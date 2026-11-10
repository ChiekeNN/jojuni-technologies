/**
 * Chat: the internal messenger.
 *
 * Two panes, the way WhatsApp Web and Slack both do it: conversations on the
 * left, the open conversation on the right. On a phone the list is replaced by
 * the open conversation rather than squeezing both onto a 390px screen.
 *
 * Everything a message can do — reply, react, edit, delete, forward, attach —
 * lives on the message itself rather than in a toolbar, so the composer stays a
 * composer.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Forward,
  Image as ImageIcon,
  Info,
  Lock,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Pin,
  Reply,
  Search,
  Send,
  SmilePlus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useWorkspace } from "../store";
import { formatStamp, type ID, type Person } from "../model";
import {
  canDeleteMessage,
  canEditMessage,
  canManageThread,
  canSeeThread,
  directPartner,
  REACTION_LABEL,
  lastMessage,
  messagesFor,
  previewOf,
  isReactionKey,
  REACTION_KEYS,
  threadTitle,
  unreadCount,
  visibleThreads,
  type ChatAttachment,
  type ChatMessageEntry,
  type ChatThread,
} from "../chat";
import {
  fileToDataUrl,
  formatBytes,
  getAttachmentBlob,
  INLINE_LIMIT,
  MAX_FILE_BYTES,
  putAttachmentBlob,
} from "../chat-store";
import { Avatar, Button, Chip, Field, IconButton, Modal, TextInput, cx } from "../ui";
import { ReactionIcon } from "../ReactionIcon";

export function ChatView({ threadId, onOpenThread }: { threadId?: ID; onOpenThread: (id: ID) => void }) {
  const { state, actions } = useWorkspace();
  const me = state.currentUserId;
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [forwarding, setForwarding] = useState<ChatMessageEntry | null>(null);

  const threads = useMemo(() => {
    const pins = state.chat.pins[me] ?? [];
    const search = query.trim().toLowerCase();
    const list = visibleThreads(state.chat, me).filter((thread) => {
      if (!search) return true;
      const title = threadTitle(thread, state.people, me).toLowerCase();
      const body = messagesFor(state.chat, thread.id)
        .map((message) => `${message.body} ${message.attachments.map((file) => file.name).join(" ")}`)
        .join(" ")
        .toLowerCase();
      return title.includes(search) || body.includes(search);
    });
    return [...list].sort((a, b) => {
      const pinned = Number(pins.includes(b.id)) - Number(pins.includes(a.id));
      if (pinned) return pinned;
      const aTime = lastMessage(state.chat, a.id)?.createdAt ?? a.createdAt;
      const bTime = lastMessage(state.chat, b.id)?.createdAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });
  }, [state.chat, state.people, me, query]);

  const activeRaw = threadId ? state.chat.threads.find((thread) => thread.id === threadId) : undefined;
  const active = activeRaw && canSeeThread(activeRaw, me) ? activeRaw : undefined;

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[560px] overflow-hidden rounded-lg border border-black/10 bg-white">
      <aside
        className={cx(
          "min-w-0 shrink-0 flex-col border-r border-black/8 bg-black/[0.015] md:flex md:w-80",
          active ? "hidden md:flex" : "flex w-full",
        )}
      >
        <header className="flex items-center gap-2 border-b border-black/8 px-3 py-2.5">
          <h2 className="text-sm font-bold text-black">Chat</h2>
          <div className="ml-auto flex items-center gap-1">
            <IconButton label="New group" onClick={() => setComposing(true)}>
              <MessageSquarePlus className="h-4 w-4" />
            </IconButton>
            <IconButton label="Message a colleague" onClick={() => setShowPeople(true)}>
              <Users className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <div className="border-b border-black/8 px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats…"
              className="py-1 pl-7 text-xs"
              aria-label="Search chats"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!threads.length && (
            <p className="px-4 py-10 text-center text-xs text-black/35">No conversations match that.</p>
          )}
          {threads.map((thread) => {
            const partner = thread.kind === "direct" ? directPartner(thread, me) : undefined;
            const person = partner ? state.people.find((item) => item.id === partner) : undefined;
            const last = lastMessage(state.chat, thread.id);
            const unread = unreadCount(state.chat, me, thread.id);
            const pinned = (state.chat.pins[me] ?? []).includes(thread.id);
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onOpenThread(thread.id)}
                className={cx(
                  "flex w-full items-center gap-2.5 border-b border-black/5 px-3 py-2.5 text-left transition",
                  active?.id === thread.id ? "bg-black/[0.055]" : "hover:bg-black/[0.03]",
                )}
              >
                {thread.kind === "group" ? (
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: thread.color ?? "#111111" }}
                  >
                    {initialsOfTitle(thread.title)}
                  </span>
                ) : (
                  <Avatar person={person} size="md" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-black">
                      {threadTitle(thread, state.people, me)}
                    </span>
                    {pinned && <Pin className="h-2.5 w-2.5 shrink-0 text-black/30" />}
                    <span className="shrink-0 text-[10px] text-black/35">
                      {last ? formatStamp(last.createdAt) : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-black/45">
                      {last ? previewOf(last) : "No messages yet"}
                    </span>
                    {unread > 0 && (
                      <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-[#d90429] px-1 text-[10px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <footer className="border-t border-black/8 px-3 py-2 text-[10px] leading-relaxed text-black/35">
          <Lock className="mr-1 inline h-2.5 w-2.5" />
          Groups are visible to their members only.
        </footer>
      </aside>

      {active ? (
        <ThreadPane
          thread={active}
          onBack={() => onOpenThread("")}
          onForward={(message) => setForwarding(message)}
        />
      ) : (
        <div className="hidden min-w-0 flex-1 flex-col md:flex">
          <div className="grid flex-1 place-items-center px-6">
            <div className="max-w-sm text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-black/5">
                <MessageSquarePlus className="h-5 w-5 text-black/40" />
              </span>
              <p className="text-sm font-semibold text-black">Pick a conversation</p>
              <p className="mt-1 text-xs leading-relaxed text-black/45">
                The staff group, project groups and direct messages all live here. Choose one on the left, or start
                a new group.
              </p>
            </div>
          </div>
        </div>
      )}

      {composing && <NewGroupModal onClose={() => setComposing(false)} onCreated={onOpenThread} />}
      {showPeople && (
        <PeopleModal people={state.people} me={me} onPick={(personId) => {
          const id = actions.openDirect(personId);
          setShowPeople(false);
          onOpenThread(id);
        }} onClose={() => setShowPeople(false)} />
      )}
      {forwarding && (
        <ForwardModal message={forwarding} onClose={() => setForwarding(null)} onDone={(id) => { setForwarding(null); onOpenThread(id); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One conversation                                                    */
/* ------------------------------------------------------------------ */

function ThreadPane({
  thread,
  onBack,
  onForward,
}: {
  thread: ChatThread;
  onBack: () => void;
  onForward: (message: ChatMessageEntry) => void;
}) {
  const { state, actions } = useWorkspace();
  const me = state.currentUserId;
  const myPerson = state.people.find((person) => person.id === me);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageEntry | null>(null);
  const [editing, setEditing] = useState<ChatMessageEntry | null>(null);
  const [deleting, setDeleting] = useState<ChatMessageEntry | null>(null);
  const [info, setInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = messagesFor(state.chat, thread.id);
  const partner = thread.kind === "direct" ? directPartner(thread, me) : undefined;
  const partnerPerson = partner ? state.people.find((person) => person.id === partner) : undefined;

  // Opening a conversation clears its unread badge.
  useEffect(() => {
    if (thread.memberIds.includes(me)) actions.markRead(thread.id);
    // Only when the thread changes or a new message lands while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.id, messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body && !pending.length) return;
    actions.sendMessage({
      threadId: thread.id,
      body,
      attachments: pending,
      replyTo: replyTo
        ? { messageId: replyTo.id, authorId: replyTo.authorId, snippet: previewOf(replyTo).slice(0, 140) }
        : undefined,
    });
    setDraft("");
    setPending([]);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const saveEdit = () => {
    if (!editing) return;
    const body = draft.trim();
    if (!body) return;
    actions.editMessage(editing.id, body);
    setEditing(null);
    setDraft("");
  };

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    const added: ChatAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setUploadError(`${file.name} is ${formatBytes(file.size)} — over the ${formatBytes(MAX_FILE_BYTES)} limit.`);
        continue;
      }
      const id = `att-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const inline = file.size <= INLINE_LIMIT;
      try {
        const dataUrl = inline ? await fileToDataUrl(file) : undefined;
        if (!dataUrl) await putAttachmentBlob(id, file);
        added.push({
          id,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          storeKey: inline ? undefined : id,
        });
      } catch {
        setUploadError(`Could not store ${file.name}. This browser may be out of space.`);
      }
    }
    setPending((current) => [...current, ...added]);
    setUploading(false);
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-black/8 px-3 py-2.5">
        <span className="md:hidden">
          <IconButton label="Back to conversations" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </IconButton>
        </span>
        {thread.kind === "group" ? (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: thread.color ?? "#111111" }}
          >
            {initialsOfTitle(thread.title)}
          </span>
        ) : (
          <Avatar person={partnerPerson} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-black">{threadTitle(thread, state.people, me)}</h3>
          <p className="truncate text-[11px] text-black/40">
            {thread.kind === "group"
              ? `${thread.memberIds.length} members`
              : partnerPerson?.title || "Direct message"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={thread.kind === "group" ? "Group info" : "Conversation info"} onClick={() => setInfo(true)}>
            <Info className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-[#f7f7f6] px-3 py-3">
        {!messages.length && (
          <div className="grid h-full place-items-center">
            <p className="max-w-xs text-center text-xs leading-relaxed text-black/40">
              No messages yet. Say hello — anyone in this conversation can read it.
            </p>
          </div>
        )}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay = !previous || previous.createdAt.slice(0, 10) !== message.createdAt.slice(0, 10);
          return (
            <div key={message.id}>
              {showDay && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40 shadow-sm">
                    {dayLabel(message.createdAt)}
                  </span>
                </div>
              )}
              <MessageRow
                message={message}
                me={me}
                person={state.people.find((person) => person.id === message.authorId)}
                people={state.people}
                showAuthor={thread.kind === "group" && previous?.authorId !== message.authorId}
                canEdit={canEditMessage(message, me)}
                canDelete={canDeleteMessage(message, myPerson, me)}
                onReply={() => {
                  setEditing(null);
                  setReplyTo(message);
                  inputRef.current?.focus();
                }}
                onEdit={() => {
                  setEditing(message);
                  setReplyTo(null);
                  setDraft(message.body);
                  inputRef.current?.focus();
                }}
                onDelete={() => setDeleting(message)}
                onForward={() => onForward(message)}
                onReact={(emoji) => actions.toggleReaction(message.id, emoji)}
              />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-black/8 bg-white px-3 py-2">
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded border-l-2 border-[#d90429] bg-black/[0.03] px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-[#d90429]">
                Replying to {state.people.find((person) => person.id === replyTo.authorId)?.name ?? "someone"}
              </p>
              <p className="truncate text-[11px] text-black/50">{previewOf(replyTo)}</p>
            </div>
            <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)} className="text-black/35 hover:text-black">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {editing && (
          <div className="mb-2 flex items-start gap-2 rounded border-l-2 border-black bg-black/[0.03] px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-black">Editing your message</p>
              <p className="truncate text-[11px] text-black/50">{previewOf(editing)}</p>
            </div>
            <button
              type="button"
              aria-label="Cancel edit"
              onClick={() => {
                setEditing(null);
                setDraft("");
              }}
              className="text-black/35 hover:text-black"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pending.map((file) => (
              <span key={file.id} className="flex max-w-full items-center gap-1 rounded bg-black/5 px-2 py-1 text-[11px] text-black/60">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="max-w-40 truncate">{file.name}</span>
                <span className="shrink-0 text-black/35">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setPending((current) => current.filter((item) => item.id !== file.id))}
                  className="text-black/35 hover:text-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {uploadError && <p className="mb-1.5 text-[11px] font-semibold text-[#d90429]">{uploadError}</p>}

        <div className="flex items-end gap-1.5">
          <IconButton label="Attach a file" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </IconButton>
          <IconButton label="Send a photo" onClick={() => imageRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
          </IconButton>
          <input ref={fileRef} type="file" multiple hidden onChange={(event) => void attach(event.target.files)} />
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => void attach(event.target.files)}
          />
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            placeholder={editing ? "Edit your message…" : `Message ${threadTitle(thread, state.people, me)}…`}
            aria-label="Message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (editing) saveEdit();
                else send();
              }
            }}
            className="max-h-32 min-h-9 min-w-0 flex-1 resize-none rounded-md border border-black/12 bg-white px-2.5 py-2 text-xs text-black outline-none transition focus:border-black/30"
          />
          {editing ? (
            <Button tone="primary" onClick={saveEdit}>
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          ) : (
            <Button
              tone="primary"
              onClick={send}
              disabled={uploading || (!draft.trim() && !pending.length)}
            >
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          )}
        </div>
      </div>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete message">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-black/70">
              Delete this message for everyone in the conversation? The message is replaced with “This message was
              deleted”, so replies to it still make sense.
            </p>
            <blockquote className="rounded border-l-2 border-black/20 bg-black/[0.03] px-3 py-2 text-xs text-black/60">
              {previewOf(deleting)}
            </blockquote>
            {deleting.authorId !== me && (
              <p className="text-[11px] font-semibold text-[#d90429]">
                This is not your message. You are deleting it as the super admin.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                tone="danger"
                onClick={() => {
                  actions.deleteMessage(deleting.id);
                  setDeleting(null);
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete message
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {info && <ThreadInfoModal thread={thread} onClose={() => setInfo(false)} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* A single message                                                    */
/* ------------------------------------------------------------------ */

function MessageRow({
  message,
  me,
  person,
  people,
  showAuthor,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
}: {
  message: ChatMessageEntry;
  me: ID;
  person?: Person;
  people: Person[];
  showAuthor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
}) {
  const mine = message.authorId === me;
  const [picker, setPicker] = useState(false);

  if (message.kind === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="max-w-[85%] rounded-full bg-white px-3 py-1 text-center text-[10px] text-black/45 shadow-sm">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div className={cx("group flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <span className="mt-auto shrink-0">
          <Avatar person={person} size="xs" />
        </span>
      )}

      <div className={cx("min-w-0 max-w-[min(78%,34rem)]", mine && "items-end")}>
        {showAuthor && !mine && (
          <p className="mb-0.5 pl-1 text-[10px] font-bold text-black/50">{person?.name ?? "Unknown"}</p>
        )}

        <div
          className={cx(
            "relative rounded-lg px-2.5 py-1.5 shadow-sm",
            mine ? "bg-[#d90429] text-white" : "bg-white text-black",
            message.deletedAt && "italic opacity-60",
          )}
        >
          {message.forwardedFrom && (
            <p className={cx("mb-1 text-[10px] italic", mine ? "text-white/70" : "text-black/40")}>
              <Forward className="mr-0.5 inline h-2.5 w-2.5" />
              Forwarded from {message.forwardedFrom.chatTitle}
            </p>
          )}

          {message.replyTo && (
            <div
              className={cx(
                "mb-1 rounded border-l-2 px-1.5 py-0.5",
                mine ? "border-white/50 bg-black/15" : "border-[#d90429]/50 bg-black/[0.04]",
              )}
            >
              <p className={cx("text-[10px] font-bold", mine ? "text-white/80" : "text-[#d90429]")}>
                {people.find((item) => item.id === message.replyTo?.authorId)?.name ?? "Someone"}
              </p>
              <p className={cx("truncate text-[10px]", mine ? "text-white/70" : "text-black/50")}>
                {message.replyTo.snippet}
              </p>
            </div>
          )}

          {message.deletedAt ? (
            <p className="text-[11px]">This message was deleted</p>
          ) : (
            <>
              {message.attachments.map((file) => (
                <AttachmentView key={file.id} file={file} mine={mine} />
              ))}
              {message.body && (
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.body}</p>
              )}
            </>
          )}

          <p className={cx("mt-0.5 text-right text-[9px]", mine ? "text-white/60" : "text-black/35")}>
            {message.editedAt && !message.deletedAt ? "edited · " : ""}
            {formatStamp(message.createdAt)}
          </p>
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className={cx("mt-0.5 flex flex-wrap gap-1", mine && "justify-end")}>
            {message.reactions.map((reaction) => {
              const activeMine = reaction.personIds.includes(me);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => onReact(reaction.emoji)}
                  title={`${(isReactionKey(reaction.emoji) ? REACTION_LABEL[reaction.emoji] : reaction.emoji)}: ${reaction.personIds
                    .map((id) => people.find((person) => person.id === id)?.name ?? "someone")
                    .join(", ")}`}
                  className={cx(
                    "flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] transition",
                    activeMine ? "border-[#d90429] bg-[#d90429]/10 text-black" : "border-black/10 bg-white text-black/60 hover:border-black/25",
                  )}
                >
                  {isReactionKey(reaction.emoji) ? (
                    <ReactionIcon name={reaction.emoji} size={12} />
                  ) : (
                    <span>{reaction.emoji}</span>
                  )}
                  <span className="font-semibold">{reaction.personIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hover actions */}
        <div
          className={cx(
            "mt-0.5 flex flex-wrap items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100",
            mine && "justify-end",
          )}
        >
          <span className="relative">
            <MessageAction label="React" onClick={() => setPicker((value) => !value)}>
              <SmilePlus className="h-3 w-3" />
            </MessageAction>
            {picker && (
              <span
                className={cx(
                  "absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full border border-black/10 bg-white p-1 shadow-lg",
                  mine ? "right-0" : "left-0",
                )}
              >
                {REACTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={REACTION_LABEL[key]}
                    title={REACTION_LABEL[key]}
                    onClick={() => {
                      onReact(key);
                      setPicker(false);
                    }}
                    className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-black/8"
                  >
                    <ReactionIcon name={key} size={15} />
                  </button>
                ))}
              </span>
            )}
          </span>
          <MessageAction label="Reply" onClick={onReply}>
            <Reply className="h-3 w-3" />
          </MessageAction>
          {!message.deletedAt && (
            <MessageAction label="Forward" onClick={onForward}>
              <Forward className="h-3 w-3" />
            </MessageAction>
          )}
          {canEdit && !message.deletedAt && (
            <MessageAction label="Edit" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </MessageAction>
          )}
          {canDelete && (
            <MessageAction label="Delete" onClick={onDelete} danger>
              <Trash2 className="h-3 w-3" />
            </MessageAction>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "grid h-5 w-5 place-items-center rounded text-black/35 transition hover:bg-black/8",
        danger ? "hover:text-[#d90429]" : "hover:text-black",
      )}
    >
      {children}
    </button>
  );
}

/** An attachment: images preview inline, everything else is a download row. */
function AttachmentView({ file, mine }: { file: ChatAttachment; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(file.dataUrl ?? null);
  const isImage = file.mime.startsWith("image/");

  useEffect(() => {
    if (url || !file.storeKey) return;
    let objectUrl: string | null = null;
    void getAttachmentBlob(file.storeKey).then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.storeKey, url]);

  const download = async () => {
    const href = url ?? (file.storeKey ? URL.createObjectURL((await getAttachmentBlob(file.storeKey)) ?? new Blob()) : null);
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    link.click();
  };

  if (isImage) {
    return (
      <button type="button" onClick={() => void download()} className="mb-1 block max-w-full" title={`Download ${file.name}`}>
        {url ? (
          <img src={url} alt={file.name} className="max-h-64 w-auto max-w-full rounded" />
        ) : (
          <span className={cx("block rounded px-2 py-6 text-[11px]", mine ? "bg-black/15 text-white/80" : "bg-black/5 text-black/50")}>
            Loading image…
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      className={cx(
        "mb-1 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition",
        mine ? "bg-black/15 hover:bg-black/25" : "bg-black/5 hover:bg-black/10",
      )}
      title={`Download ${file.name}`}
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold">{file.name}</span>
        <span className={cx("text-[9px]", mine ? "text-white/70" : "text-black/40")}>{formatBytes(file.size)}</span>
      </span>
      <Download className="h-3 w-3 shrink-0 opacity-70" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function PeopleModal({
  people,
  me,
  onPick,
  onClose,
}: {
  people: Person[];
  me: ID;
  onPick: (personId: ID) => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Message a colleague">
      <div className="space-y-1">
        {people
          .filter((person) => person.id !== me)
          .map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onPick(person.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-black/5"
            >
              <Avatar person={person} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-black">{person.name}</span>
                <span className="block truncate text-[10px] text-black/45">{person.title}</span>
              </span>
            </button>
          ))}
      </div>
    </Modal>
  );
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: ID) => void }) {
  const { state, actions } = useWorkspace();
  const me = state.currentUserId;
  const [title, setTitle] = useState("");
  const [memberIds, setMemberIds] = useState<ID[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: ID) =>
    setMemberIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const create = () => {
    if (!title.trim()) {
      setError("Give the group a name.");
      return;
    }
    if (!memberIds.length) {
      setError("Add at least one other person.");
      return;
    }
    const id = actions.createGroup({ title: title.trim(), memberIds });
    onCreated(id);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="New group">
      <div className="space-y-3">
        <Field label="Group name">
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Delivery team" autoFocus />
        </Field>
        <div>
          <p className="mb-1 text-xs font-semibold text-black">Members</p>
          <p className="mb-2 text-[11px] text-black/45">
            Only the people you pick can see this group or read its messages. You are added automatically.
          </p>
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded border border-black/10 p-1">
            {state.people
              .filter((person) => person.id !== me)
              .map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition hover:bg-black/5"
                >
                  <input type="checkbox" checked={memberIds.includes(person.id)} onChange={() => toggle(person.id)} className="accent-black" />
                  <Avatar person={person} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-black">{person.name}</span>
                    <span className="block truncate text-[10px] text-black/45">{person.title}</span>
                  </span>
                </label>
              ))}
          </div>
        </div>
        {error && <p className="text-[11px] font-semibold text-[#d90429]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={create}>
            <Users className="h-3.5 w-3.5" /> Create group
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ForwardModal({
  message,
  onClose,
  onDone,
}: {
  message: ChatMessageEntry;
  onClose: () => void;
  onDone: (threadId: ID) => void;
}) {
  const { state, actions } = useWorkspace();
  const me = state.currentUserId;
  const threads = visibleThreads(state.chat, me);

  return (
    <Modal open onClose={onClose} title="Forward message">
      <div className="space-y-3">
        <blockquote className="rounded border-l-2 border-black/20 bg-black/[0.03] px-3 py-2 text-xs text-black/60">
          {previewOf(message)}
        </blockquote>
        <p className="text-[11px] text-black/45">Choose a conversation. The person who receives it will see where it came from.</p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-black/10 p-1">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                actions.sendMessage({
                  threadId: thread.id,
                  body: message.body,
                  attachments: message.attachments,
                  forwardedFrom: {
                    chatTitle: threadTitle(thread, state.people, me),
                    authorName: state.people.find((person) => person.id === message.authorId)?.name ?? "Someone",
                  },
                });
                onDone(thread.id);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-black/5"
            >
              <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white", thread.kind === "direct" && "bg-black/40")} style={thread.kind === "group" ? { backgroundColor: thread.color ?? "#111111" } : undefined}>
                {thread.kind === "group" ? initialsOfTitle(thread.title) : "DM"}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-black">
                {threadTitle(thread, state.people, me)}
              </span>
              <Forward className="h-3 w-3 shrink-0 text-black/30" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ThreadInfoModal({ thread, onClose }: { thread: ChatThread; onClose: () => void }) {
  const { state, actions } = useWorkspace();
  const me = state.currentUserId;
  const myPerson = state.people.find((person) => person.id === me);
  const [title, setTitle] = useState(thread.title);
  const [editingMembers, setEditingMembers] = useState(false);
  const [memberIds, setMemberIds] = useState<ID[]>(thread.memberIds);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const canManage = canManageThread(thread, myPerson, me);
  const pinned = (state.chat.pins[me] ?? []).includes(thread.id);

  return (
    <Modal open onClose={onClose} title={thread.kind === "group" ? "Group info" : "Conversation info"}>
      <div className="space-y-4">
        {thread.kind === "group" && canManage ? (
          <Field label="Group name">
            <div className="flex gap-2">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
              <Button
                onClick={() => actions.updateGroup(thread.id, { title: title.trim() || thread.title })}
                disabled={!title.trim() || title.trim() === thread.title}
              >
                Save
              </Button>
            </div>
          </Field>
        ) : (
          <p className="text-sm font-bold text-black">{threadTitle(thread, state.people, me)}</p>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-black">
              Members <span className="text-black/40">({thread.memberIds.length})</span>
            </p>
            {canManage && thread.kind === "group" && (
              <button
                type="button"
                onClick={() => {
                  if (editingMembers) {
                    actions.updateGroup(thread.id, { memberIds });
                  }
                  setEditingMembers((value) => !value);
                }}
                className="text-[11px] font-semibold text-[#d90429] hover:underline"
              >
                {editingMembers ? "Save members" : "Edit"}
              </button>
            )}
          </div>
          <div className="max-h-52 space-y-0.5 overflow-y-auto rounded border border-black/10 p-1">
            {state.people.map((person) => {
              const member = editingMembers ? memberIds.includes(person.id) : thread.memberIds.includes(person.id);
              if (!member && !editingMembers) return null;
              const locked = person.id === thread.createdBy;
              return (
                <label
                  key={person.id}
                  className={cx("flex items-center gap-2 rounded px-1.5 py-1", editingMembers && !locked && "cursor-pointer hover:bg-black/5")}
                >
                  {editingMembers && (
                    <input
                      type="checkbox"
                      checked={member}
                      disabled={locked}
                      onChange={() =>
                        setMemberIds((current) =>
                          current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id],
                        )
                      }
                      className="accent-black"
                    />
                  )}
                  <Avatar person={person} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-black">
                      {person.name}
                      {person.id === me && <span className="ml-1 text-black/40">(you)</span>}
                    </span>
                    <span className="block truncate text-[10px] text-black/45">{person.title}</span>
                  </span>
                  {person.owner && <Chip tone="dark">Admin</Chip>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={() => actions.togglePin(thread.id)}>
            <Pin className="h-3.5 w-3.5" /> {pinned ? "Unpin" : "Pin to top"}
          </Button>
          {thread.kind === "group" && (
            <Button tone="ghost" onClick={() => actions.updateGroup(thread.id, { muted: !thread.muted })}>
              {thread.muted ? "Unmute" : "Mute"}
            </Button>
          )}
          {thread.kind === "group" && thread.createdBy !== me && (
            <Button tone="danger" onClick={() => setConfirmLeave(true)}>
              Leave group
            </Button>
          )}
        </div>

        {confirmLeave && (
          <div className="rounded border border-[#d90429]/30 bg-[#d90429]/5 p-3">
            <p className="text-xs text-black/70">
              Leave “{thread.title}”? You will stop seeing it and its messages.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setConfirmLeave(false)}>
                Cancel
              </Button>
              <Button
                tone="danger"
                onClick={() => {
                  actions.leaveGroup(thread.id);
                  onClose();
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function initialsOfTitle(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** "Today", "Yesterday" or a date, for the day divider. */
function dayLabel(iso: string): string {
  const date = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
