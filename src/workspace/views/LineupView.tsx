/**
 * The Lineup: every project plotted on a timeline, with key dates underneath.
 */
import { useMemo, useState } from "react";

import { useWorkspace } from "../store";
import { daysUntil, formatDate, projectProgress, type Project } from "../model";
import { Button, Panel, cx } from "../ui";
import { useNewProject } from "../NewProjectModal";
import { Plus } from "lucide-react";

const DAY = 86_400_000;

export function LineupView({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const { state } = useWorkspace();
  const [includeArchived, setIncludeArchived] = useState(false);
  const newProject = useNewProject();
  const [zoom, setZoom] = useState<"fit" | "90" | "180">("fit");

  const projects = state.projects.filter((project) => includeArchived || project.status === "active");

  const { start, end } = useMemo(() => {
    if (!projects.length) {
      const now = Date.now();
      return { start: now - 30 * DAY, end: now + 60 * DAY };
    }
    const starts = projects.map((project) => new Date(`${project.start}T00:00:00`).getTime());
    const ends = projects.map((project) => new Date(`${project.end}T00:00:00`).getTime());
    let from = Math.min(...starts, Date.now());
    let to = Math.max(...ends, Date.now());
    if (zoom === "90") {
      from = Date.now() - 20 * DAY;
      to = Date.now() + 70 * DAY;
    }
    if (zoom === "180") {
      from = Date.now() - 30 * DAY;
      to = Date.now() + 150 * DAY;
    }
    // Pad by a week so bars never touch the edges.
    return { start: from - 7 * DAY, end: to + 7 * DAY };
  }, [projects, zoom]);

  const span = Math.max(DAY, end - start);
  const today = Date.now();
  const todayPct = ((today - start) / span) * 100;

  // Month ticks across the range.
  const ticks = useMemo(() => {
    const marks: { label: string; pct: number }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() < end) {
      marks.push({
        label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(cursor),
        pct: ((cursor.getTime() - start) / span) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return marks;
  }, [end, span, start]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">The Lineup</h1>
          <p className="mt-1 text-sm text-black/50">Every project on one timeline, so overlaps are obvious.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="primary" onClick={newProject}>
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
          <label className="flex items-center gap-1.5 text-[11px] text-black/50">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              className="h-3 w-3 accent-black"
            />
            Include archived
          </label>
          <div className="flex gap-1">
            {(["fit", "90", "180"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setZoom(option)}
                className={cx(
                  "rounded px-2 py-1 text-[11px] font-semibold transition",
                  zoom === option ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
                )}
              >
                {option === "fit" ? "Fit" : `${option} days`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Panel padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* month header */}
            <div className="relative h-7 border-b border-black/8 bg-black/[0.02]">
              {ticks.map((tick) => (
                <span
                  key={`${tick.label}-${tick.pct}`}
                  className="absolute top-1.5 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.06em] text-black/40"
                  style={{ left: `${Math.max(2, Math.min(98, tick.pct))}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>

            {/* rows */}
            <div className="divide-y divide-black/6">
              {projects.map((project) => (
                <LineupRow key={project.id} project={project} start={start} span={span} todayPct={todayPct} onOpen={onOpenProject} />
              ))}
              {!projects.length && <p className="px-4 py-8 text-center text-xs text-black/35">No projects to plot.</p>}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-2 text-sm font-bold text-black">Starting soon</h2>
          <ul className="space-y-1.5">
            {[...projects]
              .filter((project) => (daysUntil(project.start) ?? -1) >= 0)
              .sort((a, b) => a.start.localeCompare(b.start))
              .slice(0, 5)
              .map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-black/75">{project.name}</span>
                  <span className="shrink-0 text-black/35">{formatDate(project.start)}</span>
                </li>
              ))}
            {![...projects].some((project) => (daysUntil(project.start) ?? -1) >= 0) && (
              <li className="text-xs text-black/35">Nothing starting in the near future.</li>
            )}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-2 text-sm font-bold text-black">Ending soon</h2>
          <ul className="space-y-1.5">
            {[...projects]
              .filter((project) => (daysUntil(project.end) ?? -999) >= 0)
              .sort((a, b) => a.end.localeCompare(b.end))
              .slice(0, 5)
              .map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-black/75">{project.name}</span>
                  <span className="shrink-0 text-black/35">{formatDate(project.end)}</span>
                </li>
              ))}
            {![...projects].some((project) => (daysUntil(project.end) ?? -999) >= 0) && (
              <li className="text-xs text-black/35">Nothing ending in the near future.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function LineupRow({
  project,
  start,
  span,
  todayPct,
  onOpen,
}: {
  project: Project;
  start: number;
  span: number;
  todayPct: number;
  onOpen: (projectId: string) => void;
}) {
  const { state } = useWorkspace();
  const from = new Date(`${project.start}T00:00:00`).getTime();
  const to = new Date(`${project.end}T00:00:00`).getTime();
  const left = ((from - start) / span) * 100;
  const width = Math.max(1.2, ((to - from) / span) * 100);
  const progress = projectProgress(state, project.id);

  return (
    <button type="button" onClick={() => onOpen(project.id)} className="block w-full px-3 py-2.5 text-left transition hover:bg-black/[0.02]">
      <div className="relative h-7">
        <span className="absolute left-0 top-0 text-[11px] font-semibold text-black/70">{project.name}</span>
        <span className="absolute right-0 top-0 text-[10px] text-black/30">{progress}%</span>
        <div className="absolute inset-x-0 bottom-0 h-2.5">
          <div
            className="absolute h-2.5 overflow-hidden rounded-full bg-black/8"
            style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100, width)}%` }}
          >
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: project.color }} />
          </div>
          <span className="absolute inset-y-0 w-px bg-[#d90429]" style={{ left: `${Math.max(0, Math.min(100, todayPct))}%` }} />
        </div>
      </div>
    </button>
  );
}

