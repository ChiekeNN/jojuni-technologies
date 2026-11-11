/**
 * Editing one item from Everything.
 *
 * Everything was a read-only index: you could see every to-do, message, card
 * and doc in the workspace and do nothing to any of them. This is the write
 * half — open a row, change it, or delete it, without hunting for the project
 * it came from.
 */
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useWorkspace } from "./store";
import { assignablePeople, todayISO, type DocKind, type ID, type PostCategory } from "./model";
import { Button, Field, IconButton, Modal, Select, TextArea, TextInput } from "./ui";

export type EditableKind = "todos" | "posts" | "cards" | "docs";

const postCategories: PostCategory[] = ["Announcement", "Discussion"];
const docKinds: DocKind[] = ["doc", "link", "file"];

export function EditItemModal({
  kind,
  id,
  onClose,
}: {
  kind: EditableKind;
  id: ID | null;
  onClose: () => void;
}) {
  const { state, actions } = useWorkspace();
  const open = id !== null;

  const todo = kind === "todos" ? state.todos.find((item) => item.id === id) : undefined;
  const post = kind === "posts" ? state.posts.find((item) => item.id === id) : undefined;
  const card = kind === "cards" ? state.cards.find((item) => item.id === id) : undefined;
  const doc = kind === "docs" ? state.docs.find((item) => item.id === id) : undefined;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [extra, setExtra] = useState("");
  const [pickId, setPickId] = useState<ID | "">("");
  const [due, setDue] = useState("");

  // Seed the fields each time a different row is opened, and never let a stale
  // draft leak from the last item. Derived during render, not in an effect, so
  // the first paint already shows the item's values.
  const [seededId, setSeededId] = useState<string | null>(null);
  const key = id === null ? null : `${kind}:${id}`;
  if (key !== seededId) {
    setSeededId(key);
    setTitle(todo?.title ?? post?.title ?? card?.title ?? doc?.name ?? "");
    setBody(post?.body ?? card?.notes ?? doc?.body ?? "");
    setExtra(post?.category ?? doc?.kind ?? "");
    setPickId((todo?.assigneeId ?? card?.assigneeId ?? "") as ID | "");
    setDue(todo?.due ?? card?.due ?? "");
  }

  const titles: Record<EditableKind, string> = {
    todos: "Edit to-do",
    posts: "Edit message",
    cards: "Edit card",
    docs: "Edit doc",
  };

  const save = () => {
    if (!id) return;
    if (!title.trim()) return;
    if (kind === "todos") actions.updateTodo(id, { title: title.trim(), assigneeId: pickId, due });
    if (kind === "posts")
      actions.updatePost(id, { title: title.trim(), body, category: (extra || "Discussion") as PostCategory });
    if (kind === "cards") actions.updateCard(id, { title: title.trim(), notes: body, assigneeId: pickId, due });
    if (kind === "docs") actions.updateDoc(id, { name: title.trim(), body, kind: (extra || "doc") as DocKind });
    onClose();
  };

  const remove = () => {
    if (!id) return;
    if (kind === "todos") actions.deleteTodo(id);
    if (kind === "posts") actions.deletePost(id);
    if (kind === "cards") actions.deleteCard(id);
    if (kind === "docs") actions.deleteDoc(id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={titles[kind]}>
      <div className="space-y-3">
        <Field label={kind === "docs" ? "Name" : "Title"}>
          <TextInput autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>

        {(kind === "posts" || kind === "cards" || kind === "docs") && (
          <Field label={kind === "cards" ? "Notes" : kind === "posts" ? "Body" : "Body / URL"}>
            <TextArea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-28"
            />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(kind === "todos" || kind === "cards") && (
            <Field label="Assignee">
              <Select value={pickId} onChange={(event) => setPickId(event.target.value)}>
                <option value="">Unassigned</option>
                {assignablePeople(state.people).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {(kind === "todos" || kind === "cards") && (
            <Field label="Due">
              <TextInput
                type="date"
                value={due || todayISO()}
                onChange={(event) => setDue(event.target.value)}
              />
            </Field>
          )}

          {kind === "posts" && (
            <Field label="Category">
              <Select value={extra} onChange={(event) => setExtra(event.target.value)}>
                {postCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {kind === "docs" && (
            <Field label="Kind">
              <Select value={extra} onChange={(event) => setExtra(event.target.value)}>
                {docKinds.map((docKind) => (
                  <option key={docKind} value={docKind}>
                    {docKind}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button tone="ghost" className="text-[#d90429] hover:bg-[#d90429]/5" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button tone="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button tone="primary" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Pencil + bin for a row. The bin asks once before deleting: these are real
 * records and there is no undo, so a single stray click must not destroy one.
 */
export function RowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          className="rounded bg-[#d90429] px-1.5 py-0.5 text-[10px] font-semibold text-white"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-black/40 hover:text-black"
        >
          No
        </button>
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <IconButton label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="h-3 w-3" />
      </IconButton>
      <IconButton label={`Delete ${label}`} tone="danger" onClick={() => setConfirming(true)}>
        <Trash2 className="h-3 w-3" />
      </IconButton>
    </span>
  );
}
