#!/usr/bin/env node
/**
 * Local API server that mounts the exact same handler modules Vercel runs in
 * `api/`. No emulation layer: Vite proxies `/api/*` here in development, so
 * the frontend talks to the real Neon-backed handlers on your machine.
 *
 *   npm run dev:api        (then `npm run dev` for the frontend, or use dev:stack)
 *
 * Requires Node >= 18 and `tsx` (devDependency) if your Node cannot strip
 * TypeScript natively — the npm script already runs it through tsx.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.DEV_API_PORT ?? 3000);
const HOST = process.env.DEV_API_HOST ?? "0.0.0.0";

/** Path -> module loader. Keys mirror the Vercel routes produced by api/. */
const ROUTES = new Map([
  ["/api/health", () => import("../api/health.ts")],
  ["/api/leads", () => import("../api/leads.ts")],
  ["/api/workspace", () => import("../api/workspace/index.ts")],
  ["/api/workspace/tasks", () => import("../api/workspace/tasks.ts")],
  ["/api/workspace/projects", () => import("../api/workspace/projects.ts")],
  ["/api/workspace/ledger", () => import("../api/workspace/ledger.ts")],
  ["/api/workspace/files", () => import("../api/workspace/files.ts")],
  ["/api/workspace/messages", () => import("../api/workspace/messages.ts")],
]);

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const started = Date.now();

  if (pathname === "/" ) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("jojuni dev api — see /api/health\n");
    return;
  }

  const loader = ROUTES.get(pathname);
  if (!loader) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", message: `No API route for ${pathname}` }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,x-workspace-role,x-admin-key,authorization",
    });
    res.end();
    return;
  }

  try {
    const mod = await loader();
    await mod.default(req, res);
  } catch (error) {
    console.error(`[dev-api] ${req.method} ${pathname} crashed:`, error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error", message: String(error?.message ?? error) }));
    } else {
      res.end();
    }
  } finally {
    console.log(`[dev-api] ${req.method} ${pathname} -> ${res.statusCode} (${Date.now() - started}ms)`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[dev-api] listening on http://${HOST === "0.0.0.0" ? "127.0.0.1" : HOST}:${PORT}`);
  console.log(`[dev-api] DATABASE_URL ${process.env.DATABASE_URL ? "is set" : "is NOT set — API will return 503 database_not_configured"}`);
});
