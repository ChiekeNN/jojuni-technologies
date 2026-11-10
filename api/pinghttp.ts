/** Diagnostic: is api/_lib/http.ts (shared by every route) loadable here? */
import { sendJson, withApiHandler, type ApiRequest, type ApiResponse } from "./_lib/http";

export default withApiHandler(async (_req: ApiRequest, res: ApiResponse) => {
  sendJson(res, 200, { ok: true, httpLibLoaded: true, node: process.version });
});
