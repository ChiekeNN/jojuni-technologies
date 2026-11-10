import { isDatabaseConfigured, query } from "./_lib/db";
import {
  queryValue,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  withApiHandler,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/http";
import { requireAdminKey } from "./_lib/roles";
import { sendLeadAcknowledgement, sendLeadNotification } from "./_lib/email";
import { asEmail, asOptionalString, asString } from "./_lib/validation";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string;
  brief: string;
  status: string;
  created_at: string;
}

/**
 * POST /api/leads        — public contact form ("Send project brief")
 * GET  /api/leads        — admin export, requires the ADMIN_API_KEY header
 *
 * The form includes a hidden honeypot field named `website`. Bots fill it;
 * humans never see it. Honeypot hits get a fake success response and are
 * silently dropped.
 */
export default withApiHandler(async (req: ApiRequest, res: ApiResponse) => {
  requireMethod(req, ["POST", "GET"]);
  const method = (req.method ?? "").toUpperCase();

  if (method === "GET") {
    requireAdminKey(req);
    const limit = Math.min(200, Math.max(1, Number(queryValue(req, "limit") ?? "50") || 50));
    const rows = await query<LeadRow>(
      "select id, name, email, company, brief, status, created_at from public.leads order by created_at desc limit $1",
      [limit],
    );
    sendJson(res, 200, {
      leads: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company,
        brief: row.brief,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
    return;
  }

  // Entry breadcrumb: if the platform ever kills this function mid-flight, the
  // last log line tells us which stage it died in.
  // eslint-disable-next-line no-console
  console.log("[leads] POST received", {
    dbConfigured: isDatabaseConfigured(),
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    notifyTo: process.env.LEAD_NOTIFY_TO ?? "(default)",
  });

  const body = await readJsonBody(req);

  // Honeypot: pretend success, store nothing.
  if (asString(body.website, { max: 500, fallback: "" })) {
    sendJson(res, 201, { id: null, accepted: false });
    return;
  }

  const name = asString(body.name, { max: 200, field: "name" });
  const email = asEmail(body.email);
  const company = asOptionalString(body.company, { max: 200, field: "company" });
  const brief = asString(body.brief, { max: 5000, field: "brief" });

  // Storage and email run CONCURRENTLY, not in sequence. Each has an 8s ceiling,
  // and running them in series would allow up to 16s — past the platform's
  // function limit, which kills the process and returns an empty 500 with no
  // JSON body. The visitor sees "the server could not complete this request"
  // and the lead is lost. Overlapping them keeps the worst case at ~8s.
  const lead = { name, email, company, brief };

  const storage = (async (): Promise<{ stored: boolean; id: string | null }> => {
    if (!isDatabaseConfigured()) return { stored: false, id: null };
    try {
      const rows = await query<{ id: string }>(
        "insert into public.leads (name, email, company, brief) values ($1, $2, $3, $4) returning id",
        [name, email, company, brief],
      );
      return { stored: true, id: rows[0]?.id ?? null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[leads] could not persist lead, falling back to email only:", error);
      return { stored: false, id: null };
    }
  })();

  const [persisted, team, acknowledgement] = await Promise.all([
    storage,
    sendLeadNotification(lead),
    sendLeadAcknowledgement(lead),
  ]);
  const { stored, id: leadId } = persisted;

  // eslint-disable-next-line no-console
  console.log("[leads] done", { stored, notified: team.sent, acknowledged: acknowledgement.sent });

  // If we neither stored nor notified anyone, the submission really is lost and
  // the visitor must be told rather than shown a false success.
  if (!stored && !team.sent) {
    sendError(
      res,
      503,
      "internal_error",
      "We could not deliver your brief right now.",
      "Nothing was saved. Please try again shortly, or email contactform@jojunitechnologies.com.ng directly.",
    );
    return;
  }

  sendJson(res, 201, {
    id: leadId,
    accepted: true,
    stored,
    email: {
      notified: team.sent,
      acknowledged: acknowledgement.sent,
    },
  });
});
