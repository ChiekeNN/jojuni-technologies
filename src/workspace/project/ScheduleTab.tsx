/**
 * Schedule: project calendar for milestones, deadlines, meetings and events.
 */
import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { dueLabel, formatDate, todayISO, type EventItem, type ID } from "../model";
import { Button, Chip, Field, IconButton, Modal, Select, TextInput, cx } from "../ui";

const KIND_TONE: Record<EventItem["kind"], "danger" | "ok" | "warn" | "neutral"> = {
  Milestone: "ok",
  Deadline: "danger",
  Meeting: "warn",
  Event: "neutral",
};

const KIND_DOT: Record<EventItem["kind"], string> = {
  Milestone: "#059669",
  Deadline: "#d90429",
  Meeting: "#b45309",
  Event: "#525252",
};

export function ScheduleTab({ projectId }: { projectId: ID }) {
  const { state, actions } = useWorkspace();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [adding, setAdding] = useState(false);

  const events = state.events.filter((event) => event.projectId === projectId);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(first);
      date.setDate(date.getDate() - (startOffset - i));
      cells.push({ iso: date.toISOString().slice(0, 10), day: date.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      cells.push({ iso: date.toISOString().slice(0, 10), day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(`${cells[cells.length - 1].iso}T00:00:00`);
      last.setDate(last.getDate() + 1);
      cells.push({ iso: last.toISOString().slice(0, 10), day: last.getDate(), inMonth: false });
    }
    return cells;
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(cursor);
  const today = todayISO();
  const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="flex items-center gap-2 border-b border-black/8 px-3 py-2.5">
          <IconButton label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <h3 className="min-w-0 flex-1 text-sm font-bold text-black">{monthLabel}</h3>
          <Button
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <IconButton label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <Button tone="primary" onClick={() => setAdding(true)}>
            <CalendarPlus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-black/8 bg-black/[0.02]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-black/40">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const dayEvents = events.filter((event) => event.date === cell.iso);
            return (
              <div
                key={cell.iso}
                className={cx(
                  "min-h-[76px] border-b border-r border-black/6 p-1",
                  !cell.inMonth && "bg-black/[0.015]",
                  cell.iso === today && "bg-[#d90429]/5",
                )}
              >
                <span
                  className={cx(
                    "inline-grid h-5 min-w-5 place-items-center rounded px-1 text-[11px]",
                    cell.iso === today ? "bg-[#d90429] font-bold text-white" : cell.inMonth ? "text-black/65" : "text-black/25",
                  )}
                >
                  {cell.day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      title={`${event.title} · ${event.time}`}
                      className="flex w-full items-center gap-1 rounded bg-black/[0.04] px-1 py-0.5 text-left text-[9px] font-medium text-black/75 transition hover:bg-black/10"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: KIND_DOT[event.kind] }} />
                      <span className="truncate">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="px-1 text-[9px] text-black/35">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">Key dates</p>
          <ul className="mt-2 space-y-2">
            {!upcoming.length && <li className="text-xs text-black/35">Nothing scheduled yet.</li>}
            {upcoming.map((event) => (
              <li key={event.id} className="group flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: KIND_DOT[event.kind] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-black">{event.title}</p>
                  <p className="text-[10px] text-black/40">
                    {formatDate(event.date, true)} · {event.time} · {dueLabel(event.date)}
                  </p>
                </div>
                <IconButton label="Delete event" tone="danger" onClick={() => actions.deleteEvent(event.id)}>
                  <Trash2 className="h-3 w-3" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">By type</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(KIND_TONE) as EventItem["kind"][]).map((kind) => (
              <Chip key={kind} tone={KIND_TONE[kind]}>
                {kind} · {events.filter((event) => event.kind === kind).length}
              </Chip>
            ))}
          </div>
        </div>
      </aside>

      <AddEvent open={adding} onClose={() => setAdding(false)} projectId={projectId} />
    </div>
  );
}

function AddEvent({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: ID }) {
  const { actions } = useWorkspace();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [kind, setKind] = useState<EventItem["kind"]>("Meeting");

  const submit = () => {
    if (!title.trim() || !date) return;
    actions.addEvent({ projectId, title: title.trim(), date, time, kind });
    setTitle("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to schedule">
      <div className="space-y-3">
        <Field label="Title">
          <TextInput autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Client review, launch, copy freeze…" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Time">
            <TextInput type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(event) => setKind(event.target.value as EventItem["kind"])}>
              <option value="Meeting">Meeting</option>
              <option value="Milestone">Milestone</option>
              <option value="Deadline">Deadline</option>
              <option value="Event">Event</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" onClick={submit}>
            Add date
          </Button>
        </div>
      </div>
    </Modal>
  );
}
