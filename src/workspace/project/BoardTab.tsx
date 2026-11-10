/**
 * Message board: announcements and discussions, each with threaded replies.
 */
import { useMemo, useState } from "react";
import { EyeOff, MessageSquare, Pin, PinOff, Plus, Send, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { formatStamp, relativeTime, type ID, type Post } from "../model";
import { Avatar, Button, Chip, Field, Modal, Select, TextArea, TextInput, cx } from "../ui";

export function BoardTab({ projectId, clientView }: { projectId: ID; clientView: boolean }) {
  const { state } = useWorkspace();
  const [openId, setOpenId] = useState<ID | null>(null);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<"all" | "announcements" | "discussions">("all");

  const posts = useMemo(() => {
    const base = state.posts.filter(
      (post) => post.projectId === projectId && (!clientView || post.clientVisible),
    );
    const filtered =
      filter === "announcements"
        ? base.filter((post) => post.category === "Announcement")
        : filter === "discussions"
          ? base.filter((post) => post.category === "Discussion")
          : base;
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [clientView, filter, projectId, state.posts]);

  const open = posts.find((post) => post.id === openId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(["all", "announcements", "discussions"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cx(
                  "rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                  filter === option ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <Button className="ml-auto" tone="primary" onClick={() => setComposing(true)}>
            <Plus className="h-3.5 w-3.5" /> New post
          </Button>
        </div>

        {!posts.length && (
          <p className="rounded-lg border border-dashed border-black/15 bg-white/50 px-5 py-12 text-center text-sm text-black/45">
            Nothing on the board yet. Post an announcement to start.
          </p>
        )}

        {posts.map((post) => {
          const author = state.people.find((person) => person.id === post.authorId);
          return (
            <article
              key={post.id}
              className="rounded-lg border border-black/10 bg-white p-4 transition hover:border-black/25"
            >
              <button type="button" onClick={() => setOpenId(post.id)} className="block w-full text-left">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {post.pinned && (
                        <Chip tone="dark">
                          <Pin className="h-2.5 w-2.5" /> Pinned
                        </Chip>
                      )}
                      <Chip tone={post.category === "Announcement" ? "danger" : "neutral"}>{post.category}</Chip>
                      {!post.clientVisible && (
                        <Chip>
                          <EyeOff className="h-2.5 w-2.5" /> Internal
                        </Chip>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-base font-bold leading-snug tracking-[-0.01em] text-black">{post.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-black/55">{post.body}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-black/40">
                  <Avatar person={author} size="xs" />
                  <span className="font-semibold text-black/60">{author?.name ?? "Someone"}</span>
                  <span>·</span>
                  <span>{relativeTime(post.createdAt)}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {post.replies.length}
                  </span>
                </div>
              </button>
            </article>
          );
        })}
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">Recent activity</p>
          <ul className="mt-2 space-y-2">
            {state.posts
              .filter((post) => post.projectId === projectId)
              .flatMap((post) => post.replies.map((reply) => ({ reply, post })))
              .sort((a, b) => new Date(b.reply.createdAt).getTime() - new Date(a.reply.createdAt).getTime())
              .slice(0, 5)
              .map(({ reply, post }) => {
                const author = state.people.find((person) => person.id === reply.authorId);
                return (
                  <li key={reply.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(post.id)}
                      className="block w-full text-left text-[11px] leading-relaxed text-black/55 hover:text-black"
                    >
                      <span className="font-semibold text-black/75">{author?.name?.split(" ")[0] ?? "Someone"}</span> replied
                      to <span className="italic">{post.title}</span>
                      <span className="block text-[10px] text-black/30">{relativeTime(reply.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </aside>

      <ComposeModal open={composing} onClose={() => setComposing(false)} projectId={projectId} />

      {open && (
        <PostModal post={open} onClose={() => setOpenId(null)} projectId={projectId} clientView={clientView} />
      )}
    </div>
  );
}

function ComposeModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: ID }) {
  const { actions } = useWorkspace();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Post["category"]>("Announcement");
  const [clientVisible, setClientVisible] = useState(true);

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    actions.addPost({ projectId, title: title.trim(), body: body.trim(), category, clientVisible });
    setTitle("");
    setBody("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <div className="space-y-3">
        <Field label="Title">
          <TextInput autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What is this about?" />
        </Field>
        <Field label="Message">
          <TextArea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write it out…" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select value={category} onChange={(event) => setCategory(event.target.value as Post["category"])}>
              <option value="Announcement">Announcement</option>
              <option value="Discussion">Discussion</option>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select value={clientVisible ? "client" : "internal"} onChange={(event) => setClientVisible(event.target.value === "client")}>
              <option value="client">Visible to client view</option>
              <option value="internal">Internal only</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            Post message
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PostModal({
  post,
  onClose,
  projectId,
  clientView,
}: {
  post: Post;
  onClose: () => void;
  projectId: ID;
  clientView: boolean;
}) {
  const { state, actions } = useWorkspace();
  const [reply, setReply] = useState("");
  const author = state.people.find((person) => person.id === post.authorId);
  const live = state.posts.find((item) => item.id === post.id) ?? post;

  return (
    <Modal open onClose={onClose} title="Message" wide>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={live.category === "Announcement" ? "danger" : "neutral"}>{live.category}</Chip>
            {live.pinned && (
              <Chip tone="dark">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </Chip>
            )}
            {!live.clientVisible && (
              <Chip>
                <EyeOff className="h-2.5 w-2.5" /> Internal
              </Chip>
            )}
          </div>
          <h2 className="mt-2 text-xl font-bold leading-tight tracking-[-0.02em] text-black">{live.title}</h2>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-black/40">
            <Avatar person={author} size="xs" />
            <span className="font-semibold text-black/60">{author?.name}</span>
            <span>·</span>
            <span>{formatStamp(live.createdAt)}</span>
          </div>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-relaxed text-black/75">{live.body}</div>

        <div className="flex flex-wrap gap-1.5 border-y border-black/8 py-2">
          <Button onClick={() => actions.updatePost(live.id, { pinned: !live.pinned })}>
            {live.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {live.pinned ? "Unpin" : "Pin"}
          </Button>
          <Button onClick={() => actions.updatePost(live.id, { category: live.category === "Announcement" ? "Discussion" : "Announcement" })}>
            Switch to {live.category === "Announcement" ? "discussion" : "announcement"}
          </Button>
          <Button onClick={() => actions.updatePost(live.id, { clientVisible: !live.clientVisible })}>
            {live.clientVisible ? "Make internal" : "Make client-visible"}
          </Button>
          <Button
            tone="danger"
            className="ml-auto"
            onClick={() => {
              actions.deletePost(live.id);
              onClose();
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-black/70">
            {live.replies.length} {live.replies.length === 1 ? "reply" : "replies"}
          </p>
          <div className="space-y-2.5">
            {live.replies.map((item) => {
              const person = state.people.find((entry) => entry.id === item.authorId);
              return (
                <div key={item.id} className="flex gap-2.5">
                  <Avatar person={person} size="sm" />
                  <div className="min-w-0 flex-1 rounded border border-black/8 bg-black/[0.02] px-3 py-2">
                    <p className="text-[11px] font-semibold text-black/70">
                      {person?.name ?? "Someone"}{" "}
                      <span className="font-normal text-black/35">· {relativeTime(item.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-black/75">{item.body}</p>
                  </div>
                </div>
              );
            })}
            {!live.replies.length && <p className="text-xs text-black/35">No replies yet.</p>}
          </div>

          {!clientView && (
            <div className="mt-3 flex gap-2">
              <TextArea
                value={reply}
                placeholder="Write a reply…"
                className="min-h-16"
                onChange={(event) => setReply(event.target.value)}
              />
              <Button
                tone="primary"
                onClick={() => {
                  if (!reply.trim()) return;
                  actions.addReply(live.id, reply.trim());
                  setReply("");
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <input type="hidden" value={projectId} />
    </Modal>
  );
}
