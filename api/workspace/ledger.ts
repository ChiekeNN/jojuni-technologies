import { TRANSACTION_TYPES } from "../../shared/types";
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
import { mapLedgerEntry, type LedgerRow } from "../_lib/mappers";
import { requireFinanceRole } from "../_lib/roles";
import { asDateString, asEnum, asNumber, asOptionalString, asString } from "../_lib/validation";

const COLUMNS = "id, entry_date, description, category, type, amount";
const SELECT = `select ${COLUMNS} from public.ledger_entries`;

/**
 * GET | POST | PATCH | DELETE /api/workspace/ledger
 *
 * Restricted: every method requires the Founder or Accountant role header
 * (see `_lib/roles.ts` for the demo-grade caveat).
 */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  requireFinanceRole(req);
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    const rows = await query<LedgerRow>(`${SELECT} order by entry_date desc, created_at desc`);
    sendJson(res, 200, { ledger: rows.map(mapLedgerEntry) });
    return;
  }

  if (method === "POST") {
    const body = await readJsonBody(req);
    const date = asDateString(body.date, { fallback: new Date().toISOString().slice(0, 10), field: "date" });
    const description = asString(body.description, { max: 500, field: "description" });
    const category = asOptionalString(body.category, { max: 120, field: "category" }) || "Other";
    const type = asEnum(body.type, TRANSACTION_TYPES, { field: "type" });
    const amount = Math.round(asNumber(body.amount, { min: 0, field: "amount" }));

    const row = await queryOne<LedgerRow>(
      `with inserted as (
         insert into public.ledger_entries (entry_date, description, category, type, amount)
         values ($1, $2, $3, $4, $5)
         returning ${COLUMNS}
       )
       select ${COLUMNS} from inserted`,
      [date, description, category, type, amount],
    );
    sendJson(res, 201, { entry: mapLedgerEntry(row) });
    return;
  }

  if (method === "PATCH") {
    const body = await readJsonBody(req);
    const id = asString(body.id, { max: 64, field: "id" });
    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.date !== undefined) {
      params.push(asDateString(body.date, { field: "date" }));
      sets.push(`entry_date = $${params.length}`);
    }
    if (body.description !== undefined) {
      params.push(asString(body.description, { max: 500, field: "description" }));
      sets.push(`description = $${params.length}`);
    }
    if (body.category !== undefined) {
      params.push(asOptionalString(body.category, { max: 120, field: "category" }) || "Other");
      sets.push(`category = $${params.length}`);
    }
    if (body.type !== undefined) {
      params.push(asEnum(body.type, TRANSACTION_TYPES, { field: "type" }));
      sets.push(`type = $${params.length}`);
    }
    if (body.amount !== undefined) {
      params.push(Math.round(asNumber(body.amount, { min: 0, field: "amount" })));
      sets.push(`amount = $${params.length}`);
    }
    if (!sets.length) {
      throw new HttpError(400, "bad_request", "No updatable fields were provided.");
    }
    sets.push("updated_at = now()");
    params.push(id);
    const idParam = `$${params.length}`;

    const row = await queryOne<LedgerRow>(
      `with updated as (
         update public.ledger_entries set ${sets.join(", ")} where id = ${idParam}
         returning ${COLUMNS}
       )
       select ${COLUMNS} from updated`,
      params,
    );
    sendJson(res, 200, { entry: mapLedgerEntry(row) });
    return;
  }

  if (method === "DELETE") {
    const body = await readJsonBody(req);
    const id = asString(queryValue(req, "id") ?? body.id, { max: 64, field: "id" });
    const rows = await query<{ id: string }>("delete from public.ledger_entries where id = $1 returning id", [id]);
    if (!rows.length) throw new HttpError(404, "not_found", "That ledger entry no longer exists.");
    sendJson(res, 200, { deleted: true, id });
    return;
  }

  throw new HttpError(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
});
