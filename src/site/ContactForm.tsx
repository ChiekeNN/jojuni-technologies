import { ArrowRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "../lib/api";

/**
 * The public "project brief" form. Submissions are stored in Neon (`leads`).
 * The hidden `website` field is a honeypot: bots fill it, humans never see it.
 */
export function ContactForm() {
  const [formSent, setFormSent] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitState("sending");
    setSubmitError(null);
    try {
      await api.createLead({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        company: String(form.get("company") ?? ""),
        brief: String(form.get("brief") ?? ""),
        website: String(form.get("website") ?? ""),
      });
      setFormSent(true);
      setSubmitState("sent");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? `${error.message} Try again, or email hello@jojuni.tech directly.`
          : "Something went wrong sending your brief. Try again, or email hello@jojuni.tech directly.",
      );
      setSubmitState("error");
    }
  };

  if (formSent) {
    return (
      <div className="border border-black/15 bg-white p-10 text-center sm:p-14">
        <div className="mx-auto grid h-16 w-16 place-items-center bg-[#d90429] text-white">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Your brief is ready.</h3>
        <p className="mx-auto mt-3 max-w-md text-black/55">
          Thanks for reaching out. The Jojuni team will review your project and respond within one working day.
        </p>
        <button onClick={() => { setFormSent(false); setSubmitState("idle"); }} className="mt-8 bg-black px-6 py-3 font-semibold text-white transition hover:bg-[#d90429]">
          Send another brief
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 border border-black/15 bg-white p-6 sm:p-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="form-label">Name<input required name="name" className="form-input" placeholder="Your name" /></label>
        <label className="form-label">Work email<input required type="email" name="email" className="form-input" placeholder="you@company.com" /></label>
      </div>
      <label className="form-label">Company<input name="company" className="form-input" placeholder="Company name" /></label>
      <label className="form-label">What can we help you build?<textarea required name="brief" rows={5} className="form-input resize-none" placeholder="A short description of your project, timeline, and budget range if you have one" /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {submitState === "error" && submitError && (
        <p className="border border-[#d90429]/40 bg-[#d90429]/5 px-4 py-3 text-sm text-[#9f001d]" role="alert">{submitError}</p>
      )}
      <button type="submit" disabled={submitState === "sending"} className="group flex w-full items-center justify-center gap-3 bg-[#d90429] px-7 py-4 font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-70">
        {submitState === "sending" ? "Sending…" : "Send project brief"}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
