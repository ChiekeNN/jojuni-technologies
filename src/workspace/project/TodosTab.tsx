/**
 * To-dos tab: lists, items, subtasks, assignment and due dates.
 */
import { useMemo, useState } from "react";
import { Check, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { assignablePeople, dueLabel, isOverdue, type ID, type Todo } from "../model";
import { Avatar, Button, Field, IconButton, Select, TextInput, cx } from "../ui";

type Filter = "all" | "mine" | "open" | "done" | "overdue";

export function TodosTab({ projectId }: { projectId: ID }) {
  const { state, actions } = useWorkspace();
  const [filter, setFilter] = useState<Filter>("all");
  const [newList, setNewList] = useState("");
  const [addingList, setAddingList] = useState(false);

  const lists = state.todoLists.filter((list) => list.projectId === projectId);
  const project = state.projects.find((item) => item.id === projectId);
  const members = assignablePeople(state.people).filter((person) => project?.members.includes(person.id));

  const todos = useMemo(() => {
    const base = state.todos.filter((todo) => todo.projectId === projectId);
    switch (filter) {
      case "mine":
        return base.filter((todo) => todo.assigneeId === state.currentUserId && !todo.done);
      case "open":
        return base.filter((todo) => !todo.done);
      case "done":
        return base.filter((todo) => todo.done);
      case "overdue":
        return base.filter((todo) => !todo.done && isOverdue(todo.due));
      default:
        return base;
    }
  }, [filter, projectId, state.currentUserId, state.todos]);

  const total = state.todos.filter((todo) => todo.projectId === projectId);
  const done = total.filter((todo) => todo.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(["all", "mine", "open", "overdue", "done"] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cx(
                "rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                filter === option ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
              )}
            >
              {option === "mine" ? "Assigned to me" : option}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-black/45">
          {done}/{total.length} complete
        </span>
        <Button onClick={() => setAddingList(true)}>
          <Plus className="h-3.5 w-3.5" /> List
        </Button>
      </div>

      {addingList && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-black/10 bg-white p-3">
          <div className="min-w-48 flex-1">
            <Field label="New list">
              <TextInput
                autoFocus
                value={newList}
                placeholder="e.g. Launch checklist"
                onChange={(event) => setNewList(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newList.trim()) {
                    actions.addTodoList(projectId, newList.trim());
                    setNewList("");
                    setAddingList(false);
                  }
                }}
              />
            </Field>
          </div>
          <Button
            tone="primary"
            onClick={() => {
              if (!newList.trim()) return;
              actions.addTodoList(projectId, newList.trim());
              setNewList("");
              setAddingList(false);
            }}
          >
            Add list
          </Button>
          <Button tone="ghost" onClick={() => setAddingList(false)}>
            Cancel
          </Button>
        </div>
      )}

      {!lists.length && (
        <p className="rounded-lg border border-dashed border-black/15 px-5 py-10 text-center text-sm text-black/45">
          No lists yet. Add one to start tracking work.
        </p>
      )}

      {lists.map((list) => {
        const listTodos = todos.filter((todo) => todo.listId === list.id);
        const allForList = total.filter((todo) => todo.listId === list.id);
        const complete = allForList.filter((todo) => todo.done).length;
        return (
          <section key={list.id} className="overflow-hidden rounded-lg border border-black/10 bg-white">
            <header className="flex items-center gap-2 border-b border-black/8 px-4 py-2.5">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-black/15" />
              <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-black">{list.title}</h3>
              <span className="shrink-0 text-[11px] text-black/40">
                {complete}/{allForList.length}
              </span>
            </header>
            <div className="divide-y divide-black/6">
              {listTodos.map((todo) => (
                <TodoRow key={todo.id} todo={todo} members={members} />
              ))}
              {!listTodos.length && (
                <p className="px-4 py-3 text-xs text-black/35">
                  {allForList.length ? "Nothing matches this filter." : "No to-dos in this list yet."}
                </p>
              )}
            </div>
            <QuickAdd projectId={projectId} listId={list.id} members={members} />
          </section>
        );
      })}
    </div>
  );
}

function QuickAdd({
  projectId,
  listId,
  members,
}: {
  projectId: ID;
  listId: ID;
  members: { id: string; name: string }[];
}) {
  const { state, actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(state.currentUserId);
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    actions.addTodo({ projectId, listId, title: title.trim(), assigneeId: assignee, due });
    setTitle("");
    setDue("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-xs font-semibold text-black/40 transition hover:bg-black/[0.02] hover:text-black"
      >
        <Plus className="h-3.5 w-3.5" /> Add a to-do
      </button>
    );
  }

  return (
    <div className="border-t border-black/8 bg-black/[0.015] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="To-do">
            <TextInput
              autoFocus
              value={title}
              placeholder="What needs doing?"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </Field>
        </div>
        <div className="w-full sm:w-40">
          <Field label="Assignee">
            <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-full sm:w-36">
          <Field label="Due">
            <TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button tone="primary" onClick={submit}>
          Add
        </Button>
        <Button tone="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function TodoRow({ todo, members }: { todo: Todo; members: { id: string; name: string; initials: string; color: string; title: string }[] }) {
  const { state, actions } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const [subtask, setSubtask] = useState("");
  const assignee = state.people.find((person) => person.id === todo.assigneeId);
  const doneSubtasks = todo.subtasks.filter((item) => item.done).length;
  const overdue = !todo.done && isOverdue(todo.due);

  return (
    <div className={cx("px-4 py-2.5 transition", expanded && "bg-black/[0.015]")}>
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => actions.toggleTodo(todo.id)}
          aria-label={todo.done ? "Mark as not done" : "Mark as done"}
          className={cx(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition",
            todo.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-black/25 hover:border-black",
          )}
        >
          {todo.done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="flex w-full items-start gap-2 text-left"
          >
            <span
              className={cx(
                "min-w-0 flex-1 text-sm leading-snug",
                todo.done ? "text-black/35 line-through" : "text-black",
              )}
            >
              {todo.title}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {todo.subtasks.length > 0 && (
                <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/45">
                  {doneSubtasks}/{todo.subtasks.length}
                </span>
              )}
              {todo.due && (
                <span
                  className={cx(
                    "text-[11px]",
                    overdue ? "font-semibold text-[#d90429]" : todo.done ? "text-black/30" : "text-black/45",
                  )}
                >
                  {dueLabel(todo.due)}
                </span>
              )}
              <ChevronDown className={cx("h-3.5 w-3.5 text-black/20 transition", expanded && "rotate-180")} />
            </span>
          </button>

          {expanded && (
            <div className="mt-2.5 space-y-2.5 rounded border border-black/8 bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Assignee">
                  <Select
                    value={todo.assigneeId}
                    onChange={(event) => actions.updateTodo(todo.id, { assigneeId: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {members.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Due date">
                  <TextInput
                    type="date"
                    value={todo.due}
                    onChange={(event) => actions.updateTodo(todo.id, { due: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Notes">
                <TextInput
                  value={todo.notes}
                  placeholder="Anything worth remembering"
                  onChange={(event) => actions.updateTodo(todo.id, { notes: event.target.value })}
                />
              </Field>

              <div>
                <p className="mb-1 text-xs font-semibold text-black/70">Subtasks</p>
                <div className="space-y-1">
                  {todo.subtasks.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => actions.toggleSubtask(todo.id, item.id)}
                        className={cx(
                          "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition",
                          item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-black/25",
                        )}
                        aria-label={item.done ? "Mark subtask not done" : "Mark subtask done"}
                      >
                        {item.done && <Check className="h-2 w-2" strokeWidth={4} />}
                      </button>
                      <span className={cx("min-w-0 flex-1 text-xs", item.done ? "text-black/35 line-through" : "text-black/75")}>
                        {item.title}
                      </span>
                      <IconButton label="Delete subtask" tone="danger" onClick={() => actions.deleteSubtask(todo.id, item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <TextInput
                    value={subtask}
                    placeholder="Add a subtask"
                    className="py-1 text-xs"
                    onChange={(event) => setSubtask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && subtask.trim()) {
                        actions.addSubtask(todo.id, subtask.trim());
                        setSubtask("");
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (!subtask.trim()) return;
                      actions.addSubtask(todo.id, subtask.trim());
                      setSubtask("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-black/8 pt-2">
                <span className="text-[11px] text-black/35">Created {dueLabel(todo.createdAt.slice(0, 10))}</span>
                <Button tone="danger" onClick={() => actions.deleteTodo(todo.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <Avatar person={assignee} size="sm" />
        </div>
      </div>
    </div>
  );
}
