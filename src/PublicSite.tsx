import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  Cloud,
  Code2,
  Globe2,
  Headphones,
  LockKeyhole,
  Menu,
  PenTool,
  Search,
  ShieldCheck,
  UsersRound,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, api } from "./lib/api";

type Service = {
  title: string;
  summary: string;
  icon: LucideIcon;
  items: { name: string; description: string }[];
};

const services: Service[] = [
  {
    title: "Web Development",
    summary: "Fast, polished websites and portals designed to turn attention into action.",
    icon: Globe2,
    items: [
      { name: "Business Websites", description: "Clean company websites that build trust and win customers." },
      { name: "Online Stores", description: "Product catalogues, secure checkout, and payment integrations." },
      { name: "Web Portals", description: "Private login areas for students, staff, clients, and partners." },
      { name: "Website Care", description: "Hosting, domains, speed improvements, security, and ongoing updates." },
    ],
  },
  {
    title: "Software & App Development",
    summary: "Purpose-built software that fits the way your team and customers actually work.",
    icon: Code2,
    items: [
      { name: "Mobile Apps", description: "Reliable experiences for iPhone and Android users." },
      { name: "Custom Business Tools", description: "Internal systems for tasks, operations, and company data." },
      { name: "Subscription Software (SaaS)", description: "Web products built for recurring monthly access." },
      { name: "Old System Upgrades", description: "Modernization, repairs, and performance improvements." },
    ],
  },
  {
    title: "Artificial Intelligence & Data",
    summary: "Practical AI and clear reporting that improve everyday business decisions.",
    icon: BrainCircuit,
    items: [
      { name: "AI Chatbots & Assistants", description: "Smart, always-on answers for customers and teams." },
      { name: "Smart Predictions", description: "Forecast sales, detect fraud, and read scanned documents." },
      { name: "Data Reports", description: "Clear dashboards that reveal daily business performance." },
    ],
  },
  {
    title: "Cloud & IT Infrastructure",
    summary: "Resilient cloud systems that keep your data available, protected, and ready to scale.",
    icon: Cloud,
    items: [
      { name: "Cloud Storage & Setup", description: "Move files and applications to AWS or Google Cloud." },
      { name: "Server Maintenance", description: "Keep critical systems stable, fast, and online." },
      { name: "Data Backups", description: "Automatic protected copies of important company information." },
    ],
  },
  {
    title: "Cybersecurity & Protection",
    summary: "Security controls that protect customers, staff, and valuable company information.",
    icon: ShieldCheck,
    items: [
      { name: "Security Testing", description: "Find and close website and application vulnerabilities." },
      { name: "Account Protection", description: "Strong passwords, two-step verification, and access controls." },
      { name: "Data Safety Compliance", description: "Privacy practices aligned with legal requirements." },
    ],
  },
  {
    title: "Product Design (UI/UX)",
    summary: "Focused digital experiences that feel clear from the very first click.",
    icon: PenTool,
    items: [
      { name: "Visual Layouts", description: "High-fidelity website and application design before development." },
      { name: "User Experience", description: "Simple, intuitive journeys built around real user needs." },
    ],
  },
  {
    title: "Business Automation",
    summary: "Connected tools and workflows that eliminate delays and repetitive paperwork.",
    icon: Workflow,
    items: [
      { name: "ERP & CRM Setup", description: "Implementation and support for HubSpot, Odoo, and similar tools." },
      { name: "Task Automation", description: "Scripts and workflows that handle repetitive operations." },
    ],
  },
  {
    title: "IT Support & Tech Management",
    summary: "Responsive support and clear technology guidance for your entire organization.",
    icon: Headphones,
    items: [
      { name: "Help Desk", description: "Support for computers, routers, printers, and office systems." },
      { name: "Tech Advising", description: "Practical technology selection, roadmaps, and budget planning." },
    ],
  },
  {
    title: "Digital Marketing Tech",
    summary: "The technical foundation your marketing needs to reach and retain more customers.",
    icon: Search,
    items: [
      { name: "Google Search Ranking (SEO)", description: "Technical improvements that help customers find you." },
      { name: "Email & SMS Automation", description: "Timely updates and promotions delivered automatically." },
    ],
  },
  {
    title: "Tech Staff Outsourcing",
    summary: "Skilled people who can strengthen your delivery team without a long hiring cycle.",
    icon: UsersRound,
    items: [
      { name: "Hiring Tech Workers", description: "Ready-to-work developers and designers for your projects." },
      { name: "Quality Testing", description: "Thorough testing to find bugs before customers do." },
    ],
  },
];

function PublicSite() {
  const [activeService, setActiveService] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Jojuni Technologies | Build. Secure. Scale.";
    const manifest = document.querySelector('link[rel="manifest"]');
    manifest?.remove();
  }, []);

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
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

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="site-shell bg-[#f4f2ed] text-black">
      <header className="absolute inset-x-0 top-0 z-40 border-b border-white/15">
        <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:h-24 lg:px-12">
          <a href="/" className="shrink-0" aria-label="Jojuni Technologies home">
            <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-11 w-auto sm:h-12" />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-white lg:flex" aria-label="Main navigation">
            <button onClick={() => scrollTo("services")} className="nav-link">Services</button>
            <button onClick={() => scrollTo("workspace-preview")} className="nav-link">Workspace</button>
            <button onClick={() => scrollTo("approach")} className="nav-link">How we work</button>
            <a href="/workspace" className="nav-link">Staff login</a>
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <button onClick={() => setContactOpen(true)} className="group inline-flex items-center gap-2 bg-[#d90429] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black">
              Start a project
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>

          <button
            className="grid h-11 w-11 place-items-center text-white lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black px-6 py-5 text-white lg:hidden"
          >
            <div className="flex items-center justify-between">
              <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-12 w-auto" />
              <button onClick={() => setMobileMenuOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close menu">
                <X className="h-7 w-7" />
              </button>
            </div>
            <nav className="mt-20 flex flex-col gap-3 text-4xl font-semibold tracking-[-0.04em]">
              <button onClick={() => scrollTo("services")} className="border-b border-white/20 py-5 text-left">Services</button>
              <button onClick={() => scrollTo("workspace-preview")} className="border-b border-white/20 py-5 text-left">Workspace</button>
              <button onClick={() => scrollTo("approach")} className="border-b border-white/20 py-5 text-left">How we work</button>
              <a href="/workspace" className="border-b border-white/20 py-5">Staff login</a>
            </nav>
            <button onClick={() => { setMobileMenuOpen(false); setContactOpen(true); }} className="mt-12 flex w-full items-center justify-between bg-[#d90429] px-6 py-5 font-semibold">
              Start a project <ArrowUpRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
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
            <motion.div
              initial={{ y: 44, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl"
            >
              <h1 className="text-[clamp(4.1rem,10vw,9.5rem)] font-extrabold leading-[0.78] tracking-[-0.075em]">
                Jojuni
                <span className="mt-4 block text-[0.36em] font-semibold leading-none tracking-[-0.035em] text-[#d90429]">Technologies</span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl lg:text-2xl">
                We build secure websites, software, and intelligent systems that move ambitious businesses forward.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => setContactOpen(true)} className="group inline-flex items-center justify-center gap-3 bg-[#d90429] px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-black">
                  Build with us
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => scrollTo("services")} className="inline-flex items-center justify-center border border-white/55 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white hover:text-black">
                  Explore our services
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="overflow-hidden bg-[#d90429] py-5 text-white" aria-label="Jojuni capabilities">
          <div className="marquee-track flex w-max items-center whitespace-nowrap text-sm font-bold uppercase tracking-[0.25em] sm:text-base">
            {[0, 1].map((group) => (
              <div key={group} className="flex items-center" aria-hidden={group === 1}>
                {['Build with clarity', 'Secure by design', 'Scale with confidence', 'Technology that works'].map((item) => (
                  <span key={item} className="flex items-center">
                    <span className="mx-8">{item}</span>
                    <span className="h-1.5 w-1.5 rotate-45 bg-white" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="scroll-mt-0 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-8 border-b border-black pb-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
              <p className="section-kicker">What we do</p>
              <div>
                <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                  One technology partner, from first idea to daily operations.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-black/60">
                  Strategy, design, engineering, infrastructure, and support brought together around your business goals.
                </p>
              </div>
            </div>

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
                  <motion.div
                    key={activeService}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                  >
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

        <section id="workspace-preview" className="scroll-mt-0 overflow-hidden bg-black px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1380px] items-center gap-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24">
            <div>
              <p className="section-kicker text-[#d90429]">Jojuni Workspace</p>
              <h2 className="mt-8 text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl">Work is clearer when everything is connected.</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
                Projects, tasks, conversations, files, and deadlines live together in a focused workspace built for the Jojuni team.
              </p>
              <ul className="mt-9 space-y-4 text-white/85">
                {[
                  "Shared project boards and personal task views",
                  "Team messages, files, and project activity",
                  "A private financial ledger for authorized roles only",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#d90429]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a href="/workspace" className="group mt-10 inline-flex items-center gap-3 bg-[#d90429] px-7 py-4 font-semibold transition hover:bg-white hover:text-black">
                Open the workspace
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7 }}
              className="workspace-window overflow-hidden border border-white/20 bg-[#f4f2ed] text-black shadow-2xl shadow-black"
            >
              <div className="flex h-14 items-center justify-between border-b border-black/10 px-5">
                <div className="flex items-center gap-3">
                  <img src="/logo-mark.svg" alt="" className="h-7 w-7 object-contain" />
                  <span className="text-sm font-bold">Jojuni Workspace</span>
                </div>
                <div className="flex -space-x-2">
                  {['AM', 'EO', 'KI'].map((initials, index) => (
                    <span key={initials} className={`grid h-8 w-8 place-items-center border-2 border-[#f4f2ed] text-[10px] font-bold ${index === 0 ? 'bg-[#d90429] text-white' : 'bg-black text-white'}`}>{initials}</span>
                  ))}
                </div>
              </div>
              <div className="grid min-h-[430px] sm:grid-cols-[160px_1fr]">
                <div className="hidden border-r border-black/10 bg-white p-4 sm:block">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">Workspace</p>
                  {['Overview', 'My work', 'Projects', 'Messages', 'Files'].map((item, index) => (
                    <div key={item} className={`mb-1 px-3 py-2 text-xs font-medium ${index === 0 ? 'bg-black text-white' : 'text-black/60'}`}>{item}</div>
                  ))}
                  <div className="mt-8 border-t border-black/10 pt-4 text-xs font-semibold text-[#d90429]">Finance is protected</div>
                </div>
                <div className="p-5 sm:p-7">
                  <p className="text-xs font-semibold text-black/45">Monday, 12 August</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Good morning, Ada.</h3>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      ['My tasks', '08'],
                      ['Due today', '03'],
                      ['In review', '05'],
                    ].map(([label, value], index) => (
                      <div key={label} className={`border-t-2 px-1 py-4 ${index === 1 ? 'border-[#d90429]' : 'border-black'}`}>
                        <p className="text-3xl font-semibold">{value}</p>
                        <p className="mt-1 text-xs text-black/50">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <div className="flex items-end justify-between border-b border-black pb-3">
                      <h4 className="font-semibold">Active projects</h4>
                      <span className="text-xs text-black/50">3 projects</span>
                    </div>
                    {[
                      ['Meridian commerce build', '72%', 'w-[72%]'],
                      ['Northstar mobile app', '45%', 'w-[45%]'],
                      ['Internal automation', '86%', 'w-[86%]'],
                    ].map(([name, progress, width]) => (
                      <div key={name} className="border-b border-black/10 py-4">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium">{name}</span>
                          <span className="text-black/45">{progress}</span>
                        </div>
                        <div className="mt-3 h-1 bg-black/10"><div className={`h-full bg-[#d90429] ${width}`} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1380px] gap-14 lg:grid-cols-2 lg:gap-24">
            <div className="flex min-h-[520px] flex-col justify-between bg-[#d90429] p-8 text-white sm:p-12">
              <LockKeyhole className="h-14 w-14" strokeWidth={1.4} />
              <div>
                <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em]">Permission by design</p>
                <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">Financial data stays with the people trusted to manage it.</h2>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="section-kicker">Protected finance</p>
              <h3 className="mt-7 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">A clean ledger without compromising access.</h3>
              <p className="mt-6 text-lg leading-relaxed text-black/60">
                Income, expenses, categories, supporting notes, and monthly summaries sit in a separate finance area. Only the Founder and Accountant roles can see or open it.
              </p>
              <div className="mt-9 border-t border-black">
                {[
                  ['General staff', 'Workspace only'],
                  ['Accountant', 'Workspace + Finance'],
                  ['Founder', 'Workspace + Finance'],
                ].map(([role, access]) => (
                  <div key={role} className="flex items-center justify-between border-b border-black/15 py-5">
                    <span className="font-semibold">{role}</span>
                    <span className="text-sm text-black/50">{access}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="approach" className="scroll-mt-0 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[1380px]">
            <p className="section-kicker">How we work</p>
            <h2 className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Less theatre. More useful technology.</h2>
            <div className="mt-16 grid border-t border-black sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Understand', 'We learn the business, the users, and the real constraint before proposing a solution.'],
                ['02', 'Design', 'We make the experience visible early so decisions stay clear and changes stay affordable.'],
                ['03', 'Build', 'Our team develops in focused cycles with visible progress and direct communication.'],
                ['04', 'Improve', 'After launch, we monitor, support, and evolve the product as the business grows.'],
              ].map(([number, title, description], index) => (
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

        <section className="bg-[#d90429] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/65">Your next move</p>
              <h2 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl lg:text-8xl">Let us build something useful.</h2>
            </div>
            <button onClick={() => setContactOpen(true)} className="group flex shrink-0 items-center gap-4 bg-white px-7 py-5 font-semibold text-black transition hover:bg-black hover:text-white">
              Tell us about your project
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-black px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-12 border-b border-white/20 pb-16 md:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
            <div>
              <img src="/logo-official.svg" alt="Jojuni Technologies" className="h-20 w-auto max-w-full sm:h-24" />
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">Technology designed, built, and supported with clarity from Nigeria to the world.</p>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Explore</p>
              <div className="space-y-3 text-sm">
                <button onClick={() => scrollTo("services")} className="block hover:text-[#d90429]">Services</button>
                <button onClick={() => scrollTo("approach")} className="block hover:text-[#d90429]">How we work</button>
                <a href="/workspace" className="block hover:text-[#d90429]">Workspace</a>
              </div>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Contact</p>
              <button onClick={() => setContactOpen(true)} className="text-left text-sm leading-relaxed hover:text-[#d90429]">Start a project<br />with our team</button>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright {new Date().getFullYear()} Jojuni Technologies.</p>
            <p>Built for dependable progress.</p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setContactOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-6 text-black sm:p-10"
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-title"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="section-kicker text-[#d90429]">Start a project</p>
                  <h2 id="contact-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Tell us what you want to move forward.</h2>
                </div>
                <button onClick={() => setContactOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center bg-black text-white" aria-label="Close contact form">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formSent ? (
                <div className="py-16 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center bg-[#d90429] text-white"><Check className="h-8 w-8" /></div>
                  <h3 className="mt-6 text-2xl font-semibold">Your brief is ready.</h3>
                  <p className="mx-auto mt-3 max-w-md text-black/55">Thanks for reaching out. The Jojuni team will review your project and respond shortly.</p>
                  <button onClick={() => { setFormSent(false); setContactOpen(false); }} className="mt-8 bg-black px-6 py-3 font-semibold text-white">Close</button>
                </div>
              ) : (
                <form onSubmit={submitContact} className="mt-9 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="form-label">Name<input required name="name" className="form-input" placeholder="Your name" /></label>
                    <label className="form-label">Work email<input required type="email" name="email" className="form-input" placeholder="you@company.com" /></label>
                  </div>
                  <label className="form-label">Company<input name="company" className="form-input" placeholder="Company name" /></label>
                  <label className="form-label">What can we help you build?<textarea required name="brief" rows={4} className="form-input resize-none" placeholder="A short description of your project" /></label>
                  {/* Honeypot: hidden from humans, filled by bots. The API drops these silently. */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                  {submitState === "error" && submitError && (
                    <p className="border border-[#d90429]/40 bg-[#d90429]/5 px-4 py-3 text-sm text-[#9f001d]" role="alert">{submitError}</p>
                  )}
                  <button type="submit" disabled={submitState === "sending"} className="group flex w-full items-center justify-center gap-3 bg-[#d90429] px-7 py-4 font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-70">
                    {submitState === "sending" ? "Sending…" : "Send project brief"} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PublicSite;