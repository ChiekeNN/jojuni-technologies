import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Mail, MapPin, Menu, Phone, Clock3, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { contactInfo, navItems } from "./content";
import { SiteLink, useRouter } from "./router";

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`));

  return (
    <div className="site-shell bg-[#f4f2ed] text-black">
      <header className="absolute inset-x-0 top-0 z-40 border-b border-white/15">
        <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:h-24 lg:px-12">
          <SiteLink to="/" className="shrink-0" aria-label="Jojuni Technologies home">
            <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-11 w-auto sm:h-12" />
          </SiteLink>

          <nav className="hidden items-center gap-7 text-sm font-medium text-white xl:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <SiteLink key={item.to} to={item.to} className={`nav-link ${isActive(item.to) ? "nav-link-active" : ""}`}>
                {item.label}
              </SiteLink>
            ))}
          </nav>

          <div className="hidden items-center gap-5 xl:flex">
            <SiteLink to="/contact" className="group inline-flex items-center gap-2 bg-[#d90429] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black">
              Start a project
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </SiteLink>
          </div>

          <button className="grid h-11 w-11 place-items-center text-white xl:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-black px-6 py-5 text-white xl:hidden">
            <div className="flex items-center justify-between">
              <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-12 w-auto" />
              <button onClick={() => setMobileMenuOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close menu">
                <X className="h-7 w-7" />
              </button>
            </div>
            <nav className="mt-14 flex flex-col gap-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <SiteLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className={`border-b border-white/20 py-4 ${isActive(item.to) ? "text-[#d90429]" : ""}`}>
                  {item.label}
                </SiteLink>
              ))}
            </nav>
            <SiteLink to="/contact" onClick={() => setMobileMenuOpen(false)} className="mt-10 flex w-full items-center justify-between bg-[#d90429] px-6 py-5 font-semibold">
              Start a project <ArrowUpRight className="h-5 w-5" />
            </SiteLink>
          </motion.div>
        )}
      </AnimatePresence>

      <main>{children}</main>

      <footer className="bg-black px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-12 border-b border-white/20 pb-16 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr]">
            <div>
              <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-20 w-auto max-w-full sm:h-24" />
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">
                Technology designed, built, and supported with clarity — from Nigeria to the world.
              </p>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Explore</p>
              <div className="space-y-3 text-sm">
                {navItems.map((item) => (
                  <SiteLink key={item.to} to={item.to} className="block hover:text-[#d90429]">
                    {item.label}
                  </SiteLink>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Contact</p>
              <div className="space-y-4 text-sm text-white/70">
                <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 hover:text-[#d90429]"><Mail className="h-4 w-4 shrink-0" /> {contactInfo.email}</a>
                <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 hover:text-[#d90429]"><Phone className="h-4 w-4 shrink-0" /> {contactInfo.phone}</a>
                <p className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0" /> {contactInfo.office}</p>
                <p className="flex items-center gap-3"><Clock3 className="h-4 w-4 shrink-0" /> {contactInfo.hours}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright {new Date().getFullYear()} Jojuni Technologies.</p>
            <div className="flex items-center gap-6">
              <a href="/workspace" className="hover:text-[#d90429]">Team workspace</a>
              <p>Built for dependable progress.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Standard intro block for inner pages (dark hero band). */
export function PageHero({ kicker, title, intro }: { kicker: string; title: string; intro: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-black px-5 pb-20 pt-40 text-white sm:px-8 sm:pb-24 sm:pt-48 lg:px-12 lg:pb-28 lg:pt-56">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_10%,rgba(217,4,41,0.35)_0%,rgba(0,0,0,0)_60%)]" />
      <div className="mx-auto max-w-[1380px]">
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="section-kicker text-[#d90429]">
          {kicker}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">
          {title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }} className="mt-7 max-w-2xl text-lg leading-relaxed text-white/65">
          {intro}
        </motion.p>
      </div>
    </section>
  );
}

/** Red call-to-action band used at the bottom of every inner page. */
export function CtaBand() {
  return (
    <section className="bg-[#d90429] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/65">Your next move</p>
          <h2 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl lg:text-8xl">Let us build something useful.</h2>
        </div>
        <SiteLink to="/contact" className="group flex shrink-0 items-center gap-4 bg-white px-7 py-5 font-semibold text-black transition hover:bg-black hover:text-white">
          Tell us about your project
          <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </SiteLink>
      </div>
    </section>
  );
}
