import { HttpError } from "./http";

/** Trims a string field; returns `fallback` when missing/blank. */
export function asString(value: unknown, options: { max?: number; fallback?: string; field?: string } = {}): string {
  const { max = 500, fallback, field = "value" } = options;
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, "bad_request", `Missing required field: ${field}.`);
  }
  const text = String(value).trim();
  if (!text) {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, "bad_request", `Missing required field: ${field}.`);
  }
  if (text.length > max) {
    throw new HttpError(400, "bad_request", `Field ${field} must be ${max} characters or fewer.`);
  }
  return text;
}

export function asOptionalString(value: unknown, options: { max?: number; field?: string } = {}): string {
  if (value === undefined || value === null) return "";
  return asString(value, { ...options, fallback: "" });
}

export function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  options: { fallback?: T; field?: string } = {},
): T {
  const { fallback, field = "value" } = options;
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, "bad_request", `Missing required field: ${field}.`);
  }
  const text = String(value);
  const match = allowed.find((option) => option.toLowerCase() === text.toLowerCase());
  if (!match) {
    throw new HttpError(400, "bad_request", `Field ${field} must be one of: ${allowed.join(", ")}.`);
  }
  return match;
}

export function asNumber(value: unknown, options: { min?: number; max?: number; field?: string } = {}): number {
  const { min, max, field = "value" } = options;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, "bad_request", `Field ${field} must be a number.`);
  }
  if (min !== undefined && parsed < min) {
    throw new HttpError(400, "bad_request", `Field ${field} must be at least ${min}.`);
  }
  if (max !== undefined && parsed > max) {
    throw new HttpError(400, "bad_request", `Field ${field} must be at most ${max}.`);
  }
  return parsed;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an ISO `YYYY-MM-DD` date string. */
export function asDateString(value: unknown, options: { fallback?: string; field?: string } = {}): string {
  const { fallback, field = "date" } = options;
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (!text) {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, "bad_request", `Missing required field: ${field}.`);
  }
  if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new HttpError(400, "bad_request", `Field ${field} must be an ISO date like 2026-01-31.`);
  }
  return text;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function asEmail(value: unknown, field = "email"): string {
  const text = asString(value, { max: 320, field });
  if (!EMAIL_PATTERN.test(text)) {
    throw new HttpError(400, "bad_request", `Field ${field} must be a valid email address.`);
  }
  return text.toLowerCase();
}

/** Turns a `YYYY-MM-DD` value into the friendly label the UI shows. */
export function dueLabel(isoDate: string): string {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${isoDate}T00:00:00`);
  const diffDays = Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(target);
}

/** `9:14 AM`-style label for new messages. */
export function timeLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}
