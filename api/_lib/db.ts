import { neon } from "@neondatabase/serverless";
import type { ApiErrorCode } from "../../shared/types";

export class DatabaseError extends Error {
  code: ApiErrorCode;
  hint?: string;

  constructor(code: ApiErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.hint = hint;
  }
}

let client: ReturnType<typeof neon> | null = null;

/**
 * Returns the Neon HTTP driver, configured from `DATABASE_URL`.
 * Neon's pooled connection string is expected (the one with `-pooler` in the
 * host), which is what the Vercel ↔ Neon integration provides as well.
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DatabaseError(
      "database_not_configured",
      "DATABASE_URL is not set for this deployment.",
      "Add the Neon pooled connection string as DATABASE_URL in Vercel project settings (or .env locally), then run: npm run db:migrate",
    );
  }
  if (!client) client = neon(url);
  return client;
}

/** Tables this app expects. Used by /api/health and error mapping. */
export const EXPECTED_TABLES = [
  "projects",
  "tasks",
  "ledger_entries",
  "workspace_files",
  "workspace_messages",
  "leads",
] as const;

/**
 * Runs a parameterised query against Neon and maps failures onto the small
 * set of API error codes the frontend understands.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sql = getSql();
  try {
    return (await sql.query(text, params)) as T[];
  } catch (error) {
    throw mapDriverError(error);
  }
}

/** Runs a single-row query; throws `not_found` when nothing matches. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const rows = await query<T>(text, params);
  if (!rows.length) {
    throw new DatabaseError("not_found", "The requested record does not exist.");
  }
  return rows[0];
}

export function mapDriverError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const record = error as { code?: string; message?: string };
  const message = record?.message ?? "Unexpected database error.";

  // 42P01 = undefined_table: schema has not been applied yet.
  if (record?.code === "42P01") {
    return new DatabaseError(
      "schema_missing",
      "The database schema has not been created on this Neon database yet.",
      "Run: npm run db:migrate (and optionally npm run db:seed)",
    );
  }
  // 23505 = unique_violation, 23514 = check_violation: bad input.
  if (record?.code === "23505") {
    return new DatabaseError("bad_request", "A record with that name already exists.");
  }
  if (record?.code === "23514" || record?.code === "22P02" || record?.code === "22007") {
    return new DatabaseError("bad_request", "One of the submitted values is not valid.");
  }
  // Connection / auth problems.
  if (
    record?.code === "28000" ||
    record?.code === "28P01" ||
    record?.code === "3D000" ||
    /fetch failed|network|socket|timeout|ECONN|ENOTFOUND|certificate/i.test(message)
  ) {
    return new DatabaseError(
      "database_unreachable",
      "Could not reach the Neon database.",
      "Check that DATABASE_URL is a valid Neon connection string and that the function region is close to the database region.",
    );
  }
  return new DatabaseError("internal_error", message);
}

/** True when the given value is a known database error. */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}
