/** Diagnostic: can a function import a local helper from api/lib (no underscore)? */
import { PROBE_VALUE } from "./lib/probe";

export default function handler(_req: unknown, res: any): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, probe: PROBE_VALUE }));
}
