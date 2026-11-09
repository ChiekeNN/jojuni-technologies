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

  // Store the lead when a database is available. If it is not, we still email
  // the brief through: losing a real enquiry because of an infrastructure
  // problem is worse than losing the row. `stored` tells the client which
  // happened so nothing is silently swallowed.
  let stored = false;
  let leadId: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      const rows = await query<{ id: string }>(
        "insert into public.leads (name, email, company, brief) values ($1, $2, $3, $4) returning id",
        [name, email, company, brief],
      );
      stored = true;
      leadId = rows[0]?.id ?? null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[leads] could not persist lead, falling back to email only:", error);
    }
  }

  // Email runs after the row is committed and never throws: a failed send must
  // not lose a stored lead, nor fail a submission the visitor made correctly.
  // Both sends are independent so one failing cannot suppress the other.
  const lead = { name, email, company, brief };
  const [team, acknowledgement] = await Promise.all([
    sendLeadNotification(lead),
    sendLeadAcknowledgement(lead),
  ]);

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
