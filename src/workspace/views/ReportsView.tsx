/**
 * Reports: a high-level read on everything, plus the finance ledger.
 */
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { daysUntil, dueLabel, formatDate, hillForProject, isOverdue, projectProgress, todayISO } from "../model";
import { Button, Chip, Field, IconButton, Modal, Panel, ProgressBar, Select, TextInput, cx } from "../ui";
import { formatNaira } from "./HomeView";

export function ReportsView({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const { state } = useWorkspace();

  const active = state.projects.filter((project) => project.status === "active");
  const open = state.todos.filter((todo) => !todo.done);
  const done = state.todos.filter((todo) => todo.done);
  const late = open.filter((todo) => isOverdue(todo.due));
  const completionRate = state.todos.length ? Math.round((done.length / state.todos.length) * 100) : 0;

  const workload = state.people
    .map((person) => ({
      person,
      open: open.filter((todo) => todo.assigneeId === person.id).length,
      done: done.filter((todo) => todo.assigneeId === person.id).length,
    }))
    .sort((a, b) => b.open - a.open);

  const maxOpen = Math.max(1, ...workload.map((row) => row.open));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">Reports</h1>
        <p className="mt-1 text-sm text-black/50">Where the whole workspace actually stands.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Projects", value: active.length, hint: `${state.projects.length - active.length} archived` },
          { label: "Open to-dos", value: open.length, hint: `${late.length} overdue` },
          { label: "Completed", value: done.length, hint: `${completionRate}% of everything` },
          { label: "Documents", value: state.docs.length, hint: `${state.docs.filter((doc) => doc.kind === "doc").length} written` },
        ].map((stat) => (
          <Panel key={stat.label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/40">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-[-0.03em] text-black">{stat.value}</p>
            <p className="text-[11px] text-black/40">{stat.hint}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Project progress</h2>
          <div className="space-y-2.5">
            {active.map((project) => {
              const progress = projectProgress(state, project.id);
              const scopes = hillForProject(state, project.id);
              const left = daysUntil(project.end);
              return (
                <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="block w-full text-left">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-black/80">{project.name}</span>
                    <span className="shrink-0 text-[10px] text-black/35">
                      {scopes.filter((scope) => scope.progress <= 50).length} uphill
                    </span>
                    <span
                      className={cx(
                        "shrink-0 text-[10px]",
                        left !== null && left < 0 ? "font-semibold text-[#d90429]" : "text-black/35",
                      )}
                    >
                      {left !== null && left < 0 ? `${Math.abs(left)}d over` : dueLabel(project.end)}
                    </span>
                    <span className="w-8 shrink-0 text-right text-[10px] font-semibold tabular-nums text-black/50">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} color={project.color} />
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-bold text-black">Workload by person</h2>
          <div className="space-y-2">
            {workload.map(({ person, open: openCount, done: doneCount }) => (
              <div key={person.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[11px] text-black/60">{person.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-[#d90429]"
                    style={{ width: `${(openCount / maxOpen) * 100}%`, opacity: 0.85 }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-black/40">
                  {openCount} open · {doneCount}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <FinancePanel />
    </div>
  );
}

export function FinancePanel() {
  const { state, actions } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Income" | "Expense">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const income = state.ledger.filter((entry) => entry.type === "Income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = state.ledger.filter((entry) => entry.type === "Expense").reduce((sum, entry) => sum + entry.amount, 0);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(state.ledger.map((entry) => entry.category))).sort()],
    [state.ledger],
  );

  /** Filtered + newest first, without mutating the stored order. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.ledger
      .filter((entry) => typeFilter === "All" || entry.type === typeFilter)
      .filter((entry) => categoryFilter === "All" || entry.category === categoryFilter)
      .filter((entry) => !needle || `${entry.description} ${entry.category}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [categoryFilter, query, state.ledger, typeFilter]);

  const visibleTotals = visible.reduce(
    (totals, entry) => {
      if (entry.type === "Income") totals.income += entry.amount;
      else totals.expense += entry.amount;
      return totals;
    },
    { income: 0, expense: 0 },
  );

  const viewing = state.ledger.find((entry) => entry.id === viewingId) ?? null;
  const editing = state.ledger.find((entry) => entry.id === editingId) ?? null;
  const deleting = state.ledger.find((entry) => entry.id === confirmDelete) ?? null;

  const byCategory = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const entry of state.ledger) {
      const row = map.get(entry.category) ?? { income: 0, expense: 0 };
      if (entry.type === "Income") row.income += entry.amount;
      else row.expense += entry.amount;
      map.set(entry.category, row);
    }
    return [...map.entries()].sort((a, b) => b[1].income + b[1].expense - (a[1].income + a[1].expense));
  }, [state.ledger]);

  const filtered = typeFilter !== "All" || categoryFilter !== "All" || query.trim().length > 0;

  return (
    <Panel padded={false}>
      <header className="flex flex-wrap items-center gap-2 border-b border-black/8 px-4 py-3">
        <h2 className="text-sm font-bold text-black">Finance</h2>
        <Chip tone="ok">
          <ArrowUpRight className="h-2.5 w-2.5" /> {formatNaira(income)}
        </Chip>
        <Chip tone="danger">
          <ArrowDownRight className="h-2.5 w-2.5" /> {formatNaira(expense)}
        </Chip>
        <Chip tone="dark">Net {formatNaira(income - expense)}</Chip>
        <Button className="ml-auto" tone="primary" onClick={() => setAdding((value) => !value)}>
          <Plus className="h-3.5 w-3.5" /> Entry
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/8 bg-black/[0.015] px-4 py-2">
        <div className="relative min-w-40 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search descriptions…"
            className="py-1 pl-7 text-xs"
          />
        </div>
        <div className="flex gap-1">
          {(["All", "Income", "Expense"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTypeFilter(option)}
              className={cx(
                "rounded px-2 py-1 text-[11px] font-semibold transition",
                typeFilter === option ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        {/* Wrapped: the base field class sets w-full, so the width has to come
            from the parent rather than fighting the class with w-44. */}
        <div className="w-44 shrink-0">
          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="py-1 text-xs"
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "All" ? "All categories" : category}
              </option>
            ))}
          </Select>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTypeFilter("All");
              setCategoryFilter("All");
            }}
            className="text-[11px] font-semibold text-black/40 hover:text-black"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-black/40">
          {filtered
            ? `${visible.length} of ${state.ledger.length} · net ${formatNaira(visibleTotals.income - visibleTotals.expense)}`
            : `${state.ledger.length} entries`}
        </span>
      </div>

      {adding && (
        <EntryForm
          submitLabel="Save entry"
          onCancel={() => setAdding(false)}
          onSubmit={(draft) => {
            actions.addLedgerEntry(draft);
            setAdding(false);
          }}
        />
      )}

      <div className="divide-y divide-black/6">
        {visible.map((entry) => (
          <div
            key={entry.id}
            className={cx(
              "flex items-center gap-2 px-4 py-2 transition hover:bg-black/[0.02]",
              editingId === entry.id && "bg-[#d90429]/5",
            )}
          >
            <button
              type="button"
              onClick={() => setViewingId(entry.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              title="View entry"
            >
              <span
                className={cx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded",
                  entry.type === "Income" ? "bg-emerald-50 text-emerald-600" : "bg-[#d90429]/10 text-[#d90429]",
                )}
              >
                {entry.type === "Income" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-black/80">{entry.description}</span>
                <span className="block text-[10px] text-black/35">
                  {formatDate(entry.date, true)} · {entry.category}
                </span>
              </span>
              <span
                className={cx(
                  "shrink-0 text-xs font-semibold tabular-nums",
                  entry.type === "Income" ? "text-emerald-600" : "text-[#d90429]",
                )}
              >
                {entry.type === "Income" ? "+" : "−"}
                {formatNaira(entry.amount)}
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton label={`View ${entry.description}`} onClick={() => setViewingId(entry.id)}>
                <Eye className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label={`Edit ${entry.description}`} onClick={() => setEditingId(entry.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label={`Duplicate ${entry.description}`} onClick={() => actions.addLedgerEntry({ ...entry, description: `${entry.description} (copy)` })}>
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label={`Delete ${entry.description}`} tone="danger" onClick={() => setConfirmDelete(entry.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
        {!visible.length && (
          <p className="px-4 py-8 text-center text-xs text-black/35">
            {state.ledger.length ? "No entries match these filters." : "No entries yet."}
          </p>
        )}
      </div>

      {byCategory.length > 0 && (
        <div className="grid gap-2 border-t border-black/8 bg-black/[0.015] p-4 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.slice(0, 6).map(([label, totals]) => (
            <button
              key={label}
              type="button"
              onClick={() => setCategoryFilter(label)}
              className="rounded border border-black/8 bg-white px-2.5 py-1.5 text-left transition hover:border-black/30"
              title={`Filter by ${label}`}
            >
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-black/40">{label}</p>
              <p className="text-xs font-semibold tabular-nums text-black/75">
                {totals.income > 0 && <span className="text-emerald-600">+{formatNaira(totals.income)}</span>}
                {totals.income > 0 && totals.expense > 0 && " · "}
                {totals.expense > 0 && <span className="text-[#d90429]">−{formatNaira(totals.expense)}</span>}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* View */}
      <Modal open={Boolean(viewing)} onClose={() => setViewingId(null)} title="Ledger entry">
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Chip tone={viewing.type === "Income" ? "ok" : "danger"}>{viewing.type}</Chip>
              <Chip>{viewing.category}</Chip>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/35">Description</p>
              <p className="text-base font-semibold leading-snug text-black">{viewing.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/35">Amount</p>
                <p
                  className={cx(
                    "text-base font-bold tabular-nums",
                    viewing.type === "Income" ? "text-emerald-600" : "text-[#d90429]",
                  )}
                >
                  {viewing.type === "Income" ? "+" : "−"}
                  {formatNaira(viewing.amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/35">Date</p>
                <p className="text-sm text-black/75">{formatDate(viewing.date, true)}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-black/8 pt-3">
              <Button
                tone="danger"
                onClick={() => {
                  setConfirmDelete(viewing.id);
                  setViewingId(null);
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <Button
                onClick={() => {
                  setEditingId(viewing.id);
                  setViewingId(null);
                }}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button tone="primary" onClick={() => setViewingId(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editing)} onClose={() => setEditingId(null)} title="Edit entry">
        {editing && (
          <EntryForm
            key={editing.id}
            initial={editing}
            submitLabel="Save changes"
            onCancel={() => setEditingId(null)}
            onSubmit={(draft) => {
              actions.updateLedgerEntry(editing.id, draft);
              setEditingId(null);
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={Boolean(deleting)} onClose={() => setConfirmDelete(null)} title="Delete entry">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-black/70">
              Delete <span className="font-semibold text-black">“{deleting.description}”</span> for{" "}
              <span className="font-semibold text-black">{formatNaira(deleting.amount)}</span> dated{" "}
              {formatDate(deleting.date, true)}? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                tone="danger"
                onClick={() => {
                  actions.deleteLedgerEntry(deleting.id);
                  setConfirmDelete(null);
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete entry
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}

/** Shared add/edit form for a ledger entry. */
function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { description: string; category: string; type: "Income" | "Expense"; amount: number; date: string };
  submitLabel: string;
  onSubmit: (draft: { description: string; category: string; type: "Income" | "Expense"; amount: number; date: string }) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Client income");
  const [type, setType] = useState<"Income" | "Expense">(initial?.type ?? "Income");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!description.trim()) {
      setError("Give the entry a description.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    onSubmit({ description: description.trim(), category: category.trim() || "Other", type, amount: value, date });
  };

  return (
    <div className="grid gap-2 border-b border-black/8 bg-black/[0.015] p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <Field label="Description">
          <TextInput
            autoFocus
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </Field>
      </div>
      <Field label="Type">
        <Select value={type} onChange={(event) => setType(event.target.value as "Income" | "Expense")}>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </Select>
      </Field>
      <Field label="Category">
        <TextInput value={category} onChange={(event) => setCategory(event.target.value)} />
      </Field>
      <Field label="Amount (₦)">
        <TextInput type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Field>
      {error && <p className="text-[11px] font-semibold text-[#d90429] lg:col-span-6">{error}</p>}
      <div className="flex items-end gap-2 lg:col-span-6">
        <Button tone="primary" onClick={submit}>
          {submitLabel}
        </Button>
        <Button tone="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
