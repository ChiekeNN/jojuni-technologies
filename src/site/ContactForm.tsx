import { ArrowRight, Check, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "../lib/api";
import { contactInfo } from "./content";

/**
 * The public "project brief" form. Submissions are stored in Neon (`leads`) and
 * trigger two emails: a notification to the team inbox and an acknowledgement
 * to the person who submitted it.
 *
 * The hidden `website` field is a honeypot: bots fill it, humans never see it.
 */

interface SubmissionResult {
  /** Server confirmed the row was stored. */
  accepted: boolean;
  /** Whether the visitor's confirmation email actually went out. */
  acknowledged: boolean;
  /** Address the acknowledgement was attempted against. */
  email: string;
  name: string;
}

export function ContactForm() {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    setSubmitState("sending");
    setSubmitError(null);
    try {
      const response = await api.createLead({
        name,
        email,
        company: String(form.get("company") ?? ""),
        brief: String(form.get("brief") ?? ""),
        website: String(form.get("website") ?? ""),
      });
      setResult({
        accepted: response.accepted,
        acknowledged: response.email?.acknowledged ?? false,
        email,
        name,
      });
      setSubmitState("idle");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? `${error.message} Try again, or email ${contactInfo.email} directly.`
          : `Something went wrong sending your brief. Try again, or email ${contactInfo.email} directly.`,
      );
      setSubmitState("error");
    }
  };

  if (result) {
    const firstName = result.name.split(/\s+/)[0] || "there";
    return (
      <div
        className="border border-black/15 bg-white p-10 text-center sm:p-14"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center bg-[#d90429] text-white">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
          Thank you, {firstName} — your brief has been submitted.
        </h3>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-black/60">
          Your submission reached us and has been logged. A senior member of the team will read it
          and reply within one working day with honest first thoughts and a suggested next step.
        </p>

        {result.acknowledged ? (
          <p className="mx-auto mt-5 flex max-w-md items-start justify-center gap-2 border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-900">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              A confirmation has been sent to <strong className="font-semibold">{result.email}</strong>.
              Check your spam folder if it has not arrived within a few minutes.
            </span>
          </p>
        ) : (
          <p className="mx-auto mt-5 max-w-md border border-black/15 bg-[#f4f2ed] px-4 py-3 text-left text-sm text-black/60">
            We could not send a confirmation email to{" "}
            <strong className="font-semibold text-black">{result.email}</strong>, but your brief has
            been received and will be reviewed. You are welcome to email{" "}
            <a href={`mailto:${contactInfo.email}`} className="font-semibold text-[#d90429] hover:text-black">
              {contactInfo.email}
            </a>{" "}
            if you would like a copy.
          </p>
        )}

        <button
          onClick={() => {
            setResult(null);
            setSubmitState("idle");
          }}
          className="mt-8 bg-black px-6 py-3 font-semibold text-white transition hover:bg-[#d90429]"
        >
          Send another brief
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 border border-black/15 bg-white p-6 sm:p-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="form-label">
          Name
          <input required name="name" className="form-input" placeholder="Your name" />
        </label>
        <label className="form-label">
          Work email
          <input required type="email" name="email" className="form-input" placeholder="you@company.com" />
        </label>
      </div>
      <label className="form-label">
        Company
        <input name="company" className="form-input" placeholder="Company name" />
      </label>
      <label className="form-label">
        What can we help you build?
        <textarea
          required
          name="brief"
          rows={5}
          className="form-input resize-none"
          placeholder="A short description of your project, timeline, and budget range if you have one"
        />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {submitState === "error" && submitError && (
        <p className="border border-[#d90429]/40 bg-[#d90429]/5 px-4 py-3 text-sm text-[#9f001d]" role="alert">
          {submitError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitState === "sending"}
        className="group flex w-full items-center justify-center gap-3 bg-[#d90429] px-7 py-4 font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-70"
      >
        {submitState === "sending" ? "Sending…" : "Send project brief"}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
