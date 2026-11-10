import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for the workspace owner account.
 *
 * scrypt is used rather than a bare hash because this password is the only
 * thing standing between the public internet and the workspace. Parameters
 * follow Node's own guidance (N=16384, r=8, p=1) with a 16-byte random salt.
 *
 * The stored format is self-describing so the parameters can be raised later
 * without invalidating existing rows:
 *
 *     scrypt$16384$8$1$<salt-base64>$<hash-base64>
 */

/** promisify loses scrypt's optional-options overload, so pin the shape here. */
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export const HASH_SCHEME = "scrypt";

function encode(salt: Buffer, hash: Buffer): string {
  return `${HASH_SCHEME}$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Hashes a plaintext password into the storage format above. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = (await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: 128 * N * R * 2,
  })) as Buffer;
  return encode(salt, hash);
}

/**
 * Verifies a plaintext password against a stored hash.
 *
 * Always runs the full scrypt computation, even when the stored value is
 * malformed, so a corrupt row cannot become a timing oracle.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const usable = parts.length === 6 && parts[0] === HASH_SCHEME;

  let salt = randomBytes(SALT_BYTES);
  let expected = randomBytes(KEY_LENGTH);
  let n = N;
  let r = R;
  let p = P;

  if (usable) {
    n = Number(parts[1]);
    r = Number(parts[2]);
    p = Number(parts[3]);
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !expected.length) {
      return false;
    }
  }

  let actual: Buffer;
  try {
    actual = (await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * Math.max(n, N) * Math.max(r, R) * 2,
    })) as Buffer;
  } catch {
    return false;
  }

  if (!usable || actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** True when a string looks like a hash produced by `hashPassword`. */
export function isPasswordHash(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(`${HASH_SCHEME}$`) && value.split("$").length === 6;
}
