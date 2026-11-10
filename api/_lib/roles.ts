import type { Role } from "../../shared/types";
import { DatabaseError } from "./db";
import { FINANCE_ROLES } from "./errors";
import { headerValue, type ApiRequest } from "./http";
import { readSession, type WorkspaceSession } from "./session";

/**
 * Workspace authorisation.
 *
 * The role now comes from a server-side session (see `./session`), never from
 * a request header the browser can set. The old `x-workspace-role` header is
 * deliberately ignored: it was demo-grade and trivially spoofable.
 *
 * `requireWorkspaceSession` is the gate every workspace route must pass
 * before touching data.
 */

/** Returns the session for this request, or null when unauthenticated. */
export async function workspaceSession(req: ApiRequest): Promise<WorkspaceSession | null> {
  return readSession(req);
}

/** Returns the role for this request, or null when unauthenticated. */
export async function workspaceRole(req: ApiRequest): Promise<Role | null> {
  const session = await readSession(req);
  return session ? session.role : null;
}

/**
 * Throws 401 when there is no valid session.
 *
 * Callers use the returned session for audit fields (who created a ledger
 * entry, whose name is on a message) so those cannot be forged either.
 */
export async function requireWorkspaceSession(req: ApiRequest): Promise<WorkspaceSession> {
  const session = await readSession(req);
  if (!session) {
    throw new DatabaseError(
      "unauthorized",
      "Sign in to the workspace to continue.",
      "The session has expired or the cookie was cleared. Sign in again at /workspace/login.",
    );
  }
  return session;
}

/** Throws 403 unless the session role may see company finances. */
export async function requireFinanceRole(req: ApiRequest): Promise<WorkspaceSession> {
  const session = await requireWorkspaceSession(req);
  if (!FINANCE_ROLES.includes(session.role)) {
    throw new DatabaseError(
      "forbidden",
      "The finance ledger is restricted to the Founder and Accountant roles.",
    );
  }
  return session;
}

/** Used by GET /api/leads. Requires ADMIN_API_KEY to be configured + matched. */
export function requireAdminKey(req: ApiRequest): void {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    throw new DatabaseError(
      "forbidden",
      "ADMIN_API_KEY is not configured, so lead export is disabled.",
      "Set ADMIN_API_KEY in Vercel project settings (or .env locally) to enable it.",
    );
  }
  const provided =
    headerValue(req, "x-admin-key") ??
    headerValue(req, "authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) {
    throw new DatabaseError("forbidden", "Invalid admin credentials.");
  }
}
