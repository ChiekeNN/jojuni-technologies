import type { LedgerEntry, Project, Task, WorkspaceFile, WorkspaceMessage } from "../../shared/types";

/**
 * Fallback demo content. The workspace renders this immediately (so there is
 * never an empty flash) and replaces it with data from `/api/workspace` as
 * soon as the Neon database answers. If the database is unreachable the UI
 * stays on this data and labels itself "Demo data".
 *
 * These values mirror `db/seed.sql` — keep the two in sync.
 */

export const seedProjects: Project[] = [
  { id: "seed-project-meridian", name: "Meridian Commerce", client: "Meridian Retail", progress: 72, due: "Sep 06", color: "#d90429", members: ["AM", "EO", "KI"] },
  { id: "seed-project-northstar", name: "Northstar Mobile", client: "Northstar Health", progress: 45, due: "Oct 18", color: "#000000", members: ["KI", "BN"] },
  { id: "seed-project-automation", name: "Jojuni Automation", client: "Internal", progress: 86, due: "Aug 30", color: "#6f6f6f", members: ["AM", "KI"] },
];

export const seedTasks: Task[] = [
  { id: "seed-task-1", title: "Finalize checkout error states", project: "Meridian Commerce", status: "In progress", assignee: "KI", due: "Today", priority: "High" },
  { id: "seed-task-2", title: "Review sprint 4 deliverables", project: "Northstar Mobile", status: "Review", assignee: "AM", due: "Today", priority: "High" },
  { id: "seed-task-3", title: "Map client onboarding workflow", project: "Jojuni Automation", status: "To do", assignee: "KI", due: "Tomorrow", priority: "Medium" },
  { id: "seed-task-4", title: "Connect payment webhook", project: "Meridian Commerce", status: "To do", assignee: "BN", due: "Aug 28", priority: "High" },
  { id: "seed-task-5", title: "Prepare usability test notes", project: "Northstar Mobile", status: "In progress", assignee: "KI", due: "Aug 29", priority: "Medium" },
  { id: "seed-task-6", title: "Publish staging release", project: "Jojuni Automation", status: "Done", assignee: "AM", due: "Aug 24", priority: "Low" },
  { id: "seed-task-7", title: "Update product catalogue import", project: "Meridian Commerce", status: "Review", assignee: "EO", due: "Aug 30", priority: "Medium" },
];

export const seedLedger: LedgerEntry[] = [
  { id: "seed-ledger-1", date: "2025-08-23", description: "Meridian milestone payment", category: "Client income", type: "Income", amount: 2850000 },
  { id: "seed-ledger-2", date: "2025-08-21", description: "AWS cloud infrastructure", category: "Infrastructure", type: "Expense", amount: 186500 },
  { id: "seed-ledger-3", date: "2025-08-19", description: "Northstar discovery deposit", category: "Client income", type: "Income", amount: 1200000 },
  { id: "seed-ledger-4", date: "2025-08-17", description: "Design software licenses", category: "Software", type: "Expense", amount: 97000 },
  { id: "seed-ledger-5", date: "2025-08-14", description: "Contract QA support", category: "Contractors", type: "Expense", amount: 325000 },
  { id: "seed-ledger-6", date: "2025-08-10", description: "Website care retainers", category: "Recurring income", type: "Income", amount: 680000 },
];

export const seedFiles: WorkspaceFile[] = [
  { id: "seed-file-1", name: "Meridian product requirements.pdf", project: "Meridian Commerce", size: "2.8 MB", type: "document", updated: "2 hours ago" },
  { id: "seed-file-2", name: "Northstar onboarding-flow.fig", project: "Northstar Mobile", size: "18.4 MB", type: "image", updated: "Yesterday" },
  { id: "seed-file-3", name: "August delivery tracker.xlsx", project: "Internal", size: "920 KB", type: "sheet", updated: "Yesterday" },
  { id: "seed-file-4", name: "API integration notes.pdf", project: "Meridian Commerce", size: "1.2 MB", type: "document", updated: "Aug 22" },
  { id: "seed-file-5", name: "Research interview summary.docx", project: "Northstar Mobile", size: "640 KB", type: "document", updated: "Aug 20" },
];

export const seedMessages: WorkspaceMessage[] = [
  { id: "seed-message-1", channel: "Meridian Commerce", name: "Ada Madu", initials: "AM", text: "The client approved the updated checkout direction. Let us move the remaining states into review today.", time: "9:14 AM", createdAt: "2025-08-24T09:14:00.000Z" },
  { id: "seed-message-2", channel: "Meridian Commerce", name: "Kene Ibe", initials: "KI", text: "Perfect. I have the error states open now and will share the prototype link before lunch.", time: "9:21 AM", createdAt: "2025-08-24T09:21:00.000Z" },
  { id: "seed-message-3", channel: "Meridian Commerce", name: "Bola Nnaji", initials: "BN", text: "Webhook testing is also complete on staging. I added the edge cases to the release notes.", time: "9:37 AM", createdAt: "2025-08-24T09:37:00.000Z" },
];

export const workspaceChannels = ["Meridian Commerce", "Northstar Mobile", "Jojuni Automation", "General"];
