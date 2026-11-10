#!/usr/bin/env node
/**
 * Makes every Vercel function self-contained.
 *
 * Why this exists
 * ---------------
 * Vercel transpiles each file in `api/` in isolation but does NOT bundle local
 * imports. A function containing `import { x } from "./_lib/http"` is deployed
 * with that specifier intact and no emitted `_lib/http.js` beside it, so the
 * module fails to resolve during *load*. Vercel reports that as a bodyless
 * `500 FUNCTION_INVOCATION_FAILED` and our own error handling never runs,
 * because there is no request yet.
 *
 * Measured on production:
 *
 *   /api/ping       imports nothing           -> 200
 *   /api/pingdb     imports an npm package    -> 200
 *   /api/pingprobe  imports one local const   -> 500 FUNCTION_INVOCATION_FAILED
 *   /api/pingtypes  imports ../shared/types   -> 500 FUNCTION_INVOCATION_FAILED
 *
 * So the rule is: any local module import kills the function.
 *
 * What it does
 * ------------
 * Before Vercel packages `api/`, this bundles each route with esbuild into a
 * single self-contained `api/<name>.js`, then removes the `.ts` sources and the
 * shared `_lib/` directory *from the build output only*. Git keeps the sources;
 * nothing is destroyed locally.
 *
 * It only runs when VERCEL is set, so `npm run build` on a developer machine is
 * untouched.
 */
import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const API_DIR = "api";
const SHARED_DIRS = new Set(["_lib"]);

if (!process.env.VERCEL) {
  console.log("[build-api] not on Vercel — leaving api/ sources alone.");
  process.exit(0);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const all = walk(API_DIR);

// Routes are `.ts` files that are not inside a shared folder. `_lib/` holds
// modules that every route imports; those get inlined by the bundler.
const routes = all.filter((file) => {
  if (!file.endsWith(".ts")) return false;
  if (file.endsWith("tsconfig.json")) return false;
  const segments = path.relative(API_DIR, file).split(path.sep);
  return !segments.some((segment, index) => index < segments.length - 1 && SHARED_DIRS.has(segment));
});

if (routes.length === 0) {
  console.error("[build-api] no routes found — refusing to emit anything.");
  process.exit(1);
}

console.log(`[build-api] bundling ${routes.length} route(s) into self-contained functions`);

for (const route of routes) {
  const outfile = route.replace(/\.ts$/, ".js");
  try {
    await esbuild.build({
      entryPoints: [route],
      outfile,
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      // Keep the Node builtins and npm packages external: Vercel installs
      // node_modules for the project, and `import { neon } from
      // "@neondatabase/serverless"` resolves correctly when left alone.
      packages: "external",
      // Vercel's Node runtime reads `export default` / `module.exports`; an ESM
      // default export is what these handlers already provide.
      banner: {
        js: "// Bundled by scripts/build-api.mjs — do not edit; edit api/**/*.ts.",
      },
      logLevel: "silent",
    });
  } catch (error) {
    console.error(`[build-api] failed to bundle ${route}:`);
    console.error(error.errors?.map((e) => `  ${e.text} @ ${e.location?.file}:${e.location?.line}`).join("\n") ?? error.message);
    process.exit(1);
  }
}

// Remove the sources so Vercel packages only the bundled functions. Anything
// still importing `./_lib/...` would now fail loudly at deploy time, which is
// what we want.
for (const route of routes) rmSync(route, { force: true });
for (const dir of SHARED_DIRS) {
  const target = path.join(API_DIR, dir);
  if (statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
    rmSync(target, { recursive: true, force: true });
  }
}

console.log("[build-api] done — api/ now contains only self-contained .js functions");
