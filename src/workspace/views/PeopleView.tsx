/**
 * People: who is in the workspace, what they are responsible for, and which
 * projects they are on.
 */
import { useState } from "react";
import { Mail, Plus } from "lucide-react";

import { useWorkspace } from "../store";
import { initialsOf, projectProgress } from "../model";
import { Avatar, Button, Chip, Field, Panel, ProgressBar, TextInput, cx } from "../ui";
import { Modal } from "../ui";

export function PeopleView({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const { state } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const me = state.currentUserId;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">People</h1>
          <p className="mt-1 text-sm text-black/50">{state.people.length} people in this workspace.</p>
        </div>
        <Button tone="primary" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Invite person
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.people.map((person) => {
          const projects = state.projects.filter((project) => project.members.includes(person.id));
          const openTodos = state.todos.filter((todo) => todo.assigneeId === person.id && !todo.done).length;
          const doneTodos = state.todos.filter((todo) => todo.assigneeId === person.id && todo.done).length;
          return (
            <Panel key={person.id}>
              <div className="flex items-start gap-3">
                <Avatar person={person} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-sm font-bold text-black">{person.name}</h2>
                    {person.owner && <Chip tone="dark">Super admin</Chip>}
                    {person.id === me && <Chip tone="ok">You</Chip>}
                  </div>
                  <p className="text-xs text-black/45">{person.title}</p>
                  <a href={`mailto:${person.email}`} className="mt-0.5 flex items-center gap-1 text-[11px] text-black/40 hover:text-black">
                    <Mail className="h-3 w-3" /> {person.email}
                  </a>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded border border-black/8 px-2 py-1.5">
                  <p className="text-base font-bold tabular-nums text-black">{openTodos}</p>
                  <p className="text-[10px] text-black/40">open to-dos</p>
                </div>
                <div className="rounded border border-black/8 px-2 py-1.5">
                  <p className="text-base font-bold tabular-nums text-black">{doneTodos}</p>
                  <p className="text-[10px] text-black/40">completed</p>
                </div>
              </div>

              <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-black/35">
                Projects ({projects.length})
              </p>
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-black/65 hover:text-black">{project.name}</span>
                      <span className="shrink-0 text-[10px] text-black/30">{projectProgress(state, project.id)}%</span>
                    </button>
                  </li>
                ))}
                {!projects.length && <li className="text-[11px] text-black/35">Not on a project yet.</li>}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <h2 className="mb-2 text-sm font-bold text-black">Workload across active projects</h2>
        <div className="space-y-2">
          {state.projects
            .filter((project) => project.status === "active")
            .map((project) => (
              <div key={project.id} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-[11px] text-black/60">{project.name}</span>
                <div className="flex -space-x-1">
                  {state.people
                    .filter((person) => project.members.includes(person.id))
                    .map((person) => (
                      <Avatar key={person.id} person={person} size="xs" ring />
                    ))}
                </div>
                <div className="ml-auto w-28">
                  <ProgressBar value={projectProgress(state, project.id)} color={project.color} />
                </div>
              </div>
            ))}
        </div>
      </Panel>

      <AddPerson open={adding} onClose={() => setAdding(false)} />
      <p className="text-[11px] leading-relaxed text-black/35">
        People added here appear in every assignment menu immediately. This workspace has no email server, so nobody is
        emailed an invitation. Removing someone takes them off every project but keeps the work they are attached to.
      </p>
    </div>
  );
}

function AddPerson({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useWorkspace();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#0f766e");

  const submit = () => {
    if (!name.trim()) return;
    actions.addPerson({
      name: name.trim(),
      initials: initialsOf(name.trim()),
      title: title.trim() || "Team member",
      email: email.trim(),
      color,
    });
    setName("");
    setTitle("");
    setEmail("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a person">
      <div className={cx("space-y-3")}>
        <Field label="Name">
          <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Role">
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Engineer" />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Avatar colour">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-[38px] w-full cursor-pointer rounded border border-black/15 bg-white p-1"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            Add person
          </Button>
        </div>
      </div>
    </Modal>
  );
}
