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
import { peopleByCategory, todayISO, type ID, type Project } from "./model";
import { SERVICE_OPTIONS } from "./services";
import { Button, Field, Modal, Select, TextArea, TextInput } from "./ui";

/**
 * One modal for the whole app.
 *
 * Every project list — Home, Everything, the Lineup, the sidebar — needs a way
 * to start a new one, and four separate copies of the same form would drift.
 * `useNewProject()` returns an `open()` that any of them can call.
 */
type ProjectDialogs = {
  create: () => void;
  /** Start a new project already pointed at this client. */
  createForClient: (clientId: ID) => void;
  edit: (projectId: ID) => void;
};

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

/** `open(clientId)` starts a new project for that client. */
export function useNewProjectForClient() {
  return useContext(NewProjectContext)?.createForClient ?? noop;
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
  const [forClient, setForClient] = useState<ID | "">("");
  const dialogs = useMemo<ProjectDialogs>(
    () => ({
      create: () => {
        setEditing(null);
        setForClient("");
        setOpen(true);
      },
      createForClient: (clientId) => {
        setEditing(null);
        setForClient(clientId);
        setOpen(true);
      },
      edit: (projectId) => {
        setEditing(projectId);
        setForClient("");
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
        defaultClientId={forClient}
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
  defaultClientId = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: ID) => void;
  /** Pass a project to edit it; omit to create a new one. */
  projectId?: ID | null;
  /** Pre-select a client, when starting from that client's card. */
  defaultClientId?: ID | "";
}) {
  const { state, actions } = useWorkspace();
  const editing: Project | undefined = projectId ? state.projects.find((item) => item.id === projectId) : undefined;
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<ID | "">("");
  const [service, setService] = useState("");
  const [serviceItem, setServiceItem] = useState("");
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
  const clients = peopleByCategory(state.people, "client");
  const clientRecord = clients.find((person) => person.id === clientId);
  const subItems = SERVICE_OPTIONS.find((option) => option.title === service)?.items ?? [];
  if (!open && seeded !== null) setSeeded(null);
  if (open && seedKey !== seeded) {
    setSeeded(seedKey);
    setName(editing?.name ?? "");
    setClientId(editing?.clientId ?? defaultClientId);
    setService(editing?.service ?? "");
    setServiceItem(editing?.serviceItem ?? "");
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
    // `client` is kept as text alongside the id: it is what old projects have,
    // it is what the Lineup and the reports show, and it survives the client
    // record being removed later.
    const clientText = clientRecord?.company || clientRecord?.name || "Internal";
    const fields = {
      name: name.trim(),
      code: name.trim().slice(0, 2).toUpperCase(),
      client: clientText,
      clientId: clientId || undefined,
      service: service || undefined,
      serviceItem: serviceItem || undefined,
      description: description.trim(),
      color,
      start,
      end: end || start,
      clientVisible,
    };
    if (editing) {
      actions.updateProject(editing.id, fields);
      onClose();
      return;
    }
    const id = actions.addProject({ ...fields, status: "active", members: [state.currentUserId] });
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client" hint={clients.length ? "Who this project is for." : "Add a client in People first."}>
            <Select
              value={clientId}
              onChange={(event) => {
                const next = event.target.value;
                setClientId(next);
                // A client named but nothing sold yet is the common case when
                // starting from their card, so do not clear the service on a
                // re-pick of the same client.
                if (next !== clientId) setServiceItem("");
              }}
            >
              <option value="">Internal / not a client</option>
              {clients.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.company || person.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What we sold" hint="The reason this project exists for them.">
            <Select
              value={service}
              onChange={(event) => {
                setService(event.target.value);
                setServiceItem("");
              }}
            >
              <option value="">Not specified</option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option.title} value={option.title}>
                  {option.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {service && (
          <Field label="Sub-service">
            <Select value={serviceItem} onChange={(event) => setServiceItem(event.target.value)}>
              <option value="">Whole service</option>
              {subItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
        )}
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
