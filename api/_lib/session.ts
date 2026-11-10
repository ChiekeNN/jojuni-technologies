import { createHash, randomBytes } from "node:crypto";

import type { Role } from "../../shared/types";
import { DatabaseError, isDatabaseConfigured, query } from "./db";
import { headerValue, type ApiRequest } from "./http";

/**
 * Server-side sessions for the workspace.
 *
 * A session is an opaque random token handed to the browser in an HttpOnly
 * cookie. Only its SHA-256 digest is stored, so a database leak does not hand
 * an attacker usable tokens. Sessions are revocable (delete the row) and
 * expire after `SESSION_TTL_DAYS`.
 *
 * Cookie name carries the `__Host-` prefix so browsers only return it over
 * HTTPS, scoped to the whole origin. (Vercel terminates TLS in production, so
 * this holds; local dev over http://localhost cannot set it, hence the
 * fallback name below.)
 */

const SESSION_COOKIE = "__Host-jojuni_workspace";
const SESSION_COOKIE_DEV = "jojuni_workspace";
const SESSION_TTL_DAYS = 7;
const TOKEN_BYTES = 32;

export interface WorkspaceSession {
  id: string;
  subject: string;
  role: Role;
  label: string;
  expiresAt: Date;
}

function cookieName(req: ApiRequest): string {
  const proto = (headerValue(req, "x-forwarded-proto") ?? "").toLowerCase();
  return proto === "https" ? SESSION_COOKIE : SESSION_COOKIE_DEV;
}

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isSecure(req: ApiRequest): boolean {
  const proto = (headerValue(req, "x-forwarded-proto") ?? "").toLowerCase();
  return proto === "https";
}

/**
 * Builds the Set-Cookie value for a new session. `SameSite=Strict` keeps the
 * cookie off cross-site navigations, so a link from elsewhere cannot ride an
 * existing session.
 */
export function sessionCookie(req: ApiRequest, token: string, maxAgeSeconds: number): string {
  const parts = [
    `${cookieName(req)}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isSecure(req)) parts.push("Secure");
  return parts.join("; ");
}

/** Cookie value that clears the session cookie. */
export function clearedSessionCookie(req: ApiRequest): string {
  const parts = [`${cookieName(req)}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (isSecure(req)) parts.push("Secure");
  return parts.join("; ");
}

/** Reads the session token from the request cookies, if present. */
export function sessionToken(req: ApiRequest): string | null {
  const header = headerValue(req, "cookie");
  if (!header) return null;
  const wanted = new Set([SESSION_COOKIE, SESSION_COOKIE_DEV]);
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    const name = pair.slice(0, index).trim();
    if (!wanted.has(name)) continue;
    const value = pair.slice(index + 1).trim();
    if (value) return decodeURIComponent(value);
  }
  return null;
}

/**
 * Creates a session row and returns the raw token for the cookie.
 *
 * The token itself is returned once and never stored; only its digest is
 * persisted, so this is the only moment it exists in plaintext.
 */
export async function createSession(role: Role, subject: string, label: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `insert into public.workspace_sessions (token_hash, subject, role, label, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [digest(token), subject, role, label, expiresAt.toISOString()],
  );
  return { token, expiresAt };
}

/**
 * Resolves the session attached to a request, or null.
 *
 * Expired rows are filtered in SQL rather than compared in JS so a clock skew
 * between the function and the database cannot extend a session.
 */
export async function readSession(req: ApiRequest): Promise<WorkspaceSession | null> {
  if (!isDatabaseConfigured()) return null;
  const token = sessionToken(req);
  if (!token) return null;

  try {
    const rows = await query<{
      id: string;
      subject: string;
      role: Role;
      label: string;
      expires_at: string;
    }>(
      `select id, subject, role, label, expires_at
         from public.workspace_sessions
        where token_hash = $1 and expires_at > now()
        limit 1`,
      [digest(token)],
    );
    if (!rows.length) return null;
    const row = rows[0];
    if (row.role !== "founder" && row.role !== "accountant" && row.role !== "staff") return null;
    return {
      id: row.id,
      subject: row.subject,
      role: row.role,
      label: row.label,
      expiresAt: new Date(row.expires_at),
    };
  } catch (error) {
    // A missing table must not look like a valid login, but it also should not
    // be reported as invalid credentials. Surface it as a setup problem.
    if (error instanceof DatabaseError && error.code === "schema_missing") throw error;
    return null;
  }
}

/** Deletes the session row behind a request. Safe to call with no session. */
export async function destroySession(req: ApiRequest): Promise<void> {
  const token = sessionToken(req);
  if (!token || !isDatabaseConfigured()) return;
  try {
    await query("delete from public.workspace_sessions where token_hash = $1", [digest(token)]);
  } catch {
    // Deleting an already-gone session is not an error worth reporting.
  }
}

/** Best-effort cleanup of expired rows; called opportunistically on login. */
export async function pruneExpiredSessions(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await query("delete from public.workspace_sessions where expires_at <= now()");
  } catch {
    // Housekeeping only.
  }
}
