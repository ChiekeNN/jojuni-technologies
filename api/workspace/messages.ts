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
import { mapMessage, type MessageRow } from "../_lib/mappers";
import { asOptionalString, asString, timeLabel } from "../_lib/validation";

const COLUMNS = "id, channel, name, initials, text, time_label, created_at";
const SELECT = `select ${COLUMNS} from public.workspace_messages`;

/** GET | POST | DELETE /api/workspace/messages */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    const channel = queryValue(req, "channel");
    const rows = channel
      ? await query<MessageRow>(`${SELECT} where channel = $1 order by created_at`, [channel])
      : await query<MessageRow>(`${SELECT} order by created_at`);
    sendJson(res, 200, { messages: rows.map(mapMessage) });
    return;
  }

  if (method === "POST") {
    const body = await readJsonBody(req);
    const channel = asString(body.channel, { max: 120, fallback: "General", field: "channel" });
    const name = asString(body.name, { max: 200, field: "name" });
    const initials = asOptionalString(body.initials, { max: 6, field: "initials" });
    const text = asString(body.text, { max: 2000, field: "text" });

    const row = await queryOne<MessageRow>(
      `with inserted as (
         insert into public.workspace_messages (channel, name, initials, text, time_label)
         values ($1, $2, $3, $4, $5)
         returning ${COLUMNS}
       )
       select ${COLUMNS} from inserted`,
      [channel, name, initials, text, timeLabel()],
    );
    sendJson(res, 201, { message: mapMessage(row) });
    return;
  }

  if (method === "DELETE") {
    const body = await readJsonBody(req);
    const id = asString(queryValue(req, "id") ?? body.id, { max: 64, field: "id" });
    const rows = await query<{ id: string }>(
      "delete from public.workspace_messages where id = $1 returning id",
      [id],
    );
    if (!rows.length) throw new HttpError(404, "not_found", "That message no longer exists.");
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  throw new HttpError(405, "method_not_allowed", "Use GET, POST or DELETE.");
});
