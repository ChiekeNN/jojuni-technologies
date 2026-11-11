/**
 * Everything views: every item of one type across every project, in one place.
 */
import { useMemo, useState } from "react";
import { Check, FileText, LayoutGrid, MessageSquare, Plus, Search } from "lucide-react";

import { useWorkspace } from "../store";
import { dueLabel, isOverdue, relativeTime, type ID } from "../model";
import { Avatar, Button, Chip, Panel, TextInput, cx } from "../ui";
import { EditItemModal, RowActions, type EditableKind } from "../EditItemModal";
import { useNewProject } from "../NewProjectModal";

type Kind = "todos" | "posts" | "cards" | "docs" | "events";

export function EverythingView({ onOpenProject }: { onOpenProject: (projectId: ID, tab?: string) => void }) {
  const { state, actions } = useWorkspace();
  const [kind, setKind] = useState<Kind>("todos");
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<{ kind: EditableKind; id: ID } | null>(null);
  const newProject = useNewProject();

  const projectIds = useMemo(
    () =>
      new Set(
        state.projects.filter((project) => includeArchived || project.status === "active").map((project) => project.id),
      ),
    [includeArchived, state.projects],
  );

  const projectName = (id: ID) => state.projects.find((project) => project.id === id)?.name ?? "—";

  const match = (text: string) => !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase());

  const counts = {
    todos: state.todos.filter((todo) => projectIds.has(todo.projectId)).length,
    posts: state.posts.filter((post) => projectIds.has(post.projectId)).length,
    cards: state.cards.filter((card) => projectIds.has(card.projectId)).length,
    docs: state.docs.filter((doc) => projectIds.has(doc.projectId)).length,
    events: state.events.filter((event) => projectIds.has(event.projectId)).length,
  } as const;

  const kinds: { id: Kind; label: string; icon: typeof Check }[] = [
    { id: "todos", label: "All to-dos", icon: Check },
    { id: "posts", label: "All messages", icon: MessageSquare },
    { id: "cards", label: "All cards", icon: LayoutGrid },
    { id: "docs", label: "All docs & files", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">Everything</h1>
          <p className="mt-1 text-sm text-black/50">Every item of one type, across every project.</p>
        </div>
        <Button tone="primary" onClick={newProject}>
          <Plus className="h-3.5 w-3.5" /> New project
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {kinds.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition",
                kind === item.id ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
              )}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
              <span className={cx("text-[10px]", kind === item.id ? "text-white/50" : "text-black/30")}>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-black/50">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              className="h-3 w-3 accent-black"
            />
            Include archived
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter…"
              className="w-44 py-1 pl-7 text-xs"
            />
          </div>
        </div>
      </div>

      <Panel padded={false}>
        <div className="divide-y divide-black/6">
          {kind === "todos" &&
            state.todos
              .filter((todo) => projectIds.has(todo.projectId) && match(`${todo.title} ${projectName(todo.projectId)}`))
              .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due))
              .map((todo) => (
                <div key={todo.id} className="flex items-center gap-2 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => actions.toggleTodo(todo.id)}
                    className={cx(
                      "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition",
                      todo.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-black/25",
                    )}
                    aria-label="Toggle"
                  >
                    {todo.done && <Check className="h-2 w-2" strokeWidth={4} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProject(todo.projectId, "To-dos")}
                    className={cx(
                      "min-w-0 flex-1 truncate text-left text-xs hover:text-black",
                      todo.done ? "text-black/35 line-through" : "text-black/80",
                    )}
                  >
                    {todo.title}
                  </button>
                  <span className="hidden shrink-0 text-[10px] text-black/35 sm:block">{projectName(todo.projectId)}</span>
                  <span className={cx("shrink-0 text-[10px]", isOverdue(todo.due) ? "font-semibold text-[#d90429]" : "text-black/35")}>
                    {dueLabel(todo.due)}
                  </span>
                  <RowActions
                    label={todo.title}
                    onEdit={() => setEditing({ kind: "todos", id: todo.id })}
                    onDelete={() => actions.deleteTodo(todo.id)}
                  />
                </div>
              ))}

          {kind === "posts" &&
            state.posts
              .filter((post) => projectIds.has(post.projectId) && match(`${post.title} ${post.body} ${projectName(post.projectId)}`))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((post) => (
                <div key={post.id} className="flex items-center gap-2 pr-2 hover:bg-black/[0.02]">
                  <button
                    type="button"
                    onClick={() => onOpenProject(post.projectId, "Message board")}
                    className="flex min-w-0 flex-1 items-start gap-2 py-2.5 pl-4 text-left"
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/25" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-black/85">{post.title}</span>
                      <span className="block truncate text-[10px] text-black/35">
                        {projectName(post.projectId)} · {post.replies.length} replies · {relativeTime(post.createdAt)}
                      </span>
                    </span>
                    <Chip tone={post.category === "Announcement" ? "danger" : "neutral"}>{post.category}</Chip>
                  </button>
                  <RowActions
                    label={post.title}
                    onEdit={() => setEditing({ kind: "posts", id: post.id })}
                    onDelete={() => actions.deletePost(post.id)}
                  />
                </div>
              ))}

          {kind === "cards" &&
            state.cards
              .filter((card) => projectIds.has(card.projectId) && match(`${card.title} ${projectName(card.projectId)}`))
              .map((card) => {
                const column = state.cardColumns.find((item) => item.id === card.columnId);
                const person = state.people.find((item) => item.id === card.assigneeId);
                return (
                  <div key={card.id} className="flex items-center gap-2 pr-2 hover:bg-black/[0.02]">
                    <button
                      type="button"
                      onClick={() => onOpenProject(card.projectId, "Card table")}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-4 text-left"
                    >
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-black/25" />
                      <span className="min-w-0 flex-1 truncate text-xs text-black/80">{card.title}</span>
                      <Chip>{column?.name ?? "—"}</Chip>
                      <span className="hidden shrink-0 text-[10px] text-black/35 sm:block">{projectName(card.projectId)}</span>
                      <Avatar person={person} size="xs" />
                    </button>
                    <RowActions
                      label={card.title}
                      onEdit={() => setEditing({ kind: "cards", id: card.id })}
                      onDelete={() => actions.deleteCard(card.id)}
                    />
                  </div>
                );
              })}

          {kind === "docs" &&
            state.docs
              .filter((doc) => projectIds.has(doc.projectId) && match(`${doc.name} ${doc.body} ${projectName(doc.projectId)}`))
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 pr-2 hover:bg-black/[0.02]">
                  <button
                    type="button"
                    onClick={() => onOpenProject(doc.projectId, "Docs & files")}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-4 text-left"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-black/25" />
                    <span className="min-w-0 flex-1 truncate text-xs text-black/80">{doc.name}</span>
                    <Chip>{doc.kind}</Chip>
                    <span className="hidden shrink-0 text-[10px] text-black/35 sm:block">{projectName(doc.projectId)}</span>
                    <span className="shrink-0 text-[10px] text-black/30">{relativeTime(doc.updatedAt)}</span>
                  </button>
                  <RowActions
                    label={doc.name}
                    onEdit={() => setEditing({ kind: "docs", id: doc.id })}
                    onDelete={() => actions.deleteDoc(doc.id)}
                  />
                </div>
              ))}
        </div>

        {counts[kind] === 0 && (
          <p className="px-4 py-10 text-center text-xs text-black/35">Nothing of this type yet.</p>
        )}
      </Panel>

      <EditItemModal kind={editing?.kind ?? "todos"} id={editing?.id ?? null} onClose={() => setEditing(null)} />
    </div>
  );
}
