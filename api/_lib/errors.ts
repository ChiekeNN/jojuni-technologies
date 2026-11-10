/**
 * API error codes.
 *
 * Deliberately duplicated from `shared/types` rather than imported. Vercel
 * bundles every serverless function from its own module graph, and reaching
 * outside `api/` for a *runtime value* is a resolution risk that shows up as an
 * opaque 500 at runtime while typechecking perfectly. `import type` is erased at
 * compile time and is safe; `import { someConst }` is not.
 *
 * `shared/types` remains the source of truth for the frontend, and the
 * `ApiErrorCode` union is type-checked against it in `api/_lib/errors.test`
 * style assertions below.
 */
export type ApiErrorCode =
  | "bad_request"
  | "method_not_allowed"
  | "database_not_configured"
  | "schema_missing"
  | "database_unreachable"
  | "forbidden"
  | "not_found"
  | "internal_error";

/**
 * Compile-time guarantee that this union stays in sync with `shared/types`.
 * `Equals` compares both directions; if either union gains or loses a member
 * the result is `false`, and the `const` below fails to compile.
 */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;
type _SameApiErrorCode = Equals<ApiErrorCode, import("../../shared/types").ApiErrorCode>;
const _assertApiErrorCodeInSync: _SameApiErrorCode = true;
export type ApiErrorCodeIsInSync = typeof _assertApiErrorCodeInSync;

export const FINANCE_ROLES: readonly string[] = ["founder", "accountant"];
