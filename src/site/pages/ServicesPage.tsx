import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CtaBand, PageHero } from "../Layout";
import { SiteLink } from "../router";
import { services } from "../content";

export function ServicesPage() {
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    document.title = "Our Services | Jojuni Technologies";
  }, []);

  return (
    <>
      <PageHero
        kicker="Our services"
        title="Everything a modern business needs from technology, under one roof."
        intro="Ten practice areas, one accountable team. Start with a website or a full digital transformation — the same people stay with you across all of it."
      />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="border-b border-black lg:border-b-0 lg:border-r lg:pr-14">
              {services.map((service, index) => {
                const Icon = service.icon;
                const active = activeService === index;
                return (
                  <button
                    key={service.title}
                    onClick={() => setActiveService(index)}
                    className={`group flex w-full items-center gap-4 border-b border-black/20 py-5 text-left transition last:border-b-0 lg:py-6 ${active ? "text-[#d90429]" : "text-black hover:text-[#d90429]"}`}
                  >
                    <span className="w-7 text-xs font-semibold tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} />
                    <span className="flex-1 text-base font-semibold sm:text-lg">{service.title}</span>
                    <ArrowRight className={`h-4 w-4 transition-transform ${active ? "translate-x-1" : "opacity-0 group-hover:translate-x-1 group-hover:opacity-100"}`} />
                  </button>
                );
              })}
            </div>

            <div className="min-h-[570px] py-12 lg:py-16">
              <AnimatePresence mode="wait">
                <motion.div key={activeService} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
                  <div className="flex h-14 w-14 items-center justify-center bg-black text-white">
                    {(() => {
                      const ActiveIcon = services[activeService].icon;
                      return <ActiveIcon className="h-7 w-7" strokeWidth={1.6} />;
                    })()}
                  </div>
                  <h3 className="mt-8 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{services[activeService].title}</h3>
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-black/60">{services[activeService].summary}</p>
                  <div className="mt-10 border-t border-black">
                    {services[activeService].items.map((item) => (
                      <div key={item.name} className="grid gap-2 border-b border-black/20 py-5 sm:grid-cols-[0.8fr_1.2fr] sm:gap-7">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm leading-relaxed text-black/60 sm:text-base">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker">Engagements</p>
          <h2 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">Three ways to work with us.</h2>
          <div className="mt-14 grid gap-px bg-black/15 lg:grid-cols-3">
            {[
              ["Project", "A defined build with a fixed scope: a website, an app, a migration. Clear milestones, a launch date, and a handover package."],
              ["Retainer", "Ongoing care for systems that must stay fast and safe: monitoring, updates, security patches, and a monthly improvement budget."],
              ["Embedded team", "Our engineers and designers join yours for a quarter or more, delivering inside your roadmap under your brand."],
            ].map(([title, description]) => (
              <div key={title} className="bg-white p-8 sm:p-10">
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-4 leading-relaxed text-black/60">{description}</p>
                <SiteLink to="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#d90429] hover:text-black">
                  Discuss this engagement <ArrowRight className="h-4 w-4" />
                </SiteLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
