import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { CtaBand } from "../Layout";
import { SiteLink } from "../router";
import { approach, blogPosts, caseStudies, services, stats, testimonials } from "../content";

export function HomePage() {
  useEffect(() => {
    document.title = "Jojuni Technologies | Build. Secure. Scale.";
  }, []);

  return (
    <>
      <section className="relative isolate flex min-h-[760px] items-end overflow-hidden bg-black pt-28 text-white sm:min-h-[840px] lg:h-[100svh] lg:min-h-[760px]">
        <motion.img
          initial={{ scale: 1.06, opacity: 0.65 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          src="/images/jojuni-team-hero.jpg"
          alt="A Jojuni Technologies team collaborating in a modern studio"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[64%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.97)_0%,rgba(0,0,0,.82)_34%,rgba(0,0,0,.18)_72%,rgba(0,0,0,.42)_100%)]" />
        <div className="mx-auto w-full max-w-[1480px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
          <motion.div initial={{ y: 44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.28, ease: [0.22, 1, 0.36, 1] }} className="max-w-4xl">
            <h1 className="text-[clamp(4.1rem,10vw,9.5rem)] font-extrabold leading-[0.78] tracking-[-0.075em]">
              Jojuni
              <span className="mt-4 block text-[0.36em] font-semibold leading-none tracking-[-0.035em] text-[#d90429]">Technologies</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl lg:text-2xl">
              We build secure websites, software, and intelligent systems that move ambitious businesses forward.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <SiteLink to="/contact" className="group inline-flex items-center justify-center gap-3 bg-[#d90429] px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-black">
                Build with us
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </SiteLink>
              <SiteLink to="/services" className="inline-flex items-center justify-center border border-white/55 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white hover:text-black">
                Explore our services
              </SiteLink>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#d90429] py-5 text-white" aria-label="Jojuni capabilities">
        <div className="marquee-track flex w-max items-center whitespace-nowrap text-sm font-bold uppercase tracking-[0.25em] sm:text-base">
          {[0, 1].map((group) => (
            <div key={group} className="flex items-center" aria-hidden={group === 1}>
              {["Build with clarity", "Secure by design", "Scale with confidence", "Technology that works"].map((item) => (
                <span key={item} className="flex items-center">
                  <span className="mx-8">{item}</span>
                  <span className="h-1.5 w-1.5 rotate-45 bg-white" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-black px-5 py-14 text-white sm:px-8 lg:px-12" aria-label="Jojuni in numbers">
        <div className="mx-auto grid max-w-[1380px] gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="bg-black px-2 py-8 sm:px-8">
              <p className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{value}</p>
              <p className="mt-2 text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-8 border-b border-black pb-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <p className="section-kicker">What we do</p>
            <div>
              <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                One technology partner, from first idea to daily operations.
              </h2>
            </div>
          </div>
          <div className="mt-14 grid gap-px bg-black/15 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service) => {
              const Icon = service.icon;
              return (
                <SiteLink key={service.title} to="/services" className="group bg-[#f4f2ed] p-7 transition hover:bg-white sm:p-9">
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center bg-black text-white"><Icon className="h-6 w-6" strokeWidth={1.6} /></span>
                    <ArrowUpRight className="h-5 w-5 text-black/25 transition group-hover:text-[#d90429]" />
                  </div>
                  <h3 className="mt-7 text-xl font-semibold tracking-[-0.02em]">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-black/55">{service.summary}</p>
                </SiteLink>
              );
            })}
          </div>
          <div className="mt-10">
            <SiteLink to="/services" className="group inline-flex items-center gap-3 border border-black px-6 py-4 font-semibold transition hover:bg-black hover:text-white">
              See all ten service areas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </SiteLink>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-end justify-between gap-8 border-b border-black pb-10">
            <div>
              <p className="section-kicker">Selected work</p>
              <h2 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">Results our clients can measure.</h2>
            </div>
            <SiteLink to="/portfolio" className="group hidden shrink-0 items-center gap-3 text-sm font-semibold hover:text-[#d90429] sm:inline-flex">
              View the portfolio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </SiteLink>
          </div>
          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            {caseStudies.slice(0, 3).map((study) => (
              <SiteLink key={study.name} to="/portfolio" className="group border-t-2 border-black pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">{study.sector} / {study.year}</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] group-hover:text-[#d90429]">{study.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/55">{study.summary}</p>
                <p className="mt-5 text-sm font-semibold text-[#d90429]">{study.outcomes[0]}</p>
              </SiteLink>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker">How we work</p>
          <h2 className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Less theatre. More useful technology.</h2>
          <div className="mt-16 grid border-t border-black sm:grid-cols-2 lg:grid-cols-4">
            {approach.map(([number, title, description], index) => (
              <motion.div
                key={number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: index * 0.08 }}
                className="border-b border-black p-6 first:pl-0 sm:odd:border-r lg:border-r lg:last:border-r-0 lg:last:pr-0"
              >
                <span className="text-xs font-bold text-[#d90429]">{number}</span>
                <h3 className="mt-12 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-black/55">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1380px]">
          <p className="section-kicker text-[#d90429]">Client words</p>
          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            {testimonials.map((item) => (
              <blockquote key={item.name} className="border-t border-white/25 pt-7">
                <p className="text-xl leading-snug tracking-[-0.01em] text-white/90">“{item.quote}”</p>
                <footer className="mt-6 text-sm text-white/50">
                  <span className="font-semibold text-white">{item.name}</span> — {item.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-end justify-between gap-8 border-b border-black pb-8">
            <div>
              <p className="section-kicker">News & insights</p>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">What we are writing about.</h2>
            </div>
            <SiteLink to="/blog" className="group hidden shrink-0 items-center gap-3 text-sm font-semibold hover:text-[#d90429] sm:inline-flex">
              All articles <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </SiteLink>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {blogPosts.slice(0, 2).map((post) => (
              <SiteLink key={post.slug} to={`/blog/${post.slug}`} className="group border border-black/15 bg-white p-7 transition hover:border-black sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">{post.category} / {post.dateLabel}</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.02em] group-hover:text-[#d90429]">{post.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/55">{post.excerpt}</p>
              </SiteLink>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
