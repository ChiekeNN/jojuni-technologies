/**
 * Internal chat.
 *
 * A WhatsApp-shaped messenger inside the workspace: direct messages between two
 * people, and groups that only their members can see.
 *
 * There is no server. Everything here lives in the browser that is using it, so
 * "seen only by group members" means the app will not show a conversation to a
 * non-member — it does not mean the messages travel between people's devices.
 * That is a real limitation and should not be dressed up: two staff on different
 * laptops have two separate chat histories until this is backed by a database.
 * The shapes here are deliberately the ones a server expects (ids, timestamps,
 * author ids, membership lists), so swapping storage for an API later does not
 * require rebuilding the model.
 */

/**
 * Kept here rather than imported from `model.ts`: the workspace state holds a
 * ChatState, and a two-way type import between the two files would be a cycle.
 */
export type ID = string;

export interface Person {
  id: ID;
  name: string;
  initials: string;
  title: string;
  email?: string;
  color?: string;
  owner?: boolean;
}

export type MessageKind = "text" | "image" | "file" | "voice" | "system";

/** A file carried by a message. Small ones are inline; larger ones by key. */
export interface ChatAttachment {
  id: ID;
  name: string;
  mime: string;
  /** Bytes, for showing "2.4 MB" and for the size guard. */
  size: number;
  /** Data URL for small files (images especially, so they preview inline). */
  dataUrl?: string;
  /**
   * Reference into IndexedDB for anything too big to keep in the workspace
   * blob. Set when `dataUrl` would blow the localStorage budget.
   */
  storeKey?: string;
  width?: number;
  height?: number;
  /** Seconds, for voice notes and video. */
  duration?: number;
}

/** Who reacted, with what. Counts are derived, never stored. */
export interface ChatReaction {
  /** A `ReactionKey`, not an emoji. */
  emoji: string;
  personIds: ID[];
}

export interface ChatReplyRef {
  messageId: ID;
  /** Copied at send time so a later edit or delete cannot rewrite history. */
  authorId: ID;
  snippet: string;
}

export interface ChatMessageEntry {
  id: ID;
  chatId: ID;
  authorId: ID;
  kind: MessageKind;
  body: string;
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
  replyTo?: ChatReplyRef;
  /** Set when this message was forwarded from another chat. */
  forwardedFrom?: { chatTitle: string; authorName: string };
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  /** Who deleted it — the author or the super admin. Shown to admins only. */
  deletedBy?: ID;
}

export interface ChatThread {
  id: ID;
  kind: "direct" | "group";
  title: string;
  /** Empty for direct messages; the two people are in `memberIds`. */
  memberIds: ID[];
  createdBy: ID;
  createdAt: string;
  /** Optional colour for the group avatar. */
  color?: string;
  /** Groups can be muted so they stop shouting for attention. */
  muted?: boolean;
}

export interface ChatState {
  threads: ChatThread[];
  messages: ChatMessageEntry[];
  /** Per-person read marker, keyed `${personId}:${threadId}`. */
  reads: Record<string, string>;
  /** Threads this person has pinned to the top of the list. */
  pins: Record<string, ID[]>;
}

export const EMPTY_CHAT_STATE: ChatState = { threads: [], messages: [], reads: {}, pins: {} };

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

/**
 * The reaction palette.
 *
 * Keys, not emoji. Emoji are drawn by whichever font the machine happens to
 * have, and plenty of systems have none — a workspace on a locked-down laptop
 * renders 👍 as an empty box, which makes reactions look broken. These map to
 * inline SVG icons instead, so they look the same everywhere.
 */
export type ReactionKey = "like" | "love" | "laugh" | "happy" | "sad" | "fire" | "celebrate";

export const REACTION_KEYS: ReactionKey[] = ["like", "love", "laugh", "happy", "sad", "fire", "celebrate"];

export const REACTION_LABEL: Record<ReactionKey, string> = {
  like: "Like",
  love: "Love",
  laugh: "Laugh",
  happy: "Happy",
  sad: "Sad",
  fire: "Fire",
  celebrate: "Celebrate",
};

/** Guard for reaction keys coming out of stored data. */
export function isReactionKey(value: string): value is ReactionKey {
  return (REACTION_KEYS as string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Whether a person may see a conversation at all.
 *
 * Direct messages are visible to their two participants. Groups are visible
 * only to members. The super admin is a member of the staff group by default
 * but this function does not grant an override — "sees only group members"
 * has to mean what it says, or it is not a private group.
 */
export function canSeeThread(thread: ChatThread, personId: ID): boolean {
  return thread.memberIds.includes(personId);
}

/**
 * Who may delete a message: the person who wrote it, or the super admin.
 *
 * This is the one place the admin override applies, and it is deliberate —
 * moderating a workspace is the owner's job. It never extends to *reading*
 * someone else's private group.
 */
export function canDeleteMessage(
  message: ChatMessageEntry,
  person: Person | undefined,
  personId: ID,
): boolean {
  if (message.deletedAt) return false;
  if (message.authorId === personId) return true;
  return !!person?.owner;
}

/** Editing is narrower than deleting: only the author, and only their own words. */
export function canEditMessage(message: ChatMessageEntry, personId: ID): boolean {
  return !message.deletedAt && message.authorId === personId;
}

/** Only the owner and a group's creator can rename or add members. */
export function canManageThread(
  thread: ChatThread,
  person: Person | undefined,
  personId: ID,
): boolean {
  if (thread.kind === "group" && thread.createdBy === personId) return true;
  return !!person?.owner;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function messagesFor(chat: ChatState, threadId: ID): ChatMessageEntry[] {
  return chat.messages
    .filter((message) => message.chatId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function visibleThreads(chat: ChatState, personId: ID): ChatThread[] {
  return chat.threads.filter((thread) => canSeeThread(thread, personId));
}

export function readKey(personId: ID, threadId: ID): string {
  return `${personId}:${threadId}`;
}

export function lastReadAt(chat: ChatState, personId: ID, threadId: ID): string | undefined {
  return chat.reads[readKey(personId, threadId)];
}

/** Messages in a thread newer than the person's read marker. */
export function unreadCount(chat: ChatState, personId: ID, threadId: ID): number {
  const marker = lastReadAt(chat, personId, threadId) ?? "";
  return chat.messages.filter(
    (message) => message.chatId === threadId && message.authorId !== personId && message.createdAt > marker,
  ).length;
}

/** Total unread across every thread the person can see. Drives the nav badge. */
export function totalUnread(chat: ChatState, personId: ID): number {
  return visibleThreads(chat, personId).reduce(
    (sum, thread) => sum + (thread.muted ? 0 : unreadCount(chat, personId, thread.id)),
    0,
  );
}

/** The title of a direct thread depends on who is looking at it. */
export function threadTitle(thread: ChatThread, people: Person[], personId: ID): string {
  if (thread.kind === "group") return thread.title;
  const other = thread.memberIds.find((id) => id !== personId);
  return people.find((person) => person.id === other)?.name ?? "Direct message";
}

/** The other participant in a direct thread, for the avatar. */
export function directPartner(thread: ChatThread, personId: ID): ID | undefined {
  return thread.memberIds.find((id) => id !== personId);
}

/** A stable key for a one-to-one conversation, in either direction. */
export function directKey(a: ID, b: ID): string {
  return [a, b].sort().join("|");
}

/** Collapse a message to a one-line preview, for lists and reply quotes. */
export function previewOf(message: ChatMessageEntry | undefined): string {
  if (!message) return "";
  if (message.deletedAt) return "This message was deleted";
  const attachmentOnly = !message.body.trim() && message.attachments.length > 0;
  if (attachmentOnly) {
    const first = message.attachments[0];
    if (message.kind === "image") return "📷 Photo";
    if (message.kind === "voice") return "🎤 Voice note";
    return `📎 ${first?.name ?? "Attachment"}`;
  }
  return message.body.replace(/\s+/g, " ").trim();
}

/** The last message in a thread, ignoring nothing — a deletion is worth showing. */
export function lastMessage(chat: ChatState, threadId: ID): ChatMessageEntry | undefined {
  const list = messagesFor(chat, threadId);
  return list[list.length - 1];
}

/** Emoji counts for a message, most-used first, with the people behind each. */
export function reactionSummary(message: ChatMessageEntry): { emoji: string; count: number; mine: boolean }[] {
  return message.reactions
    .filter((reaction) => reaction.personIds.length > 0)
    .map((reaction) => ({ emoji: reaction.emoji, count: reaction.personIds.length, mine: false }))
    .sort((a, b) => b.count - a.count);
}
