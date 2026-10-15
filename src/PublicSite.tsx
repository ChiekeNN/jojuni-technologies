import { Layout } from "./site/Layout";
import { useRouter } from "./site/router";
import { AboutPage } from "./site/pages/AboutPage";
import { BlogPage } from "./site/pages/BlogPage";
import { ContactPage } from "./site/pages/ContactPage";
import { HomePage } from "./site/pages/HomePage";
import { NotFoundPage } from "./site/pages/NotFoundPage";
import { PortfolioPage } from "./site/pages/PortfolioPage";
import { ServicesPage } from "./site/pages/ServicesPage";

/**
 * The public marketing site: one layout, real pages with shareable URLs.
 * Routing state comes from the tiny history router in `src/site/router.tsx`.
 */
export default function PublicSite() {
  const { path } = useRouter();

  let page;
  if (path === "/") page = <HomePage />;
  else if (path === "/about") page = <AboutPage />;
  else if (path === "/services") page = <ServicesPage />;
  else if (path === "/portfolio") page = <PortfolioPage />;
  else if (path === "/blog") page = <BlogPage slug={null} />;
  else if (path.startsWith("/blog/")) page = <BlogPage slug={path.slice("/blog/".length)} />;
  else if (path === "/contact") page = <ContactPage />;
  else page = <NotFoundPage />;

  return <Layout>{page}</Layout>;
}
