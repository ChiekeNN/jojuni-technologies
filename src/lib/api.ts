import type {
  ApiErrorBody,
  LedgerEntry,
  Project,
  Role,
  Task,
  WorkspaceFile,
  WorkspaceMessage,
  WorkspaceSnapshot,
} from "../../shared/types";

/** Error thrown for any non-2xx response from `/api/*`. */
export class ApiError extends Error {
  status: number;
  code: string;
  hint?: string;

  constructor(status: number, code: string, message: string, hint?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.hint = hint;
  }

  /** True when the failure means "there is no usable database right now". */
  get isDatabaseIssue(): boolean {
    return (
      this.code === "database_not_configured" ||
      this.code === "schema_missing" ||
      this.code === "database_unreachable"
    );
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  role?: Role | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, role, headers, ...rest } = options;
  const headerRecord: Record<string, string> = {};
  if (body !== undefined) headerRecord["content-type"] = "application/json";
  if (role) headerRecord["x-workspace-role"] = role;
  if (headers) {
    new Headers(headers).forEach((value, key) => {
      headerRecord[key] = value;
    });
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: headerRecord,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "The API could not be reached.");
  }

  const payload = (await response.json().catch(() => null)) as (ApiErrorBody & Record<string, unknown>) | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? "internal_error",
      payload?.message ?? `Request to ${path} failed with status ${response.status}.`,
      payload?.hint,
    );
  }
  return payload as T;
}

export interface WorkspaceResponse extends WorkspaceSnapshot {
  /** True when the requesting role may see the finance ledger. */
  finance: boolean;
}

export interface HealthResponse {
  ok: boolean;
  ready: boolean;
  service: string;
  region: string;
  database: {
    configured: boolean;
    reachable: boolean;
    missingTables: string[];
    detail?: string;
  };
  timestamp: string;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),

  workspace: (role: Role | null) => request<WorkspaceResponse>("/api/workspace", { role }),

  createLead: (lead: { name: string; email: string; company?: string; brief: string; website?: string }) =>
    request<{ id: string | null; accepted: boolean }>("/api/leads", { method: "POST", body: lead }),

  tasks: {
    create: (task: Partial<Task>, role: Role | null) =>
      request<{ task: Task }>("/api/workspace/tasks", { method: "POST", body: task, role }),
    update: (id: string, patch: Partial<Task>, role: Role | null) =>
      request<{ task: Task }>("/api/workspace/tasks", { method: "PATCH", body: { id, ...patch }, role }),
    remove: (id: string) => request<{ deleted: boolean }>("/api/workspace/tasks", { method: "DELETE", body: { id } }),
  },

  projects: {
    create: (project: Partial<Project>) =>
      request<{ project: Project }>("/api/workspace/projects", { method: "POST", body: project }),
    update: (id: string, patch: Partial<Project>) =>
      request<{ project: Project }>("/api/workspace/projects", { method: "PATCH", body: { id, ...patch } }),
    remove: (id: string) => request<{ deleted: boolean }>("/api/workspace/projects", { method: "DELETE", body: { id } }),
  },

  ledger: {
    create: (entry: Partial<LedgerEntry>, role: Role | null) =>
      request<{ entry: LedgerEntry }>("/api/workspace/ledger", { method: "POST", body: entry, role }),
    update: (id: string, patch: Partial<LedgerEntry>, role: Role | null) =>
      request<{ entry: LedgerEntry }>("/api/workspace/ledger", { method: "PATCH", body: { id, ...patch }, role }),
    remove: (id: string, role: Role | null) =>
      request<{ deleted: boolean }>("/api/workspace/ledger", { method: "DELETE", body: { id }, role }),
  },

  files: {
    create: (file: Partial<WorkspaceFile>) =>
      request<{ file: WorkspaceFile }>("/api/workspace/files", { method: "POST", body: file }),
    remove: (id: string) => request<{ deleted: boolean }>("/api/workspace/files", { method: "DELETE", body: { id } }),
  },

  messages: {
    create: (message: Partial<WorkspaceMessage>, role: Role | null) =>
      request<{ message: WorkspaceMessage }>("/api/workspace/messages", { method: "POST", body: message, role }),
    remove: (id: string) =>
      request<{ deleted: boolean }>("/api/workspace/messages", { method: "DELETE", body: { id } }),
  },
};
