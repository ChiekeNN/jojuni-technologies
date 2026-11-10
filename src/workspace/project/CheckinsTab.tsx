/**
 * Automatic check-ins: recurring questions with everyone's answers in one place.
 */
import { useState } from "react";
import { Repeat, Send, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { formatStamp, relativeTime, type ID } from "../model";
import { Avatar, Button, Field, IconButton, Modal, Select, TextArea, TextInput } from "../ui";

const SCHEDULES = [
  "Every Monday at 9:00",
  "Every Monday at 9:00, reminder Wednesday",
  "Every Friday at 15:00",
  "Every day at 9:00",
  "Every other Monday at 9:00",
  "First of the month at 9:00",
];

export function CheckinsTab({ projectId }: { projectId: ID }) {
  const { state } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const checkins = state.checkins.filter((checkin) => checkin.projectId === projectId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-black/45">
          Ask the same question on a schedule and keep every answer in one place, instead of another meeting.
        </p>
        <Button className="ml-auto" tone="primary" onClick={() => setAdding(true)}>
          <Repeat className="h-3.5 w-3.5" /> New check-in
        </Button>
      </div>

      {!checkins.length && (
        <p className="rounded-lg border border-dashed border-black/15 bg-white/50 px-5 py-12 text-center text-sm text-black/45">
          No check-ins yet. “What are you working on this week?” is a good first one.
        </p>
      )}

      {checkins.map((checkin) => (
        <CheckinCard key={checkin.id} checkinId={checkin.id} />
      ))}

      <NewCheckin open={adding} onClose={() => setAdding(false)} projectId={projectId} />
    </div>
  );
}

function CheckinCard({ checkinId }: { checkinId: ID }) {
  const { state, actions } = useWorkspace();
  const [answer, setAnswer] = useState("");
  const checkin = state.checkins.find((item) => item.id === checkinId);
  if (!checkin) return null;

  const answers = [...checkin.answers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <header className="flex items-start gap-2 border-b border-black/8 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-black">{checkin.prompt}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-black/40">
            <Repeat className="h-3 w-3" /> {checkin.schedule} · {checkin.answers.length} answer
            {checkin.answers.length === 1 ? "" : "s"}
          </p>
        </div>
        <IconButton label="Delete check-in" tone="danger" onClick={() => actions.deleteCheckin(checkin.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </header>

      <div className="divide-y divide-black/6">
        {answers.map((item) => {
          const person = state.people.find((entry) => entry.id === item.authorId);
          return (
            <div key={item.id} className="flex gap-2.5 px-4 py-2.5">
              <Avatar person={person} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-black/40">
                  <span className="font-semibold text-black/70">{person?.name ?? "Someone"}</span> ·{" "}
                  {formatStamp(item.createdAt)} ({relativeTime(item.createdAt)})
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-black/75">{item.body}</p>
              </div>
            </div>
          );
        })}
        {!answers.length && <p className="px-4 py-3 text-xs text-black/35">No answers yet.</p>}
      </div>

      <div className="flex items-end gap-2 border-t border-black/8 bg-black/[0.015] p-3">
        <TextArea
          value={answer}
          placeholder="Add your answer…"
          className="min-h-14"
          onChange={(event) => setAnswer(event.target.value)}
        />
        <Button
          tone="primary"
          onClick={() => {
            if (!answer.trim()) return;
            actions.answerCheckin(checkin.id, answer.trim());
            setAnswer("");
          }}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function NewCheckin({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: ID }) {
  const { actions } = useWorkspace();
  const [prompt, setPrompt] = useState("What are you working on this week?");
  const [schedule, setSchedule] = useState(SCHEDULES[0]);

  return (
    <Modal open={open} onClose={onClose} title="New automatic check-in">
      <div className="space-y-3">
        <Field label="Question">
          <TextInput autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </Field>
        <Field label="How often">
          <Select value={schedule} onChange={(event) => setSchedule(event.target.value)}>
            {SCHEDULES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-[11px] leading-relaxed text-black/40">
          This workspace has no server scheduler, so nothing is emailed — the question sits on the project with the
          schedule recorded, and everyone answers here.
        </p>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            tone="primary"
            onClick={() => {
              if (!prompt.trim()) return;
              actions.addCheckin(projectId, prompt.trim(), schedule);
              onClose();
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
