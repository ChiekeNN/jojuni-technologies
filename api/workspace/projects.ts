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
import { mapProject, type ProjectRow } from "../_lib/mappers";
import { asNumber, asOptionalString, asString } from "../_lib/validation";

const COLUMNS = "id, name, client, progress, due, color, members";
const SELECT = `select ${COLUMNS} from public.projects`;

/** GET | POST | PATCH | DELETE /api/workspace/projects */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    const rows = await query<ProjectRow>(`${SELECT} order by position, created_at`);
    sendJson(res, 200, { projects: rows.map(mapProject) });
    return;
  }

  if (method === "POST") {
    const body = await readJsonBody(req);
    const name = asString(body.name, { max: 200, field: "name" });
    const client = asOptionalString(body.client, { max: 200, field: "client" }) || "Internal";
    const progress = clampProgress(body.progress, 0);
    const due = asOptionalString(body.due, { max: 40, field: "due" });
    const color = normalizeColor(body.color);
    const members = asMembers(body.members);

    const row = await queryOne<ProjectRow>(
      `with inserted as (
         insert into public.projects (name, client, progress, due, color, members)
         values ($1, $2, $3, $4, $5, $6)
         returning ${COLUMNS}
       )
       select ${COLUMNS} from inserted`,
      [name, client, progress, due, color, members],
    );
    sendJson(res, 201, { project: mapProject(row) });
    return;
  }

  if (method === "PATCH") {
    const body = await readJsonBody(req);
    const id = asString(body.id, { max: 64, field: "id" });
    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.name !== undefined) {
      params.push(asString(body.name, { max: 200, field: "name" }));
      sets.push(`name = $${params.length}`);
    }
    if (body.client !== undefined) {
      params.push(asOptionalString(body.client, { max: 200, field: "client" }));
      sets.push(`client = $${params.length}`);
    }
    if (body.progress !== undefined) {
      params.push(clampProgress(body.progress));
      sets.push(`progress = $${params.length}`);
    }
    if (body.due !== undefined) {
      params.push(asOptionalString(body.due, { max: 40, field: "due" }));
      sets.push(`due = $${params.length}`);
    }
    if (body.color !== undefined) {
      params.push(normalizeColor(body.color));
      sets.push(`color = $${params.length}`);
    }
    if (body.members !== undefined) {
      params.push(asMembers(body.members));
      sets.push(`members = $${params.length}`);
    }
    if (!sets.length) {
      throw new HttpError(400, "bad_request", "No updatable fields were provided.");
    }
    sets.push("updated_at = now()");
    params.push(id);
    const idParam = `$${params.length}`;

    const row = await queryOne<ProjectRow>(
      `with updated as (
         update public.projects set ${sets.join(", ")} where id = ${idParam}
         returning ${COLUMNS}
       )
       select ${COLUMNS} from updated`,
      params,
    );
    sendJson(res, 200, { project: mapProject(row) });
    return;
  }

  if (method === "DELETE") {
    const body = await readJsonBody(req);
    const id = asString(queryValue(req, "id") ?? body.id, { max: 64, field: "id" });
    const rows = await query<{ id: string }>("delete from public.projects where id = $1 returning id", [id]);
    if (!rows.length) throw new HttpError(404, "not_found", "That project no longer exists.");
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  throw new HttpError(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
});

function clampProgress(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  return Math.max(0, Math.min(100, Math.round(asNumber(value, { min: 0, max: 100, field: "progress" }))));
}

function normalizeColor(value: unknown): string {
  const text = asOptionalString(value, { max: 20, field: "color" });
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : "#000000";
}

function asMembers(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : String(value).split(",");
  return list.map((item) => String(item).trim().slice(0, 10)).filter(Boolean).slice(0, 20);
}
