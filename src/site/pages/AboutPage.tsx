import { useEffect } from "react";
import { CtaBand, PageHero } from "../Layout";
import { approach, stats, team, values } from "../content";

export function AboutPage() {
  useEffect(() => {
    document.title = "About Us | Jojuni Technologies";
  }, []);

  return (
    <>
      <PageHero
        kicker="About us"
        title="A Lagos technology company built on plain language and kept promises."
        intro="Jojuni Technologies exists because too many ambitious businesses were sold software they could not use, maintain, or explain. We do the opposite: clear scope, dependable delivery, and systems your team actually owns."
      />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[1380px] gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
          <div>
            <p className="section-kicker">Our story</p>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-black/65">
              <p>
                Jojuni began as a two-person consultancy fixing other people's abandoned websites — expired certificates, broken checkouts, code nobody understood. The same story repeated so often that we decided to build a company where that story could not happen: every project documented, every system maintainable, every handover complete.
              </p>
              <p>
                Today we are a multidisciplinary team of engineers, designers, and operators delivering websites, mobile apps, cloud infrastructure, and automation for companies across retail, health, education, and logistics.
              </p>
              <p>
                We remain deliberately compact. Senior people stay on your project from first conversation to long after launch, because continuity is the feature clients tell us they value most.
              </p>
            </div>
          </div>
          <div className="bg-black p-8 text-white sm:p-10">
            <p className="section-kicker text-[#d90429]">Jojuni in numbers</p>
            <div className="mt-8 space-y-6">
              {stats.map(([value, label]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-white/15 pb-5">
                  <span className="text-4xl font-semibold tracking-[-0.04em]">{value}</span>
                  <span className="text-sm text-white/55">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker">What we stand for</p>
          <h2 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">Four commitments, on every project.</h2>
          <div className="mt-14 grid gap-px bg-black/15 sm:grid-cols-2">
            {values.map((value) => (
              <div key={value.title} className="bg-white p-8 sm:p-10">
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">{value.title}</h3>
                <p className="mt-4 leading-relaxed text-black/60">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker">The team</p>
          <h2 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">The people you will actually work with.</h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div key={member.initials} className="border-t-2 border-black pt-6">
                <span className="grid h-16 w-16 place-items-center bg-[#d90429] text-lg font-bold text-white">{member.initials}</span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">{member.name}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-black/45">{member.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-black/55">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker">How we work</p>
          <div className="mt-10 grid border-t border-black sm:grid-cols-2 lg:grid-cols-4">
            {approach.map(([number, title, description]) => (
              <div key={number} className="border-b border-black p-6 first:pl-0 sm:odd:border-r lg:border-r lg:last:border-r-0 lg:last:pr-0">
                <span className="text-xs font-bold text-[#d90429]">{number}</span>
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-black/55">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
