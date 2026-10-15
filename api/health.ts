import { EXPECTED_TABLES, isDatabaseError, query } from "./_lib/db";
import { requireMethod, sendJson, withApiHandler, type ApiRequest, type ApiResponse } from "./_lib/http";

interface TableRow {
  table_name: string;
}

/**
 * GET /api/health
 *
 * Reports service + database status without ever throwing, so it is safe to
 * hit from monitoring (and from the README troubleshooting steps) before the
 * schema has been applied.
 */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  requireMethod(req, ["GET"]);

  const database: {
    configured: boolean;
    reachable: boolean;
    missingTables: string[];
    detail?: string;
  } = { configured: true, reachable: true, missingTables: [] };

  try {
    await query("select 1 as ok");
    const rows = await query<TableRow>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])",
      [[...EXPECTED_TABLES]],
    );
    const present = new Set(rows.map((row) => row.table_name));
    database.missingTables = EXPECTED_TABLES.filter((table) => !present.has(table));
  } catch (error) {
    const mapped = isDatabaseError(error)
      ? error
      : null;
    database.reachable = false;
    database.missingTables = [...EXPECTED_TABLES];
    if (mapped?.code === "database_not_configured") database.configured = false;
    database.detail = mapped ? `${mapped.code}: ${mapped.message}` : String(error);
  }

  const ready = database.configured && database.reachable && database.missingTables.length === 0;
  sendJson(res, 200, {
    ok: true,
    ready,
    service: "jojuni-technologies-api",
    region: process.env.VERCEL_REGION ?? "local",
    database,
    timestamp: new Date().toISOString(),
  });
});
