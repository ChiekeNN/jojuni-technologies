import { FILE_KINDS, type FileKind } from "../../shared/types";
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
import { mapWorkspaceFile, type FileRow } from "../_lib/mappers";
import { asEnum, asOptionalString, asString } from "../_lib/validation";

const COLUMNS = "id, name, project, size_label, kind, updated_label, created_at";
const SELECT = `select ${COLUMNS} from public.workspace_files`;

/**
 * GET | POST | PATCH | DELETE /api/workspace/files
 *
 * Stores file *metadata* only. Actual bytes are not uploaded anywhere yet —
 * wire this to Vercel Blob / S3 later via the reserved `storage_url` column.
 */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    const rows = await query<FileRow>(`${SELECT} order by created_at desc`);
    sendJson(res, 200, { files: rows.map(mapWorkspaceFile) });
    return;
  }

  if (method === "POST") {
    const body = await readJsonBody(req);
    const name = asString(body.name, { max: 400, field: "name" });
    const project = asString(body.project, { max: 200, fallback: "Internal", field: "project" });
    const size = asOptionalString(body.size, { max: 40, field: "size" });
    const kind = asEnum(body.type, FILE_KINDS, { fallback: inferKind(name), field: "type" });

    const row = await queryOne<FileRow>(
      `with inserted as (
         insert into public.workspace_files (name, project, size_label, kind, updated_label)
         values ($1, $2, $3, $4, 'Just now')
         returning ${COLUMNS}
       )
       select ${COLUMNS} from inserted`,
      [name, project, size, kind],
    );
    sendJson(res, 201, { file: mapWorkspaceFile(row) });
    return;
  }

  if (method === "PATCH") {
    const body = await readJsonBody(req);
    const id = asString(body.id, { max: 64, field: "id" });
    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.name !== undefined) {
      params.push(asString(body.name, { max: 400, field: "name" }));
      sets.push(`name = $${params.length}`);
    }
    if (body.project !== undefined) {
      params.push(asString(body.project, { max: 200, field: "project" }));
      sets.push(`project = $${params.length}`);
    }
    if (body.size !== undefined) {
      params.push(asOptionalString(body.size, { max: 40, field: "size" }));
      sets.push(`size_label = $${params.length}`);
    }
    if (body.type !== undefined) {
      params.push(asEnum(body.type, FILE_KINDS, { field: "type" }));
      sets.push(`kind = $${params.length}`);
    }
    if (!sets.length) {
      throw new HttpError(400, "bad_request", "No updatable fields were provided.");
    }
    sets.push("updated_at = now()", "updated_label = 'Just now'");
    params.push(id);
    const idParam = `$${params.length}`;

    const row = await queryOne<FileRow>(
      `with updated as (
         update public.workspace_files set ${sets.join(", ")} where id = ${idParam}
         returning ${COLUMNS}
       )
       select ${COLUMNS} from updated`,
      params,
    );
    sendJson(res, 200, { file: mapWorkspaceFile(row) });
    return;
  }

  if (method === "DELETE") {
    const body = await readJsonBody(req);
    const id = asString(queryValue(req, "id") ?? body.id, { max: 64, field: "id" });
    const rows = await query<{ id: string }>("delete from public.workspace_files where id = $1 returning id", [id]);
    if (!rows.length) throw new HttpError(404, "not_found", "That file no longer exists.");
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  throw new HttpError(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
});

function inferKind(name: string): FileKind {
  if (/\.(png|jpe?g|gif|webp|svg|fig)$/i.test(name)) return "image";
  if (/\.(xlsx|xls|csv)$/i.test(name)) return "sheet";
  return "document";
}
