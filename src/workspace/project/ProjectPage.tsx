/**
 * A project's own page: header, tabs, and Basecamp-style overview.
 */
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Eye,
  FileText,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Network,
  Repeat,
  TrendingUp,
  Users,
} from "lucide-react";

import { useWorkspace } from "../store";
import { assignablePeople,
  dueLabel,
  hillForProject,
  isOverdue,
  projectProgress,
  relativeTime,
  upcomingEvents,
  hillPoint,
  type ID,
} from "../model";
import { Avatar, AvatarStack, Button, Chip, Panel, ProgressBar, cx } from "../ui";
import { BoardTab } from "./BoardTab";
import { CampfireTab } from "./CampfireTab";
import { CardsTab } from "./CardsTab";
import { CheckinsTab } from "./CheckinsTab";
import { FilesTab } from "./FilesTab";
import { HillTab } from "./HillTab";
import { ScheduleTab } from "./ScheduleTab";
import { TodosTab } from "./TodosTab";

export const PROJECT_TABS = [
  { id: "overview", slug: "overview", label: "Overview", icon: TrendingUp },
  { id: "board", slug: "message-board", label: "Message board", icon: MessageSquare },
  { id: "todos", slug: "todos", label: "To-dos", icon: CheckSquare2 },
  { id: "cards", slug: "card-table", label: "Card table", icon: LayoutGrid },
  { id: "hill", slug: "hill-chart", label: "Hill chart", icon: Network },
  { id: "campfire", slug: "campfire", label: "Campfire", icon: MessageSquare },
  { id: "schedule", slug: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "files", slug: "docs-and-files", label: "Docs & files", icon: FileText },
  { id: "checkins", slug: "check-ins", label: "Check-ins", icon: Repeat },
] as const;

export type ProjectTabId = (typeof PROJECT_TABS)[number]["id"];

/** Accepts a URL slug ("hill-chart"), a tab id ("hill") or a label ("Hill chart"). */
export function tabByLabel(value: string): ProjectTabId | undefined {
  const needle = value.trim().toLowerCase();
  return PROJECT_TABS.find(
    (tab) => tab.slug === needle || tab.id === needle || tab.label.toLowerCase() === needle,
  )?.id;
}

export function slugForTab(id: ProjectTabId): string {
  return PROJECT_TABS.find((tab) => tab.id === id)?.slug ?? id;
}

export function ProjectPage({
  projectId,
  tab,
  onTab,
  onBack,
}: {
  projectId: ID;
  tab: ProjectTabId;
  onTab: (tab: ProjectTabId) => void;
  onBack: () => void;
}) {
  const { state, actions } = useWorkspace();
  const [clientView, setClientView] = useState(false);
  const project = state.projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-black">That project no longer exists.</p>
        <Button className="mt-3" onClick={onBack}>
          Back to home
        </Button>
      </div>
    );
  }

  const members = assignablePeople(state.people).filter((person) => project.members.includes(person.id));
  const progress = projectProgress(state, project.id);
  const openTodos = state.todos.filter((todo) => todo.projectId === project.id && !todo.done);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-black/45 transition hover:text-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </button>

      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded text-xs font-black text-white"
                style={{ backgroundColor: project.color }}
              >
                {project.code}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-[-0.03em] text-black">{project.name}</h1>
                <p className="text-xs text-black/45">
                  {project.client} · {dueLabel(project.start)} → {dueLabel(project.end)}
                  {project.status === "archived" && " · archived"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AvatarStack people={members} max={5} />
            <button
              type="button"
              onClick={() => setClientView((on) => !on)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-semibold transition",
                clientView
                  ? "border-[#d90429] bg-[#d90429] text-white"
                  : "border-black/15 bg-white text-black/60 hover:border-black/40 hover:text-black",
              )}
              title="Preview what a client would see"
            >
              <Eye className="h-3.5 w-3.5" /> {clientView ? "Client view on" : "Client view"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progress} color={project.color} />
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-black/50">{progress}%</span>
        </div>
      </header>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-black/10 pb-px">
        {PROJECT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-semibold transition",
              tab === item.id
                ? "border-[#d90429] text-black"
                : "border-transparent text-black/45 hover:border-black/20 hover:text-black",
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {clientView && (
        <p className="mb-3 rounded border border-[#d90429]/25 bg-[#d90429]/5 px-3 py-2 text-[11px] text-[#8c0219]">
          Client view is on: internal-only posts, docs and files are hidden.
        </p>
      )}

      {tab === "overview" && (
        <Overview projectId={project.id} onTab={onTab} clientView={clientView} openTodos={openTodos.length} />
      )}
      {tab === "board" && <BoardTab projectId={project.id} clientView={clientView} />}
      {tab === "todos" && <TodosTab projectId={project.id} />}
      {tab === "cards" && <CardsTab projectId={project.id} />}
      {tab === "hill" && <HillTab projectId={project.id} />}
      {tab === "campfire" && <CampfireTab projectId={project.id} />}
      {tab === "schedule" && <ScheduleTab projectId={project.id} />}
      {tab === "files" && <FilesTab projectId={project.id} clientView={clientView} />}
      {tab === "checkins" && <CheckinsTab projectId={project.id} />}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-3">
        <Button onClick={() => actions.archiveProject(project.id, project.status !== "archived")}>
          {project.status === "archived" ? "Restore project" : "Archive project"}
        </Button>
        <Button
          tone="danger"
          onClick={() => {
            if (window.confirm(`Delete “${project.name}” and everything in it? This cannot be undone.`)) {
              actions.deleteProject(project.id);
              onBack();
            }
          }}
        >
          Delete project
        </Button>
      </div>
    </div>
  );
}

function Overview({
  projectId,
  onTab,
  clientView,
  openTodos,
}: {
  projectId: ID;
  onTab: (tab: ProjectTabId) => void;
  clientView: boolean;
  openTodos: number;
}) {
  const { state } = useWorkspace();
  const project = state.projects.find((item) => item.id === projectId)!;
  const posts = state.posts
    .filter((post) => post.projectId === projectId && (!clientView || post.clientVisible))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const events = upcomingEvents(state, 20).filter((event) => event.projectId === projectId).slice(0, 4);
  const todos = state.todos.filter((todo) => todo.projectId === projectId && !todo.done);
  const scopes = hillForProject(state, projectId);
  const members = assignablePeople(state.people).filter((person) => project.members.includes(person.id));
  const chats = state.chats.filter((chat) => chat.projectId === projectId).slice(-3);

  return (
    <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-3">
      <div className="min-w-0 space-y-4 lg:col-span-2">
        <Panel>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-black">Latest from the board</h2>
            <button type="button" onClick={() => onTab("board")} className="text-[11px] font-semibold text-black/40 hover:text-black">
              Open board
            </button>
          </div>
          <div className="space-y-3">
            {!posts.length && <p className="text-xs text-black/35">No posts yet.</p>}
            {posts.map((post) => {
              const author = state.people.find((person) => person.id === post.authorId);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onTab("board")}
                  className="block w-full border-b border-black/6 pb-2.5 text-left last:border-0 last:pb-0"
                >
                  <p className="text-sm font-semibold leading-snug text-black">{post.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-black/50">{post.body}</p>
                  <p className="mt-1 text-[10px] text-black/35">
                    {author?.name ?? "Someone"} · {relativeTime(post.createdAt)} · {post.replies.length} replies
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
          <Panel>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-black">Open to-dos</h2>
              <span className="text-[11px] font-semibold text-black/40">{openTodos}</span>
            </div>
            <ul className="space-y-2">
              {todos.slice(0, 5).map((todo) => {
                const person = state.people.find((item) => item.id === todo.assigneeId);
                return (
                  <li key={todo.id} className="flex items-center gap-2">
                    <Avatar person={person} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-xs text-black/75">{todo.title}</span>
                    <span className={cx("shrink-0 text-[10px]", isOverdue(todo.due) ? "font-semibold text-[#d90429]" : "text-black/35")}>
                      {todo.due ? dueLabel(todo.due) : ""}
                    </span>
                  </li>
                );
              })}
              {!todos.length && <li className="text-xs text-black/35">Nothing open.</li>}
            </ul>
            <button type="button" onClick={() => onTab("todos")} className="mt-3 text-[11px] font-semibold text-black/40 hover:text-black">
              All to-dos →
            </button>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-black">Coming up</h2>
              <button type="button" onClick={() => onTab("schedule")} className="text-[11px] font-semibold text-black/40 hover:text-black">
                Calendar
              </button>
            </div>
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d90429]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-black">{event.title}</span>
                    <span className="block text-[10px] text-black/40">
                      {dueLabel(event.date)} · {event.time}
                    </span>
                  </span>
                </li>
              ))}
              {!events.length && <li className="text-xs text-black/35">Nothing scheduled.</li>}
            </ul>
          </Panel>
        </div>

        <Panel>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-black">Hill chart</h2>
            <button type="button" onClick={() => onTab("hill")} className="text-[11px] font-semibold text-black/40 hover:text-black">
              Full chart
            </button>
          </div>
          <MiniHill scopes={scopes} />
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel>
          <h2 className="mb-2 text-sm font-bold text-black">About this project</h2>
          <p className="text-xs leading-relaxed text-black/60">{project.description}</p>
          <dl className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-black/40">Client</dt>
              <dd className="font-semibold text-black/75">{project.client}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-black/40">Started</dt>
              <dd className="font-semibold text-black/75">{dueLabel(project.start)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-black/40">Target</dt>
              <dd className="font-semibold text-black/75">{dueLabel(project.end)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-black/40">Client visibility</dt>
              <dd className="font-semibold text-black/75">{project.clientVisible ? "Shared" : "Internal"}</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-black">
            <Users className="h-3.5 w-3.5" /> People ({members.length})
          </h2>
          <ul className="space-y-2">
            {members.map((person) => (
              <li key={person.id} className="flex items-center gap-2">
                <Avatar person={person} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-black">{person.name}</span>
                  <span className="block truncate text-[10px] text-black/40">{person.title}</span>
                </span>
                {person.owner && <Chip tone="dark">Owner</Chip>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-black">Campfire</h2>
            <button type="button" onClick={() => onTab("campfire")} className="text-[11px] font-semibold text-black/40 hover:text-black">
              Open
            </button>
          </div>
          <ul className="space-y-2">
            {chats.map((chat) => {
              const person = state.people.find((item) => item.id === chat.authorId);
              return (
                <li key={chat.id} className="flex gap-1.5">
                  <Avatar person={person} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold text-black/60">{person?.name}</span>
                    <span className="line-clamp-2 text-[11px] leading-snug text-black/50">{chat.body}</span>
                  </span>
                </li>
              );
            })}
            {!chats.length && <li className="text-xs text-black/35">Quiet in here.</li>}
          </ul>
        </Panel>

        <Panel>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-black">
            <ListTodo className="h-3.5 w-3.5" /> Quick numbers
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Open to-dos", value: state.todos.filter((todo) => todo.projectId === projectId && !todo.done).length },
              { label: "Done", value: state.todos.filter((todo) => todo.projectId === projectId && todo.done).length },
              { label: "Cards", value: state.cards.filter((card) => card.projectId === projectId).length },
              { label: "Docs", value: state.docs.filter((doc) => doc.projectId === projectId).length },
            ].map((stat) => (
              <div key={stat.label} className="rounded border border-black/8 px-2 py-1.5">
                <p className="text-base font-bold tabular-nums text-black">{stat.value}</p>
                <p className="text-[10px] leading-tight text-black/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Small hill chart drawn with plain divs, used on the overview. */
function MiniHill({ scopes }: { scopes: { id: string; label: string; progress: number }[] }) {
  if (!scopes.length) return <p className="text-xs text-black/35">No scopes on the hill yet.</p>;
  return (
    <div className="relative h-32 overflow-hidden rounded border border-black/8 bg-black/[0.015]">
      <svg viewBox="0 0 300 120" className="h-full w-full">
        <path d="M10,110 Q80,10 150,10 Q220,10 290,110" fill="none" stroke="#00000025" strokeWidth={1.5} />
        <line x1="150" y1="10" x2="150" y2="110" stroke="#00000012" strokeDasharray="3 4" />
        {scopes.map((scope) => {
          const point = hillPoint(scope.progress);
          const cx = 10 + point.x * 280; // x is now 0→1 across the whole hill
          const cy = 110 - point.y * 95;
          return <circle key={scope.id} cx={cx} cy={cy} r={4} fill="#d90429" fillOpacity={0.8} />;
        })}
      </svg>
    </div>
  );
}
