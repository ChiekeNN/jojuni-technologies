/** Diagnostic: is api/_lib/db.ts (the non-driver parts) loadable here? */
import { EXPECTED_TABLES, isDatabaseError, query } from "./_lib/db";

export default async function handler(_req: unknown, res: any): Promise<void> {
  const body = JSON.stringify({
    ok: true,
    dbLibLoaded: true,
    tables: EXPECTED_TABLES.length,
    isDatabaseError: typeof isDatabaseError,
    query: typeof query,
    node: process.version,
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}
