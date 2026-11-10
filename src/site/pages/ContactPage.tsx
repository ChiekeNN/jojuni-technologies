import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useEffect } from "react";
import { CtaBand, PageHero } from "../Layout";
import { contactInfo, telHref, whatsappHref } from "../content";

export function ContactPage() {
  useEffect(() => {
    document.title = "Contact | Jojuni Technologies";
  }, []);

  const methods = [
    {
      label: "Email",
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`,
      note: "Best for briefs, documents and anything you want in writing.",
      icon: Mail,
      external: false,
      primary: true,
    },
    {
      label: "WhatsApp",
      value: contactInfo.whatsapp,
      href: whatsappHref(),
      note: "Fastest route to a reply. Message us and we will pick it up in office hours.",
      icon: MessageCircle,
      external: true,
      primary: true,
    },
    {
      label: "Phone",
      value: contactInfo.phone,
      href: `tel:${telHref()}`,
      note: "Call during office hours to speak to someone directly.",
      icon: Phone,
      external: false,
      primary: false,
    },
  ];

  return (
    <>
      <PageHero
        kicker="Contact"
        title="Talk to us directly."
        intro="No forms and no sales queue. Reach us on whichever channel suits you — a senior member of the team reads every message and replies within one working day."
      />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div>
            <p className="section-kicker">Reach us</p>
            <div className="mt-8 grid grid-cols-1 gap-px border border-black/15 bg-black/15 sm:grid-cols-2">
              {methods.map((method) => {
                const Icon = method.icon;
                return (
                  <a
                    key={method.label}
                    href={method.href}
                    {...(method.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                    className="group flex flex-col bg-white p-7 transition hover:bg-[#f4f2ed]"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center bg-black text-white">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowUpRight
                        className="h-5 w-5 text-black/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#d90429]"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-black/40">
                      {method.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.01em] group-hover:text-[#d90429]">
                      {method.value.includes("@") ? (
                        <>
                          {method.value.split("@")[0]}@
                          <wbr />
                          {method.value.split("@")[1]}
                        </>
                      ) : (
                        method.value
                      )}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-black/55">{method.note}</p>
                  </a>
                );
              })}

              <div className="flex flex-col bg-[#f4f2ed] p-7">
                <span className="grid h-11 w-11 place-items-center bg-black text-white">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-black/40">
                  Office hours
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.01em]">{contactInfo.hours}</p>
                <p className="mt-3 text-sm leading-relaxed text-black/55">
                  Messages sent outside these hours are answered the next working morning.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-start gap-4 border border-black/15 bg-white p-7">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-black text-white">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">Office</p>
                <p className="mt-2 text-lg font-semibold leading-snug tracking-[-0.01em]">
                  {contactInfo.office}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-black/55">
                  Visits are by appointment — message or call first so we can make sure the right
                  people are in.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="border border-black/15 bg-white p-7">
              <p className="section-kicker">What happens next</p>
              <ol className="mt-6 space-y-5 text-sm leading-relaxed text-black/60">
                {[
                  ["You message us", "Email, WhatsApp or a call — whichever you prefer. There is no form to fill in."],
                  ["A 30-minute call", "We ask the awkward questions early: constraints, deadlines, budget range, past attempts."],
                  ["A written proposal", "Scope, schedule, price, and what we explicitly will not do — usually within three working days."],
                ].map(([title, description], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#d90429] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>
                      <strong className="block text-black">{title}</strong>
                      {description}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
