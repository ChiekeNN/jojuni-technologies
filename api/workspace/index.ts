import { FINANCE_ROLES, type WorkspaceSnapshot } from "../../shared/types";
import { query } from "../_lib/db";
import { requireMethod, sendJson, withApiHandler, type ApiRequest, type ApiResponse } from "../_lib/http";
import {
  mapLedgerEntry,
  mapMessage,
  mapProject,
  mapTask,
  mapWorkspaceFile,
  type FileRow,
  type LedgerRow,
  type MessageRow,
  type ProjectRow,
  type TaskRow,
} from "../_lib/mappers";
import { workspaceRole } from "../_lib/roles";

/**
 * GET /api/workspace
 *
 * One round trip for everything the workspace UI renders. The finance ledger
 * is only included for roles allowed to see it (see `_lib/roles.ts`).
 */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  requireMethod(req, ["GET"]);
  const role = workspaceRole(req);
  const canViewFinance = role !== null && FINANCE_ROLES.includes(role);

  const [taskRows, projectRows, fileRows, messageRows] = await Promise.all([
    query<TaskRow>(
      "select id, title, project, status, assignee, due, priority, position from public.tasks order by position, created_at",
    ),
    query<ProjectRow>(
      "select id, name, client, progress, due, color, members from public.projects order by position, created_at",
    ),
    query<FileRow>(
      "select id, name, project, size_label, kind, updated_label, created_at from public.workspace_files order by created_at desc",
    ),
    query<MessageRow>(
      "select id, channel, name, initials, text, time_label, created_at from public.workspace_messages order by created_at",
    ),
  ]);

  const ledgerRows = canViewFinance
    ? await query<LedgerRow>(
        "select id, entry_date, description, category, type, amount from public.ledger_entries order by entry_date desc, created_at desc",
      )
    : [];

  const snapshot: WorkspaceSnapshot = {
    tasks: taskRows.map(mapTask),
    projects: projectRows.map(mapProject),
    ledger: ledgerRows.map(mapLedgerEntry),
    files: fileRows.map(mapWorkspaceFile),
    messages: messageRows.map(mapMessage),
  };

  sendJson(res, 200, { ...snapshot, finance: canViewFinance });
});
