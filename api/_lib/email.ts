/**
 * Transactional email for lead notifications.
 *
 * Uses Resend's HTTP API directly (plain fetch, no SDK) so the serverless
 * bundle stays small and there is nothing to instrument for bundling.
 *
 * Configuration (all optional — the app degrades gracefully without them):
 *   RESEND_API_KEY      API key from https://resend.com/api-keys
 *   LEAD_NOTIFY_TO      inbox that receives every project brief
 *   LEAD_FROM_EMAIL     verified sender, e.g. "Jojuni <forms@jojunitechnologies.com.ng>"
 *
 * If a sending domain has not been verified yet, Resend only permits sending
 * from onboarding@resend.dev and only to the account owner's own address.
 * That is fine for a smoke test but will silently fail for real visitors.
 */

/** Inbox that receives every submitted brief. */
export const LEAD_NOTIFY_TO =
  process.env.LEAD_NOTIFY_TO?.trim() || "contactform@jojunitechnologies.com.ng";

/**
 * Default sender. Until the domain is verified in Resend this must stay on
 * Resend's own domain, so a reply still routes back via `reply_to`.
 */
const LEAD_FROM_EMAIL =
  process.env.LEAD_FROM_EMAIL?.trim() || "Jojuni Website <onboarding@resend.dev>";

export interface LeadEmailInput {
  name: string;
  email: string;
  company?: string;
  brief: string;
  receivedAt?: Date;
}

export type EmailOutcome =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error"; detail?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Escapes text for safe interpolation into the HTML email bodies. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapses newlines in the brief into paragraphs for the HTML body. */
function paragraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

async function send(payload: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailOutcome> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: LEAD_FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Log but never throw: a failed email must not lose the stored lead.
      // eslint-disable-next-line no-console
      console.error("[email] provider rejected send:", response.status, detail.slice(0, 400));
      return { sent: false, reason: "provider_error", detail: `${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[email] send failed:", error);
    return { sent: false, reason: "provider_error" };
  }
}

/** Notifies the team inbox that a new brief has arrived. */
export function sendLeadNotification(input: LeadEmailInput): Promise<EmailOutcome> {
  const received = (input.receivedAt ?? new Date()).toISOString().replace("T", " ").slice(0, 16);
  const company = input.company?.trim() || "—";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#151515;line-height:1.6">
      <h2 style="margin:0 0 4px;font-size:20px">New project brief</h2>
      <p style="margin:0 0 20px;color:#666;font-size:13px">Received ${escapeHtml(received)} UTC</p>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px">
        <tr><td style="padding:4px 16px 4px 0;color:#666">Name</td><td><strong>${escapeHtml(input.name)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Company</td><td>${escapeHtml(company)}</td></tr>
      </table>
      <h3 style="margin:0 0 8px;font-size:15px">Brief</h3>
      <div style="border-left:3px solid #d90429;padding-left:14px;font-size:14px">
        ${paragraphs(input.brief)}
      </div>
      <p style="margin-top:24px;font-size:12px;color:#888">
        Reply directly to this email to answer ${escapeHtml(input.name)}.
      </p>
    </div>`;

  return send({
    to: LEAD_NOTIFY_TO,
    subject: `New project brief — ${input.name}${input.company?.trim() ? ` (${input.company.trim()})` : ""}`,
    html,
    replyTo: input.email,
  });
}

/** Acknowledges receipt to the person who submitted the form. */
export function sendLeadAcknowledgement(input: LeadEmailInput): Promise<EmailOutcome> {
  const firstName = input.name.trim().split(/\s+/)[0] || "there";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#151515;line-height:1.65;max-width:560px">
      <h2 style="margin:0 0 16px;font-size:20px">We have your brief, ${escapeHtml(firstName)}.</h2>
      <p style="margin:0 0 14px">
        Thank you for getting in touch with Jojuni Technologies. Your project brief
        reached us successfully and has been logged.
      </p>
      <p style="margin:0 0 14px">
        A senior member of our team — not a sales queue — will read it and reply
        within one working day with honest first thoughts and a suggested next step.
      </p>
      <p style="margin:0 0 14px">
        If anything changes in the meantime, simply reply to this email.
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#666">
        Your submission, for reference:
      </p>
      <div style="border-left:3px solid #d90429;padding-left:14px;margin-top:10px;font-size:13px;color:#444">
        ${paragraphs(input.brief)}
      </div>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:26px 0 14px">
      <p style="margin:0;font-size:13px;color:#666">
        <strong>Jojuni Technologies</strong><br>
        1, Mpi Avenue, off Chinda Road, off Ada George Road,<br>
        Port Harcourt, Rivers State, Nigeria
      </p>
    </div>`;

  return send({
    to: input.email,
    subject: "We received your project brief — Jojuni Technologies",
    html,
    replyTo: LEAD_NOTIFY_TO,
  });
}
