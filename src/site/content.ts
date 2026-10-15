import {
  BrainCircuit,
  Cloud,
  Code2,
  Globe2,
  Headphones,
  PenTool,
  Search,
  ShieldCheck,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/* ---------------------------------------------------------------------------
 * Single source of truth for all public-site copy. Edit here, not in pages.
 * ------------------------------------------------------------------------- */

export type Service = {
  title: string;
  summary: string;
  icon: LucideIcon;
  items: { name: string; description: string }[];
};

export const services: Service[] = [
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

export const stats: [string, string][] = [
  ["40+", "projects delivered"],
  ["12", "industries served"],
  ["98%", "clients who stay with us"],
  ["24/7", "support & monitoring"],
];

export const approach: [string, string, string][] = [
  ["01", "Understand", "We learn the business, the users, and the real constraint before proposing a solution."],
  ["02", "Design", "We make the experience visible early so decisions stay clear and changes stay affordable."],
  ["03", "Build", "Our team develops in focused cycles with visible progress and direct communication."],
  ["04", "Improve", "After launch, we monitor, support, and evolve the product as the business grows."],
];

export const values: { title: string; description: string }[] = [
  { title: "Clarity first", description: "Plain language, visible progress, and no surprise invoices. Technology decisions should be understandable by the people paying for them." },
  { title: "Secure by default", description: "Every project ships with the basics done right: encrypted connections, least-privilege access, backups, and monitoring from day one." },
  { title: "Built to last", description: "We choose boring, dependable technology over fashionable technology, so what we hand over keeps working long after launch." },
  { title: "Partner, not vendor", description: "We stay involved after go-live — measuring, maintaining, and improving — because outcomes matter more than deliverables." },
];

export const team: { name: string; role: string; initials: string; bio: string }[] = [
  { name: "Ada Madu", role: "Founder & Chief Executive", initials: "AM", bio: "Started Jojuni after years of watching ambitious Nigerian businesses lose money to software that did not fit. Leads strategy and client partnerships." },
  { name: "Bola Nnaji", role: "Lead Engineer", initials: "BN", bio: "Owns architecture and delivery across web, mobile, and cloud. Obsessive about performance budgets and clean handovers." },
  { name: "Kene Ibe", role: "Head of Product Design", initials: "KI", bio: "Turns complicated workflows into interfaces people use without training. Runs research and usability testing on every engagement." },
  { name: "Emeka Obi", role: "Finance & Operations", initials: "EO", bio: "Keeps projects commercially honest — budgets, contracts, and the paperwork that lets the team focus on the work." },
];

export type CaseStudy = {
  name: string;
  client: string;
  sector: string;
  year: string;
  summary: string;
  outcomes: string[];
  tags: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    name: "Meridian Commerce",
    client: "Meridian Retail",
    sector: "Retail & e-commerce",
    year: "2025",
    summary: "A full rebuild of an ageing online store: new catalogue, secure checkout with local payment providers, and an editor the marketing team can use without calling us.",
    outcomes: ["Online revenue up 38% in the first quarter", "Checkout error reports down 62%", "Pages load in under 2 seconds on Lagos connections"],
    tags: ["Web Development", "Payments", "UI/UX"],
  },
  {
    name: "Northstar Mobile",
    client: "Northstar Health",
    sector: "Healthcare",
    year: "2025",
    summary: "A patient follow-up app for private clinics: appointment reminders, visit history, and secure messaging between patients and care teams.",
    outcomes: ["12,000 downloads in the first six months", "4.7-star average store rating", "Missed appointments down 27%"],
    tags: ["Mobile App", "Cloud", "Security"],
  },
  {
    name: "Jojuni Automation",
    client: "Internal delivery platform",
    sector: "Operations",
    year: "2024",
    summary: "Our own delivery workspace: project boards, client files, and reporting in one place, replacing spreadsheets and chat-thread project management.",
    outcomes: ["Weekly reporting time cut by 70%", "One source of truth across three teams", "Faster client onboarding with checklists built in"],
    tags: ["Business Automation", "Custom Tools", "Data Reports"],
  },
  {
    name: "Lagoon Foods",
    client: "Lagoon Foods Ltd",
    sector: "Food & logistics",
    year: "2024",
    summary: "An online store and dispatch system for a Lagos food brand, integrating deliveries, inventory, and paystack-enabled checkout.",
    outcomes: ["Order volume tripled over one festive season", "Manual order entry eliminated completely", "Stock levels synced across two warehouses"],
    tags: ["Online Store", "Automation", "Integrations"],
  },
  {
    name: "Axis Academy",
    client: "Axis Academy",
    sector: "Education",
    year: "2023",
    summary: "A student portal for a vocational training institute: applications, course materials, results, and fee payments in a single login area.",
    outcomes: ["1,400 students onboarded in the first term", "Admin phone calls down 80%", "Fee payments reconciled daily, not monthly"],
    tags: ["Web Portal", "Payments", "Support"],
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  date: string;
  dateLabel: string;
  excerpt: string;
  body: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "why-business-websites-fail-in-year-one",
    title: "Why most business websites fail in year one",
    category: "Web",
    date: "2026-09-28",
    dateLabel: "28 Sep 2026",
    excerpt: "It is rarely the design. It is the absence of an owner, a plan, and a reason for customers to return.",
    body: [
      "Most companies launch a website with genuine excitement, then never touch it again. Within a year the contact form routes to an ex-employee's inbox, the pricing page describes an offer that no longer exists, and the security certificate expires on a public holiday.",
      "The pattern is consistent across industries: the website was treated as a one-off purchase instead of an operating asset. A shop needs staff, stock, and cleaning every week; a website needs an owner, content, and maintenance on a similar rhythm.",
      "Our recommendation to every client is unglamorous. Name one person accountable for the site. Put four dates in the calendar each year for content and security reviews. Measure one number that matters — enquiries, orders, bookings — and look at it monthly.",
      "None of this requires a big budget. It requires treating the website as part of the business rather than a brochure that escaped from it.",
    ],
  },
  {
    slug: "keeping-customer-data-safe-in-nigeria",
    title: "Keeping customer data safe: a practical guide for Nigerian businesses",
    category: "Security",
    date: "2026-09-10",
    dateLabel: "10 Sep 2026",
    excerpt: "NDPR obligations in plain language, and the five controls that prevent most breaches we see.",
    body: [
      "The Nigeria Data Protection Regulation expects any organisation handling personal data to collect only what it needs, store it safely, and delete it when it is no longer required. That is the whole obligation in one sentence; the work is in the details.",
      "In practice, most incidents we investigate start with something small: a shared password written in a notebook, an admin panel open to the whole internet, or a spreadsheet of customer phone numbers sitting in a personal Drive account.",
      "Five controls prevent the majority of these: unique passwords with two-step verification on every business account, role-based access so staff see only what their work requires, encrypted connections everywhere, automatic daily backups stored separately, and a written note of what data you hold and why.",
      "None of this is exotic technology. It is discipline, written down, and checked occasionally — which is exactly what a data protection officer is meant to ensure.",
    ],
  },
  {
    slug: "from-spreadsheets-to-a-real-system",
    title: "What we learned moving a client from spreadsheets to a real system",
    category: "Automation",
    date: "2026-08-19",
    dateLabel: "19 Aug 2026",
    excerpt: "The hard part was never the software. It was agreeing what a 'customer' and a 'paid invoice' actually mean.",
    body: [
      "A growing logistics company asked us for 'a system'. What they had was eleven spreadsheets, three of which disagreed about stock, and a WhatsApp group that functioned as the order book.",
      "We spent the first two weeks without writing code, mapping how money and goods actually moved. The breakthrough was a shared definition of five terms — order, dispatch, delivery, invoice, payment — because every spreadsheet had silently used them differently.",
      "The system we built is deliberately boring: one screen per job, statuses anyone can read, and a daily summary email. Adoption took because the new flow removed work instead of adding it.",
      "Our lesson for anyone attempting the same: automate the agreement first, the workflow second, and the reports last. Software amplifies whatever definitions you give it.",
    ],
  },
  {
    slug: "mobile-app-or-web-portal",
    title: "Choosing between a mobile app and a web portal",
    category: "Product",
    date: "2026-07-30",
    dateLabel: "30 Jul 2026",
    excerpt: "Apps win on engagement and offline use. Portals win on reach and cost. Here is how we decide with clients.",
    body: [
      "The question arrives in almost every discovery call: 'should we build an app?' Our honest answer starts with another question — how often will a user need this, and what happens if they cannot reach it?",
      "Mobile apps earn their cost when usage is frequent or the device matters: push notifications for appointments, camera and offline storage for field work, smooth gestures for high-volume tasks. A patient follow-up tool used weekly is a good app candidate.",
      "Web portals earn their keep everywhere else: no install friction, one codebase for every device, instant updates, and a fraction of the maintenance. For staff tools, student portals, and admin dashboards, the browser is usually the better home.",
      "When a client genuinely needs both, we build the web platform first and wrap it in a native shell later — the same APIs serve both, and nothing is rewritten.",
    ],
  },
  {
    slug: "hosting-for-speed-in-lagos",
    title: "How we host for speed in Lagos (and everywhere else)",
    category: "Cloud",
    date: "2026-07-08",
    dateLabel: "08 Jul 2026",
    excerpt: "Edge caching, regional databases, and small bundles: the levers that matter on real Nigerian connections.",
    body: [
      "A beautiful site that takes nine seconds to load on a mobile connection in Yaba is not finished. Performance in Nigeria is a design constraint, not an optimisation phase.",
      "Our default stack puts static assets on a global edge network so images and scripts arrive from the closest point of presence, keeps databases in a region close to the users (usually London for West Africa), and ships as little JavaScript as the product allows.",
      "We also design for instability: interfaces that work offline for a moment, forms that retry gracefully, and images that degrade instead of blocking. A dropped packet should cost a millisecond, not a customer.",
      "The result is measurable — most of our launches hold sub-two-second first loads on 4G — and more importantly, it is boring. Speed that survives real networks comes from architecture, not tricks.",
    ],
  },
];

export const testimonials: { quote: string; name: string; role: string }[] = [
  { quote: "Jojuni rebuilt our store and checkout finally just works. Sales followed within a quarter.", name: "Ifeoma Eze", role: "Operations Lead, Meridian Retail" },
  { quote: "They explain technology in plain language and deliver on the date they promise. That is rarer than it should be.", name: "Dr. Tunde Bakare", role: "Director, Northstar Health" },
  { quote: "Our whole delivery process runs inside what they built for us. It is the first system our team did not resist.", name: "Chidi Okoro", role: "COO, Lagoon Foods" },
];

export const contactInfo = {
  // TODO: replace with the company's real phone number and street address.
  email: "hello@jojuni.tech",
  phone: "+234 803 000 0000",
  office: "Yaba, Lagos, Nigeria",
  hours: "Monday – Friday, 9:00 – 18:00 WAT",
};

export const navItems: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Our Services", to: "/services" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "News/Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];
