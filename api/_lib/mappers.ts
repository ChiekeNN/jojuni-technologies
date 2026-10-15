import type {
  LedgerEntry,
  Project,
  Task,
  WorkspaceFile,
  WorkspaceMessage,
} from "../../shared/types";

/**
 * Postgres row -> JSON mappers. The Neon HTTP driver returns `numeric` as
 * strings and `date` as strings, so numbers are coerced here.
 */

export interface TaskRow {
  id: string;
  title: string;
  project: string;
  status: Task["status"];
  assignee: string;
  due: string;
  priority: Task["priority"];
  position: number;
}

export interface ProjectRow {
  id: string;
  name: string;
  client: string;
  progress: number;
  due: string;
  color: string;
  members: string[] | null;
}

export interface LedgerRow {
  id: string;
  entry_date: string;
  description: string;
  category: string;
  type: LedgerEntry["type"];
  amount: string | number;
}

export interface FileRow {
  id: string;
  name: string;
  project: string;
  size_label: string;
  kind: WorkspaceFile["type"];
  updated_label: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  channel: string;
  name: string;
  initials: string;
  text: string;
  time_label: string;
  created_at: string;
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    project: row.project,
    status: row.status,
    assignee: row.assignee,
    due: row.due,
    priority: row.priority,
  };
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    progress: Number(row.progress),
    due: row.due,
    color: row.color,
    members: row.members ?? [],
  };
}

export function mapLedgerEntry(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    date: row.entry_date,
    description: row.description,
    category: row.category,
    type: row.type,
    amount: Math.round(Number(row.amount)),
  };
}

export function mapWorkspaceFile(row: FileRow): WorkspaceFile {
  return {
    id: row.id,
    name: row.name,
    project: row.project,
    size: row.size_label,
    type: row.kind,
    updated: row.updated_label,
  };
}

export function mapMessage(row: MessageRow): WorkspaceMessage {
  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    initials: row.initials,
    text: row.text,
    time: row.time_label,
    createdAt: row.created_at,
  };
}
