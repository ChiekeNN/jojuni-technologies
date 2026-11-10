/**
 * Diagnostic endpoint: the smallest possible function.
 *
 * Deliberately imports nothing from `_lib`, `shared` or any dependency, so it
 * answers one question and only one: can this deployment run a function at all?
 * If /api/ping works and /api/health does not, the fault is in shared code. If
 * both fail, the fault is project configuration or the deployed bundle.
 */
export default function handler(_req: unknown, res: any): void {
  const body = JSON.stringify({
    ok: true,
    node: process.version,
    region: process.env.VERCEL_REGION ?? "unknown",
    env: process.env.VERCEL_ENV ?? "unknown",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}
