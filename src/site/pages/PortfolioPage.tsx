import { Check } from "lucide-react";
import { useEffect } from "react";
import { CtaBand, PageHero } from "../Layout";
import { caseStudies } from "../content";

export function PortfolioPage() {
  useEffect(() => {
    document.title = "Portfolio | Jojuni Technologies";
  }, []);

  return (
    <>
      <PageHero
        kicker="Portfolio"
        title="Work that paid for itself, in the clients' own numbers."
        intro="A selection of recent engagements across retail, health, education, food logistics, and our own operations. Every outcome below was measured by the client, not by us."
      />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px] space-y-20">
          {caseStudies.map((study, index) => (
            <article key={study.name} className={`grid gap-10 border-t-2 border-black pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 ${index % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
              <div className="lg:[direction:ltr]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">{study.sector} / {study.year}</p>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{study.name}</h2>
                <p className="mt-3 text-sm font-semibold text-black/45">{study.client}</p>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/60">{study.summary}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {study.tags.map((tag) => (
                    <span key={tag} className="border border-black/25 px-3 py-1.5 text-xs font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="bg-black p-8 text-white sm:p-10 lg:[direction:ltr]">
                <p className="section-kicker text-[#d90429]">Measured outcomes</p>
                <ul className="mt-8 space-y-5">
                  {study.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-4 border-b border-white/15 pb-5 text-lg leading-snug last:border-b-0 last:pb-0">
                      <Check className="mt-1 h-5 w-5 shrink-0 text-[#d90429]" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
