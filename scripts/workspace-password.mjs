#!/usr/bin/env node
/**
 * Generates the SQL to set (or rotate) the workspace password.
 *
 *   node scripts/workspace-password.mjs            # prompts for a password
 *   node scripts/workspace-password.mjs --random   # generates one for you
 *
 * The password is hashed here with the same parameters the API verifies with,
 * so the plaintext never leaves your machine and never enters the repository.
 * Paste the printed statement into the Neon SQL editor, or run:
 *
 *   psql "$DATABASE_URL" -c "$(...)"
 */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: 128 * N * R * 2,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function readPassword() {
  if (process.argv.includes("--random")) {
    return randomBytes(18).toString("base64url");
  }

  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question("New workspace password: ");
  const again = await rl.question("Confirm: ");
  rl.close();
  if (password !== again) {
    console.error("\nThose did not match. Nothing was changed.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("\nUse at least 12 characters. Nothing was changed.");
    process.exit(1);
  }
  return password;
}

const password = await readPassword();
if (!password) {
  console.error("No password supplied. Nothing was changed.");
  process.exit(1);
}

const hash = hashPassword(password);
const literal = hash.replace(/'/g, "''");

console.log(`
Workspace password hash generated. Run this against your Neon database:

  update public.workspace_accounts
     set password_hash = '${literal}',
         updated_at    = now();

  delete from public.workspace_sessions;   -- signs every device out

${process.argv.includes("--random") ? `The generated password is:\n\n  ${password}\n\nStore it somewhere safe now; it is not recoverable.\n` : ""}`);
