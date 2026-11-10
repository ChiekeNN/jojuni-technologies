/**
 * Card table: kanban columns with drag-and-drop, per-card notes, assignee and due.
 */
import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";

import { useWorkspace } from "../store";
import { dueLabel, isOverdue, relativeTime, type Card, type ID } from "../model";
import { Avatar, Button, Field, IconButton, Modal, Select, TextArea, TextInput, cx } from "../ui";

export function CardsTab({ projectId }: { projectId: ID }) {
  const { state, actions } = useWorkspace();
  const [dragging, setDragging] = useState<ID | null>(null);
  const [overColumn, setOverColumn] = useState<ID | null>(null);
  const [addingIn, setAddingIn] = useState<ID | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [openCard, setOpenCard] = useState<ID | null>(null);

  const columns = state.cardColumns
    .filter((column) => column.projectId === projectId)
    .sort((a, b) => a.position - b.position);
  const cards = state.cards.filter((card) => card.projectId === projectId);
  const project = state.projects.find((item) => item.id === projectId);
  const members = state.people.filter((person) => project?.members.includes(person.id));
  const activeCard = state.cards.find((card) => card.id === openCard) ?? null;

  const drop = (columnId: ID) => {
    if (dragging) actions.moveCard(dragging, columnId);
    setDragging(null);
    setOverColumn(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-black/45">
          {cards.length} cards across {columns.length} columns · drag a card to move it
        </p>
        <Button className="ml-auto" onClick={() => setAddingColumn(true)}>
          <Plus className="h-3.5 w-3.5" /> Column
        </Button>
      </div>

      {addingColumn && (
        <div className="flex items-end gap-2 rounded-lg border border-black/10 bg-white p-3">
          <div className="min-w-48 flex-1">
            <Field label="Column name">
              <TextInput
                autoFocus
                value={columnName}
                placeholder="e.g. Blocked"
                onChange={(event) => setColumnName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && columnName.trim()) {
                    actions.addColumn(projectId, columnName.trim());
                    setColumnName("");
                    setAddingColumn(false);
                  }
                }}
              />
            </Field>
          </div>
          <Button
            tone="primary"
            onClick={() => {
              if (!columnName.trim()) return;
              actions.addColumn(projectId, columnName.trim());
              setColumnName("");
              setAddingColumn(false);
            }}
          >
            Add
          </Button>
          <Button tone="ghost" onClick={() => setAddingColumn(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => {
          const columnCards = cards.filter((card) => card.columnId === column.id);
          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOverColumn(column.id);
              }}
              onDragLeave={() => setOverColumn((current) => (current === column.id ? null : current))}
              onDrop={() => drop(column.id)}
              className={cx(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-black/[0.025] transition",
                overColumn === column.id ? "border-[#d90429] bg-[#d90429]/5" : "border-black/10",
              )}
            >
              <header className="flex items-center gap-1.5 px-2.5 py-2">
                <h3 className="min-w-0 flex-1 truncate text-xs font-bold text-black">{column.name}</h3>
                <span className="rounded bg-black/5 px-1.5 text-[10px] font-semibold text-black/45">{columnCards.length}</span>
                <IconButton label="Delete column" tone="danger" onClick={() => actions.deleteColumn(column.id)}>
                  <Trash2 className="h-3 w-3" />
                </IconButton>
              </header>

              <div className="min-h-24 flex-1 space-y-2 px-2 pb-2">
                {columnCards.map((card) => {
                  const assignee = state.people.find((person) => person.id === card.assigneeId);
                  return (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDragging(card.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverColumn(null);
                      }}
                      className={cx(
                        "cursor-grab rounded border border-black/10 bg-white p-2.5 transition hover:border-black/25 active:cursor-grabbing",
                        dragging === card.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-black/15" />
                        <button type="button" onClick={() => setOpenCard(card.id)} className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-semibold leading-snug text-black">{card.title}</p>
                          {card.notes && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-black/45">{card.notes}</p>}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {card.due && (
                          <span className={cx("text-[10px]", isOverdue(card.due) ? "font-semibold text-[#d90429]" : "text-black/40")}>
                            {dueLabel(card.due)}
                          </span>
                        )}
                        <span className="ml-auto">
                          <Avatar person={assignee} size="xs" />
                        </span>
                      </div>
                    </article>
                  );
                })}

                {addingIn === column.id ? (
                  <div className="rounded border border-black/10 bg-white p-2">
                    <TextInput
                      autoFocus
                      value={newTitle}
                      placeholder="Card title"
                      className="py-1 text-xs"
                      onChange={(event) => setNewTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && newTitle.trim()) {
                          actions.addCard({ projectId, columnId: column.id, title: newTitle.trim() });
                          setNewTitle("");
                        }
                        if (event.key === "Escape") setAddingIn(null);
                      }}
                    />
                    <div className="mt-1.5 flex gap-1">
                      <Button
                        tone="primary"
                        onClick={() => {
                          if (!newTitle.trim()) return;
                          actions.addCard({ projectId, columnId: column.id, title: newTitle.trim() });
                          setNewTitle("");
                        }}
                      >
                        Add
                      </Button>
                      <IconButton label="Close" onClick={() => setAddingIn(null)}>
                        <X className="h-3 w-3" />
                      </IconButton>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingIn(column.id);
                      setNewTitle("");
                    }}
                    className="flex w-full items-center gap-1 rounded px-1.5 py-1.5 text-[11px] font-semibold text-black/35 transition hover:bg-black/5 hover:text-black"
                  >
                    <Plus className="h-3 w-3" /> Add card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeCard && <CardModal card={activeCard} onClose={() => setOpenCard(null)} members={members} columns={columns} />}
    </div>
  );
}

function CardModal({
  card,
  onClose,
  members,
  columns,
}: {
  card: Card;
  onClose: () => void;
  members: { id: string; name: string }[];
  columns: { id: string; name: string }[];
}) {
  const { actions } = useWorkspace();
  const live = card;

  return (
    <Modal open onClose={onClose} title="Card">
      <div className="space-y-3">
        <Field label="Title">
          <TextInput value={live.title} onChange={(event) => actions.updateCard(live.id, { title: event.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea value={live.notes} onChange={(event) => actions.updateCard(live.id, { notes: event.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Column">
            <Select value={live.columnId} onChange={(event) => actions.updateCard(live.id, { columnId: event.target.value })}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select value={live.assigneeId} onChange={(event) => actions.updateCard(live.id, { assigneeId: event.target.value })}>
              <option value="">Unassigned</option>
              {members.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due">
            <TextInput type="date" value={live.due} onChange={(event) => actions.updateCard(live.id, { due: event.target.value })} />
          </Field>
        </div>
        <p className="text-[11px] text-black/35">Added {relativeTime(live.createdAt)}</p>
        <div className="flex justify-between gap-2">
          <Button
            tone="danger"
            onClick={() => {
              actions.deleteCard(live.id);
              onClose();
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <Button tone="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
