import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiErrorBody, ApiErrorCode } from "../../shared/types";
import { DatabaseError, isDatabaseError } from "./db";

/**
 * Minimal request/response types so the same handler code runs unchanged on
 * Vercel (`@vercel/node` passes VercelRequest/VercelResponse, which extend
 * these) and in the local dev server (`scripts/dev-api.mjs`).
 */
export type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  body?: unknown;
};
export type ApiResponse = ServerResponse;

export class HttpError extends Error {
  status: number;
  code: ApiErrorCode;
  hint?: string;

  constructor(status: number, code: ApiErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

export function sendJson(res: ApiResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

export function sendError(
  res: ApiResponse,
  status: number,
  code: ApiErrorCode,
  message: string,
  hint?: string,
): void {
  const payload: ApiErrorBody = { error: code, message };
  if (hint) payload.hint = hint;
  sendJson(res, status, payload);
}

export function requireMethod(req: ApiRequest, allowed: string[]): void {
  const method = (req.method ?? "GET").toUpperCase();
  if (!allowed.includes(method)) {
    throw new HttpError(405, "method_not_allowed", `Use ${allowed.join(" or ")} for this endpoint.`);
  }
}

export function queryValue(req: ApiRequest, name: string): string | undefined {
  const url = new URL(req.url ?? "/", "http://localhost");
  const value = url.searchParams.get(name);
  return value === null ? undefined : value;
}

/**
 * Reads a JSON request body. Vercel pre-parses JSON bodies into `req.body`;
 * the local dev server does not, so fall back to reading the stream.
 */
export async function readJsonBody(req: ApiRequest, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return req.body as Record<string, unknown>;
    throw new HttpError(400, "bad_request", "Request body must be a JSON object.");
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > maxBytes) {
      throw new HttpError(413, "bad_request", "Request body is too large.");
    }
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "bad_request", "Request body must be valid JSON.");
  }
}

export function headerValue(req: ApiRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/** Converts any thrown value into an HTTP response. */
export function handleHandlerError(res: ApiResponse, error: unknown): void {
  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message, error.hint);
    return;
  }
  if (isDatabaseError(error)) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "bad_request"
          ? 400
          : error.code === "forbidden"
            ? 403
            : 503;
    sendError(res, status, error.code, error.message, error.hint);
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  // eslint-disable-next-line no-console
  console.error("[api] unhandled error:", error);
  sendError(res, 500, "internal_error", message);
}

/**
 * Runs a handler with consistent error handling. Every API route file is a
 * two-line wrapper around this.
 */
export function withApiHandler(handler: (req: ApiRequest, res: ApiResponse) => Promise<void>) {
  return async function apiHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    try {
      await handler(req, res);
    } catch (error) {
      if (!res.headersSent) handleHandlerError(res, error);
      else res.end();
    }
  };
}

export { DatabaseError };
