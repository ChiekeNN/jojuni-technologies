import { TASK_PRIORITIES, TASK_STATUSES } from "../../shared/types";
import { query, queryOne } from "../_lib/db";
import {
  HttpError,
  queryValue,
  readJsonBody,
  sendJson,
  withApiHandler,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { mapTask, type TaskRow } from "../_lib/mappers";
import { asEnum, asOptionalString, asString, dueLabel } from "../_lib/validation";

const COLUMNS = "id, title, project, status, assignee, due, priority, position";
const SELECT = `select ${COLUMNS} from public.tasks`;

/** GET | POST | PATCH | DELETE /api/workspace/tasks */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    const rows = await query<TaskRow>(`${SELECT} order by position, created_at`);
    sendJson(res, 200, { tasks: rows.map(mapTask) });
    return;
  }

  if (method === "POST") {
    const body = await readJsonBody(req);
    const title = asString(body.title, { max: 300, field: "title" });
    const project = asString(body.project, { max: 200, fallback: "Internal", field: "project" });
    const status = asEnum(body.status, TASK_STATUSES, { fallback: "To do", field: "status" });
    const assignee = asOptionalString(body.assignee, { max: 10, field: "assignee" });
    const priority = asEnum(body.priority, TASK_PRIORITIES, { fallback: "Medium", field: "priority" });
    const due = formatDue(body.due);

    const row = await queryOne<TaskRow>(
      `with inserted as (
         insert into public.tasks (title, project, status, assignee, due, priority)
         values ($1, $2, $3, $4, $5, $6)
         returning ${COLUMNS}
       )
       select ${COLUMNS} from inserted`,
      [title, project, status, assignee, due, priority],
    );
    sendJson(res, 201, { task: mapTask(row) });
    return;
  }

  if (method === "PATCH") {
    const body = await readJsonBody(req);
    const id = asString(body.id, { max: 64, field: "id" });
    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.title !== undefined) {
      params.push(asString(body.title, { max: 300, field: "title" }));
      sets.push(`title = $${params.length}`);
    }
    if (body.project !== undefined) {
      params.push(asString(body.project, { max: 200, field: "project" }));
      sets.push(`project = $${params.length}`);
    }
    if (body.status !== undefined) {
      params.push(asEnum(body.status, TASK_STATUSES, { field: "status" }));
      sets.push(`status = $${params.length}`);
    }
    if (body.assignee !== undefined) {
      params.push(asOptionalString(body.assignee, { max: 10, field: "assignee" }));
      sets.push(`assignee = $${params.length}`);
    }
    if (body.priority !== undefined) {
      params.push(asEnum(body.priority, TASK_PRIORITIES, { field: "priority" }));
      sets.push(`priority = $${params.length}`);
    }
    if (body.due !== undefined) {
      params.push(formatDue(body.due));
      sets.push(`due = $${params.length}`);
    }
    if (!sets.length) {
      throw new HttpError(400, "bad_request", "No updatable fields were provided.");
    }
    sets.push("updated_at = now()");
    params.push(id);
    const idParam = `$${params.length}`;

    const row = await queryOne<TaskRow>(
      `with updated as (
         update public.tasks set ${sets.join(", ")} where id = ${idParam}
         returning ${COLUMNS}
       )
       select ${COLUMNS} from updated`,
      params,
    );
    sendJson(res, 200, { task: mapTask(row) });
    return;
  }

  if (method === "DELETE") {
    const body = await readJsonBody(req);
    const id = asString(queryValue(req, "id") ?? body.id, { max: 64, field: "id" });
    const rows = await query<{ id: string }>("delete from public.tasks where id = $1 returning id", [id]);
    if (!rows.length) throw new HttpError(404, "not_found", "That task no longer exists.");
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  throw new HttpError(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
});

/** Accepts either a `YYYY-MM-DD` value or a ready-made label ("Today"). */
function formatDue(value: unknown): string {
  const text = asOptionalString(value, { max: 40, field: "due" });
  if (!text) return "No date";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return dueLabel(text);
  return text;
}
