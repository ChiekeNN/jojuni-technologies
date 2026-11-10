/**
 * The services the company sells, in the shape the workspace needs.
 *
 * This mirrors `src/site/content.ts` — same ten services, same names, same
 * sub-services — but flattened into plain data. The workspace only ever needs
 * the titles, and importing `content.ts` would drag every Lucide icon into the
 * workspace bundle for no benefit.
 *
 * If a service is added to or renamed in `content.ts` and the finance service
 * breakdown looks wrong, update this list: it is the only duplicate.
 */

export interface ServiceOption {
  /** Group label, exactly as published on the site. */
  title: string;
  /** The sub-services sold under it. */
  items: string[];
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    title: "Web Development",
    items: ["Business Websites", "Online Stores", "Web Portals", "Website Care"],
  },
  {
    title: "Software & App Development",
    items: ["Mobile Apps", "Custom Business Tools", "Subscription Software (SaaS)", "Old System Upgrades"],
  },
  {
    title: "Artificial Intelligence & Data",
    items: ["AI Chatbots & Assistants", "Smart Predictions", "Data Reports"],
  },
  {
    title: "Cloud & IT Infrastructure",
    items: ["Cloud Storage & Setup", "Server Maintenance", "Data Backups"],
  },
  {
    title: "Cybersecurity & Protection",
    items: ["Security Testing", "Account Protection", "Data Safety Compliance"],
  },
  {
    title: "Product Design (UI/UX)",
    items: ["Visual Layouts", "User Experience"],
  },
  {
    title: "Business Automation",
    items: ["ERP & CRM Setup", "Task Automation"],
  },
  {
    title: "IT Support & Tech Management",
    items: ["Help Desk", "Tech Advising"],
  },
  {
    title: "Digital Marketing Tech",
    items: ["Google Search Ranking (SEO)", "Email & SMS Automation"],
  },
  {
    title: "Tech Staff Outsourcing",
    items: ["Hiring Tech Workers", "Quality Testing"],
  },
];

export const SERVICE_TITLES: string[] = SERVICE_OPTIONS.map((service) => service.title);

/** Sub-services for one service title, or [] if it is not a known service. */
export function itemsForService(title: string): string[] {
  return SERVICE_OPTIONS.find((service) => service.title === title)?.items ?? [];
}

/**
 * Income reasons that are not a service sale — retainers paid in advance,
 * deposits, adjustments. Kept separate so the service breakdown stays honest.
 */
export const NON_SERVICE_INCOME = [
  "Retainer (not service-specific)",
  "Deposit",
  "Milestone payment",
  "Maintenance contract",
  "Consulting",
  "Other income",
];

/** Reason options for an income entry: every sub-service, plus the catch-alls. */
export const INCOME_REASON_OPTIONS: string[] = [
  ...SERVICE_OPTIONS.flatMap((service) => service.items),
  ...NON_SERVICE_INCOME,
];
