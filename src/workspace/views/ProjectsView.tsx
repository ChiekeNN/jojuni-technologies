/**
 * Projects: every project as a card, on one page.
 *
 * The sidebar used to list every project under a heading, which pushed the
 * real navigation down the screen and turned a long project list into a second
 * scrollbar. A project is a place you go, not a permanent fixture — so it now
 * has a page of its own, in the same grid shape whether you have three
 * projects or thirty.
 *
 * Cards carry the things you would ask about a project before opening it: who
 * it is for, what we sold them, how far along it is, who is on it, and whether
 * the date is still honest.
 */
import { useMemo, useState } from "react";
import { ArrowUpRight, FolderKanban, Plus, Search } from "lucide-react";

import { useWorkspace } from "../store";
import {
  daysUntil,
  dueLabel,
  formatDate,
  projectProgress,
  projectServiceLabel,
  type Project,
} from "../model";
import { Avatar, Button, Panel, ProgressBar, TextInput, cx } from "../ui";
import { useNewProject } from "../NewProjectModal";

type Filter = "active" | "archived" | "all";

export function ProjectsView({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const { state } = useWorkspace();
  const newProject = useNewProject();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      active: state.projects.filter((project) => project.status === "active").length,
      archived: state.projects.filter((project) => project.status === "archived").length,
      all: state.projects.length,
    }),
    [state.projects],
  );

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return state.projects
      .filter((project) => filter === "all" || project.status === filter)
      .filter((project) => {
        if (!search) return true;
        return [project.name, project.client, project.code, project.description, projectServiceLabel(project)]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        // Soonest deadline first: the project most likely to need attention.
        const left = a.status === "archived" ? 1 : 0;
        const right = b.status === "archived" ? 1 : 0;
        return left - right || a.end.localeCompare(b.end);
      });
  }, [filter, query, state.projects]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">Projects</h1>
          <p className="mt-1 text-sm text-black/50">
            {counts.active} active{counts.archived ? ` · ${counts.archived} archived` : ""} — open one to get to its
            board, files and to-dos.
          </p>
        </div>
        <Button tone="primary" onClick={newProject}>
          <Plus className="h-3.5 w-3.5" /> New project
        </Button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "active", label: "Active" },
              { id: "archived", label: "Archived" },
              { id: "all", label: "All" },
            ] as { id: Filter; label: string }[]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={cx(
                "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition",
                filter === option.id ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
              )}
            >
              {option.label}
              <span className={cx("tabular-nums", filter === option.id ? "text-white/60" : "text-black/30")}>
                {counts[option.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-64 sm:flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="py-1.5 pl-7 text-xs"
          />
        </div>
      </div>

      {!visible.length ? (
        <Panel>
          <div className="py-10 text-center">
            <FolderKanban className="mx-auto h-6 w-6 text-black/15" />
            <p className="mt-2 text-xs text-black/40">
              {query.trim()
                ? "Nothing matches that."
                : filter === "archived"
                  ? "Nothing archived yet."
                  : "No projects yet."}
            </p>
            {!query.trim() && filter !== "archived" && (
              <Button tone="primary" className="mt-3" onClick={newProject}>
                <Plus className="h-3.5 w-3.5" /> New project
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (projectId: string) => void }) {
  const { state } = useWorkspace();
  const progress = projectProgress(state, project.id);
  const members = state.people.filter((person) => project.members.includes(person.id));
  const client = project.clientId ? state.people.find((person) => person.id === project.clientId) : undefined;
  const openTodos = state.todos.filter((todo) => todo.projectId === project.id && !todo.done).length;
  const daysLeft = daysUntil(project.end);
  const archived = project.status === "archived";
  const service = projectServiceLabel(project);

  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className={cx(
        "group flex flex-col rounded-lg border border-black/10 bg-white p-3.5 text-left transition hover:border-black/30 hover:bg-black/[0.015]",
        archived && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded text-[10px] font-black text-white"
          style={{ backgroundColor: project.color }}
        >
          {project.code.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-black">{project.name}</span>
          <span className="block truncate text-[11px] text-black/45">
            {client ? client.company || client.name : project.client || "Internal"}
          </span>
        </span>
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/20 transition group-hover:text-black/50" />
      </div>

      {service && (
        <span className="mt-2 inline-flex w-fit rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/50">
          {service}
        </span>
      )}

      {project.description && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-black/40">{project.description}</p>
      )}

      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2">
          <ProgressBar value={progress} color={project.color} />
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-black/45">{progress}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex shrink-0 -space-x-1">
              {members.slice(0, 4).map((person) => (
                <Avatar key={person.id} person={person} size="xs" ring />
              ))}
            </div>
            {openTodos > 0 && (
              <span className="shrink-0 text-[10px] tabular-nums text-black/35">{openTodos} to-do</span>
            )}
          </div>
          <span
            className={cx(
              "shrink-0 text-[10px]",
              archived
                ? "text-black/30"
                : daysLeft !== null && daysLeft < 0
                  ? "font-semibold text-[#d90429]"
                  : daysLeft !== null && daysLeft <= 7
                    ? "font-semibold text-amber-600"
                    : "text-black/35",
            )}
          >
            {archived
              ? "Archived"
              : daysLeft !== null && daysLeft < 0
                ? `${Math.abs(daysLeft)}d over`
                : `ends ${dueLabel(project.end)}`}
          </span>
        </div>
      </div>
    </button>
  );
}

/** Kept for views that show a bare date range rather than a countdown. */
export function projectRange(project: Project): string {
  return `${formatDate(project.start)} → ${formatDate(project.end)}`;
}
