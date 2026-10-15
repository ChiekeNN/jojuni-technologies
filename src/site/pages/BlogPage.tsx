import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { CtaBand, PageHero } from "../Layout";
import { SiteLink } from "../router";
import { blogPosts } from "../content";

export function BlogPage({ slug }: { slug: string | null }) {
  const post = slug ? blogPosts.find((item) => item.slug === slug) ?? null : null;

  useEffect(() => {
    document.title = post ? `${post.title} | Jojuni Technologies` : "News & Blog | Jojuni Technologies";
  }, [post]);

  if (slug && !post) {
    return (
      <>
        <PageHero kicker="News & blog" title="That article has moved or never existed." intro="The link may be old. Here is everything we have published recently." />
        <ArticleList />
        <CtaBand />
      </>
    );
  }

  if (post) {
    return (
      <>
        <section className="bg-black px-5 pb-16 pt-40 text-white sm:px-8 sm:pt-48 lg:px-12 lg:pb-20 lg:pt-56">
          <div className="mx-auto max-w-[900px]">
            <SiteLink to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-[#d90429]">
              <ArrowLeft className="h-4 w-4" /> All articles
            </SiteLink>
            <p className="section-kicker mt-8 text-[#d90429]">{post.category} / {post.dateLabel}</p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{post.title}</h1>
            <p className="mt-6 text-lg leading-relaxed text-white/60">{post.excerpt}</p>
          </div>
        </section>
        <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[760px] space-y-7 text-lg leading-relaxed text-black/70">
            {post.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            <div className="border-t border-black pt-8 text-sm text-black/50">
              Written by the Jojuni Technologies team. Questions about your own situation?{" "}
              <SiteLink to="/contact" className="font-semibold text-[#d90429] hover:text-black">Tell us about it</SiteLink>.
            </div>
          </div>
        </section>
        <CtaBand />
      </>
    );
  }

  return (
    <>
      <PageHero
        kicker="News & blog"
        title="Notes from the field, written for business owners."
        intro="No press-release fluff: practical writing about websites, security, automation, and the realities of running technology on Nigerian infrastructure."
      />
      <ArticleList />
      <CtaBand />
    </>
  );
}

function ArticleList() {
  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1380px]">
        <div className="border-t border-black">
          {blogPosts.map((post) => (
            <SiteLink key={post.slug} to={`/blog/${post.slug}`} className="group grid gap-4 border-b border-black/20 py-8 lg:grid-cols-[180px_1fr_auto] lg:items-center lg:gap-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">{post.category} / {post.dateLabel}</p>
              <div>
                <h2 className="text-2xl font-semibold leading-tight tracking-[-0.03em] group-hover:text-[#d90429] sm:text-3xl">{post.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/55 sm:text-base">{post.excerpt}</p>
              </div>
              <ArrowRight className="hidden h-5 w-5 text-black/30 transition group-hover:translate-x-1 group-hover:text-[#d90429] lg:block" />
            </SiteLink>
          ))}
        </div>
      </div>
    </section>
  );
}
