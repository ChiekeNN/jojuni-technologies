/**
 * Home: the workspace dashboard. Everything a super admin wants in the first
 * three seconds — what is late, what is coming, what changed, where to go.
 */
import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare2,
  Clock3,
  FolderKanban,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useWorkspace } from "../store";
import {
  activityFeed,
  daysUntil,
  dueLabel,
  formatDate,
  hillForProject,
  hillPoint,
  isOverdue,
  overdueTodos,
  projectProgress,
  relativeTime,
  upcomingEvents,
  type ID,
} from "../model";
import { Avatar, Button, Panel, ProgressBar, cx } from "../ui";
import type { TopView } from "../Shell";
import { useNewProject } from "../NewProjectModal";

export function HomeView({
  onOpenProject,
  onNavigate,
}: {
  onOpenProject: (projectId: ID, tab?: string) => void;
  onNavigate: (view: TopView) => void;
}) {
  const { state, actions } = useWorkspace();
  const newProject = useNewProject();
  const me = state.people.find((person) => person.id === state.currentUserId);

  const activeProjects = state.projects.filter((project) => project.status === "active");
  const openTodos = state.todos.filter((todo) => !todo.done);
  const late = overdueTodos(state);
  const dueThisWeek = openTodos.filter((todo) => {
    const days = daysUntil(todo.due);
    return days !== null && days >= 0 && days <= 7;
  });
  const feed = activityFeed(state, 12);
  const events = upcomingEvents(state, 6);

  const income = state.ledger.filter((entry) => entry.type === "Income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = state.ledger.filter((entry) => entry.type === "Expense").reduce((sum, entry) => sum + entry.amount, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">
            {greeting}, {me?.name?.split(" ")[0] ?? "Owner"}
          </h1>
          <p className="mt-1 text-sm text-black/50">
            {activeProjects.length} active projects · {openTodos.length} open to-dos · {late.length} overdue
          </p>
        </div>
        <Button tone="primary" onClick={newProject}>
          <Plus className="h-3.5 w-3.5" /> New project
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Open to-dos"
          value={openTodos.length}
          hint={`${dueThisWeek.length} due this week`}
          icon={<CheckSquare2 className="h-4 w-4" />}
          onClick={() => onNavigate("mywork")}
        />
        <Stat
          label="Overdue"
          value={late.length}
          hint={late.length ? "Needs attention today" : "Nothing late"}
          tone={late.length ? "danger" : "ok"}
          icon={<Clock3 className="h-4 w-4" />}
          onClick={() => onNavigate("mywork")}
        />
        <Stat
          label="Active projects"
          value={activeProjects.length}
          hint={`${state.projects.filter((project) => project.status === "archived").length} archived`}
          icon={<FolderKanban className="h-4 w-4" />}
          onClick={() => onNavigate("lineup")}
        />
        <Stat
          label="Net position"
          value={formatNaira(income - expense)}
          hint={`${formatNaira(income)} in · ${formatNaira(expense)} out`}
          icon={income - expense >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          onClick={() => onNavigate("finance")}
        />
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Panel>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-black">Projects</h2>
              <button type="button" onClick={() => onNavigate("lineup")} className="text-[11px] font-semibold text-black/40 hover:text-black">
                Lineup →
              </button>
            </div>
            <div className="grid gap-2.5 [&>*]:min-w-0 sm:grid-cols-2">
              {activeProjects.map((project) => {
                const progress = projectProgress(state, project.id);
                const members = state.people.filter((person) => project.members.includes(person.id));
                const daysLeft = daysUntil(project.end);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="group min-w-0 rounded-lg border border-black/10 p-3 text-left transition hover:border-black/30 hover:bg-black/[0.015]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded text-[9px] font-black text-white"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-black">{project.name}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-black/20 transition group-hover:text-black/50" />
                    </div>
                    <p className="mt-1.5 truncate text-[11px] text-black/45">{project.client}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={progress} color={project.color} />
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-black/45">{progress}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex -space-x-1">
                        {members.slice(0, 4).map((person) => (
                          <Avatar key={person.id} person={person} size="xs" ring />
                        ))}
                      </div>
                      <span
                        className={cx(
                          "text-[10px]",
                          daysLeft !== null && daysLeft < 0
                            ? "font-semibold text-[#d90429]"
                            : daysLeft !== null && daysLeft <= 7
                              ? "font-semibold text-amber-600"
                              : "text-black/35",
                        )}
                      >
                        {daysLeft !== null && daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `ends ${dueLabel(project.end)}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-black">Needs attention</h2>
              <button type="button" onClick={() => onNavigate("mywork")} className="text-[11px] font-semibold text-black/40 hover:text-black">
                My work →
              </button>
            </div>
            {!late.length && !dueThisWeek.length && (
              <p className="py-4 text-center text-xs text-black/35">Nothing overdue and nothing due this week. Good place to be.</p>
            )}
            <ul className="divide-y divide-black/6">
              {[...late, ...dueThisWeek].slice(0, 7).map((todo) => {
                const project = state.projects.find((item) => item.id === todo.projectId);
                const person = state.people.find((item) => item.id === todo.assigneeId);
                return (
                  <li key={todo.id} className="flex items-center gap-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => actions.toggleTodo(todo.id)}
                      aria-label="Complete"
                      className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-black/25 transition hover:border-emerald-600 hover:bg-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => onOpenProject(todo.projectId, "To-dos")}
                      className="min-w-0 flex-1 truncate text-left text-xs text-black/80 hover:text-black"
                    >
                      {todo.title}
                    </button>
                    <span className="hidden shrink-0 text-[10px] text-black/35 sm:block">{project?.name}</span>
                    <span
                      className={cx(
                        "shrink-0 text-[10px]",
                        isOverdue(todo.due) ? "font-semibold text-[#d90429]" : "text-black/40",
                      )}
                    >
                      {dueLabel(todo.due)}
                    </span>
                    <Avatar person={person} size="xs" />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-black">Next up</h2>
              <button type="button" onClick={() => onNavigate("lineup")} className="text-[11px] font-semibold text-black/40 hover:text-black">
                All dates
              </button>
            </div>
            <ul className="space-y-2.5">
              {events.map((event) => {
                const project = state.projects.find((item) => item.id === event.projectId);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProject(event.projectId, "Schedule")}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded bg-black/[0.04]">
                        <CalendarDays className="h-3.5 w-3.5 text-black/40" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-black">{event.title}</span>
                        <span className="block truncate text-[10px] text-black/40">
                          {formatDate(event.date)} · {event.time} · {project?.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-black/35">{dueLabel(event.date)}</span>
                    </button>
                  </li>
                );
              })}
              {!events.length && <li className="text-xs text-black/35">No upcoming dates.</li>}
            </ul>
          </Panel>

          <Panel>
            <h2 className="mb-2 text-sm font-bold text-black">Where the work stands</h2>
            <div className="space-y-2.5">
              {activeProjects.slice(0, 3).map((project) => {
                const scopes = hillForProject(state, project.id);
                return (
                  <div key={project.id}>
                    <p className="mb-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-black/60">{project.name}</span>
                      <span className="text-black/35">
                        {scopes.filter((scope) => scope.progress <= 50).length} uphill ·{" "}
                        {scopes.filter((scope) => scope.progress > 50).length} downhill
                      </span>
                    </p>
                    <div className="relative h-9 overflow-hidden rounded border border-black/8 bg-black/[0.015]">
                      <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="h-full w-full">
                        <path d="M4,36 Q80,4 150,4 Q220,4 296,36" fill="none" stroke="#00000022" strokeWidth={1.2} />
                        {scopes.map((scope) => {
                          const point = hillPoint(scope.progress);
                          return (
                            <circle key={scope.id} cx={4 + point.x * 292} cy={36 - point.y * 32} r={2.6} fill="#d90429" fillOpacity={0.75} />
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel padded={false}>
            <div className="border-b border-black/8 px-4 py-2.5">
              <h2 className="text-sm font-bold text-black">Latest activity</h2>
            </div>
            <ul className="divide-y divide-black/6">
              {feed.slice(0, 9).map((item) => {
                const person = state.people.find((entry) => entry.id === item.actorId);
                const project = state.projects.find((entry) => entry.id === item.projectId);
                return (
                  <li key={item.id} className="flex items-start gap-2 px-4 py-2">
                    <Avatar person={person} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-snug text-black/65">
                        <span className="font-semibold text-black/80">{person?.name?.split(" ")[0] ?? "Someone"}</span>{" "}
                        {item.text}
                      </p>
                      <p className="text-[10px] text-black/30">
                        {project?.name} · {relativeTime(item.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
              {!feed.length && <li className="px-4 py-3 text-xs text-black/35">Nothing has happened yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>

    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
  tone?: "neutral" | "danger" | "ok";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg border bg-white p-3.5 text-left transition hover:border-black/30",
        tone === "danger" ? "border-[#d90429]/30" : "border-black/10",
      )}
    >
      <div className="flex items-center gap-1.5 text-black/40">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p
        className={cx(
          "mt-1.5 text-2xl font-bold tabular-nums tracking-[-0.03em]",
          tone === "danger" ? "text-[#d90429]" : tone === "ok" ? "text-emerald-600" : "text-black",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-black/40">{hint}</p>
    </button>
  );
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
function formatNaira(value: number): string {
  return naira.format(value);
}

export { formatNaira };
