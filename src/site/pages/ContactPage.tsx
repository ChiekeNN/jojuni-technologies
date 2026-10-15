import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { useEffect } from "react";
import { PageHero } from "../Layout";
import { ContactForm } from "../ContactForm";
import { contactInfo } from "../content";

export function ContactPage() {
  useEffect(() => {
    document.title = "Contact | Jojuni Technologies";
  }, []);

  return (
    <>
      <PageHero
        kicker="Contact"
        title="Tell us what you want to move forward."
        intro="Send a brief and a senior team member — not a sales queue — reads it. Expect a reply within one working day, with honest first thoughts and a suggested next step."
      />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[1380px] gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <ContactForm />

          <div className="space-y-10">
            <div>
              <p className="section-kicker">Reach us directly</p>
              <div className="mt-7 space-y-5 text-base">
                <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-4 font-semibold hover:text-[#d90429]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-black text-white"><Mail className="h-5 w-5" /></span>
                  {contactInfo.email}
                </a>
                <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="flex items-center gap-4 font-semibold hover:text-[#d90429]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-black text-white"><Phone className="h-5 w-5" /></span>
                  {contactInfo.phone}
                </a>
                <p className="flex items-center gap-4 font-semibold">
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-black text-white"><MapPin className="h-5 w-5" /></span>
                  {contactInfo.office}
                </p>
                <p className="flex items-center gap-4 font-semibold">
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-black text-white"><Clock3 className="h-5 w-5" /></span>
                  {contactInfo.hours}
                </p>
              </div>
            </div>

            <div className="border border-black/15 bg-white p-7">
              <p className="section-kicker">What happens next</p>
              <ol className="mt-6 space-y-5 text-sm leading-relaxed text-black/60">
                {[
                  ["We read your brief", "A senior engineer and a designer review it together the same day it arrives."],
                  ["A 30-minute call", "We ask the awkward questions early: constraints, deadlines, budget range, past attempts."],
                  ["A written proposal", "Scope, schedule, price, and what we explicitly will not do — usually within three working days."],
                ].map(([title, description], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#d90429] text-xs font-bold text-white">{index + 1}</span>
                    <span><strong className="block text-black">{title}</strong>{description}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
