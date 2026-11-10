/**
 * Workspace shell: sidebar, top bar, keyboard-driven Everything search, and
 * the Basecamp-style "My Bar" pinned to the bottom of the screen.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  Command,
  FolderKanban,
  Home,
  LayoutGrid,
  ListTodo,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  MessageCircle,
  NotebookPen,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { Avatar, Chip, cx } from "./ui";
import { totalUnread } from "./chat";
import {
  dueLabel,
  isOverdue,
  myAssignments,
  overdueTodos,
  relativeTime,
  type WorkspaceState,
} from "./model";

export type TopView =
  | "home"
  | "mywork"
  | "everything"
  | "lineup"
  | "people"
  | "reports"
  | "finance"
  | "chat"
  | "settings";

export interface NavCounts {
  openTodos: number;
  overdue: number;
}

const topNav: { id: TopView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "mywork", label: "My work", icon: CheckSquare2 },
  { id: "everything", label: "Everything", icon: LayoutGrid },
  { id: "lineup", label: "Lineup", icon: CalendarDays },
  { id: "reports", label: "Reports", icon: Network },
  { id: "people", label: "People", icon: Users },
  { id: "finance", label: "Finance", icon: ListTodo },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Shell({
  state,
  view,
  activeProjectId,
  onNavigate,
  onOpenProject,
  children,
  onSignOut,
}: {
  state: WorkspaceState;
  view: TopView;
  activeProjectId: string | null;
  onNavigate: (view: TopView) => void;
  onOpenProject: (projectId: string, tab?: string) => void;
  children: ReactNode;
  onSignOut?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const me = state.people.find((person) => person.id === state.currentUserId);
  const activeProjects = state.projects.filter((project) => project.status === "active");
  const archived = state.projects.filter((project) => project.status === "archived");
  const openTodos = state.todos.filter((todo) => !todo.done).length;
  const overdueCount = overdueTodos(state).length;
  const unread = state.chats.filter((chat) => relativeTime(chat.createdAt).includes("min")).length;

  // Every navigable destination, searched by the command palette.
  const destinations = useMemo(() => {
    const list: { label: string; hint: string; action: () => void; group: string }[] = [];
    for (const item of topNav) {
      list.push({ label: item.label, hint: "Workspace", group: "Pages", action: () => onNavigate(item.id) });
    }
    for (const project of activeProjects) {
      list.push({
        label: project.name,
        hint: project.client,
        group: "Projects",
        action: () => onOpenProject(project.id),
      });
      for (const tab of ["Message board", "To-dos", "Card table", "Campfire", "Schedule", "Docs & files", "Hill chart", "Check-ins"]) {
        list.push({
          label: `${project.name} · ${tab}`,
          hint: project.client,
          group: "Inside projects",
          action: () => onOpenProject(project.id, tab),
        });
      }
    }
    for (const todo of state.todos.filter((item) => !item.done)) {
      const project = state.projects.find((item) => item.id === todo.projectId);
      list.push({
        label: todo.title,
        hint: project ? `${project.name} · to-do` : "To-do",
        group: "To-dos",
        action: () => onOpenProject(todo.projectId, "To-dos"),
      });
    }
    for (const post of state.posts) {
      const project = state.projects.find((item) => item.id === post.projectId);
      list.push({
        label: post.title,
        hint: project ? `${project.name} · post` : "Post",
        group: "Message board",
        action: () => onOpenProject(post.projectId, "Message board"),
      });
    }
    for (const doc of state.docs) {
      const project = state.projects.find((item) => item.id === doc.projectId);
      list.push({
        label: doc.name,
        hint: project ? `${project.name} · ${doc.kind}` : "Doc",
        group: "Docs & files",
        action: () => onOpenProject(doc.projectId, "Docs & files"),
      });
    }
    return list;
  }, [activeProjects, onNavigate, onOpenProject, state.docs, state.posts, state.todos]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return destinations
      .filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(needle))
      .slice(0, 24);
  }, [destinations, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setMobileOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      window.setTimeout(() => searchRef.current?.focus(), 20);
    }
  }, [paletteOpen]);

  const openProject = (projectId: string, tab?: string) => {
    onOpenProject(projectId, tab);
    setMobileOpen(false);
    setPaletteOpen(false);
  };

  const go = (next: TopView) => {
    onNavigate(next);
    setMobileOpen(false);
    setPaletteOpen(false);
  };

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2 text-white" title="Back to the website">
          <span className="grid h-7 w-7 place-items-center rounded bg-[#d90429] text-[11px] font-black">J</span>
          <span className="text-sm font-bold tracking-[-0.02em]">Jojuni</span>
        </a>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="grid h-7 w-7 place-items-center rounded text-white/40 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mb-4 flex w-full items-center gap-2 rounded border border-white/15 bg-white/5 px-2.5 py-2 text-left text-xs text-white/55 transition hover:border-white/30 hover:text-white"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">Jump to anything</span>
          <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-semibold">⌘K</kbd>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarGroup>
          {topNav.slice(0, 5).map((item) => (
            <SidebarLink
              key={item.id}
              active={view === item.id && !activeProjectId}
              onClick={() => go(item.id)}
              icon={<item.icon className="h-4 w-4 shrink-0" />}
              label={item.label}
              badge={item.id === "mywork" && openTodos ? openTodos : undefined}
            />
          ))}
        </SidebarGroup>

        <SidebarLabel>Projects</SidebarLabel>
        <div className="space-y-0.5">
          {activeProjects.map((project) => (
            <SidebarLink
              key={project.id}
              active={activeProjectId === project.id}
              onClick={() => openProject(project.id)}
              icon={
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-sm text-[8px] font-black text-white"
                  style={{ backgroundColor: project.color }}
                >
                  {project.code.slice(0, 2)}
                </span>
              }
              label={project.name}
            />
          ))}
          {archived.length > 0 && (
            <p className="px-2 pt-2 text-[10px] uppercase tracking-[0.1em] text-white/25">
              {archived.length} archived
            </p>
          )}
        </div>

        <SidebarLabel>Workspace</SidebarLabel>
        <SidebarGroup>
          {topNav.slice(5).map((item) => (
            <SidebarLink
              key={item.id}
              active={view === item.id && !activeProjectId}
              onClick={() => go(item.id)}
              icon={<item.icon className="h-4 w-4 shrink-0" />}
              label={item.label}
              badge={item.id === "chat" ? totalUnread(state.chat, state.currentUserId) || undefined : undefined}
            />
          ))}
          <SidebarLink
            onClick={() => go("everything")}
            active={false}
            icon={<FolderKanban className="h-4 w-4 shrink-0" />}
            label="All files & docs"
            muted
          />
          <SidebarLink
            onClick={() => go("mywork")}
            active={false}
            icon={<NotebookPen className="h-4 w-4 shrink-0" />}
            label="Notes & bookmarks"
            muted
          />
        </SidebarGroup>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition hover:bg-white/5"
          >
            <Avatar person={me} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{me?.name ?? "Owner"}</span>
              <span className="block truncate text-[10px] text-white/40">{me?.title ?? "Super admin"}</span>
            </span>
            <ChevronDown className={cx("h-3.5 w-3.5 shrink-0 text-white/30 transition", accountOpen && "rotate-180")} />
          </button>

          {accountOpen && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-full rounded border border-white/15 bg-[#161616] p-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  go("settings");
                  setAccountOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-3.5 w-3.5" /> Settings
              </button>
              <a
                href="/"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Home className="h-3.5 w-3.5" /> Public site
              </a>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-[#ff6b81] hover:bg-white/10"
                >
                  <LogOut className="h-3.5 w-3.5" /> Lock workspace
                </button>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 px-2 text-[10px] leading-relaxed text-white/25">
          Saved in this browser · full access
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-black">
      {/* Sidebar, fixed on desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-[#0e0e0e] lg:block">{sidebar}</aside>

      {/* Sidebar, drawer on mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#0e0e0e]">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f4f2ed]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded border border-black/10 bg-white text-black/60 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-white px-3 py-1.5 text-left text-xs text-black/40 transition hover:border-black/30 sm:max-w-md"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search everything…</span>
              <kbd className="ml-auto hidden rounded bg-black/5 px-1 py-0.5 text-[10px] font-semibold text-black/40 sm:block">⌘K</kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              {overdueCount > 0 && (
                <Chip tone="danger">
                  <Bell className="h-2.5 w-2.5" /> {overdueCount} overdue
                </Chip>
              )}
              <button
                type="button"
                onClick={() => go("mywork")}
                className="relative grid h-8 w-8 place-items-center rounded border border-black/10 bg-white text-black/55 transition hover:text-black"
                aria-label="My work"
                title="My work"
              >
                <CheckSquare2 className="h-4 w-4" />
                {openTodos > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d90429] px-1 text-[9px] font-bold text-white">
                    {openTodos > 99 ? "99+" : openTodos}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => go("home")}
                className="grid h-8 w-8 place-items-center rounded border border-black/10 bg-white text-black/55 transition hover:text-black"
                aria-label="Home"
                title="Home"
              >
                <Home className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go("settings")}
                className="hidden h-8 w-8 place-items-center rounded border border-black/10 bg-white text-black/55 transition hover:text-black sm:grid"
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-5 sm:px-6">{children}</main>
      </div>

      {/* My Bar */}
      <MyBar state={state} onNavigate={go} onOpenProject={openProject} unread={unread} />

      {/* Command palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[10vh]">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-black/35" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) results[0].action();
                }}
                placeholder="Jump to a project, to-do, post or document…"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/30"
              />
              <kbd className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/40">ESC</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {!query.trim() && (
                <div className="px-2 py-6 text-center text-xs text-black/35">
                  Type to search every project, to-do, post, document and page.
                </div>
              )}
              {query.trim() && !results.length && (
                <div className="px-2 py-6 text-center text-xs text-black/35">Nothing matches “{query.trim()}”.</div>
              )}
              {results.map((result, index) => (
                <button
                  key={`${result.group}-${result.label}-${index}`}
                  type="button"
                  onClick={result.action}
                  className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition hover:bg-black/5"
                >
                  <Command className="h-3.5 w-3.5 shrink-0 text-black/25" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-black">{result.label}</span>
                    <span className="block truncate text-[10px] text-black/40">{result.hint}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-black/25">{result.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarGroup({ children }: { children: ReactNode }) {
  return <div className="space-y-0.5">{children}</div>;
}

function SidebarLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 mt-5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">{children}</p>
  );
}

function SidebarLink({
  icon,
  label,
  active,
  onClick,
  badge,
  muted,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 rounded px-2 py-[7px] text-left text-xs transition",
        active ? "bg-white/12 font-semibold text-white" : muted ? "text-white/35 hover:bg-white/5 hover:text-white/70" : "text-white/60 hover:bg-white/5 hover:text-white",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-[#d90429] px-1.5 text-[10px] font-bold leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* My Bar                                                              */
/* ------------------------------------------------------------------ */

function MyBar({
  state,
  onNavigate,
  onOpenProject,
  unread,
}: {
  state: WorkspaceState;
  onNavigate: (view: TopView) => void;
  onOpenProject: (projectId: string, tab?: string) => void;
  unread: number;
}) {
  const [openPanel, setOpenPanel] = useState<"tasks" | "events" | "notes" | "bookmarks" | null>(null);
  const { todos } = myAssignments(state);
  const nextEvents = [...state.events]
    .filter((event) => (new Date(`${event.date}T00:00:00`).getTime() ?? 0) >= Date.now() - 86_400_000)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const items = [
    { id: "tasks" as const, label: "My tasks", icon: CheckSquare2, count: todos.length },
    { id: "events" as const, label: "Events", icon: CalendarDays, count: nextEvents.length },
    { id: "notes" as const, label: "Notes", icon: NotebookPen, count: state.notes.length },
    { id: "bookmarks" as const, label: "Bookmarks", icon: MessageSquare, count: state.bookmarks.length },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0e0e0e]">
      {openPanel && (
        <div className="mx-auto max-h-[46vh] max-w-[1500px] overflow-y-auto border-b border-white/10 px-4 py-4 sm:px-6">
          {openPanel === "tasks" && (
            <PanelList
              title="My tasks"
              empty="Nothing assigned to you right now."
              rows={todos.slice(0, 12).map((todo) => {
                const project = state.projects.find((item) => item.id === todo.projectId);
                return {
                  id: todo.id,
                  primary: todo.title,
                  secondary: project?.name ?? "To-do",
                  meta: dueLabel(todo.due),
                  danger: isOverdue(todo.due),
                  onClick: () => {
                    onOpenProject(todo.projectId, "To-dos");
                    setOpenPanel(null);
                  },
                };
              })}
            />
          )}
          {openPanel === "events" && (
            <PanelList
              title="Upcoming events"
              empty="No upcoming dates."
              rows={nextEvents.map((event) => {
                const project = state.projects.find((item) => item.id === event.projectId);
                return {
                  id: event.id,
                  primary: event.title,
                  secondary: project?.name ?? "Event",
                  meta: dueLabel(event.date),
                  onClick: () => {
                    onOpenProject(event.projectId, "Schedule");
                    setOpenPanel(null);
                  },
                };
              })}
            />
          )}
          {openPanel === "notes" && (
            <PanelList
              title="Notes"
              empty="No notes yet."
              rows={state.notes.slice(0, 8).map((note) => ({
                id: note.id,
                primary: note.title,
                secondary: note.body.replace(/\s+/g, " ").slice(0, 90) || "Empty note",
                meta: relativeTime(note.updatedAt),
                onClick: () => {
                  onNavigate("mywork");
                  setOpenPanel(null);
                },
              }))}
            />
          )}
          {openPanel === "bookmarks" && (
            <PanelList
              title="Bookmarks"
              empty="No bookmarks yet."
              rows={state.bookmarks.map((bookmark) => ({
                id: bookmark.id,
                primary: bookmark.label,
                secondary: bookmark.target,
                meta: relativeTime(bookmark.createdAt),
                onClick: () => {
                  const [, projectId] = bookmark.target.split("/");
                  onOpenProject(projectId);
                  setOpenPanel(null);
                },
              }))}
            />
          )}
        </div>
      )}

      <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-2 py-1.5 sm:px-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenPanel((current) => (current === item.id ? null : item.id))}
            className={cx(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition",
              openPanel === item.id ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/8 hover:text-white",
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="rounded bg-white/10 px-1 text-[9px] font-bold text-white/60">{item.count}</span>
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-white/25 sm:flex">
          <span className={cx("h-1.5 w-1.5 rounded-full", unread ? "bg-[#d90429]" : "bg-emerald-500")} />
          {unread ? `${unread} new message${unread === 1 ? "" : "s"}` : "All caught up"}
        </span>
      </div>
    </div>
  );
}

function PanelList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { id: string; primary: string; secondary: string; meta: string; danger?: boolean; onClick: () => void }[];
  empty: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{title}</p>
      {!rows.length && <p className="text-xs text-white/35">{empty}</p>}
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-white/10"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white/85">{row.primary}</span>
              <span className="block truncate text-[10px] text-white/35">{row.secondary}</span>
            </span>
            <span className={cx("shrink-0 text-[10px]", row.danger ? "text-[#ff6b81]" : "text-white/35")}>{row.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
