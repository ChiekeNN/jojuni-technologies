/**
 * Canonical domain types shared by the browser bundle (`src/`) and the
 * Vercel serverless functions (`api/`). Imported with `import type` on both
 * sides, so this file never ships as runtime code.
 */

export type Role = "founder" | "accountant" | "staff";
export type TaskStatus = "To do" | "In progress" | "Review" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";
export type TransactionType = "Income" | "Expense";
export type FileKind = "document" | "image" | "sheet";
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export const TASK_STATUSES: TaskStatus[] = ["To do", "In progress", "Review", "Done"];
export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High"];
export const TRANSACTION_TYPES: TransactionType[] = ["Income", "Expense"];
export const FILE_KINDS: FileKind[] = ["document", "image", "sheet"];
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "won", "lost"];
export const FINANCE_ROLES: Role[] = ["founder", "accountant"];

export interface Task {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  assignee: string;
  due: string;
  priority: TaskPriority;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  progress: number;
  due: string;
  color: string;
  members: string[];
}

export interface LedgerEntry {
  id: string;
  /** ISO date, `YYYY-MM-DD` */
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  project: string;
  /** Human readable size, e.g. `2.8 MB` */
  size: string;
  type: FileKind;
  /** Human readable recency label, e.g. `2 hours ago` */
  updated: string;
}

export interface WorkspaceMessage {
  id: string;
  channel: string;
  name: string;
  initials: string;
  text: string;
  /** Display label, e.g. `9:14 AM` */
  time: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  brief: string;
  status: LeadStatus;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  tasks: Task[];
  projects: Project[];
  ledger: LedgerEntry[];
  files: WorkspaceFile[];
  messages: WorkspaceMessage[];
}

/** Error codes returned by `/api/*` in the `code` field of an error body. */
export type ApiErrorCode =
  | "bad_request"
  | "method_not_allowed"
  | "database_not_configured"
  | "schema_missing"
  | "database_unreachable"
  | "forbidden"
  | "not_found"
  | "internal_error";

export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
  hint?: string;
}
