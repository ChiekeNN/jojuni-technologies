import { ArrowUpRight, Lock } from "lucide-react";
import type { CaseStudyMedia as Media } from "./content";

/**
 * Renders a case-study hero visual inside a frame that matches the product
 * surface: browser chrome for web work, a device shell for mobile.
 *
 * The aspect ratio is fixed per `kind` so every visual on the portfolio page
 * lines up regardless of the source image's dimensions.
 */
export function CaseStudyMedia({ media, demoUrl }: { media: Media; demoUrl?: string }) {
  const host = demoUrl ? safeHost(demoUrl) : undefined;

  return (
    <figure className="m-0">
      {media.kind === "phone" ? (
        <PhoneFrame media={media} />
      ) : (
        <BrowserFrame media={media} host={host} kind={media.kind} />
      )}

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-black/45">{media.caption ?? media.alt}</span>
        {demoUrl ? (
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex shrink-0 items-center gap-1.5 font-semibold text-black transition hover:text-[#d90429]"
          >
            View live
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}

function BrowserFrame({ media, host, kind }: { media: Media; host?: string; kind: "browser" | "app" }) {
  return (
    <div className="overflow-hidden border border-black bg-white shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
      <div className="flex items-center gap-3 border-b border-black/15 bg-[#f4f2ed] px-3 py-2.5 sm:px-4">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 bg-black/20" />
          <span className="h-2.5 w-2.5 bg-black/20" />
          <span className="h-2.5 w-2.5 bg-black/20" />
        </div>
        {host ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 border border-black/15 bg-white px-2.5 py-1 text-[11px] font-medium text-black/50">
            {kind === "app" ? <Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
            <span className="truncate">{host}</span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
      <img
        src={media.src}
        alt={media.alt}
        loading="lazy"
        decoding="async"
        className="block aspect-[16/10] w-full object-cover object-top"
      />
    </div>
  );
}

function PhoneFrame({ media }: { media: Media }) {
  return (
    <div className="flex justify-center bg-[#f4f2ed] px-6 py-10">
      <div className="w-full max-w-[260px] overflow-hidden rounded-[2rem] border-[6px] border-black bg-black shadow-[10px_10px_0_0_rgba(0,0,0,0.15)]">
        <div className="relative bg-black pb-1.5 pt-2">
          <div className="mx-auto h-1 w-16 rounded-full bg-white/25" aria-hidden="true" />
        </div>
        <img
          src={media.src}
          alt={media.alt}
          loading="lazy"
          decoding="async"
          className="block aspect-[9/19] w-full object-cover object-top"
        />
      </div>
    </div>
  );
}

/** Extract a display host, tolerating values without a scheme. */
function safeHost(url: string): string | undefined {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).host;
  } catch {
    return undefined;
  }
}
