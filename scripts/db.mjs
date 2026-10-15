#!/usr/bin/env node
/**
 * Tiny Neon database CLI (no ORM, no extra deps).
 *
 *   node scripts/db.mjs migrate   apply db/schema.sql   (idempotent)
 *   node scripts/db.mjs seed      apply db/seed.sql     (only fills empty tables)
 *   node scripts/db.mjs status    show tables + row counts
 *
 * Connection string is read from DIRECT_DATABASE_URL or DATABASE_URL
 * (see .env.example). Uses the WebSocket driver from @neondatabase/serverless,
 * which supports multi-statement DDL — exactly what migrations need.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
/** `--optional`: exit 0 (skip) instead of failing when DATABASE_URL is absent. */
const optional = process.argv.includes("--optional");

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      const value = raw.trim().replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  }
}

function connectionString() {
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    if (optional) {
      console.log("• DATABASE_URL not set — skipping database step.");
      process.exit(0);
    }
    console.error(
      [
        "",
        "DATABASE_URL is not set.",
        "",
        "1. Create a free project at https://console.neon.tech",
        "2. Copy the pooled connection string (Connection Details -> Pooled).",
        "3. Put it in .env:  DATABASE_URL=\"postgresql://...\"",
        "   (or export it in your shell).",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
  return url;
}

async function runSqlFile(client, relativePath) {
  const sql = readFileSync(path.join(root, relativePath), "utf8");
  await client.query(sql);
}

async function main() {
  loadEnvFile();
  const pool = new Pool({ connectionString: connectionString(), max: 1 });
  const client = await pool.connect();

  try {
    if (command === "migrate") {
      await runSqlFile(client, "db/schema.sql");
      console.log("✔ Schema applied (db/schema.sql).");
    } else if (command === "seed") {
      await runSqlFile(client, "db/seed.sql");
      console.log("✔ Seed data applied where tables were empty (db/seed.sql).");
    } else if (command === "status") {
      const tables = [
        "projects",
        "tasks",
        "ledger_entries",
        "workspace_files",
        "workspace_messages",
        "leads",
      ];
      console.log(`Connected to ${maskUrl(connectionString())}\n`);
      for (const table of tables) {
        const exists = await client.query(
          "select to_regclass($1) is not null as exists",
          [`public.${table}`],
        );
        if (!exists.rows[0].exists) {
          console.log(`  ✗ ${table.padEnd(20)} missing  -> run: npm run db:migrate`);
          continue;
        }
        const count = await client.query(`select count(*)::int as n from public.${table}`);
        console.log(`  ✔ ${table.padEnd(20)} ${String(count.rows[0].n).padStart(4)} rows`);
      }
    } else {
      console.error("Usage: node scripts/db.mjs <migrate|seed|status>");
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

function maskUrl(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

main().catch((error) => {
  const message = error?.message ?? String(error);
  console.error(`\n✗ Database command failed: ${message}\n`);
  if (/42P01|does not exist/.test(message)) {
    console.error("Hint: the schema may be missing. Run: npm run db:migrate\n");
  }
  process.exit(1);
});
