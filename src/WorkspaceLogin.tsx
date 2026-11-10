import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { ApiError, api } from "./lib/api";
import { companyInfo } from "./site/content";

/**
 * Workspace sign-in.
 *
 * Password only — the workspace has one owner account, so there is no username
 * to ask for. The password is posted to /api/workspace/auth, checked against a
 * scrypt hash on the server, and exchanged for an HttpOnly session cookie. It
 * is never stored in the browser, never put in localStorage, and never part of
 * the bundle.
 */

interface LoginPageProps {
  /** Called once the server confirms a session. */
  onSignedIn: () => void;
  /** Rendered when the session expired mid-use rather than on first visit. */
  expired?: boolean;
}

export default function LoginPage({ onSignedIn, expired = false }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    document.title = "Sign in | Jojuni Workspace";
    // The workspace manifest would otherwise let a signed-out visitor install
    // the app shell; drop it on the sign-in screen.
    document.querySelector('link[rel="manifest"]')?.remove();
  }, []);

  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = window.setInterval(() => setRetryIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [retryIn]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setHint(null);
    setPending(true);
    try {
      await api.workspaceAuth.login(password);
      setPassword("");
      onSignedIn();
    } catch (failure) {
      if (failure instanceof ApiError) {
        if (failure.code === "too_many_attempts") {
          const match = failure.hint?.match(/(\d+)/);
          setRetryIn(match ? Number(match[1]) * 60 : 900);
        }
        setError(failure.message);
        if (failure.hint && failure.code !== "too_many_attempts") setHint(failure.hint);
      } else {
        setError("That could not be completed. Try again.");
      }
      setPassword("");
    } finally {
      setPending(false);
    }
  };

  const locked = retryIn > 0;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_75%_0%,rgba(217,4,41,0.32)_0%,rgba(0,0,0,0)_62%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-white/10" />

      <header className="px-5 pt-8 sm:px-10">
        <a
          href="/"
          className="inline-flex items-center gap-3 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to jojunitechnologies.com.ng
        </a>
      </header>

      <main className="flex flex-1 items-center px-5 py-14 sm:px-10">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-20">
          {/* Left: identity */}
          <div>
            <img
              src="/logo-official.svg"
              alt="Jojuni Technologies"
              className="h-16 w-auto max-w-full sm:h-20"
            />
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-[#d90429]">
              Team workspace
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
              Authorised access only.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/55">
              This workspace is restricted to the super admin. Tasks, projects, files, messages and
              the finance ledger are not public.
            </p>
            <div className="mt-9 flex items-start gap-4 border border-white/12 bg-white/[0.03] p-5">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#d90429]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-white/45">
                Sessions are held server-side and expire after seven days. Signing out ends the
                session immediately.
              </p>
            </div>
          </div>

          {/* Right: the form */}
          <div className="bg-white p-7 text-black shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">Sign in</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Enter the password</h2>
            <p className="mt-2 text-sm leading-relaxed text-black/55">
              No username needed — this workspace has a single owner account.
            </p>

            {expired && !error && (
              <p className="mt-6 border-l-2 border-[#d90429] bg-[#fdf2f4] px-4 py-3 text-sm text-black/70">
                Your session expired. Sign in again to pick up where you left off.
              </p>
            )}

            <form onSubmit={submit} className="mt-7" noValidate>
              <label
                htmlFor="workspace-password"
                className="text-xs font-bold uppercase tracking-[0.16em] text-black/50"
              >
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="workspace-password"
                  name="password"
                  type={reveal ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                  disabled={pending || locked}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "workspace-error" : undefined}
                  placeholder="Enter your password"
                  className="w-full border border-black/20 bg-white px-4 py-3.5 pr-12 text-base tracking-[0.02em] outline-none transition placeholder:tracking-normal placeholder:text-black/30 focus:border-black disabled:bg-black/5"
                />
                <button
                  type="button"
                  onClick={() => setReveal((value) => !value)}
                  className="absolute right-0 top-0 grid h-full w-12 place-items-center text-black/35 transition hover:text-black"
                  aria-label={reveal ? "Hide password" : "Show password"}
                  aria-pressed={reveal}
                  tabIndex={-1}
                >
                  {reveal ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {error && (
                <p
                  id="workspace-error"
                  role="alert"
                  className="mt-4 border-l-2 border-[#d90429] bg-[#fdf2f4] px-4 py-3 text-sm text-[#8d0220]"
                >
                  {error}
                  {locked && ` Try again in ${Math.ceil(retryIn / 60)} minute(s).`}
                </p>
              )}
              {hint && (
                <p className="mt-3 text-xs leading-relaxed text-black/45">{hint}</p>
              )}

              <button
                type="submit"
                disabled={pending || locked || !password}
                className="mt-6 flex w-full items-center justify-center gap-2 bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#d90429] disabled:cursor-not-allowed disabled:bg-black/25"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Checking…
                  </>
                ) : locked ? (
                  "Too many attempts"
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-6 border-t border-black/10 pt-5 text-xs leading-relaxed text-black/40">
              Lost the password? It can only be reset on the server — see{" "}
              <span className="text-black/60">DEPLOYMENT.md</span>.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white px-5 py-6 text-xs text-black/55 sm:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {companyInfo.legalName}. All rights reserved.</p>
          <p className="text-black/45">Registered in Nigeria · CAC {companyInfo.registration}</p>
        </div>
      </footer>
    </div>
  );
}
