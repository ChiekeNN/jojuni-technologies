/**
 * Docs & Files: folders, written documents, links and attached files.
 *
 * Files are stored as metadata plus a note, not as binary uploads — the
 * workspace has no server bucket yet, so a "file" records what it is and where
 * it lives rather than pretending to hold the bytes.
 */
import { useMemo, useState } from "react";
import { EyeOff, File as FileIcon, FileText, FolderPlus, Link2, Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { relativeTime, type DocFile, type ID } from "../model";
import { Button, Chip, Field, IconButton, Modal, Select, TextArea, TextInput, cx } from "../ui";

const KIND_ICON = { doc: FileText, file: FileIcon, link: Link2 } as const;

export function FilesTab({ projectId, clientView }: { projectId: ID; clientView: boolean }) {
  const { state, actions } = useWorkspace();
  const [folderId, setFolderId] = useState<ID | "">("");
  const [adding, setAdding] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [openDoc, setOpenDoc] = useState<ID | null>(null);

  const folders = state.folders.filter((folder) => folder.projectId === projectId);
  const docs = useMemo(
    () =>
      state.docs
        .filter((doc) => doc.projectId === projectId && (!clientView || doc.clientVisible))
        .filter((doc) => (folderId ? doc.folderId === folderId : true))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [clientView, folderId, projectId, state.docs],
  );

  const activeDoc = state.docs.find((doc) => doc.id === openDoc) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-1">
        <button
          type="button"
          onClick={() => setFolderId("")}
          className={cx(
            "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-semibold transition",
            folderId === "" ? "bg-black text-white" : "bg-white text-black/60 hover:text-black",
          )}
        >
          All docs & files
          <span className="ml-auto text-[10px] opacity-60">{state.docs.filter((doc) => doc.projectId === projectId).length}</span>
        </button>
        {folders.map((folder) => {
          const count = state.docs.filter((doc) => doc.folderId === folder.id).length;
          return (
            <div key={folder.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => setFolderId(folder.id)}
                className={cx(
                  "flex min-w-0 flex-1 items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-semibold transition",
                  folderId === folder.id ? "bg-black text-white" : "bg-white text-black/60 hover:text-black",
                )}
              >
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-[10px] opacity-60">{count}</span>
              </button>
            </div>
          );
        })}
        {addingFolder ? (
          <div className="rounded border border-black/10 bg-white p-2">
            <TextInput
              autoFocus
              value={folderName}
              placeholder="Folder name"
              className="py-1 text-xs"
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && folderName.trim()) {
                  actions.addFolder(projectId, folderName.trim());
                  setFolderName("");
                  setAddingFolder(false);
                }
              }}
            />
          </div>
        ) : (
          <Button tone="ghost" className="w-full justify-start" onClick={() => setAddingFolder(true)}>
            <FolderPlus className="h-3.5 w-3.5" /> New folder
          </Button>
        )}

        <div className="mt-4 rounded border border-black/10 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/40">Tip</p>
          <p className="mt-1 text-[11px] leading-relaxed text-black/50">
            Documents are written here. Files record a name and description — link to the real file if it lives in Drive or Dropbox.
          </p>
        </div>
      </aside>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-black">
            {folderId ? folders.find((folder) => folder.id === folderId)?.name : "All docs & files"}
          </h3>
          <Button tone="primary" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        {!docs.length && (
          <p className="rounded-lg border border-dashed border-black/15 bg-white/50 px-5 py-12 text-center text-sm text-black/45">
            Nothing in this folder yet.
          </p>
        )}

        <div className="divide-y divide-black/6 overflow-hidden rounded-lg border border-black/10 bg-white">
          {docs.map((doc) => {
            const Icon = KIND_ICON[doc.kind];
            const folder = folders.find((item) => item.id === doc.folderId);
            return (
              <div key={doc.id} className="group flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-black/[0.02]">
                <button type="button" onClick={() => setOpenDoc(doc.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-black/[0.05] text-black/50">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-black">{doc.name}</span>
                      {!doc.clientVisible && <EyeOff className="h-3 w-3 shrink-0 text-black/25" />}
                    </span>
                    <span className="block truncate text-[11px] text-black/40">
                      {folder ? `${folder.name} · ` : ""}
                      {doc.kind === "link" ? doc.body : doc.body.replace(/\s+/g, " ").slice(0, 80) || "Empty"}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[10px] text-black/30 sm:block">{relativeTime(doc.updatedAt)}</span>
                </button>
                <IconButton label="Delete" tone="danger" onClick={() => actions.deleteDoc(doc.id)}>
                  <Trash2 className="h-3 w-3" />
                </IconButton>
              </div>
            );
          })}
        </div>
      </div>

      <NewDocModal
        open={adding}
        onClose={() => setAdding(false)}
        projectId={projectId}
        folders={folders}
        defaultFolderId={folderId}
      />

      {activeDoc && (
        <Modal open onClose={() => setOpenDoc(null)} title={activeDoc.name} wide>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone="neutral">{activeDoc.kind === "doc" ? "Document" : activeDoc.kind === "link" ? "Link" : "File"}</Chip>
              {!activeDoc.clientVisible && (
                <Chip>
                  <EyeOff className="h-2.5 w-2.5" /> Internal
                </Chip>
              )}
              <span className="text-[11px] text-black/35">Updated {relativeTime(activeDoc.updatedAt)}</span>
            </div>

            <TextInput
              value={activeDoc.name}
              onChange={(event) => actions.updateDoc(activeDoc.id, { name: event.target.value })}
              className="text-base font-semibold"
            />

            {activeDoc.kind === "link" ? (
              <Field label="URL">
                <TextInput value={activeDoc.body} onChange={(event) => actions.updateDoc(activeDoc.id, { body: event.target.value })} />
              </Field>
            ) : (
              <TextArea
                value={activeDoc.body}
                className="min-h-64"
                onChange={(event) => actions.updateDoc(activeDoc.id, { body: event.target.value })}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={() => actions.updateDoc(activeDoc.id, { clientVisible: !activeDoc.clientVisible })}>
                {activeDoc.clientVisible ? "Make internal" : "Make client-visible"}
              </Button>
              <Button tone="primary" onClick={() => setOpenDoc(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewDocModal({
  open,
  onClose,
  projectId,
  folders,
  defaultFolderId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: ID;
  folders: { id: string; name: string }[];
  defaultFolderId: ID | "";
}) {
  const { actions } = useWorkspace();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DocFile["kind"]>("doc");
  const [body, setBody] = useState("");
  const [folderId, setFolderId] = useState<ID | "">(defaultFolderId);
  const [clientVisible, setClientVisible] = useState(true);

  const submit = () => {
    if (!name.trim()) return;
    actions.addDoc({ projectId, folderId, name: name.trim(), kind, body, clientVisible });
    setName("");
    setBody("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to docs & files">
      <div className="space-y-3">
        <Field label="Name">
          <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Decision log, brand assets, contract…" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <Select value={kind} onChange={(event) => setKind(event.target.value as DocFile["kind"])}>
              <option value="doc">Written document</option>
              <option value="link">Link</option>
              <option value="file">File reference</option>
            </Select>
          </Field>
          <Field label="Folder">
            <Select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={kind === "link" ? "URL" : kind === "file" ? "Where does it live?" : "Content"}>
          {kind === "link" ? (
            <TextInput value={body} onChange={(event) => setBody(event.target.value)} placeholder="https://" />
          ) : (
            <TextArea value={body} onChange={(event) => setBody(event.target.value)} placeholder={kind === "file" ? "e.g. Shared Drive › Meridian › SOW.pdf" : "Write it here…"} />
          )}
        </Field>
        <Field label="Visibility">
          <Select value={clientVisible ? "client" : "internal"} onChange={(event) => setClientVisible(event.target.value === "client")}>
            <option value="client">Visible in client view</option>
            <option value="internal">Internal only</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}
