import { hashPassword, verifyPassword } from "../_lib/password";
import { isDatabaseConfigured, query } from "../_lib/db";
import {
  headerValue,
  readJsonBody,
  requireMethod,
  sendJson,
  withApiHandler,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import {
  clearedSessionCookie,
  createSession,
  destroySession,
  pruneExpiredSessions,
  readSession,
  sessionCookie,
} from "../_lib/session";

/**
 * POST /api/workspace/auth   — sign in with the workspace password
 * DELETE /api/workspace/auth — sign out
 * GET /api/workspace/auth    — report the current session, if any
 *
 * There is no username: the workspace has a single owner account, so the
 * password alone identifies it. That is only tolerable because the password is
 * long, sign-in is rate limited, and verification happens server-side against
 * a scrypt hash stored in the database. The password never reaches the browser
 * bundle and is not in the repository in reusable form.
 */

/** Attempts allowed per IP per window, and the window itself. */
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MINUTES = 15;

function clientKey(req: ApiRequest): string {
  const forwarded = headerValue(req, "x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : headerValue(req, "x-real-ip")) ?? "unknown";
  return ip.trim().slice(0, 120) || "unknown";
}

/**
 * Counts this attempt against the caller's budget. Counted in the database so
 * it survives cold starts and cannot be reset by the client.
 */
async function noteAttempt(
  req: ApiRequest,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = clientKey(req);
  try {
    const rows = await query<{ attempts: number; first_at: string }>(
      `insert into public.workspace_login_attempts (client_key, attempts, first_at)
       values ($1, 1, now())
       on conflict (client_key) do update
         set attempts = case
               when public.workspace_login_attempts.first_at < now() - ($2::int * interval '1 minute') then 1
               else public.workspace_login_attempts.attempts + 1
             end,
             first_at = case
               when public.workspace_login_attempts.first_at < now() - ($2::int * interval '1 minute') then now()
               else public.workspace_login_attempts.first_at
             end
       returning attempts, first_at`,
      [key, ATTEMPT_WINDOW_MINUTES],
    );
    const attempts = rows[0]?.attempts ?? 1;
    if (attempts <= MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 };
    const first = rows[0]?.first_at ? new Date(rows[0].first_at).getTime() : Date.now();
    const elapsed = (Date.now() - first) / 1000;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(ATTEMPT_WINDOW_MINUTES * 60 - elapsed)),
    };
  } catch {
    // Without the counter table the password check still needs the database,
    // so failing open here does not weaken the actual gate.
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

async function clearAttempts(req: ApiRequest): Promise<void> {
  try {
    await query("delete from public.workspace_login_attempts where client_key = $1", [clientKey(req)]);
  } catch {
    // Housekeeping only.
  }
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));
}

export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  const method = (req.method ?? "GET").toUpperCase();

  if (method === "GET") {
    let session = null;
    try {
      session = await readSession(req);
    } catch (error) {
      // An unreadable database must not be reported as "signed out": the UI
      // would show the sign-in form and the password would then fail for a
      // reason that has nothing to do with the password.
      const detail = error instanceof Error ? error.message : "unexpected error";
      sendJson(res, 503, {
        error: "database_unreachable",
        message: "The workspace database could not be reached.",
        hint: detail,
      });
      return;
    }
    if (!session) {
      sendJson(res, 200, { authenticated: false });
      return;
    }
    sendJson(res, 200, {
      authenticated: true,
      role: session.role,
      label: session.label,
      expiresAt: session.expiresAt.toISOString(),
    });
    return;
  }

  if (method === "DELETE") {
    await destroySession(req);
    res.setHeader("Set-Cookie", clearedSessionCookie(req));
    sendJson(res, 200, { authenticated: false });
    return;
  }

  requireMethod(req, ["POST"]);

  if (!isDatabaseConfigured()) {
    sendJson(res, 503, {
      error: "database_not_configured",
      message: "The workspace cannot sign anyone in because no database is configured.",
      hint: "Set DATABASE_URL (Neon pooled connection string) in Vercel project settings, then run: npm run db:migrate",
    });
    return;
  }

  const body = await readJsonBody(req, 4 * 1024);
  const submitted = typeof body.password === "string" ? body.password : "";
  if (!submitted.trim()) {
    sendJson(res, 400, { error: "bad_request", message: "Enter the workspace password." });
    return;
  }

  const budget = await noteAttempt(req);
  if (!budget.allowed) {
    res.setHeader("Retry-After", String(budget.retryAfterSeconds));
    sendJson(res, 429, {
      error: "too_many_attempts",
      message: "Too many sign-in attempts.",
      hint: `Try again in ${Math.ceil(budget.retryAfterSeconds / 60)} minute(s).`,
    });
    return;
  }

  let account: { id: string; password_hash: string; role: string; label: string };
  try {
    const rows = await query<{ id: string; password_hash: string; role: string; label: string }>(
      `select id, password_hash, role, label
         from public.workspace_accounts
        where active = true
        order by created_at
        limit 1`,
    );
    if (!rows.length) {
      sendJson(res, 503, {
        error: "schema_missing",
        message: "The workspace owner account has not been created on this database yet.",
        hint: "Run: npm run db:migrate (applies db/schema.sql, which seeds the owner account).",
      });
      return;
    }
    account = rows[0];
  } catch {
    sendJson(res, 503, {
      error: "database_unreachable",
      message: "The workspace database could not be reached.",
      hint: "Check DATABASE_URL and that db/schema.sql has been applied on this Neon database.",
    });
    return;
  }

  if (!(await verifyPassword(submitted, account.password_hash))) {
    sendJson(res, 401, { error: "invalid_password", message: "That password is not correct." });
    return;
  }

  // Opportunistic upgrade: if the row was seeded with weaker parameters than
  // the current ones, re-hash with the submitted plaintext while it is in hand.
  try {
    const [scheme, n] = account.password_hash.split("$");
    if (scheme === "scrypt" && Number(n) < 16384) {
      await query(
        "update public.workspace_accounts set password_hash = $1, updated_at = now() where id = $2",
        [await hashPassword(submitted), account.id],
      );
    }
  } catch {
    // Not fatal.
  }

  await clearAttempts(req);
  await pruneExpiredSessions();

  const role =
    account.role === "accountant" || account.role === "staff" ? account.role : "founder";
  const { token, expiresAt } = await createSession(role, account.id, account.label);
  res.setHeader("Set-Cookie", sessionCookie(req, token, secondsUntil(expiresAt)));
  sendJson(res, 200, {
    authenticated: true,
    role,
    label: account.label,
    expiresAt: expiresAt.toISOString(),
  });
});
