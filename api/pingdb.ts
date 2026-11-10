/** Diagnostic: does merely importing the Neon driver kill the function here? */
import { neon } from "@neondatabase/serverless";

export default function handler(_req: unknown, res: any): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      ok: true,
      driverImported: typeof neon === "function",
      node: process.version,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    }),
  );
}
