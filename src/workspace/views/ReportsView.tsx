/**
 * Reports: a high-level read on everything, plus the finance ledger.
 */
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "../store";
import { daysUntil, dueLabel, formatDate, hillForProject, isOverdue, projectProgress, todayISO } from "../model";
import { Button, Chip, Field, IconButton, Panel, ProgressBar, Select, TextInput, cx } from "../ui";
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
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Income");
  const [category, setCategory] = useState("Client income");
  const [date, setDate] = useState(todayISO());

  const income = state.ledger.filter((entry) => entry.type === "Income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = state.ledger.filter((entry) => entry.type === "Expense").reduce((sum, entry) => sum + entry.amount, 0);

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
        <Button className="ml-auto" onClick={() => setAdding((value) => !value)}>
          <Plus className="h-3.5 w-3.5" /> Entry
        </Button>
      </header>

      {adding && (
        <div className="grid gap-2 border-b border-black/8 bg-black/[0.015] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Field label="Description">
              <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
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
          <Field label="Amount">
            <TextInput type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <div className="flex items-end gap-2 lg:col-span-6">
            <Button
              tone="primary"
              onClick={() => {
                if (!description.trim() || !Number(amount)) return;
                actions.addLedgerEntry({
                  date,
                  description: description.trim(),
                  category: category.trim() || "Other",
                  type,
                  amount: Number(amount),
                });
                setDescription("");
                setAmount("");
                setAdding(false);
              }}
            >
              Save entry
            </Button>
            <Button tone="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-black/6">
        {state.ledger.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 px-4 py-2">
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
            <IconButton label="Delete entry" tone="danger" onClick={() => actions.deleteLedgerEntry(entry.id)}>
              <Trash2 className="h-3 w-3" />
            </IconButton>
          </div>
        ))}
        {!state.ledger.length && <p className="px-4 py-8 text-center text-xs text-black/35">No entries yet.</p>}
      </div>

      {byCategory.length > 0 && (
        <div className="grid gap-2 border-t border-black/8 bg-black/[0.015] p-4 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.slice(0, 6).map(([label, totals]) => (
            <div key={label} className="rounded border border-black/8 bg-white px-2.5 py-1.5">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-black/40">{label}</p>
              <p className="text-xs font-semibold tabular-nums text-black/75">
                {totals.income > 0 && <span className="text-emerald-600">+{formatNaira(totals.income)}</span>}
                {totals.income > 0 && totals.expense > 0 && " · "}
                {totals.expense > 0 && <span className="text-[#d90429]">−{formatNaira(totals.expense)}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
