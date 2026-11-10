/// <reference types="vite/client" />

/**
 * Environment variables this build reads.
 *
 * Both are optional on purpose. Without them the workspace chat runs local-only
 * from `localStorage` — the same behaviour as before the database existed — so
 * a deployment that forgets to set them is degraded, not broken.
 *
 * See `docs/chat-database-scope.md`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
