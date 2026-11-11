/**
 * Creating a to-do from outside a project.
 *
 * To-dos belong to a project, so this asks which one. Used by My work, where
 * "add a task" has to mean something even though the page is not inside a
 * project — and it defaults to whoever is signed in, because a task you add to
 * your own list is usually yours.
 */
import { useState } from "react";

import { useWorkspace } from "./store";
import { assignablePeople, todayISO, type ID } from "./model";
import { Button, Field, Modal, Select, TextInput } from "./ui";

export function NewTaskModal({
  open,
  onClose,
  defaultProjectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: ID;
  onCreated?: (projectId: ID) => void;
}) {
  const { state, actions } = useWorkspace();
  const activeProjects = state.projects.filter((project) => project.status === "active");

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? activeProjects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState<ID | "">(state.currentUserId);
  const [due, setDue] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setProjectId(defaultProjectId ?? activeProjects[0]?.id ?? "");
      setAssigneeId(state.currentUserId);
      setDue(todayISO());
      setError(null);
    }
  }

  const lists = state.todoLists.filter((list) => list.projectId === projectId);

  const submit = () => {
    if (!title.trim()) {
      setError("Give the task a name.");
      return;
    }
    if (!projectId) {
      setError("Create a project first — tasks live inside one.");
      return;
    }
    // A to-do needs a list. If the project has none, make one rather than
    // refusing: "add a task" failing because of an empty list is a bad answer.
    const listId = lists[0]?.id ?? actions.addTodoList(projectId, "Tasks");
    actions.addTodo({ projectId, listId, title: title.trim(), assigneeId, due });
    onCreated?.(projectId);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="space-y-3">
        <Field label="What needs doing?">
          <TextInput
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="e.g. Send the staging link to the client"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project" hint={activeProjects.length ? undefined : "No active project yet."}>
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="">Unassigned</option>
              {assignablePeople(state.people).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Due">
          <TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>

        {error && <p className="text-[11px] font-semibold text-[#d90429]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            Add task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
