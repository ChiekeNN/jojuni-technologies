/**
 * Creating a project.
 *
 * Extracted from HomeView so it can be opened from anywhere a project list
 * appears. "I can't create projects" was really "the only button is on a page
 * I don't start on", and a control that exists in exactly one place is a
 * control most people never find.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { useWorkspace } from "./store";
import { todayISO, type ID, type Project } from "./model";
import { Button, Field, Modal, Select, TextArea, TextInput } from "./ui";

/**
 * One modal for the whole app.
 *
 * Every project list — Home, Everything, the Lineup, the sidebar — needs a way
 * to start a new one, and four separate copies of the same form would drift.
 * `useNewProject()` returns an `open()` that any of them can call.
 */
type ProjectDialogs = { create: () => void; edit: (projectId: ID) => void };

const NewProjectContext = createContext<ProjectDialogs | null>(null);
const noop = () => {};

/** `open()` starts a new project. */
export function useNewProject() {
  return useContext(NewProjectContext)?.create ?? noop;
}

/** `open(projectId)` edits an existing one. */
export function useEditProject() {
  return useContext(NewProjectContext)?.edit ?? noop;
}

/** Mount once, near the root: owns the modal and hands out `open()`. */
export function NewProjectProvider({
  onCreated,
  children,
}: {
  onCreated: (projectId: ID) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ID | null>(null);
  const dialogs = useMemo<ProjectDialogs>(
    () => ({
      create: () => {
        setEditing(null);
        setOpen(true);
      },
      edit: (projectId) => {
        setEditing(projectId);
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <NewProjectContext.Provider value={dialogs}>
      {children}
      <NewProjectModal
        open={open}
        projectId={editing}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />
    </NewProjectContext.Provider>
  );
}

export function NewProjectModal({
  open,
  onClose,
  onCreated,
  projectId = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: ID) => void;
  /** Pass a project to edit it; omit to create a new one. */
  projectId?: ID | null;
}) {
  const { state, actions } = useWorkspace();
  const editing: Project | undefined = projectId ? state.projects.find((item) => item.id === projectId) : undefined;
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState("");
  const [color, setColor] = useState("#d90429");
  const [clientVisible, setClientVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Reset when reopened, so a cancelled draft does not come back. */
  // Re-seed on every open: creating twice in a row must not carry the previous
  // draft over, and edit must never show the last project it looked at.
  const [seeded, setSeeded] = useState<string | null>(null);
  const seedKey = open ? (editing?.id ?? "new") : null;
  if (!open && seeded !== null) setSeeded(null);
  if (open && seedKey !== seeded) {
    setSeeded(seedKey);
    setName(editing?.name ?? "");
    setClient(editing && editing.client !== "Internal" ? editing.client : "");
    setDescription(editing?.description ?? "");
    setStart(editing?.start || todayISO());
    setEnd(editing?.end ?? "");
    setColor(editing?.color ?? "#d90429");
    setClientVisible(editing?.clientVisible ?? true);
    setError(null);
  }

  const submit = () => {
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    if (editing) {
      actions.updateProject(editing.id, {
        name: name.trim(),
        code: name.trim().slice(0, 2).toUpperCase(),
        client: client.trim() || "Internal",
        description: description.trim(),
        color,
        start,
        end: end || start,
        clientVisible,
      });
      onClose();
      return;
    }
    const id = actions.addProject({
      name: name.trim(),
      code: name.trim().slice(0, 2).toUpperCase(),
      client: client.trim() || "Internal",
      description: description.trim(),
      color,
      start,
      end: end || start,
      status: "active",
      members: [state.currentUserId],
      clientVisible,
    });
    onClose();
    onCreated(id);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit project" : "New project"}>
      <div className="space-y-3">
        <Field label="Project name">
          <TextInput
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="e.g. Meridian Commerce"
          />
        </Field>
        <Field label="Client" hint="Leave blank for internal work.">
          <TextInput
            value={client}
            onChange={(event) => setClient(event.target.value)}
            placeholder="Client name, or Internal"
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-16"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Starts">
            <TextInput type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label="Target">
            <TextInput type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
          <Field label="Colour">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-[38px] w-full cursor-pointer rounded border border-black/15 bg-white p-1"
            />
          </Field>
        </div>
        <Field label="Client visibility">
          <Select
            value={clientVisible ? "client" : "internal"}
            onChange={(event) => setClientVisible(event.target.value === "client")}
          >
            <option value="client">Client can see this project</option>
            <option value="internal">Internal only</option>
          </Select>
        </Field>

        {error && <p className="text-[11px] font-semibold text-[#d90429]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            {editing ? "Save changes" : "Create project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
