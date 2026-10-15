#!/usr/bin/env node
/**
 * Runs the local API server and the Vite dev server together with prefixed
 * output, so a single command gives you the full stack:
 *
 *   npm run dev:stack
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const children = [];

function run(label, color, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell: process.platform === "win32",
  });
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `;
  const pipe = (stream) => {
    stream.setEncoding("utf8");
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) process.stdout.write(prefix + line + "\n");
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}exited with code ${code}\n`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", "35", process.execPath, [
  path.join(root, "node_modules", "tsx", "dist", "cli.mjs"),
  path.join(root, "scripts", "dev-api.mjs"),
]);
run("web", "36", process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js")]);

console.log("\x1b[2mStarting Jojuni dev stack (api :3000 + vite :5173)…\x1b[0m");
