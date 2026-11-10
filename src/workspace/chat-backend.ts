/**
 * The chat's connection to the database.
 *
 * Plain `fetch` against Supabase's REST and Auth endpoints rather than
 * `@supabase/supabase-js`. The SDK is ~230 kB before gzip and this workspace is
 * one generated file, so every kilobyte is paid by every visitor — including
 * deployments that never turn the database on. The three endpoints needed here
 * are small enough to call directly.
 *
 * Everything is optional by design. If the environment variables are missing,
 * the database is unreachable, or the schema has not been applied, `session()`
 * returns null and the chat runs exactly as it did before: local-only, from
 * `localStorage`. A missing key must never break a working feature.
 *
 * See `docs/chat-database-scope.md` for the schema, the RLS rules and what is
 * still missing (realtime, file storage, real accounts).
 */

import type { ChatAttachment, ChatMessageEntry, ChatReaction, ChatState, ChatThread } from "./chat";
import type { Person } from "./model";

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both variables are present. */
export function isConfigured(): boolean {
  return Boolean(URL_BASE && ANON_KEY);
}

const SESSION_KEY = "jojuni.chat.session";

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* a full quota must not break sign-in */
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string };
  error?: string;
  error_description?: string;
  msg?: string;
}

/**
 * A session, signing in anonymously when there is none.
 *
 * Anonymous sign-in gives a real `auth.uid()`, which is what makes the RLS
 * policies enforceable, without asking anyone for a password. It is a stepping
 * stone — the target is a real account per person (see the scope doc).
 */
export async function session(): Promise<string | null> {
  if (!isConfigured()) return null;
  const existing = readSession();
  if (existing && existing.expires_at > Date.now() / 1000 + 60) return existing.user_id;

  // Expired: refresh rather than start a new identity, or a person would lose
  // ownership of everything they had written.
  if (existing?.refresh_token) {
    const refreshed = await authCall("token?grant_type=refresh_token", {
      refresh_token: existing.refresh_token,
    });
    if (refreshed?.access_token && refreshed.user?.id) {
      writeSession({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? existing.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
        user_id: refreshed.user.id,
      });
      return refreshed.user.id;
    }
    writeSession(null);
  }

  const created = await authCall("signup", {});
  if (created?.access_token && created.user?.id) {
    writeSession({
      access_token: created.access_token,
      refresh_token: created.refresh_token ?? "",
      expires_at: Math.floor(Date.now() / 1000) + (created.expires_in ?? 3600),
      user_id: created.user.id,
    });
    return created.user.id;
  }
  return null;
}

/**
 * POST to the auth API.
 *
 * An empty body on `signup` is Supabase's anonymous sign-in: the server issues
 * a user with no email and no password. It requires anonymous sign-ins to be
 * enabled on the project, which is a one-switch setting, not code.
 */
async function authCall(path: string, body: Record<string, unknown>): Promise<AuthResponse | null> {
  try {
    const response = await fetch(`${URL_BASE}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY as string,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as AuthResponse;
    if (!response.ok) return null;
    return data;
  } catch {
    return null;
  }
}

/** Link an email and password to the current anonymous session. */
export async function upgradeSession(email: string, password: string): Promise<string | null> {
  if (!isConfigured()) return "This build has no database configured.";
  const stored = readSession();
  if (!stored) return "Not signed in.";
  try {
    const response = await fetch(`${URL_BASE}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY as string,
        Authorization: `Bearer ${stored.access_token}`,
      },
      body: JSON.stringify({ email, password }),
    });
    if (response.ok) return null;
    const data = (await response.json()) as AuthResponse;
    return data.msg ?? data.error_description ?? "Could not save those details.";
  } catch {
    return "Could not reach the server.";
  }
}

/* ------------------------------------------------------------------ */
/* REST                                                                */
/* ------------------------------------------------------------------ */

async function rest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<T | null> {
  if (!isConfigured()) return null;
  const stored = readSession();
  if (!stored) return null;
  try {
    const response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY as string,
        Authorization: `Bearer ${stored.access_token}`,
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!response.ok) {
      failures += 1;
      return null;
    }
    if (response.status === 204) return [] as unknown as T;
    return (await response.json()) as T;
  } catch {
    failures += 1;
    return null;
  }
}

let failures = 0;
/** Count of failed writes this session. Surfaced for diagnostics only. */
export function writeFailures(): number {
  return failures;
}

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

interface ThreadRow {
  id: string;
  kind: "direct" | "group";
  title: string;
  created_by: string;
  color: string;
  muted: boolean;
  created_at: string;
}

interface MemberRow {
  thread_id: string;
  person_id: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  author_id: string;
  kind: ChatMessageEntry["kind"];
  body: string;
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
  reply_to: ChatMessageEntry["replyTo"] | null;
  forwarded_from: ChatMessageEntry["forwardedFrom"] | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface PersonRow {
  id: string;
  name: string;
  initials: string;
  title: string;
  email: string;
  color: string;
  is_owner: boolean;
}

export interface HydratedChat {
  chat: ChatState;
  people: Person[];
}

/**
 * Read everything this user is allowed to see.
 *
 * RLS does the filtering: these queries ask for every thread and come back with
 * only the ones the caller belongs to, so this function does not have to be
 * trusted to hide anything.
 */
export async function hydrate(): Promise<HydratedChat | null> {
  const userId = await session();
  if (!userId) return null;

  const [personRows, threadRows, memberRows, messageRows] = await Promise.all([
    rest<PersonRow[]>("workspace_people?select=id,name,initials,title,email,color,is_owner&auth_uid=eq." + userId),
    rest<ThreadRow[]>("chat_threads?select=id,kind,title,created_by,color,muted,created_at"),
    rest<MemberRow[]>("chat_thread_members?select=thread_id,person_id"),
    rest<MessageRow[]>(
      "chat_messages?select=id,thread_id,author_id,kind,body,attachments,reactions,reply_to,forwarded_from,created_at,edited_at,deleted_at,deleted_by&order=created_at.asc&limit=1000",
    ),
  ]);

  if (!threadRows || !memberRows || !messageRows) return null;

  const threads: ChatThread[] = threadRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    memberIds: memberRows.filter((member) => member.thread_id === row.id).map((member) => member.person_id),
    createdBy: row.created_by,
    createdAt: row.created_at,
    color: row.color,
    muted: row.muted,
  }));

  const messages: ChatMessageEntry[] = messageRows.map((row) => ({
    id: row.id,
    chatId: row.thread_id,
    authorId: row.author_id,
    kind: row.kind,
    body: row.body,
    attachments: row.attachments ?? [],
    reactions: row.reactions ?? [],
    replyTo: row.reply_to ?? undefined,
    forwardedFrom: row.forwarded_from ?? undefined,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by ?? undefined,
  }));

  const people: Person[] = (personRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    title: row.title,
    email: row.email,
    color: row.color,
    owner: row.is_owner,
  }));

  return { chat: { threads, messages, reads: {}, pins: {} }, people };
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Writes are fire-and-forget. The local state is already updated and the UI
 * must not wait on a round trip; a failure leaves the message in the local copy
 * and is counted, not thrown.
 */
export async function pushThread(thread: ChatThread): Promise<void> {
  await rest("chat_threads", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: {
      id: thread.id,
      kind: thread.kind,
      title: thread.title,
      created_by: thread.createdBy,
      color: thread.color ?? "#111111",
    },
  });
  await pushMembers(thread.id, thread.memberIds);
}

export async function pushMembers(threadId: string, personIds: string[]): Promise<void> {
  if (!personIds.length) return;
  await rest("chat_thread_members?on_conflict=thread_id,person_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: personIds.map((personId) => ({ thread_id: threadId, person_id: personId })),
  });
}

export async function pushMessage(message: ChatMessageEntry): Promise<void> {
  await rest("chat_messages", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: {
      id: message.id,
      thread_id: message.chatId,
      author_id: message.authorId,
      kind: message.kind,
      body: message.body,
      attachments: message.attachments,
      reactions: message.reactions,
      reply_to: message.replyTo ?? null,
      forwarded_from: message.forwardedFrom ?? null,
      created_at: message.createdAt,
    },
  });
}

export async function pushEdit(messageId: string, body: string, editedAt: string): Promise<void> {
  await rest(`chat_messages?id=eq.${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: { body, edited_at: editedAt },
  });
}

export async function pushDelete(messageId: string, personId: string, deletedAt: string): Promise<void> {
  await rest(`chat_messages?id=eq.${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: { deleted_at: deletedAt, deleted_by: personId, body: "", attachments: [], reactions: [] },
  });
}

export async function pushReactions(messageId: string, reactions: ChatReaction[]): Promise<void> {
  await rest(`chat_messages?id=eq.${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: { reactions },
  });
}
