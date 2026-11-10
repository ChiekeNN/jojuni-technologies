/**
 * My work: my assignments, notes and bookmarks in one place.
 */
import { useState } from "react";
import { Bookmark, Check, NotebookPen, Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { dueLabel, isOverdue, relativeTime, type ID } from "../model";
import { Avatar, Button, IconButton, Panel, TextArea, TextInput, cx } from "../ui";

type Tab = "tasks" | "notes" | "bookmarks";

export function MyWorkView({ onOpenProject }: { onOpenProject: (projectId: ID, tab?: string) => void }) {
  const { state, actions } = useWorkspace();
  const [tab, setTab] = useState<Tab>("tasks");
  const [activeNote, setActiveNote] = useState<ID | null>(state.notes[0]?.id ?? null);

  const mine = state.todos.filter((todo) => !todo.done && (todo.assigneeId === state.currentUserId || todo.assigneeId === ""));
  const cards = state.cards.filter((card) => card.assigneeId === state.currentUserId);
  const note = state.notes.find((item) => item.id === activeNote) ?? state.notes[0] ?? null;

  const grouped = {
    overdue: mine.filter((todo) => isOverdue(todo.due)),
    today: mine.filter((todo) => !isOverdue(todo.due) && dueLabel(todo.due) === "Today"),
    week: mine.filter((todo) => {
      const label = dueLabel(todo.due);
      return !isOverdue(todo.due) && label !== "Today" && /^(Tomorrow|In \d+ days)/.test(label);
    }),
    later: mine.filter((todo) => {
      const label = dueLabel(todo.due);
      return !isOverdue(todo.due) && label !== "Today" && !/^(Tomorrow|In \d+ days)/.test(label);
    }),
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">My work</h1>
          <p className="mt-1 text-sm text-black/50">
            {mine.length} open to-dos · {cards.length} cards · {state.notes.length} notes
          </p>
        </div>
        <div className="flex gap-1">
          {(
            [
              { id: "tasks", label: "Tasks", icon: Check },
              { id: "notes", label: "Notes", icon: NotebookPen },
              { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
            ] as { id: Tab; label: string; icon: typeof Check }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition",
                tab === item.id ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
              )}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "tasks" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Bucket title="Overdue" tone="danger" count={grouped.overdue.length}>
            {grouped.overdue.map((todo) => (
              <TaskRow key={todo.id} todoId={todo.id} onOpenProject={onOpenProject} />
            ))}
          </Bucket>
          <Bucket title="Today" count={grouped.today.length}>
            {grouped.today.map((todo) => (
              <TaskRow key={todo.id} todoId={todo.id} onOpenProject={onOpenProject} />
            ))}
          </Bucket>
          <Bucket title="This week" count={grouped.week.length}>
            {grouped.week.map((todo) => (
              <TaskRow key={todo.id} todoId={todo.id} onOpenProject={onOpenProject} />
            ))}
          </Bucket>
          <Bucket title="Later / no date" count={grouped.later.length}>
            {grouped.later.map((todo) => (
              <TaskRow key={todo.id} todoId={todo.id} onOpenProject={onOpenProject} />
            ))}
          </Bucket>

          {cards.length > 0 && (
            <Panel className="lg:col-span-2">
              <h2 className="mb-2 text-sm font-bold text-black">Cards assigned to me</h2>
              <ul className="divide-y divide-black/6">
                {cards.map((card) => {
                  const project = state.projects.find((item) => item.id === card.projectId);
                  return (
                    <li key={card.id} className="flex items-center gap-2 py-1.5">
                      <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-black/45">
                        {project?.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenProject(card.projectId, "Card table")}
                        className="min-w-0 flex-1 truncate text-left text-xs text-black/80 hover:text-black"
                      >
                        {card.title}
                      </button>
                      <span className="shrink-0 text-[10px] text-black/35">{card.due ? dueLabel(card.due) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-1">
            <Button
              className="w-full justify-start"
              onClick={() => {
                const id = actions.addNote();
                setActiveNote(id);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> New note
            </Button>
            {state.notes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNote(item.id)}
                className={cx(
                  "block w-full rounded px-2.5 py-1.5 text-left transition",
                  note?.id === item.id ? "bg-black text-white" : "bg-white text-black/60 hover:text-black",
                )}
              >
                <span className="block truncate text-xs font-semibold">{item.title}</span>
                <span className={cx("block truncate text-[10px]", note?.id === item.id ? "text-white/50" : "text-black/35")}>
                  {relativeTime(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>

          {note ? (
            <Panel>
              <div className="flex items-center gap-2">
                <TextInput
                  value={note.title}
                  onChange={(event) => actions.updateNote(note.id, { title: event.target.value })}
                  className="border-0 px-0 text-lg font-bold focus:border-0"
                />
                <IconButton label="Delete note" tone="danger" onClick={() => actions.deleteNote(note.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <p className="mb-2 text-[10px] text-black/35">Updated {relativeTime(note.updatedAt)}</p>
              <TextArea
                value={note.body}
                className="min-h-[45vh]"
                placeholder="Start writing…"
                onChange={(event) => actions.updateNote(note.id, { body: event.target.value })}
              />
            </Panel>
          ) : (
            <Panel>
              <p className="py-12 text-center text-sm text-black/35">No notes yet.</p>
            </Panel>
          )}
        </div>
      )}

      {tab === "bookmarks" && (
        <Panel>
          <h2 className="mb-2 text-sm font-bold text-black">Bookmarks</h2>
          <ul className="divide-y divide-black/6">
            {state.bookmarks.map((bookmark) => {
              const [, projectId] = bookmark.target.split("/");
              const project = state.projects.find((item) => item.id === projectId);
              return (
                <li key={bookmark.id} className="flex items-center gap-2 py-2">
                  <Bookmark className="h-3.5 w-3.5 shrink-0 text-black/30" />
                  <button
                    type="button"
                    onClick={() => project && onOpenProject(project.id)}
                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-black/80 hover:text-black"
                  >
                    {bookmark.label}
                  </button>
                  <span className="hidden shrink-0 text-[10px] text-black/35 sm:block">{project?.name}</span>
                  <IconButton label="Remove bookmark" tone="danger" onClick={() => actions.deleteBookmark(bookmark.id)}>
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </li>
              );
            })}
            {!state.bookmarks.length && <li className="py-3 text-xs text-black/35">No bookmarks yet.</li>}
          </ul>
          <p className="mt-2 text-[11px] text-black/35">
            Use the project page to bookmark anything worth coming back to.
          </p>
        </Panel>
      )}
    </div>
  );
}

function Bucket({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <Panel padded={false}>
      <header className="flex items-center gap-2 border-b border-black/8 px-4 py-2.5">
        <h2 className={cx("text-sm font-bold", tone === "danger" ? "text-[#d90429]" : "text-black")}>{title}</h2>
        <span className="rounded bg-black/5 px-1.5 text-[10px] font-semibold text-black/45">{count}</span>
      </header>
      <div className="divide-y divide-black/6">
        {count === 0 && <p className="px-4 py-3 text-xs text-black/35">Nothing here.</p>}
        {children}
      </div>
    </Panel>
  );
}

function TaskRow({ todoId, onOpenProject }: { todoId: ID; onOpenProject: (projectId: ID, tab?: string) => void }) {
  const { state, actions } = useWorkspace();
  const todo = state.todos.find((item) => item.id === todoId);
  if (!todo) return null;
  const project = state.projects.find((item) => item.id === todo.projectId);
  const person = state.people.find((item) => item.id === todo.assigneeId);

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <button
        type="button"
        onClick={() => actions.toggleTodo(todo.id)}
        aria-label="Complete"
        className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-black/25 transition hover:border-emerald-600 hover:bg-emerald-600"
      />
      <button
        type="button"
        onClick={() => onOpenProject(todo.projectId, "To-dos")}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-xs text-black/80 hover:text-black">{todo.title}</span>
        <span className="block truncate text-[10px] text-black/35">
          {project?.name}
          {todo.subtasks.length ? ` · ${todo.subtasks.filter((item) => item.done).length}/${todo.subtasks.length} subtasks` : ""}
        </span>
      </button>
      <span className={cx("shrink-0 text-[10px]", isOverdue(todo.due) ? "font-semibold text-[#d90429]" : "text-black/35")}>
        {dueLabel(todo.due)}
      </span>
      <Avatar person={person} size="xs" />
    </div>
  );
}
