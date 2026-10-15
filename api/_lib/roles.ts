import { FINANCE_ROLES, type Role } from "../../shared/types";
import { DatabaseError } from "./db";
import { headerValue, type ApiRequest } from "./http";

/**
 * Reads the workspace role the browser is acting as.
 *
 * NOTE: this is *demo-grade* authorisation. It mirrors the role switcher in
 * the UI so the finance ledger is not served to the `staff` role, but the
 * header is trivially spoofable. Before handling real company money, put a
 * real identity provider (Clerk, Auth.js, WorkOS…) in front of these routes.
 */
export function workspaceRole(req: ApiRequest): Role | null {
  const raw = headerValue(req, "x-workspace-role");
  return raw === "founder" || raw === "accountant" || raw === "staff" ? raw : null;
}

export function requireFinanceRole(req: ApiRequest): void {
  const role = workspaceRole(req);
  if (!role || !FINANCE_ROLES.includes(role)) {
    throw new DatabaseError(
      "forbidden",
      "The finance ledger is restricted to the Founder and Accountant roles.",
    );
  }
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
