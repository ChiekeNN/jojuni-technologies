import type { ChatMessageEntry, ChatState, ChatThread } from "./chat";
import { EMPTY_CHAT_STATE } from "./chat";

/**
 * Workspace domain model.
 *
 * This is the local-first layer behind `/workspace`. Everything the app needs
 * lives in one plain object (`WorkspaceState`) that is persisted to
 * `localStorage` on every change, so the workspace works with no server, no
 * database and no sign-in. `exportState` / `importState` give you a JSON file
 * you can move between browsers.
 *
 * When the hosted database is wired up (see `api/workspace/*`) the same shapes
 * can be persisted server-side without touching the UI: the components only
 * ever read from `WorkspaceState`.
 */

export type ID = string;

export type ProjectStatus = "active" | "archived";
export type PostCategory = "Announcement" | "Discussion";
export type EventKind = "Milestone" | "Deadline" | "Meeting" | "Event";
export type DocKind = "doc" | "file" | "link";
export type TransactionType = "Income" | "Expense";

/**
 * What a person is to the company.
 *
 * Staff are on payroll and can be assigned work. Clients and vendors are
 * contacts: they are tracked so the business can reach and pay them, but they
 * are not project members and never get a to-do assigned. That distinction is
 * enforced where it matters rather than left to whoever is filling the form.
 */
export type PersonCategory = "staff" | "client" | "vendor";

export interface Person {
  id: ID;
  /**
   * The display name. Kept as one field because it is what every avatar, chip
   * and assignment menu already reads; `firstName` / `lastName` below are the
   * structured version, and `name` is derived from them when saving.
   */
  name: string;
  initials: string;
  /** Job title for staff, role for a client contact, service for a vendor. */
  title: string;
  email: string;
  /** Solid colour used for the avatar chip. */
  color: string;
  /** Owner is always a member of every project and cannot be removed. */
  owner?: boolean;

  /**
   * Staff by default: a person added before this field existed was a colleague.
   * Optional so workspaces saved earlier keep loading.
   */
  category?: PersonCategory;
  firstName?: string;
  lastName?: string;
  /** Primary phone, as entered. Formatting is left to the person typing. */
  phone?: string;
  /** Separate from `phone`: the number WhatsApp actually reaches them on. */
  whatsapp?: string;
  /** Postal or street address, free text and multi-line. */
  address?: string;
  /**
   * Clients: the company they represent. Vendors: their business, if they have
   * one. Freelance vendors legitimately have none, which is why this is not
   * required for them.
   */
  company?: string;
  /** True when a vendor works for themselves rather than through a company. */
  freelance?: boolean;
  /**
   * Web address, stored as typed. A client's site is the fastest way to check
   * what a company actually does before a call, and it belongs with the rest of
   * the contact details rather than in a project note somewhere.
   */
  website?: string;
  createdAt?: string;
}

export interface Project {
  id: ID;
  name: string;
  /** Short reference shown in dense lists, e.g. `MC`. */
  code: string;
  /** The client's name as text. Kept so a project always displays something. */
  client: string;
  /**
   * The client record this work was done for.
   *
   * `client` above started life as free text, which meant a client card could
   * not say what we had done for them — the two halves of the same fact were
   * not connected. This is the connection. Optional, so projects saved before
   * it existed keep loading; `loadState` backfills it where the text matches.
   */
  clientId?: ID;
  /** What was sold for this client: a `SERVICE_OPTIONS` title. */
  service?: string;
  /** The sub-service under `service`, e.g. `Business Websites`. */
  serviceItem?: string;
  description: string;
  color: string;
  /** ISO dates, `YYYY-MM-DD`. */
  start: string;
  end: string;
  status: ProjectStatus;
  /** Person ids. */
  members: ID[];
  /** When false the project is internal and never shown in client view. */
  clientVisible: boolean;
  createdAt: string;
}

export interface TodoList {
  id: ID;
  projectId: ID;
  title: string;
  createdAt: string;
}

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export interface Todo {
  id: ID;
  listId: ID;
  projectId: ID;
  title: string;
  assigneeId: ID | "";
  /** ISO date or "" for none. */
  due: string;
  done: boolean;
  completedAt?: string;
  notes: string;
  subtasks: Subtask[];
  createdAt: string;
}

export interface Reply {
  id: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Post {
  id: ID;
  projectId: ID;
  title: string;
  body: string;
  authorId: ID;
  category: PostCategory;
  pinned: boolean;
  /** Hidden from the client view when false. */
  clientVisible: boolean;
  replies: Reply[];
  createdAt: string;
}

export interface ChatMessage {
  id: ID;
  projectId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface EventItem {
  id: ID;
  projectId: ID;
  title: string;
  date: string;
  time: string;
  kind: EventKind;
  createdAt: string;
}

export interface Folder {
  id: ID;
  projectId: ID;
  name: string;
}

export interface DocFile {
  id: ID;
  projectId: ID;
  folderId: ID | "";
  name: string;
  kind: DocKind;
  /** Markdown-ish body for `doc`, the URL for `link`, a note for `file`. */
  body: string;
  clientVisible: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface CardColumn {
  id: ID;
  projectId: ID;
  name: string;
  position: number;
}

export interface Card {
  id: ID;
  projectId: ID;
  columnId: ID;
  title: string;
  notes: string;
  assigneeId: ID | "";
  due: string;
  createdAt: string;
}

export interface HillScope {
  id: ID;
  projectId: ID;
  label: string;
  /** 0–100. Below 50 is the "figuring it out" climb, above 50 is execution. */
  progress: number;
}

export interface CheckinAnswer {
  id: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Checkin {
  id: ID;
  projectId: ID;
  prompt: string;
  schedule: string;
  answers: CheckinAnswer[];
}

export interface Note {
  id: ID;
  title: string;
  body: string;
  updatedAt: string;
}

export interface Bookmark {
  id: ID;
  label: string;
  /** Route inside the workspace, e.g. `project/<id>`. */
  target: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: ID;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  /**
   * Income only: which service was paid for. One of
   * `INCOME_REASON_OPTIONS` in `services.ts`, or "" for older entries and
   * expenses. Optional so existing saved workspaces keep loading.
   */
  service?: string;
  /** Income only: the sub-service or entry point under `service`, if chosen. */
  serviceItem?: string;
  /** The project this money relates to, when it is tied to one. */
  projectId?: ID;
  /**
   * Which bank the money moved through. On income that is the account the
   * payment landed in; on expenses it is the account it left from. One of
   * `INCOME_BANKS` (income) or `BANK_OPTIONS` (expenses) in `banks.ts`.
   * Optional so existing entries keep loading.
   */
  bank?: string;
  /**
   * How the money moved, when it was not a plain transfer into `bank` — an
   * OPay transfer, a card, a cheque. Important for a statement trail: an OPay
   * payment never appears on the bank statement at all.
   */
  method?: string;
  /**
   * The other side of the transaction: the person or company who paid, or who
   * was paid. Free text, because counterparties are invoices and individuals
   * rather than a fixed list.
   */
  counterparty?: string;
}

/**
 * Bumped when the stored shape changes in a way older data cannot survive.
 *
 * v2 → v3: the ledger stopped being sample data. A browser that had opened the
 * workspace before 10 Nov 2026 was holding nine invented transactions, which
 * would have sat alongside the real ones and quietly corrupted the books. The
 * bump discards those workspaces so the real ledger seeds cleanly. Everything
 * else in the workspace is sample content anyway, so nothing of value is lost.
 */
export const WORKSPACE_STATE_VERSION = 3;

/** Keys from previous state versions, cleared on load so nothing lingers. */
const LEGACY_STORAGE_KEYS = ["jojuni.workspace.v2"];


export interface WorkspaceState {
  version: typeof WORKSPACE_STATE_VERSION;
  people: Person[];
  /** The signed-in owner. Everything is edited as this person. */
  currentUserId: ID;
  projects: Project[];
  todoLists: TodoList[];
  todos: Todo[];
  posts: Post[];
  chats: ChatMessage[];
  events: EventItem[];
  folders: Folder[];
  docs: DocFile[];
  cardColumns: CardColumn[];
  cards: Card[];
  hill: HillScope[];
  checkins: Checkin[];
  notes: Note[];
  bookmarks: Bookmark[];
  ledger: LedgerEntry[];
  /** Internal chat: direct messages and private groups. */
  chat: ChatState;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = "jojuni.workspace.v3";

export function uid(prefix = "id"): ID {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${random}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number, hour = 9): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const LONG_DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function formatDate(iso: string, long = false): string {
  if (!iso) return "No date";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return (long ? LONG_DATE : SHORT_DATE).format(date);
}

export function formatStamp(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Whole days from today to `iso`. Negative means overdue. */
export function daysUntil(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** Friendly relative label: Today, Tomorrow, 3 days ago, 12 Nov. */
export function dueLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days === null) return "No date";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < -1) return `${Math.abs(days)} days ago`;
  if (days < 7) return `In ${days} days`;
  return formatDate(iso);
}

export function relativeTime(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso.slice(0, 10));
}

export function isOverdue(iso: string): boolean {
  const days = daysUntil(iso);
  return days !== null && days < 0;
}

export function isThisWeek(iso: string): boolean {
  const days = daysUntil(iso);
  return days !== null && days >= 0 && days <= 7;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function personById(state: WorkspaceState, id: ID | ""): Person | undefined {
  return state.people.find((person) => person.id === id);
}

/**
 * People who can be assigned work: staff only.
 *
 * Clients and vendors are contacts. Putting a client in a to-do assignee menu
 * is the kind of small mistake that makes a workspace feel unreliable, so the
 * rule lives here and every assignee list reads it.
 */
export function assignablePeople(people: Person[]): Person[] {
  return people.filter((person) => (person.category ?? "staff") === "staff");
}

/** Everyone in a category, in the order they were added. */
export function peopleByCategory(people: Person[], category: PersonCategory): Person[] {
  return people.filter((person) => (person.category ?? "staff") === category);
}

/** Counts per category, for the tabs on the People page. */
export function peopleCounts(people: Person[]): Record<PersonCategory, number> {
  return {
    staff: peopleByCategory(people, "staff").length,
    client: peopleByCategory(people, "client").length,
    vendor: peopleByCategory(people, "vendor").length,
  };
}

/** "Ada Madu" -> { first: "Ada", last: "Madu" } */
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * What to show under a person's name on a card.
 *
 * A client is known by their company first — that is how an invoice is made
 * out and how anyone looks them up. A freelance vendor has no company, so the
 * service they provide is the useful line instead.
 */
/**
 * Every project done for a client, newest first.
 *
 * This is the purpose a client exists for: the logo one year, the site the
 * next, SEO after that. Newest first so the card reads as recent history.
 */
export function projectsForClient(state: WorkspaceState, clientId: ID): Project[] {
  return state.projects
    .filter((project) => project.clientId === clientId)
    .sort((a, b) => b.start.localeCompare(a.start));
}

/** The label to print for what a project was: sub-service first, then service. */
export function projectServiceLabel(project: Project): string {
  return project.serviceItem || project.service || "";
}

/** Calendar year a project began, for the history list. */
export function projectYear(project: Project): string {
  return (project.start || project.createdAt || "").slice(0, 4);
}

export function personSubtitle(person: Person): string {
  if (person.category === "client") return person.company || person.title || "Client";
  if (person.category === "vendor") {
    if (person.freelance) {
      if (!person.title) return "Freelance";
      return /freelance/i.test(person.title) ? person.title : `Freelance · ${person.title}`;
    }
    return person.company || person.title || "Vendor";
  }
  return person.title;
}

/** International dialling link, so the number works from any device. */
export function telHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

/** wa.me link. Nigeria defaults to 234 when the number is entered locally. */
export function whatsappHref(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0")) return `https://wa.me/234${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

/**
 * Website link. People type `example.com` as often as `https://example.com`,
 * and a bare host in an href resolves relative to the workspace, so add the
 * scheme when it is missing.
 */
export function websiteHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** What to print in the link: the address without the scheme or trailing slash. */
export function websiteLabel(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function projectById(state: WorkspaceState, id: ID): Project | undefined {
  return state.projects.find((project) => project.id === id);
}

export function todosForProject(state: WorkspaceState, projectId: ID): Todo[] {
  return state.todos.filter((todo) => todo.projectId === projectId);
}

/** Share of to-dos completed, 0–100. Empty projects report 0. */
export function projectProgress(state: WorkspaceState, projectId: ID): number {
  const todos = todosForProject(state, projectId);
  if (!todos.length) return 0;
  const done = todos.filter((todo) => todo.done).length;
  return Math.round((done / todos.length) * 100);
}

export function hillForProject(state: WorkspaceState, projectId: ID): HillScope[] {
  return state.hill.filter((scope) => scope.projectId === projectId);
}

/**
 * Basecamp-style hill chart position.
 *
 * A scope that is still being figured out climbs the left slope; once it is
 * understood it crests the hill and moves down the right slope as it gets
 * executed. `progress` 0–100 maps onto that path, so a single number is enough
 * to place a dot.
 */
export function hillPoint(progress: number): { x: number; y: number; phase: "uphill" | "downhill" } {
  const clamped = Math.max(0, Math.min(100, progress));
  // `t` runs 0→2: 0–1 is the climb (figuring it out), 1–2 the descent (executing).
  const t = clamped / 50;
  // `x` is always the fraction across the whole hill, 0→1, so callers can scale
  // it straight into a chart width. `y` is 0 at the feet and 1 at the peak.
  const x = t / 2;
  if (t <= 1) {
    return { x, y: Math.sin((t * Math.PI) / 2), phase: "uphill" };
  }
  return { x, y: Math.cos(((t - 1) * Math.PI) / 2), phase: "downhill" };
}

export interface ActivityItem {
  id: string;
  projectId: ID;
  actorId: ID;
  text: string;
  detail?: string;
  at: string;
  /** Where clicking it should land. */
  target: string;
}

/** Everything that happened, newest first, derived from the stored records. */
export function activityFeed(state: WorkspaceState, limit = 60): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const post of state.posts) {
    items.push({
      id: `act-post-${post.id}`,
      projectId: post.projectId,
      actorId: post.authorId,
      text: `posted “${post.title}”`,
      at: post.createdAt,
      target: `project/${post.projectId}/board`,
    });
    for (const reply of post.replies) {
      items.push({
        id: `act-reply-${reply.id}`,
        projectId: post.projectId,
        actorId: reply.authorId,
        text: `replied to “${post.title}”`,
        at: reply.createdAt,
        target: `project/${post.projectId}/board`,
      });
    }
  }

  for (const todo of state.todos) {
    if (todo.done && todo.completedAt) {
      items.push({
        id: `act-todo-${todo.id}`,
        projectId: todo.projectId,
        actorId: todo.assigneeId || state.currentUserId,
        text: `completed “${todo.title}”`,
        at: todo.completedAt,
        target: `project/${todo.projectId}/todos`,
      });
    }
  }

  for (const chat of state.chats) {
    items.push({
      id: `act-chat-${chat.id}`,
      projectId: chat.projectId,
      actorId: chat.authorId,
      text: "sent a message in the campfire",
      detail: chat.body.slice(0, 110),
      at: chat.createdAt,
      target: `project/${chat.projectId}/campfire`,
    });
  }

  for (const doc of state.docs) {
    items.push({
      id: `act-doc-${doc.id}`,
      projectId: doc.projectId,
      actorId: state.currentUserId,
      text: `added ${doc.kind === "link" ? "a link" : doc.kind === "doc" ? "a document" : "a file"} “${doc.name}”`,
      at: doc.createdAt,
      target: `project/${doc.projectId}/files`,
    });
  }

  for (const card of state.cards) {
    items.push({
      id: `act-card-${card.id}`,
      projectId: card.projectId,
      actorId: card.assigneeId || state.currentUserId,
      text: `added “${card.title}” to the card table`,
      at: card.createdAt,
      target: `project/${card.projectId}/cards`,
    });
  }

  for (const event of state.events) {
    items.push({
      id: `act-event-${event.id}`,
      projectId: event.projectId,
      actorId: state.currentUserId,
      text: `scheduled “${event.title}”`,
      at: event.createdAt,
      target: `project/${event.projectId}/schedule`,
    });
  }

  return items
    .filter((item) => Boolean(item.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/** My assignments: open to-dos for the current user plus cards assigned to them. */
export function myAssignments(state: WorkspaceState): { todos: Todo[]; cards: Card[] } {
  const me = state.currentUserId;
  return {
    todos: state.todos.filter((todo) => !todo.done && (todo.assigneeId === me || todo.assigneeId === "")),
    cards: state.cards.filter((card) => card.assigneeId === me),
  };
}

export function overdueTodos(state: WorkspaceState): Todo[] {
  return state.todos.filter((todo) => !todo.done && isOverdue(todo.due));
}

export function upcomingEvents(state: WorkspaceState, limit = 8): EventItem[] {
  return [...state.events]
    .filter((event) => (daysUntil(event.date) ?? -999) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export function loadState(): WorkspaceState | null {
  try {
    // Anything from an older schema is dropped rather than migrated: the seed
    // is the source of truth, and a half-migrated ledger is worse than a reset.
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!parsed || parsed.version !== WORKSPACE_STATE_VERSION || !Array.isArray(parsed.projects)) {
      return null;
    }
    // Chat was added after the first v3 saves were in the wild. A workspace
    // from before it simply gains an empty one rather than being thrown away.
    if (!parsed.chat) parsed.chat = EMPTY_CHAT_STATE;
    // Projects used to name their client in text only. Link them to the client
    // record where the name matches, so an existing workspace starts showing
    // client history immediately instead of waiting to be re-entered by hand.
    parsed.projects = linkProjectClients(parsed.projects, parsed.people);
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A full quota must not break the UI; the change simply stays in memory.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportState(state: WorkspaceState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): WorkspaceState {
  const parsed = JSON.parse(json) as WorkspaceState;
  if (!parsed || parsed.version !== WORKSPACE_STATE_VERSION || !Array.isArray(parsed.projects)) {
    throw new Error("That file is not a Jojuni workspace backup.");
  }
  parsed.projects = linkProjectClients(parsed.projects, parsed.people);
  return parsed;
}

/** "Meridian Retail" on a project matches "Meridian Retail" as a client company. */
function normaliseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Attach a client record to projects that only carry the client's name.
 *
 * Matches the project's `client` text against a client's company, then their
 * full name. Only fills a gap: a project already linked is left alone. A name
 * that matches nothing stays free text, which is what an internal or retainer
 * project is.
 */
export function linkProjectClients(projects: Project[], people: Person[]): Project[] {
  const clients = people.filter((person) => (person.category ?? "staff") === "client");
  if (!clients.length) return projects;
  const byName = new Map<string, ID>();
  for (const client of clients) {
    if (client.company) byName.set(normaliseName(client.company), client.id);
    byName.set(normaliseName(client.name), client.id);
  }
  return projects.map((project) => {
    if (project.clientId) return project;
    const match = byName.get(normaliseName(project.client));
    return match ? { ...project, clientId: match } : project;
  });
}

/* ------------------------------------------------------------------ */
/* Initial content                                                     */
/* ------------------------------------------------------------------ */

const OWNER = "person-owner";
const ADA = "person-ada";
const EMEKA = "person-emeka";
const KENE = "person-kene";
const BOLA = "person-bola";

/**
 * Starting content.
 *
 * Every date is generated relative to "now" so the workspace never opens on a
 * stale calendar. Project names match the ones already published on the
 * marketing site; no client detail beyond that is invented here.
 */
export function createInitialState(): WorkspaceState {
  const projects: Project[] = [
    {
      id: "project-meridian",
      name: "Meridian Commerce",
      code: "MC",
      client: "Meridian Retail",
      service: "Web Development",
      serviceItem: "Online Stores",
      description: "Storefront and checkout rebuild, with a catalogue the marketing team can edit themselves.",
      color: "#d90429",
      start: dateDaysFromNow(-64),
      end: dateDaysFromNow(24),
      status: "active",
      members: [OWNER, ADA, KENE, EMEKA],
      clientVisible: true,
      createdAt: isoDaysAgo(64),
    },
    {
      id: "project-northstar",
      name: "Northstar Mobile",
      code: "NM",
      client: "Northstar Health",
      service: "Software & App Development",
      serviceItem: "Mobile Apps",
      description: "Patient follow-up app for private clinics: reminders, visit history and secure messaging.",
      color: "#111111",
      start: dateDaysFromNow(-38),
      end: dateDaysFromNow(52),
      status: "active",
      members: [OWNER, KENE, BOLA],
      clientVisible: true,
      createdAt: isoDaysAgo(38),
    },
    {
      id: "project-automation",
      name: "Jojuni Automation",
      code: "JA",
      client: "Internal",
      service: "Business Automation",
      serviceItem: "Task Automation",
      description: "Our own delivery workspace: project boards, client files and reporting in one place.",
      color: "#6f6f6f",
      start: dateDaysFromNow(-120),
      end: dateDaysFromNow(10),
      status: "active",
      members: [OWNER, ADA, BOLA],
      clientVisible: false,
      createdAt: isoDaysAgo(120),
    },
    {
      id: "project-website",
      name: "Website Care",
      code: "WC",
      client: "Retainer",
      service: "Web Development",
      serviceItem: "Website Care",
      description: "Monthly maintenance, monitoring and content updates for client sites on retainer.",
      color: "#0f766e",
      start: dateDaysFromNow(-200),
      end: dateDaysFromNow(160),
      status: "active",
      members: [OWNER, EMEKA],
      clientVisible: false,
      createdAt: isoDaysAgo(200),
    },
  ];

  const todoLists: TodoList[] = [
    { id: "list-mc-build", projectId: "project-meridian", title: "Checkout rebuild", createdAt: isoDaysAgo(40) },
    { id: "list-mc-launch", projectId: "project-meridian", title: "Launch checklist", createdAt: isoDaysAgo(30) },
    { id: "list-nm-build", projectId: "project-northstar", title: "Build sprint", createdAt: isoDaysAgo(20) },
    { id: "list-ja-ops", projectId: "project-automation", title: "Internal operations", createdAt: isoDaysAgo(90) },
    { id: "list-wc-run", projectId: "project-website", title: "Monthly run", createdAt: isoDaysAgo(20) },
  ];

  const todos: Todo[] = [
    {
      id: "todo-1",
      listId: "list-mc-build",
      projectId: "project-meridian",
      title: "Finalise checkout error states",
      assigneeId: KENE,
      due: dateDaysFromNow(1),
      done: false,
      notes: "Cover declined card, expired session and out-of-stock race conditions.",
      subtasks: [
        { id: "sub-1", title: "Declined card copy", done: true },
        { id: "sub-2", title: "Expired session redirect", done: false },
        { id: "sub-3", title: "Out-of-stock guard", done: false },
      ],
      createdAt: isoDaysAgo(6),
    },
    {
      id: "todo-2",
      listId: "list-mc-build",
      projectId: "project-meridian",
      title: "Connect payment webhook",
      assigneeId: BOLA,
      due: dateDaysFromNow(-3),
      done: false,
      notes: "Retry on 5xx, and record every event id so replays are idempotent.",
      subtasks: [],
      createdAt: isoDaysAgo(12),
    },
    {
      id: "todo-3",
      listId: "list-mc-build",
      projectId: "project-meridian",
      title: "Catalogue import for the marketing team",
      assigneeId: ADA,
      due: dateDaysFromNow(4),
      done: false,
      notes: "",
      subtasks: [{ id: "sub-4", title: "Sample spreadsheet", done: true }],
      createdAt: isoDaysAgo(9),
    },
    {
      id: "todo-4",
      listId: "list-mc-launch",
      projectId: "project-meridian",
      title: "Run staging release checklist",
      assigneeId: OWNER,
      due: dateDaysFromNow(2),
      done: false,
      notes: "",
      subtasks: [
        { id: "sub-5", title: "Migrations applied", done: true },
        { id: "sub-6", title: "Rollback rehearsed", done: false },
      ],
      createdAt: isoDaysAgo(5),
    },
    {
      id: "todo-5",
      listId: "list-mc-launch",
      projectId: "project-meridian",
      title: "Usability test notes written up",
      assigneeId: KENE,
      due: dateDaysFromNow(-8),
      done: true,
      completedAt: isoDaysAgo(8),
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(20),
    },
    {
      id: "todo-6",
      listId: "list-mc-launch",
      projectId: "project-meridian",
      title: "Client sign-off on checkout flow",
      assigneeId: OWNER,
      due: dateDaysFromNow(-1),
      done: true,
      completedAt: isoDaysAgo(1),
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(15),
    },
    {
      id: "todo-7",
      listId: "list-nm-build",
      projectId: "project-northstar",
      title: "Appointment reminder service",
      assigneeId: BOLA,
      due: dateDaysFromNow(6),
      done: false,
      notes: "Runs every 15 minutes; quiet hours respected per clinic.",
      subtasks: [{ id: "sub-7", title: "Timezone handling", done: false }],
      createdAt: isoDaysAgo(7),
    },
    {
      id: "todo-8",
      listId: "list-nm-build",
      projectId: "project-northstar",
      title: "Onboarding flow prototype",
      assigneeId: KENE,
      due: dateDaysFromNow(3),
      done: false,
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(11),
    },
    {
      id: "todo-9",
      listId: "list-nm-build",
      projectId: "project-northstar",
      title: "Clinic admin interview notes",
      assigneeId: OWNER,
      due: dateDaysFromNow(-12),
      done: true,
      completedAt: isoDaysAgo(12),
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(25),
    },
    {
      id: "todo-10",
      listId: "list-ja-ops",
      projectId: "project-automation",
      title: "Weekly reporting time down to one hour",
      assigneeId: ADA,
      due: dateDaysFromNow(9),
      done: false,
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(4),
    },
    {
      id: "todo-11",
      listId: "list-ja-ops",
      projectId: "project-automation",
      title: "Retire the old spreadsheet tracker",
      assigneeId: ADA,
      due: dateDaysFromNow(-20),
      done: true,
      completedAt: isoDaysAgo(20),
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(70),
    },
    {
      id: "todo-12",
      listId: "list-wc-run",
      projectId: "project-website",
      title: "Monthly uptime and backup report",
      assigneeId: EMEKA,
      due: dateDaysFromNow(5),
      done: false,
      notes: "",
      subtasks: [],
      createdAt: isoDaysAgo(2),
    },
  ];

  const posts: Post[] = [
    {
      id: "post-1",
      projectId: "project-meridian",
      title: "Checkout rebuild is ready for review",
      body:
        "The new checkout is on staging and the full path works end to end: cart, address, payment, confirmation.\n\nThe error states still need copy review before we open it to the client. Everything else is ready for anyone who wants to click through.",
      authorId: OWNER,
      category: "Announcement",
      pinned: true,
      clientVisible: true,
      createdAt: isoDaysAgo(2),
      replies: [
        {
          id: "reply-1",
          authorId: KENE,
          body: "Clicked through this morning. The declined-card message is still the placeholder — I'll have wording by tomorrow.",
          createdAt: isoDaysAgo(2, 11),
        },
        {
          id: "reply-2",
          authorId: ADA,
          body: "Nice. I've added the remaining copy items to the launch checklist so they don't get lost.",
          createdAt: isoDaysAgo(1, 10),
        },
      ],
    },
    {
      id: "post-2",
      projectId: "project-meridian",
      title: "Decision: we are keeping the one-page checkout",
      body:
        "We compared the two-step version against the single page with the team on Monday. Staying with one page — fewer drop-offs in testing and less to maintain.\n\nRecorded here so we do not reopen it next quarter.",
      authorId: OWNER,
      category: "Discussion",
      pinned: false,
      clientVisible: true,
      createdAt: isoDaysAgo(9),
      replies: [],
    },
    {
      id: "post-3",
      projectId: "project-northstar",
      title: "Kickoff notes and what we heard from clinics",
      body:
        "Three clinic managers, same three complaints: reminders arrive late, visit history is scattered, and nobody trusts a chat tool that is not the one they already use.\n\nOur answer is reminders on a schedule they control, one timeline per patient, and messages that stay inside the app.",
      authorId: ADA,
      category: "Announcement",
      pinned: false,
      clientVisible: true,
      createdAt: isoDaysAgo(16),
      replies: [
        {
          id: "reply-3",
          authorId: OWNER,
          body: "Good summary. Let's not over-promise on the chat side — secure messaging is the hard part.",
          createdAt: isoDaysAgo(15, 14),
        },
      ],
    },
    {
      id: "post-4",
      projectId: "project-automation",
      title: "This workspace replaces three tools",
      body:
        "Project boards, client files and the weekly report now live here. That is spreadsheets, a chat thread and a shared drive folder done.\n\nIf something is still living outside, say so and we will move it in.",
      authorId: OWNER,
      category: "Announcement",
      pinned: false,
      clientVisible: false,
      createdAt: isoDaysAgo(21),
      replies: [],
    },
    {
      id: "post-5",
      projectId: "project-website",
      title: "Retainer schedule for this month",
      body: "Backups verified, uptime at target, two content updates requested and done. Report attached in Docs & Files.",
      authorId: EMEKA,
      category: "Announcement",
      pinned: false,
      clientVisible: false,
      createdAt: isoDaysAgo(3),
      replies: [],
    },
  ];

  const chats: ChatMessage[] = [
    { id: "chat-1", projectId: "project-meridian", authorId: ADA, body: "Morning — staging is up if anyone wants to click the new checkout.", createdAt: isoDaysAgo(1, 8) },
    { id: "chat-2", projectId: "project-meridian", authorId: KENE, body: "On it after standup. The error copy is the last thing I owe you.", createdAt: isoDaysAgo(1, 9) },
    { id: "chat-3", projectId: "project-meridian", authorId: OWNER, body: "Reminder that the client review is Thursday, so let's have copy locked tomorrow.", createdAt: isoDaysAgo(1, 10) },
    { id: "chat-4", projectId: "project-northstar", authorId: BOLA, body: "Reminder service is running on the staging cron. Quiet hours still behave.", createdAt: isoDaysAgo(2, 13) },
    { id: "chat-5", projectId: "project-automation", authorId: ADA, body: "I moved the last of the tracker into the card table. Nothing left in the sheet.", createdAt: isoDaysAgo(3, 15) },
  ];

  const events: EventItem[] = [
    { id: "event-1", projectId: "project-meridian", title: "Client review — checkout", date: dateDaysFromNow(3), time: "10:00", kind: "Meeting", createdAt: isoDaysAgo(3) },
    { id: "event-2", projectId: "project-meridian", title: "Checkout launch", date: dateDaysFromNow(24), time: "09:00", kind: "Milestone", createdAt: isoDaysAgo(30) },
    { id: "event-3", projectId: "project-meridian", title: "Copy freeze", date: dateDaysFromNow(1), time: "17:00", kind: "Deadline", createdAt: isoDaysAgo(2) },
    { id: "event-4", projectId: "project-northstar", title: "Prototype walkthrough", date: dateDaysFromNow(7), time: "14:00", kind: "Meeting", createdAt: isoDaysAgo(5) },
    { id: "event-5", projectId: "project-northstar", title: "Beta opens to two clinics", date: dateDaysFromNow(52), time: "09:00", kind: "Milestone", createdAt: isoDaysAgo(10) },
    { id: "event-6", projectId: "project-automation", title: "Automation handover", date: dateDaysFromNow(10), time: "12:00", kind: "Milestone", createdAt: isoDaysAgo(7) },
    { id: "event-7", projectId: "project-website", title: "Monthly report due", date: dateDaysFromNow(5), time: "16:00", kind: "Deadline", createdAt: isoDaysAgo(1) },
  ];

  const folders: Folder[] = [
    { id: "folder-mc-design", projectId: "project-meridian", name: "Design" },
    { id: "folder-mc-contracts", projectId: "project-meridian", name: "Contracts" },
    { id: "folder-nm-research", projectId: "project-northstar", name: "Research" },
    { id: "folder-ja-ops", projectId: "project-automation", name: "Operations" },
  ];

  const docs: DocFile[] = [
    {
      id: "doc-1",
      projectId: "project-meridian",
      folderId: "folder-mc-design",
      name: "Checkout flow — final decisions",
      kind: "doc",
      body:
        "## One page, not two\n\nWe keep the single-page checkout. Fewer drop-offs in testing.\n\n## Error handling\n\n- Declined card: explain, offer retry, keep the cart intact\n- Expired session: return to payment with the cart preserved\n- Out of stock: block the line item, not the order\n\n## Open questions\n\nPayment provider retry window is still unconfirmed.",
      clientVisible: true,
      updatedAt: isoDaysAgo(1),
      createdAt: isoDaysAgo(14),
    },
    {
      id: "doc-2",
      projectId: "project-meridian",
      folderId: "folder-mc-design",
      name: "Storefront moodboard",
      kind: "link",
      body: "https://www.jojunitechnologies.com.ng/portfolio",
      clientVisible: true,
      updatedAt: isoDaysAgo(20),
      createdAt: isoDaysAgo(20),
    },
    {
      id: "doc-3",
      projectId: "project-meridian",
      folderId: "folder-mc-contracts",
      name: "Statement of work.pdf",
      kind: "file",
      body: "Signed scope, milestones and payment schedule.",
      clientVisible: false,
      updatedAt: isoDaysAgo(60),
      createdAt: isoDaysAgo(60),
    },
    {
      id: "doc-4",
      projectId: "project-northstar",
      folderId: "folder-nm-research",
      name: "Clinic interviews — themes",
      kind: "doc",
      body:
        "## What keeps coming up\n\n1. Reminders arrive too late to be useful\n2. Visit history is split across paper and two systems\n3. Nobody wants another chat app they have to check\n\n## What we are not doing\n\nBuilding a full clinical record system. This is follow-up only.",
      clientVisible: true,
      updatedAt: isoDaysAgo(12),
      createdAt: isoDaysAgo(18),
    },
    {
      id: "doc-5",
      projectId: "project-automation",
      folderId: "folder-ja-ops",
      name: "Weekly reporting checklist",
      kind: "doc",
      body: "1. Pull the week's completed to-dos\n2. Note anything overdue and why\n3. Update the client-facing summary\n4. Send before Friday 16:00",
      clientVisible: false,
      updatedAt: isoDaysAgo(4),
      createdAt: isoDaysAgo(40),
    },
  ];

  const cardColumns: CardColumn[] = [
    { id: "col-mc-backlog", projectId: "project-meridian", name: "Backlog", position: 0 },
    { id: "col-mc-progress", projectId: "project-meridian", name: "In progress", position: 1 },
    { id: "col-mc-review", projectId: "project-meridian", name: "In review", position: 2 },
    { id: "col-mc-done", projectId: "project-meridian", name: "Done", position: 3 },
    { id: "col-nm-backlog", projectId: "project-northstar", name: "Backlog", position: 0 },
    { id: "col-nm-progress", projectId: "project-northstar", name: "In progress", position: 1 },
    { id: "col-nm-done", projectId: "project-northstar", name: "Done", position: 2 },
  ];

  const cards: Card[] = [
    { id: "card-1", projectId: "project-meridian", columnId: "col-mc-backlog", title: "Gift card support", notes: "Requested by the client. Not in the current scope.", assigneeId: "", due: "", createdAt: isoDaysAgo(15) },
    { id: "card-2", projectId: "project-meridian", columnId: "col-mc-backlog", title: "Saved addresses", notes: "", assigneeId: KENE, due: dateDaysFromNow(14), createdAt: isoDaysAgo(13) },
    { id: "card-3", projectId: "project-meridian", columnId: "col-mc-progress", title: "Payment retry handling", notes: "Idempotent event ids so replays do not double-charge.", assigneeId: BOLA, due: dateDaysFromNow(2), createdAt: isoDaysAgo(8) },
    { id: "card-4", projectId: "project-meridian", columnId: "col-mc-review", title: "Declined card copy", notes: "", assigneeId: KENE, due: dateDaysFromNow(1), createdAt: isoDaysAgo(5) },
    { id: "card-5", projectId: "project-meridian", columnId: "col-mc-done", title: "Address validation", notes: "", assigneeId: BOLA, due: "", createdAt: isoDaysAgo(22) },
    { id: "card-6", projectId: "project-northstar", columnId: "col-nm-backlog", title: "Multi-clinic admin roles", notes: "", assigneeId: "", due: "", createdAt: isoDaysAgo(10) },
    { id: "card-7", projectId: "project-northstar", columnId: "col-nm-progress", title: "Reminder quiet hours", notes: "", assigneeId: BOLA, due: dateDaysFromNow(6), createdAt: isoDaysAgo(7) },
    { id: "card-8", projectId: "project-northstar", columnId: "col-nm-done", title: "Patient timeline view", notes: "", assigneeId: KENE, due: "", createdAt: isoDaysAgo(19) },
  ];

  const hill: HillScope[] = [
    { id: "hill-1", projectId: "project-meridian", label: "Checkout flow", progress: 82 },
    { id: "hill-2", projectId: "project-meridian", label: "Catalogue import", progress: 38 },
    { id: "hill-3", projectId: "project-meridian", label: "Payment integration", progress: 61 },
    { id: "hill-4", projectId: "project-meridian", label: "Launch runbook", progress: 12 },
    { id: "hill-5", projectId: "project-northstar", label: "Reminders", progress: 44 },
    { id: "hill-6", projectId: "project-northstar", label: "Secure messaging", progress: 18 },
    { id: "hill-7", projectId: "project-northstar", label: "Onboarding", progress: 55 },
    { id: "hill-8", projectId: "project-automation", label: "Reporting", progress: 74 },
  ];

  const checkins: Checkin[] = [
    {
      id: "checkin-1",
      projectId: "project-meridian",
      prompt: "What did you work on this week?",
      schedule: "Every Monday at 9:00",
      answers: [
        { id: "ans-1", authorId: KENE, body: "Error states and the declined-card copy. Staging is ready to click through.", createdAt: isoDaysAgo(2, 9) },
        { id: "ans-2", authorId: BOLA, body: "Webhook retries, and I wrote down every event id we receive so replays are safe.", createdAt: isoDaysAgo(2, 10) },
      ],
    },
    {
      id: "checkin-2",
      projectId: "project-meridian",
      prompt: "Anything blocking you?",
      schedule: "Every Friday at 15:00",
      answers: [
        { id: "ans-3", authorId: ADA, body: "Waiting on the client's product feed before the catalogue import can finish.", createdAt: isoDaysAgo(3, 15) },
      ],
    },
    {
      id: "checkin-3",
      projectId: "project-northstar",
      prompt: "What are you working on this week?",
      schedule: "Every Monday at 9:00",
      answers: [
        { id: "ans-4", authorId: BOLA, body: "Reminder service scheduling and the quiet-hours rules.", createdAt: isoDaysAgo(1, 9) },
      ],
    },
  ];

  const notes: Note[] = [
    {
      id: "note-1",
      title: "Questions to ask every new client",
      body: "1. Who answers when something breaks at 22:00?\n2. What does success look like in numbers?\n3. What system are we replacing, and who still relies on it?\n4. Who has sign-off, and who only thinks they do?",
      updatedAt: isoDaysAgo(6),
    },
    {
      id: "note-2",
      title: "Weekly review prompts",
      body: "What shipped?\nWhat slipped, and was it our fault?\nWhat are we pretending not to know?",
      updatedAt: isoDaysAgo(13),
    },
  ];

  const bookmarks: Bookmark[] = [
    { id: "bm-1", label: "Checkout launch checklist", target: "project/project-meridian/todos", createdAt: isoDaysAgo(4) },
    { id: "bm-2", label: "Clinic interview notes", target: "project/project-northstar/files", createdAt: isoDaysAgo(11) },
  ];

  const ledger: LedgerEntry[] = [
    /* Real transactions. These are the company's actual first months of
       trading, so this array is the books — not sample data. Demo rows must
       never creep back in: on 10 Nov 2026 nine invented entries were replaced
       by these and the stored ledger was wiped to match (see
       `WORKSPACE_STATE_VERSION`).

       Dates are fixed rather than relative so the ledger keeps matching the
       bank and mobile-money statements it was copied from. */
    {
      id: "led-2026-10-02-a",
      date: "2026-10-02",
      description: "Take-off grant from Chieke Nwanna-Nzewunwa",
      category: "Founder capital",
      type: "Income",
      amount: 500000,
      service: "Founder / take-off grant",
      bank: "OPay",
      method: "OPay",
      counterparty: "Chieke Nwanna-Nzewunwa",
    },
    {
      id: "led-2026-10-02-b",
      date: "2026-10-02",
      description: "Take-off grant from Chieke Nwanna-Nzewunwa",
      category: "Founder capital",
      type: "Income",
      amount: 200000,
      service: "Founder / take-off grant",
      bank: "OPay",
      method: "OPay",
      counterparty: "Chieke Nwanna-Nzewunwa",
    },
    {
      id: "led-2026-10-03",
      date: "2026-10-03",
      description: "Take-off grant from Chieke Nwanna-Nzewunwa",
      category: "Founder capital",
      type: "Income",
      amount: 500000,
      service: "Founder / take-off grant",
      bank: "OPay",
      method: "OPay",
      counterparty: "Chieke Nwanna-Nzewunwa",
    },
    {
      id: "led-2026-10-07",
      date: "2026-10-07",
      description: "Test transfer to confirm account alerts work",
      category: "Other income",
      type: "Income",
      amount: 100,
      service: "Other income",
      bank: "Fidelity Bank",
      counterparty: "Edith",
    },
    {
      id: "led-2026-10-08",
      date: "2026-10-08",
      description: "Take-off grant from Western Dada Limited",
      category: "Founder capital",
      type: "Income",
      amount: 1000000,
      service: "Founder / take-off grant",
      bank: "Fidelity Bank",
      method: "Bank transfer from First Bank",
      counterparty: "Western Dada Limited",
    },
    {
      id: "led-2026-10-16",
      date: "2026-10-16",
      description: "Search fee bank levy",
      category: "Bank charges",
      type: "Expense",
      amount: 10000,
      bank: "Fidelity Bank",
    },
    {
      id: "led-2026-10-31",
      date: "2026-10-31",
      description: "Website design payment from Aviel Karis Limited",
      category: "Client income",
      type: "Income",
      amount: 200000,
      service: "Web Development",
      serviceItem: "Business Websites",
      bank: "Fidelity Bank",
      method: "Bank transfer from Guaranty Trust Bank",
      counterparty: "Aviel Karis Limited",
    },
    {
      id: "led-2026-11-09",
      date: "2026-11-09",
      description: "Website design payment for PG Life Sciences",
      category: "Client income",
      type: "Income",
      amount: 300000,
      service: "Web Development",
      serviceItem: "Business Websites",
      bank: "OPay",
      method: "OPay",
      counterparty: "Chieke Nwanna-Nzewunwa",
    },
  ];

  /* Internal chat. The staff group is the one everybody belongs to — the
     answer to "staff need an internal chat". Two direct threads are seeded so
     the feature is not an empty shell on first open. */
  const staffThreadId = "thread-staff";
  const chatThreads: ChatThread[] = [
    {
      id: staffThreadId,
      kind: "group",
      title: "Staff",
      memberIds: [OWNER, ADA, EMEKA, KENE, BOLA],
      createdBy: OWNER,
      createdAt: isoDaysAgo(60),
      color: "#d90429",
    },
    {
      id: "thread-finance",
      kind: "group",
      title: "Finance & operations",
      memberIds: [OWNER, EMEKA],
      createdBy: OWNER,
      createdAt: isoDaysAgo(30),
      color: "#0f766e",
    },
    {
      id: "thread-dm-ada",
      kind: "direct",
      title: "",
      memberIds: [OWNER, ADA],
      createdBy: OWNER,
      createdAt: isoDaysAgo(20),
    },
    {
      id: "thread-dm-emeka",
      kind: "direct",
      title: "",
      memberIds: [OWNER, EMEKA],
      createdBy: OWNER,
      createdAt: isoDaysAgo(12),
    },
  ];

  const chatMessages: ChatMessageEntry[] = [
    {
      id: "msg-1",
      chatId: staffThreadId,
      authorId: OWNER,
      kind: "system",
      body: "You created the Staff group. Everyone in the company is here.",
      attachments: [],
      reactions: [],
      createdAt: isoDaysAgo(60),
    },
    {
      id: "msg-2",
      chatId: staffThreadId,
      authorId: ADA,
      kind: "text",
      body: "Morning all. Standup notes are on the board if anyone missed it.",
      attachments: [],
      reactions: [{ emoji: "like", personIds: [OWNER, KENE] }],
      createdAt: isoDaysAgo(2, 8),
    },
    {
      id: "msg-3",
      chatId: staffThreadId,
      authorId: KENE,
      kind: "text",
      body: "Checkout copy is locked. I will put the last screens in the design folder this afternoon.",
      attachments: [],
      reactions: [{ emoji: "fire", personIds: [ADA] }],
      replyTo: { messageId: "msg-2", authorId: ADA, snippet: "Morning all. Standup notes are on the board…" },
      createdAt: isoDaysAgo(2, 9),
    },
    {
      id: "msg-4",
      chatId: staffThreadId,
      authorId: BOLA,
      kind: "text",
      body: "Reminder: the client review is Thursday at 10. Bring anything that needs a decision.",
      attachments: [],
      reactions: [{ emoji: "celebrate", personIds: [OWNER, ADA, KENE] }],
      createdAt: isoDaysAgo(1, 16),
    },
    {
      id: "msg-5",
      chatId: "thread-finance",
      authorId: EMEKA,
      kind: "text",
      body: "The Fidelity levy cleared — ₦10,000, already in the ledger as a bank charge.",
      attachments: [],
      reactions: [{ emoji: "like", personIds: [OWNER] }],
      createdAt: isoDaysAgo(9, 11),
    },
    {
      id: "msg-6",
      chatId: "thread-dm-ada",
      authorId: ADA,
      kind: "text",
      body: "Do you want me to send the Meridian staging link to the client today, or wait until Friday?",
      attachments: [],
      reactions: [],
      createdAt: isoDaysAgo(3, 14),
    },
    {
      id: "msg-7",
      chatId: "thread-dm-emeka",
      authorId: EMEKA,
      kind: "text",
      body: "Petty cash for the courier came out of my own pocket — should I log it as a reimbursement?",
      attachments: [],
      reactions: [],
      createdAt: isoDaysAgo(5, 10),
    },
  ];

  const chat: ChatState = {
    threads: chatThreads,
    messages: chatMessages,
    // Everyone is caught up on the seeded messages; unread should be 0 on a
    // fresh workspace rather than a fake backlog.
    reads: { [`${OWNER}:${staffThreadId}`]: isoDaysAgo(0) },
    pins: {},
  };

  return {
    version: WORKSPACE_STATE_VERSION,
    currentUserId: OWNER,
    people: [
      { id: OWNER, name: "Workspace Owner", firstName: "Workspace", lastName: "Owner", category: "staff", initials: "WO", title: "Founder / Super admin", email: "hello@jojunitechnologies.com.ng", color: "#d90429", owner: true },
      { id: ADA, name: "Ada Madu", firstName: "Ada", lastName: "Madu", category: "staff", initials: "AM", title: "Delivery lead", email: "ada@jojunitechnologies.com.ng", color: "#111111" },
      { id: EMEKA, name: "Emeka Obi", firstName: "Emeka", lastName: "Obi", category: "staff", initials: "EO", title: "Finance & operations", email: "emeka@jojunitechnologies.com.ng", color: "#6f6f6f" },
      { id: KENE, name: "Kene Ibe", firstName: "Kene", lastName: "Ibe", category: "staff", initials: "KI", title: "Product designer", email: "kene@jojunitechnologies.com.ng", color: "#0f766e" },
      { id: BOLA, name: "Bola Nnaji", firstName: "Bola", lastName: "Nnaji", category: "staff", initials: "BN", title: "Engineer", email: "bola@jojunitechnologies.com.ng", color: "#7c3aed" },

      /* Contacts, not colleagues. These are the two sides of the business:
         the people who pay us and the people we pay. Kept out of project
         membership so they never appear in an assignment menu. */
      {
        id: "client-aviel",
        name: "Aviel Karis",
        firstName: "Aviel",
        lastName: "Karis",
        category: "client",
        initials: "AK",
        title: "Director",
        email: "accounts@avielkaris.com",
        phone: "+234 803 000 0001",
        whatsapp: "+234 803 000 0001",
        address: "12B Woji Road, GRA Phase 2, Port Harcourt, Rivers State",
        company: "Aviel Karis Limited",
        color: "#1d4ed8",
      },
      {
        id: "client-western",
        name: "Western Dada",
        firstName: "Western",
        lastName: "Dada",
        category: "client",
        initials: "WD",
        title: "Managing Director",
        email: "info@westerndada.com",
        phone: "+234 802 000 0002",
        whatsapp: "+234 802 000 0002",
        address: "Plot 5, Trans-Amadi Industrial Layout, Port Harcourt",
        company: "Western Dada Limited",
        color: "#0e7490",
      },
      {
        id: "vendor-fresh",
        name: "Chidi Okonkwo",
        firstName: "Chidi",
        lastName: "Okonkwo",
        category: "vendor",
        initials: "CO",
        title: "Freelance designer",
        email: "chidi.okonkwo@gmail.com",
        phone: "+234 701 000 0003",
        whatsapp: "+234 701 000 0003",
        address: "Rumuokoro, Port Harcourt",
        freelance: true,
        color: "#b45309",
      },
    ],
    projects,
    todoLists,
    todos,
    posts,
    chats,
    chat,
    events,
    folders,
    docs,
    cardColumns,
    cards,
    hill,
    checkins,
    notes,
    bookmarks,
    ledger,
  };
}
