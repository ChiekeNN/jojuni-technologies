/**
 * Hill chart.
 *
 * The left slope is "still figuring it out"; the right slope is "executing".
 * A dot's height reads as certainty, not percentage complete — which is the
 * whole point of the chart. Drag a dot, or use the sliders below.
 */
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { hillPoint, type ID } from "../model";
import { Button, Field, IconButton, TextInput } from "../ui";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_X = 44;
const PAD_Y = 28;

/** Turns a 0–100 progress value into SVG coordinates inside the chart box. */
function toSvg(progress: number) {
  const { x, y } = hillPoint(progress);
  return {
    cx: PAD_X + x * (WIDTH - PAD_X * 2),
    cy: HEIGHT - PAD_Y - y * (HEIGHT - PAD_Y * 2),
  };
}

/** The hill outline: up one side, down the other. */
function hillPath() {
  const points: string[] = [];
  for (let step = 0; step <= 100; step += 2) {
    const { x, y } = hillPoint(step);
    const px = PAD_X + x * (WIDTH - PAD_X * 2);
    const py = HEIGHT - PAD_Y - y * (HEIGHT - PAD_Y * 2);
    points.push(`${step === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`);
  }
  return points.join(" ");
}

export function HillTab({ projectId }: { projectId: ID }) {
  const { state, actions } = useWorkspace();
  const [newScope, setNewScope] = useState("");
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<ID | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scopes = state.hill.filter((scope) => scope.projectId === projectId);
  const uphill = scopes.filter((scope) => scope.progress <= 50);
  const downhill = scopes.filter((scope) => scope.progress > 50);

  /** Converts a pointer position back into a 0–100 progress value. */
  const progressFromEvent = (clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const y = ((clientY - rect.top) / rect.height) * HEIGHT;
    // `normX` is the fraction across the whole hill (0→1); the peak sits at 0.5.
    const normX = (x - PAD_X) / (WIDTH - PAD_X * 2);
    const normY = (HEIGHT - PAD_Y - y) / (HEIGHT - PAD_Y * 2);
    const clampedX = Math.max(0, Math.min(1, normX));
    if (clampedX <= 0.5) {
      // Uphill: blend horizontal and vertical position so the dot feels
      // attached to the slope rather than snapping to a fixed row.
      const climb = Math.max(0, Math.min(1, clampedX * 2));
      const blended = (climb + normY) / 2;
      return Math.round(blended * 100) / 2;
    }
    const descent = Math.max(0, Math.min(1, (clampedX - 0.5) * 2));
    const blended = (descent + (1 - normY)) / 2;
    return Math.round(50 + blended * 50);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-black">Where things really stand</h3>
            <p className="mt-0.5 text-xs text-black/45">
              Left of the peak: still figuring it out. Right of the peak: executing. Drag a dot.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Scope
          </Button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-label="Hill chart"
          onPointerMove={(event) => {
            if (!draggingId) return;
            actions.setHillProgress(draggingId, progressFromEvent(event.clientX, event.clientY));
          }}
          onPointerUp={() => setDraggingId(null)}
          onPointerLeave={() => setDraggingId(null)}
        >
          <defs>
            <linearGradient id="hillFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d90429" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#d90429" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* baseline */}
          <line
            x1={PAD_X}
            y1={HEIGHT - PAD_Y}
            x2={WIDTH - PAD_X}
            y2={HEIGHT - PAD_Y}
            stroke="#00000018"
            strokeWidth={1}
          />

          {/* the hill */}
          <path
            d={`${hillPath()} L${WIDTH - PAD_X},${HEIGHT - PAD_Y} L${PAD_X},${HEIGHT - PAD_Y} Z`}
            fill="url(#hillFill)"
          />
          <path d={hillPath()} fill="none" stroke="#00000045" strokeWidth={1.75} />

          {/* peak marker */}
          <line
            x1={WIDTH / 2}
            y1={HEIGHT - PAD_Y}
            x2={WIDTH / 2}
            y2={PAD_Y}
            stroke="#00000020"
            strokeDasharray="4 5"
          />

          <text x={PAD_X} y={HEIGHT - 10} fontSize="10" fill="#00000055" fontWeight="600">
            FIGURING IT OUT
          </text>
          <text x={WIDTH - PAD_X} y={HEIGHT - 10} fontSize="10" fill="#00000055" fontWeight="600" textAnchor="end">
            EXECUTING
          </text>

          {scopes.map((scope) => {
            const point = toSvg(scope.progress);
            const isDragging = draggingId === scope.id;
            return (
              <g
                key={scope.id}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDraggingId(scope.id);
                }}
              >
                <circle cx={point.cx} cy={point.cy} r={isDragging ? 9 : 7} fill="#d90429" fillOpacity={isDragging ? 0.95 : 0.85} />
                <circle cx={point.cx} cy={point.cy} r={2.5} fill="#ffffff" />
                <text
                  x={point.cx + (point.cx > WIDTH * 0.62 ? -12 : 12)}
                  y={point.cy + 3.5}
                  fontSize="10.5"
                  fill="#000000aa"
                  fontWeight="600"
                  textAnchor={point.cx > WIDTH * 0.62 ? "end" : "start"}
                  style={{ pointerEvents: "none" }}
                >
                  {scope.label}
                </text>
              </g>
            );
          })}
        </svg>

        {!scopes.length && (
          <p className="py-6 text-center text-xs text-black/35">Add a scope to plot it on the hill.</p>
        )}
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">Scopes</p>
          <div className="mt-2 space-y-2.5">
            {scopes.map((scope) => (
              <div key={scope.id}>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-black">{scope.label}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-black/40">{scope.progress}%</span>
                  <IconButton label="Delete scope" tone="danger" onClick={() => actions.deleteHillScope(scope.id)}>
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={scope.progress}
                  onChange={(event) => actions.setHillProgress(scope.id, Number(event.target.value))}
                  className="mt-1 h-1 w-full cursor-pointer appearance-none rounded bg-black/10 accent-[#d90429]"
                  aria-label={`${scope.label} progress`}
                />
              </div>
            ))}
            {!scopes.length && <p className="text-xs text-black/35">No scopes yet.</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="text-lg font-bold tabular-nums text-[#d90429]">{uphill.length}</p>
            <p className="text-[10px] leading-tight text-black/45">still figuring it out</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="text-lg font-bold tabular-nums text-emerald-600">{downhill.length}</p>
            <p className="text-[10px] leading-tight text-black/45">executing</p>
          </div>
        </div>
      </aside>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[15vh]">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="mb-3 text-sm font-bold text-black">Add a scope</h2>
            <Field label="What is it?">
              <TextInput
                autoFocus
                value={newScope}
                placeholder="e.g. Payment retries"
                onChange={(event) => setNewScope(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newScope.trim()) {
                    actions.addHillScope(projectId, newScope.trim());
                    setNewScope("");
                    setAdding(false);
                  }
                  if (event.key === "Escape") setAdding(false);
                }}
              />
            </Field>
            <div className="mt-3 flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                tone="primary"
                onClick={() => {
                  if (!newScope.trim()) return;
                  actions.addHillScope(projectId, newScope.trim());
                  setNewScope("");
                  setAdding(false);
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
