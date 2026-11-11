/**
 * Settings: workspace identity, super-admin profile, archiving, backup/restore
 * and the client-visibility rules.
 */
import { useRef, useState } from "react";
import { Download, RotateCcw, ShieldCheck, Upload } from "lucide-react";

import { useWorkspace } from "../store";
import { initialsOf, type ID } from "../model";
import { Avatar, Button, Chip, Field, Panel, Select, TextInput } from "../ui";
import { useEditProject } from "../NewProjectModal";

export function SettingsView({ onOpenProject }: { onOpenProject: (projectId: ID) => void }) {
  const { state, actions, resetToSample, exportJSON, importJSON } = useWorkspace();
  const editProject = useEditProject();
  const me = state.people.find((person) => person.id === state.currentUserId);
  const [name, setName] = useState(me?.name ?? "");
  const [title, setTitle] = useState(me?.title ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jojuni-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
  };

  const upload = async (file: File) => {
    try {
      importJSON(await file.text());
      setStatus("Workspace restored from that file.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "That file could not be read.");
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">Settings</h1>
        <p className="mt-1 text-sm text-black/50">Your profile, the projects, and how the workspace is stored.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Your profile</h2>
          <div className="mb-3 flex items-center gap-3">
            <Avatar person={me} size="lg" />
            <div>
              <p className="text-sm font-semibold text-black">{me?.name}</p>
              <p className="text-xs text-black/45">{me?.title}</p>
            </div>
            <Chip tone="dark" >
              <ShieldCheck className="h-2.5 w-2.5" /> Full access
            </Chip>
          </div>
          <div className="space-y-2.5">
            <Field label="Name">
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Title">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Button
              tone="primary"
              onClick={() => {
                if (!me) return;
                actions.updatePerson(me.id, { name, title, email, initials: initialsOf(name) });
                setStatus("Profile saved.");
              }}
            >
              Save profile
            </Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Projects</h2>
          <div className="divide-y divide-black/6">
            {state.projects.map((project) => (
              <div key={project.id} className="flex items-center gap-2 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-black/80 hover:text-black"
                >
                  {project.name}
                </button>
                {project.status === "archived" && <Chip>Archived</Chip>}
                <Button onClick={() => editProject(project.id)}>Edit</Button>
                <Button onClick={() => actions.archiveProject(project.id, project.status !== "archived")}>
                  {project.status === "archived" ? "Restore" : "Archive"}
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Client view defaults</h2>
          <p className="mb-3 text-xs leading-relaxed text-black/50">
            Client view hides anything marked internal. These are the current settings per project.
          </p>
          <div className="space-y-2">
            {state.projects.map((project) => (
              <div key={project.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-black/70">{project.name}</span>
                <Select
                  value={project.clientVisible ? "shared" : "internal"}
                  onChange={(event) => actions.updateProject(project.id, { clientVisible: event.target.value === "shared" })}
                  className="w-40 py-1 text-xs"
                >
                  <option value="shared">Client can see</option>
                  <option value="internal">Internal only</option>
                </Select>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Storage & backup</h2>
          <p className="mb-3 text-xs leading-relaxed text-black/50">
            Everything you change is saved in this browser's local storage — no server, no sign-in, no database
            required. Clearing site data erases it, so download a backup before you do.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={download}>
              <Download className="h-3.5 w-3.5" /> Download backup
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Restore from file
            </Button>
            <Button
              tone="danger"
              onClick={() => {
                if (window.confirm("Replace everything with the starting sample content? Your changes will be lost.")) {
                  resetToSample();
                  setStatus("Reset to the starting content.");
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset workspace
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          {status && <p className="mt-2 text-[11px] font-semibold text-black/55">{status}</p>}
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-2 text-sm font-bold text-black">About access</h2>
        <p className="text-xs leading-relaxed text-black/55">
          This workspace currently opens without a password so the super admin can get straight in. That is a
          deliberate, temporary choice: there is no database behind it, so nothing here is more sensitive than the
          notes you would keep in a spreadsheet. When the password gate goes back on, the same screens stay — only the
          door changes.
        </p>
      </Panel>
    </div>
  );
}
