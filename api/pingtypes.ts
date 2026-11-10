/** Diagnostic: can a function import a runtime VALUE from shared/types? */
import { TASK_STATUSES } from "../shared/types";

export default function handler(_req: unknown, res: any): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, statuses: TASK_STATUSES.length }));
}
