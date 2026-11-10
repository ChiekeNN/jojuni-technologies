/**
 * Small presentational primitives shared by every workspace screen.
 *
 * Deliberately dependency-free: Tailwind classes only, no component library.
 * The palette mirrors the public site (black / off-white / #d90429).
 */
import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

import { initialsOf, type Person } from "./model";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Avatars                                                             */
/* ------------------------------------------------------------------ */

export function Avatar({
  person,
  size = "md",
  ring,
}: {
  person?: Person;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const dimensions = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-[11px]",
    lg: "h-10 w-10 text-xs",
  }[size];

  if (!person) {
    return (
      <span
        className={cx(
          "grid shrink-0 place-items-center rounded-full border border-dashed border-black/25 font-semibold text-black/35",
          dimensions,
        )}
        title="Unassigned"
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-white",
        dimensions,
      )}
      style={{ backgroundColor: person.color }}
      title={`${person.name} — ${person.title}`}
    >
      {person.initials || initialsOf(person.name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: Person[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((person) => (
        <Avatar key={person.id} person={person} size="sm" ring />
      ))}
      {extra > 0 && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-black/70 text-[10px] font-semibold text-white ring-2 ring-white">
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout blocks                                                       */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx("rounded-lg border border-black/10 bg-white", padded && "p-5", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold tracking-[-0.01em] text-black">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-black/45">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-[-0.03em] text-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-black/50">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-black/70">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-black/45">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  tone = "secondary",
  type = "button",
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const tones: Record<ButtonTone, string> = {
    primary: "bg-black text-white hover:bg-[#d90429]",
    secondary: "border border-black/15 bg-white text-black hover:border-black/40",
    ghost: "text-black/60 hover:bg-black/5 hover:text-black",
    danger: "border border-[#d90429]/30 bg-white text-[#d90429] hover:bg-[#d90429] hover:text-white",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  tone = "ghost",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  tone?: "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "grid h-7 w-7 shrink-0 place-items-center rounded transition",
        tone === "danger" ? "text-black/35 hover:bg-[#d90429]/10 hover:text-[#d90429]" : "text-black/35 hover:bg-black/5 hover:text-black",
      )}
    >
      {children}
    </button>
  );
}

const fieldClass =
  "w-full rounded border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-black/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-black/40">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.ComponentPropsWithoutRef<"input">) {
  const { className, ...rest } = props;
  return <input {...rest} className={cx(fieldClass, className)} />;
}

export function TextArea(props: React.ComponentPropsWithoutRef<"textarea">) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cx(fieldClass, "min-h-24 resize-y leading-relaxed", className)} />;
}

export function Select(props: React.ComponentPropsWithoutRef<"select">) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cx(fieldClass, "appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "ok" | "warn" | "dark";
}) {
  const tones = {
    neutral: "bg-black/5 text-black/60",
    danger: "bg-[#d90429]/10 text-[#d90429]",
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    dark: "bg-black text-white",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]", tones[tone])}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8">
      <div
        className={cx("w-full rounded-lg bg-white shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-black/10 px-5 py-3.5">
          <h2 className="text-sm font-bold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded text-black/40 transition hover:bg-black/5 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({ value, color = "#000000" }: { value: number; color?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-black/8" aria-hidden>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}
