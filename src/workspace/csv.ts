/**
 * Downloading the ledger.
 *
 * Two files, both plain CSV so they open in Excel, Numbers, Google Sheets and
 * anything else without a converter:
 *
 * 1. The ledger — one row per entry, in the same shape as the table on screen,
 *    with service, sub-service, project and bank broken into their own columns.
 *    Filtered to whatever the user is currently looking at, so "show me only
 *    the Fidelity expenses for Northstar" can become a spreadsheet.
 * 2. The summary — totals by category, by service, and by bank, for handing to
 *    an accountant or reading against a bank statement.
 *
 * Money is written as a bare number (no ₦, no thousands separators) so the
 * spreadsheet treats it as currency rather than text. A leading BOM makes
 * Excel open UTF-8 correctly on Windows, which matters for the ₦ sign.
 */

import { BANK_OPTIONS, bankByName } from "./banks";
import type { LedgerEntry } from "./model";
import { isCapitalReason } from "./services";

/** RFC 4180 escaping: quote anything containing a comma, quote or newline. */
function cell(value: string | number | undefined): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: (string | number | undefined)[][]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

function download(filename: string, csv: string): void {
  // The BOM is what makes Excel read the file as UTF-8 rather than the local
  // code page, which is the difference between ₦ and a row of mojibake.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in some browsers; one turn of
  // the event loop is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Ledger rows for a spreadsheet. `entries` should already be filtered. */
export function exportLedger(
  entries: LedgerEntry[],
  projects: { id: string; name: string }[],
  scope: string,
): void {
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const rows: (string | number | undefined)[][] = [
    [
      "Date",
      "Description",
      "Type",
      "Category",
      "Amount (NGN)",
      "Service",
      "Sub-service",
      "Project",
      "Paid by / to",
      "How it moved",
      "Bank",
      "Direction",
    ],
  ];

  for (const entry of sorted) {
    rows.push([
      entry.date,
      entry.description,
      entry.type,
      entry.category,
      entry.amount,
      entry.service ?? "",
      entry.serviceItem ?? "",
      entry.projectId ? projectName.get(entry.projectId) ?? entry.projectId : "",
      entry.counterparty ?? "",
      entry.method ?? "",
      entry.bank ?? "",
      entry.type === "Income" ? "Money in" : "Money out",
    ]);
  }

  // A totals row saves the reader doing it by hand, and makes an obviously
  // wrong import obvious immediately.
  const income = sorted.filter((entry) => entry.type === "Income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = sorted.filter((entry) => entry.type === "Expense").reduce((sum, entry) => sum + entry.amount, 0);
  rows.push([]);
  rows.push(["", "TOTAL IN", "Income", "", income]);
  rows.push(["", "TOTAL OUT", "Expense", "", expense]);
  rows.push(["", "NET", "", "", income - expense]);

  download(`jojuni-ledger-${scope}-${slugDate(new Date())}.csv`, toCsv(rows));
}

/** Totals by category, service and bank — the accountant's sheet. */
export function exportSummary(
  entries: LedgerEntry[],
  projects: { id: string; name: string }[],
  scope: string,
): void {
  const projectName = new Map(projects.map((project) => [project.id, project.name]));

  const total = (
    list: LedgerEntry[],
    key: (entry: LedgerEntry) => string,
  ): [string, number, number][] => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const entry of list) {
      const label = key(entry) || "Not recorded";
      const row = map.get(label) ?? { income: 0, expense: 0 };
      if (entry.type === "Income") row.income += entry.amount;
      else row.expense += entry.amount;
      map.set(label, row);
    }
    return [...map.entries()]
      .map(([label, row]) => [label, row.income, row.expense] as [string, number, number])
      .sort((a, b) => b[1] + b[2] - (a[1] + a[2]));
  };

  const income = entries.filter((entry) => entry.type === "Income");
  const expense = entries.filter((entry) => entry.type === "Expense");
  const sumIn = income.reduce((sum, entry) => sum + entry.amount, 0);
  const sumOut = expense.reduce((sum, entry) => sum + entry.amount, 0);

  const rows: (string | number | undefined)[][] = [];
  rows.push(["Jojuni Technologies Ltd", ""]);
  rows.push(["Finance summary", scope]);
  rows.push(["Generated", new Date().toISOString().slice(0, 16).replace("T", " ")]);
  rows.push(["Entries", entries.length]);
  rows.push([]);
  // Revenue and capital are both money in, but only one is earned. Splitting
  // them here stops the summary implying the business earned a grant.
  const capital = income
    .filter((entry) => isCapitalReason(entry.service))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const revenue = sumIn - capital;

  rows.push(["REVENUE (client money)", revenue]);
  rows.push(["CAPITAL (put in by owners)", capital]);
  rows.push(["TOTAL IN", sumIn]);
  rows.push(["TOTAL OUT", sumOut]);
  rows.push(["NET", sumIn - sumOut]);
  rows.push([]);

  rows.push(["BY BANK", "In", "Out", "Net"]);
  for (const [label, inAmount, outAmount] of total(entries, (entry) => entry.bank ?? "")) {
    rows.push([label, inAmount, outAmount, inAmount - outAmount]);
  }
  rows.push([]);

  rows.push(["BY SERVICE", "In", "Out", "Net"]);
  for (const [label, inAmount, outAmount] of total(entries, (entry) => entry.service ?? "")) {
    rows.push([label, inAmount, outAmount, inAmount - outAmount]);
  }
  rows.push([]);

  rows.push(["BY CATEGORY", "In", "Out", "Net"]);
  for (const [label, inAmount, outAmount] of total(entries, (entry) => entry.category)) {
    rows.push([label, inAmount, outAmount, inAmount - outAmount]);
  }
  rows.push([]);

  rows.push(["BY PROJECT", "In", "Out", "Net"]);
  for (const [label, inAmount, outAmount] of total(entries, (entry) =>
    entry.projectId ? projectName.get(entry.projectId) ?? entry.projectId : "",
  )) {
    rows.push([label, inAmount, outAmount, inAmount - outAmount]);
  }

  download(`jojuni-finance-summary-${scope}-${slugDate(new Date())}.csv`, toCsv(rows));
}

/** Every bank, for a reference sheet the accountant can match against. */
export function exportBankReference(): void {
  const rows: (string | number | undefined)[][] = [["Bank", "Offers", "Notes"]];
  for (const bank of BANK_OPTIONS) {
    rows.push([
      bank.label,
      "Expenses",
      bank.name === "Fidelity Bank" ? "Operating account — income can land here" : "Payments out only",
    ]);
  }
  download(`jojuni-banks-${slugDate(new Date())}.csv`, toCsv(rows));
}

export { bankByName };
