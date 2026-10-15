import { useEffect } from "react";
import { SiteLink } from "../router";
import { navItems } from "../content";

export function NotFoundPage() {
  useEffect(() => {
    document.title = "Page not found | Jojuni Technologies";
  }, []);

  return (
    <section className="flex min-h-[100svh] items-center bg-black px-5 py-40 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1380px]">
        <p className="section-kicker text-[#d90429]">404</p>
        <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">
          This page does not exist — but the rest of the site does.
        </h1>
        <div className="mt-12 flex flex-wrap gap-3">
          {navItems.map((item) => (
            <SiteLink key={item.to} to={item.to} className="border border-white/30 px-5 py-3 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-black">
              {item.label}
            </SiteLink>
          ))}
        </div>
      </div>
    </section>
  );
}
