/**
 * Campfire: the quick, casual chat for a project.
 */
import { useEffect, useRef, useState } from "react";
import { sendableLine } from "./chat-utils";

import { useWorkspace } from "../store";
import { relativeTime, type ID } from "../model";
import { Avatar, Button, TextInput, cx } from "../ui";

export function CampfireTab({ projectId }: { projectId: ID }) {
  const { state, actions } = useWorkspace();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = state.chats
    .filter((chat) => chat.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, projectId]);

  const send = () => {
    const line = sendableLine(draft);
    if (!line) return;
    actions.sendChat(projectId, line);
    setDraft("");
  };

  return (
    <div className="flex h-[calc(100vh-320px)] min-h-96 flex-col overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/8 px-4 py-2.5">
        <h3 className="text-sm font-bold text-black">Campfire</h3>
        <span className="text-[11px] text-black/40">{messages.length} messages</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!messages.length && (
          <p className="py-10 text-center text-xs text-black/35">
            Nothing here yet. Say good morning, share a link, ask a question.
          </p>
        )}
        {messages.map((chat, index) => {
          const person = state.people.find((entry) => entry.id === chat.authorId);
          const mine = chat.authorId === state.currentUserId;
          const previous = messages[index - 1];
          const grouped = previous?.authorId === chat.authorId;
          return (
            <div key={chat.id} className={cx("flex gap-2.5", mine && "flex-row-reverse")}>
              <div className={cx("w-7 shrink-0", grouped && "opacity-0")}>
                <Avatar person={person} size="md" />
              </div>
              <div className={cx("min-w-0 max-w-[78%]", mine && "text-right")}>
                {!grouped && (
                  <p className="mb-0.5 text-[11px] text-black/40">
                    <span className="font-semibold text-black/70">{person?.name ?? "Someone"}</span> ·{" "}
                    {relativeTime(chat.createdAt)}
                  </p>
                )}
                <div
                  className={cx(
                    "inline-block whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm leading-relaxed",
                    mine ? "bg-black text-white" : "bg-black/[0.04] text-black/80",
                  )}
                >
                  {chat.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-black/8 p-3">
        <TextInput
          value={draft}
          placeholder="Message the campfire…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button tone="primary" onClick={send} disabled={!sendableLine(draft)}>
          Send
        </Button>
      </div>
    </div>
  );
}
