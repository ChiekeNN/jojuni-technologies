import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  Clock3,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  Files,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageCircle,
  MonitorDown,
  MoreHorizontal,
  Paperclip,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type {
  LedgerEntry,
  Project,
  Role,
  Task,
  TaskStatus,
  TransactionType,
  WorkspaceFile,
  WorkspaceMessage,
} from "../shared/types";
import { ApiError, api } from "./lib/api";
import { seedFiles, seedLedger, seedMessages, seedProjects, seedTasks, workspaceChannels } from "./lib/seed";

type View = "overview" | "tasks" | "projects" | "messages" | "files" | "finance";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const people: Record<Role, { name: string; title: string; initials: string }> = {
  founder: { name: "Ada Madu", title: "Founder", initials: "AM" },
  accountant: { name: "Emeka Obi", title: "Accountant", initials: "EO" },
  staff: { name: "Kene Ibe", title: "Product Designer", initials: "KI" },
};

const statuses: TaskStatus[] = ["To do", "In progress", "Review", "Done"];

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "My work", icon: CheckSquare2 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "files", label: "Files", icon: Files },
];

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const fileIcon = (type: WorkspaceFile["type"]) => {
  if (type === "image") return FileImage;
  if (type === "sheet") return FileSpreadsheet;
  return File;
};

/** Turns a `YYYY-MM-DD` form value into the friendly label the board shows. */
function formatDueLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "No date";
  const target = new Date(`${value}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(target);
}

function WorkspaceApp() {
  const [role, setRole] = useState<Role>(() => {
    const stored = localStorage.getItem("jojuni-demo-role");
    return stored === "staff" || stored === "accountant" || stored === "founder" ? stored : "founder";
  });
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [ledger, setLedger] = useState<LedgerEntry[]>(seedLedger);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(seedFiles);
  const [messages, setMessages] = useState<WorkspaceMessage[]>(seedMessages);
  const [dataState, setDataState] = useState<"syncing" | "live" | "demo">("syncing");
  const [databaseNote, setDatabaseNote] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [installVisible, setInstallVisible] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canViewFinance = role === "founder" || role === "accountant";
  const currentPerson = people[role];

  useEffect(() => {
    document.title = "Workspace | Jojuni Technologies";
    let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) {
      manifest = document.createElement("link");
      manifest.rel = "manifest";
      document.head.appendChild(manifest);
    }
    manifest.href = "/workspace-manifest.webmanifest";

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/workspace-sw.js", { scope: "/workspace" }).catch(() => undefined);
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const timer = window.setTimeout(() => setInstallVisible(!standalone), 450);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallVisible(true);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("jojuni-demo-role", role);
    if (view === "finance" && role === "staff") setView("overview");
  }, [role, view]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    const loadWorkspace = async () => {
      setDataState("syncing");
      try {
        const data = await api.workspace(role);
        if (cancelled) return;
        setTasks(data.tasks);
        setProjects(data.projects);
        setLedger(data.ledger);
        setWorkspaceFiles(data.files);
        setMessages(data.messages);
        setDatabaseNote(null);
        setDataState("live");
      } catch (error) {
        if (cancelled) return;
        setDataState("demo");
        setDatabaseNote(error instanceof ApiError ? error.message : "The workspace database could not be reached.");
      }
    };
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const reportSaveFailure = (error: unknown) => {
    if (error instanceof ApiError && error.isDatabaseIssue) {
      setDataState("demo");
      setDatabaseNote(error.message);
      setNotice({ text: "Saved on this device only — the database is unavailable.", tone: "error" });
      return;
    }
    setNotice({
      text: error instanceof ApiError ? error.message : "That change could not be saved.",
      tone: "error",
    });
  };

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return tasks
      .filter((task) => `${task.title} ${task.project}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [searchQuery, tasks]);

  const navigate = (nextView: View) => {
    if (nextView === "finance" && !canViewFinance) return;
    setView(nextView);
    setMobileNavOpen(false);
    setSearchQuery("");
  };

  const moveTask = (id: string, direction: -1 | 1) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const nextIndex = Math.max(0, Math.min(statuses.length - 1, statuses.indexOf(current.status) + direction));
    const nextStatus = statuses[nextIndex];
    if (nextStatus === current.status) return;
    const previous = tasks;
    setTasks((all) => all.map((task) => (task.id === id ? { ...task, status: nextStatus } : task)));
    api.tasks.update(id, { status: nextStatus }, role).catch((error) => {
      setTasks(previous);
      reportSaveFailure(error);
    });
  };

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: Task = {
      id: `local-${Date.now()}`,
      title: String(form.get("title")),
      project: String(form.get("project")),
      status: "To do",
      assignee: currentPerson.initials,
      due: formatDueLabel(String(form.get("due") || "")),
      priority: String(form.get("priority")) as Task["priority"],
    };
    setTasks((current) => [...current, draft]);
    event.currentTarget.reset();
    setTaskModalOpen(false);
    api.tasks
      .create(draft, role)
      .then(({ task }) => setTasks((current) => current.map((item) => (item.id === draft.id ? task : item))))
      .catch((error) => {
        setTasks((current) => current.filter((item) => item.id !== draft.id));
        reportSaveFailure(error);
      });
  };

  const addTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canViewFinance) return;
    const form = new FormData(event.currentTarget);
    const draft: LedgerEntry = {
      id: `local-${Date.now()}`,
      date: String(form.get("date")),
      description: String(form.get("description")),
      category: String(form.get("category")),
      type: String(form.get("type")) as TransactionType,
      amount: Number(form.get("amount")),
    };
    setLedger((current) => [draft, ...current]);
    event.currentTarget.reset();
    setTransactionModalOpen(false);
    api.ledger
      .create(draft, role)
      .then(({ entry }) => setLedger((current) => current.map((item) => (item.id === draft.id ? entry : item))))
      .catch((error) => {
        setLedger((current) => current.filter((item) => item.id !== draft.id));
        reportSaveFailure(error);
      });
  };

  const uploadFile = (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selected = input.files?.[0];
    if (!selected) return;
    const type: WorkspaceFile["type"] = selected.type.startsWith("image/") ? "image" : selected.name.endsWith(".xlsx") || selected.name.endsWith(".csv") ? "sheet" : "document";
    const draft: WorkspaceFile = {
      id: `local-${Date.now()}`,
      name: selected.name,
      project: "Internal",
      size: `${Math.max(1, Math.round(selected.size / 1024))} KB`,
      type,
      updated: "Just now",
    };
    setWorkspaceFiles((current) => [draft, ...current]);
    input.value = "";
    api.files
      .create(draft)
      .then(({ file }) => setWorkspaceFiles((current) => current.map((item) => (item.id === draft.id ? file : item))))
      .catch((error) => {
        setWorkspaceFiles((current) => current.filter((item) => item.id !== draft.id));
        reportSaveFailure(error);
      });
  };

  const sendMessage = (channel: string, text: string) => {
    const draft: WorkspaceMessage = {
      id: `local-${Date.now()}`,
      channel,
      name: currentPerson.name,
      initials: currentPerson.initials,
      text,
      time: "Now",
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, draft]);
    api.messages
      .create(draft, role)
      .then(({ message }) => setMessages((current) => current.map((item) => (item.id === draft.id ? message : item))))
      .catch(reportSaveFailure);
  };

  const exportLedger = () => {
    const rows = [
      ["Date", "Description", "Category", "Type", "Amount"],
      ...ledger.map((entry) => [entry.date, entry.description, entry.category, entry.type, String(entry.amount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "jojuni-ledger.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const installWorkspace = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallVisible(false);
      setInstallPrompt(null);
      return;
    }
    setInstallHelp(true);
  };

  return (
    <div className="workspace-shell min-h-screen bg-[#f6f6f3] text-[#151515]">
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            aria-label="Close navigation"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col bg-black text-white transition-transform duration-300 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <a href="/workspace" className="flex items-center gap-3">
            <img src="/logo-mark.svg" alt="Jojuni" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-sm font-bold leading-none">Jojuni</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.17em] text-white/45">Workspace</p>
            </div>
          </a>
          <button onClick={() => setMobileNavOpen(false)} className="text-white/60 lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="Workspace navigation">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => navigate(item.id)} className={`mb-1 flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium transition ${view === item.id ? "bg-[#d90429] text-white" : "text-white/60 hover:bg-white/8 hover:text-white"}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {item.label}
                {item.id === "messages" && <span className="ml-auto grid h-5 min-w-5 place-items-center bg-white px-1 text-[10px] font-bold text-black">3</span>}
              </button>
            );
          })}

          <div className="my-6 border-t border-white/10" />
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Restricted</p>
          {canViewFinance ? (
            <button onClick={() => navigate("finance")} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium transition ${view === "finance" ? "bg-white text-black" : "text-white/60 hover:bg-white/8 hover:text-white"}`}>
              <Landmark className="h-[18px] w-[18px]" strokeWidth={1.8} />
              Finance
              <ShieldCheck className="ml-auto h-4 w-4 text-[#d90429]" />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-3 py-3 text-sm text-white/25">
              <LockKeyhole className="h-[18px] w-[18px]" />
              Finance
              <span className="ml-auto text-[9px] uppercase tracking-wider">Private</span>
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button onClick={() => setAccountMenuOpen((open) => !open)} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/8">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#d90429] text-xs font-bold">{currentPerson.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{currentPerson.name}</span>
              <span className="block truncate text-[11px] text-white/45">{currentPerson.title}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-white/45 transition ${accountMenuOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {accountMenuOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-1 border border-white/15 p-2">
                  <p className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">Demo as</p>
                  {(Object.keys(people) as Role[]).map((roleOption) => (
                    <button key={roleOption} onClick={() => { setRole(roleOption); setAccountMenuOpen(false); }} className={`flex w-full items-center gap-2 px-2 py-2 text-xs capitalize ${role === roleOption ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
                      <UserRound className="h-3.5 w-3.5" />
                      {roleOption}
                      {role === roleOption && <Check className="ml-auto h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <div className="lg:pl-[278px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-black/10 bg-[#f6f6f3]/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button onClick={() => setMobileNavOpen(true)} className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <div className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full border-0 border-b border-transparent bg-transparent py-2 pl-7 pr-3 text-sm outline-none placeholder:text-black/35 focus:border-black" placeholder="Search tasks and projects" />
            {searchQuery && (
              <div className="absolute left-0 right-0 top-12 border border-black/15 bg-white p-2 shadow-xl">
                {searchResults.length ? searchResults.map((task) => (
                  <button key={task.id} onClick={() => navigate("tasks")} className="flex w-full items-center justify-between gap-4 px-3 py-3 text-left hover:bg-black/5">
                    <span><span className="block text-sm font-medium">{task.title}</span><span className="text-xs text-black/45">{task.project}</span></span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                )) : <p className="px-3 py-4 text-sm text-black/45">No matching work found.</p>}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              title={databaseNote ?? "Workspace data is stored in Neon (PostgreSQL)"}
              className={`hidden items-center gap-2 border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] sm:flex ${
                dataState === "live"
                  ? "border-emerald-600/30 bg-emerald-50 text-emerald-700"
                  : dataState === "syncing"
                    ? "border-black/10 bg-white text-black/45"
                    : "border-amber-500/40 bg-amber-50 text-amber-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dataState === "live" ? "bg-emerald-600" : dataState === "syncing" ? "animate-pulse bg-black/30" : "bg-amber-500"}`} />
              {dataState === "live" ? "Synced" : dataState === "syncing" ? "Syncing" : "Demo data"}
            </span>
            <button className="relative grid h-10 w-10 place-items-center border border-black/10 bg-white" aria-label="Notifications">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d90429]" />
            </button>
            <button onClick={() => setTaskModalOpen(true)} className="hidden items-center gap-2 bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d90429] sm:flex">
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] p-4 sm:p-6 lg:p-8 xl:p-10">
          {databaseNote && (
            <div className="mx-auto mb-6 flex max-w-[1500px] items-start gap-3 border border-amber-500/40 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Demo data.</strong> {databaseNote} Changes stay on this device until the Neon database is connected — see <code className="font-semibold">DEPLOYMENT.md</code> for the setup steps.
              </span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {view === "overview" && <Overview person={currentPerson.name} tasks={tasks} projects={projects} onNavigate={navigate} onNewTask={() => setTaskModalOpen(true)} />}
              {view === "tasks" && <MyWork tasks={tasks} onMoveTask={moveTask} onNewTask={() => setTaskModalOpen(true)} />}
              {view === "projects" && <ProjectBoard tasks={tasks} projects={projects} onMoveTask={moveTask} onNewTask={() => setTaskModalOpen(true)} />}
              {view === "messages" && <MessagesView messages={messages} onSend={sendMessage} />}
              {view === "files" && <FilesView files={workspaceFiles} onUpload={() => fileInputRef.current?.click()} />}
              {view === "finance" && canViewFinance && <FinanceView entries={ledger} onNew={() => setTransactionModalOpen(true)} onExport={exportLedger} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <input ref={fileInputRef} type="file" onChange={uploadFile} className="hidden" />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`fixed bottom-4 right-4 z-[90] max-w-sm border px-4 py-3 text-sm shadow-2xl ${notice.tone === "error" ? "border-[#d90429] bg-[#d90429] text-white" : "border-black bg-black text-white"}`}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {installVisible && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-4 left-4 right-4 z-[70] border border-black bg-white p-5 shadow-2xl sm:left-auto sm:max-w-sm">
            <button onClick={() => setInstallVisible(false)} className="absolute right-3 top-3 text-black/40 hover:text-black" aria-label="Dismiss install prompt"><X className="h-4 w-4" /></button>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-black"><img src="/logo-mark.svg" alt="" className="h-8 w-8" /></span>
              <div className="pr-4">
                <h2 className="font-semibold">Install Jojuni Workspace</h2>
                <p className="mt-1 text-sm leading-relaxed text-black/55">Open projects faster and keep the workspace close at hand.</p>
              </div>
            </div>
            {installHelp ? (
              <p className="mt-4 border-t border-black/10 pt-4 text-sm leading-relaxed"><strong>Install from your browser:</strong> open the browser menu, then choose "Install app" or "Add to Home Screen".</p>
            ) : (
              <div className="mt-5 flex gap-2">
                <button onClick={() => setInstallVisible(false)} className="flex-1 border border-black/20 px-4 py-2.5 text-sm font-semibold">Not now</button>
                <button onClick={installWorkspace} className="flex flex-1 items-center justify-center gap-2 bg-[#d90429] px-4 py-2.5 text-sm font-semibold text-white"><MonitorDown className="h-4 w-4" /> Install</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create a new task" subtitle="Add work to the shared project board.">
        <form onSubmit={addTask} className="space-y-5">
          <label className="workspace-label">Task name<input required name="title" autoFocus className="workspace-input" placeholder="What needs to be done?" /></label>
          <label className="workspace-label">Project<select name="project" className="workspace-input">{projects.map((project) => <option key={project.name}>{project.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="workspace-label">Due date<input required name="due" type="date" className="workspace-input" /></label>
            <label className="workspace-label">Priority<select name="priority" className="workspace-input"><option>Medium</option><option>High</option><option>Low</option></select></label>
          </div>
          <button type="submit" className="w-full bg-[#d90429] px-5 py-3.5 font-semibold text-white transition hover:bg-black">Create task</button>
        </form>
      </Modal>

      <Modal open={transactionModalOpen && canViewFinance} onClose={() => setTransactionModalOpen(false)} title="Add a ledger entry" subtitle="This information is visible only to finance roles.">
        <form onSubmit={addTransaction} className="space-y-5">
          <label className="workspace-label">Description<input required name="description" autoFocus className="workspace-input" placeholder="What was this transaction for?" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="workspace-label">Type<select name="type" className="workspace-input"><option>Income</option><option>Expense</option></select></label>
            <label className="workspace-label">Amount (NGN)<input required min="1" name="amount" type="number" className="workspace-input" placeholder="0" /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="workspace-label">Category<input required name="category" className="workspace-input" placeholder="e.g. Software" /></label>
            <label className="workspace-label">Date<input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="workspace-input" /></label>
          </div>
          <button type="submit" className="w-full bg-[#d90429] px-5 py-3.5 font-semibold text-white transition hover:bg-black">Save transaction</button>
        </form>
      </Modal>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d90429]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/50 sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Overview({ person, tasks, projects, onNavigate, onNewTask }: { person: string; tasks: Task[]; projects: Project[]; onNavigate: (view: View) => void; onNewTask: () => void }) {
  const firstName = person.split(" ")[0];
  const taskCounts = {
    mine: tasks.filter((task) => task.assignee === "AM" || task.assignee === "KI").length,
    today: tasks.filter((task) => task.due === "Today").length,
    review: tasks.filter((task) => task.status === "Review").length,
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeading
        eyebrow={new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        title={`Good morning, ${firstName}.`}
        description="Here is what is moving across the team today."
        action={<button onClick={onNewTask} className="flex items-center justify-center gap-2 bg-black px-4 py-3 text-sm font-semibold text-white sm:hidden"><Plus className="h-4 w-4" /> New task</button>}
      />

      <div className="grid border-y border-black/15 sm:grid-cols-3">
        {[
          ["Assigned tasks", String(taskCounts.mine).padStart(2, "0"), CheckSquare2],
          ["Due today", String(taskCounts.today).padStart(2, "0"), Clock3],
          ["Waiting for review", String(taskCounts.review).padStart(2, "0"), Bell],
        ].map(([label, value, Icon], index) => {
          const StatIcon = Icon as LucideIcon;
          return (
            <button key={String(label)} onClick={() => onNavigate("tasks")} className={`group flex items-center justify-between px-1 py-6 text-left sm:px-6 ${index < 2 ? "border-b border-black/15 sm:border-b-0 sm:border-r" : ""}`}>
              <div><p className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{String(value)}</p><p className="mt-2 text-sm text-black/50">{String(label)}</p></div>
              <StatIcon className="h-6 w-6 text-black/25 transition group-hover:text-[#d90429]" strokeWidth={1.6} />
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.4fr_0.8fr]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Active projects</h2>
            <button onClick={() => onNavigate("projects")} className="flex items-center gap-2 text-sm font-semibold text-black/50 hover:text-black">View board <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="border-t border-black">
            {projects.map((project) => (
              <button key={project.name} onClick={() => onNavigate("projects")} className="grid w-full gap-4 border-b border-black/15 py-5 text-left sm:grid-cols-[1fr_110px_120px] sm:items-center">
                <div className="flex items-center gap-4">
                  <span className="h-10 w-1 shrink-0" style={{ background: project.color }} />
                  <span><span className="block font-semibold">{project.name}</span><span className="mt-1 block text-xs text-black/45">{project.client}</span></span>
                </div>
                <div><p className="text-xs text-black/40">Progress</p><div className="mt-2 h-1.5 bg-black/10"><div className="h-full bg-[#d90429]" style={{ width: `${project.progress}%` }} /></div></div>
                <div className="flex items-center gap-2 text-sm text-black/50 sm:justify-end"><CalendarDays className="h-4 w-4" /> {project.due}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold tracking-[-0.02em]">Recent activity</h2><MoreHorizontal className="h-5 w-5 text-black/35" /></div>
          <div className="border-t border-black">
            {[
              ["KI", "Kene moved a task to Review", "Meridian Commerce", "18 min"],
              ["AM", "Ada shared release notes", "Northstar Mobile", "1 hr"],
              ["EO", "Emeka uploaded a tracker", "Internal", "3 hrs"],
              ["BN", "Bola completed API mapping", "Meridian Commerce", "Yesterday"],
            ].map(([initials, activity, project, time]) => (
              <div key={activity} className="flex gap-3 border-b border-black/10 py-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center bg-black text-[10px] font-bold text-white">{initials}</span>
                <div className="min-w-0"><p className="text-sm font-medium">{activity}</p><p className="mt-1 truncate text-xs text-black/40">{project} / {time}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MyWork({ tasks, onMoveTask, onNewTask }: { tasks: Task[]; onMoveTask: (id: string, direction: -1 | 1) => void; onNewTask: () => void }) {
  const [filter, setFilter] = useState<"All" | TaskStatus>("All");
  const visible = filter === "All" ? tasks : tasks.filter((task) => task.status === filter);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeading eyebrow="Personal queue" title="My work" description="Every assignment, deadline, and handoff in one place." action={<button onClick={onNewTask} className="flex items-center gap-2 bg-black px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New task</button>} />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-black/15">
        {(["All", ...statuses] as const).map((status) => (
          <button key={status} onClick={() => setFilter(status)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${filter === status ? "border-[#d90429] text-[#d90429]" : "border-transparent text-black/45"}`}>{status}</button>
        ))}
      </div>
      <div className="border-t border-black">
        {visible.map((task) => <TaskRow key={task.id} task={task} onMoveTask={onMoveTask} />)}
        {!visible.length && <p className="py-16 text-center text-black/40">There are no tasks in this view.</p>}
      </div>
    </div>
  );
}

function TaskRow({ task, onMoveTask }: { task: Task; onMoveTask: (id: string, direction: -1 | 1) => void }) {
  return (
    <div className="grid gap-4 border-b border-black/15 py-5 sm:grid-cols-[1fr_135px_100px] sm:items-center">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${task.priority === "High" ? "bg-[#d90429]" : task.priority === "Medium" ? "bg-black" : "bg-black/25"}`} />
        <div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-black/45">{task.project} / {task.assignee}</p></div>
      </div>
      <div><span className="inline-flex bg-black/5 px-2.5 py-1.5 text-xs font-medium">{task.status}</span></div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className={`text-xs ${task.due === "Today" ? "font-semibold text-[#d90429]" : "text-black/45"}`}>{task.due}</span>
        <div className="flex">
          <button disabled={task.status === "To do"} onClick={() => onMoveTask(task.id, -1)} className="grid h-8 w-8 place-items-center border border-black/10 disabled:opacity-20" aria-label="Move task back"><ArrowLeft className="h-3.5 w-3.5" /></button>
          <button disabled={task.status === "Done"} onClick={() => onMoveTask(task.id, 1)} className="grid h-8 w-8 place-items-center border border-l-0 border-black/10 disabled:opacity-20" aria-label="Move task forward"><ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ProjectBoard({ tasks, projects, onMoveTask, onNewTask }: { tasks: Task[]; projects: Project[]; onMoveTask: (id: string, direction: -1 | 1) => void; onNewTask: () => void }) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeading eyebrow="Shared delivery" title="Project board" description="Move work through the delivery pipeline and keep every handoff visible." action={<button onClick={onNewTask} className="flex items-center gap-2 bg-[#d90429] px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add task</button>} />
      <div className="mb-6 flex items-center justify-between border-y border-black/10 py-4">
        <div><p className="font-semibold">Meridian Commerce</p><p className="mt-1 text-xs text-black/45">Web development / 72% complete</p></div>
        <div className="hidden -space-x-2 sm:flex">{(projects[0]?.members ?? []).map((member, index) => <span key={member} className={`grid h-8 w-8 place-items-center border-2 border-[#f6f6f3] text-[10px] font-bold text-white ${index === 0 ? "bg-[#d90429]" : "bg-black"}`}>{member}</span>)}</div>
      </div>
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return (
            <section key={status} className="min-w-[270px] border-t-2 border-black pt-4">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">{status}</h2><span className="grid h-6 min-w-6 place-items-center bg-black/5 px-1 text-xs">{columnTasks.length}</span></div>
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <div key={task.id} className="border border-black/12 bg-white p-4 transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.priority === "High" ? "bg-[#d90429]" : "bg-black/30"}`} /><button aria-label="Task options"><MoreHorizontal className="h-4 w-4 text-black/30" /></button></div>
                    <h3 className="mt-4 text-sm font-semibold leading-snug">{task.title}</h3>
                    <p className="mt-2 text-[11px] text-black/40">{task.project}</p>
                    <div className="mt-5 flex items-center justify-between"><span className="grid h-7 w-7 place-items-center bg-black text-[9px] font-bold text-white">{task.assignee}</span><span className={`text-[11px] ${task.due === "Today" ? "font-semibold text-[#d90429]" : "text-black/40"}`}>{task.due}</span></div>
                    <div className="mt-4 flex border-t border-black/10 pt-3">
                      <button disabled={status === "To do"} onClick={() => onMoveTask(task.id, -1)} className="flex flex-1 items-center justify-center gap-1 text-[10px] font-semibold text-black/45 disabled:opacity-20"><ArrowLeft className="h-3 w-3" /> Back</button>
                      <button disabled={status === "Done"} onClick={() => onMoveTask(task.id, 1)} className="flex flex-1 items-center justify-center gap-1 border-l border-black/10 text-[10px] font-semibold text-black/45 disabled:opacity-20">Move <ArrowRight className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MessagesView({ messages, onSend }: { messages: WorkspaceMessage[]; onSend: (channel: string, text: string) => void }) {
  const channels = useMemo(() => {
    const known = new Set<string>(workspaceChannels);
    for (const message of messages) known.add(message.channel);
    return [...known];
  }, [messages]);
  const [activeChannel, setActiveChannel] = useState(channels[0] ?? "General");
  const [draft, setDraft] = useState("");

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel),
    [messages, activeChannel],
  );

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(activeChannel, draft.trim());
    setDraft("");
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeading eyebrow="Team communication" title="Messages" description="Project conversations stay close to the work they support." />
      <div className="grid min-h-[620px] border border-black/15 bg-white md:grid-cols-[250px_1fr]">
        <aside className="border-b border-black/10 p-4 md:border-b-0 md:border-r">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-black/35">Project channels</p>
          {channels.map((channel) => {
            const count = messages.filter((message) => message.channel === channel).length;
            const active = channel === activeChannel;
            return (
              <button key={channel} onClick={() => setActiveChannel(channel)} className={`mb-1 flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium ${active ? "bg-black text-white" : "text-black/55 hover:bg-black/5"}`}>
                <span className="text-black/30">#</span>
                <span className="truncate">{channel}</span>
                {count > 0 && <span className={`ml-auto grid h-5 min-w-5 place-items-center px-1 text-[9px] font-bold ${active ? "bg-white text-black" : "bg-black/10 text-black/60"}`}>{count}</span>}
              </button>
            );
          })}
        </aside>
        <section className="flex min-h-[540px] flex-col">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4"><div><h2 className="font-semibold">{activeChannel}</h2><p className="mt-1 text-xs text-black/40">{channelMessages.length} message{channelMessages.length === 1 ? "" : "s"} / Client delivery</p></div><MoreHorizontal className="h-5 w-5 text-black/30" /></div>
          <div className="flex-1 space-y-7 overflow-y-auto p-5 sm:p-7">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">Today</p>
            {channelMessages.map((message, index) => (
              <motion.div initial={index === channelMessages.length - 1 && message.time === "Now" ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} key={message.id} className="flex gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center text-[10px] font-bold text-white ${message.initials === "AM" ? "bg-[#d90429]" : "bg-black"}`}>{message.initials || message.name.slice(0, 2).toUpperCase()}</span>
                <div><p className="text-sm font-semibold">{message.name} <span className="ml-2 text-[10px] font-normal text-black/35">{message.time}</span></p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/65">{message.text}</p></div>
              </motion.div>
            ))}
            {!channelMessages.length && <p className="py-16 text-center text-sm text-black/40">No messages in this channel yet.</p>}
          </div>
          <form onSubmit={sendMessage} className="m-4 flex items-end gap-2 border border-black/20 p-2 sm:m-5">
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center text-black/40" aria-label="Attach file"><Paperclip className="h-4 w-4" /></button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none" placeholder="Write a message..." />
            <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center bg-[#d90429] text-white" aria-label="Send message"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      </div>
    </div>
  );
}

function FilesView({ files, onUpload }: { files: WorkspaceFile[]; onUpload: () => void }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeading eyebrow="Shared resources" title="Files" description="The latest project documents, designs, and working files." action={<button onClick={onUpload} className="flex items-center gap-2 bg-black px-4 py-3 text-sm font-semibold text-white"><Upload className="h-4 w-4" /> Upload file</button>} />
      <div className="border-t border-black">
        <div className="hidden grid-cols-[1.3fr_0.7fr_100px_110px] gap-5 border-b border-black/15 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-black/35 sm:grid"><span>Name</span><span>Project</span><span>Size</span><span>Updated</span></div>
        {files.map((item, index) => {
          const Icon = fileIcon(item.type);
          return (
            <div key={`${item.name}-${index}`} className="grid gap-3 border-b border-black/12 py-5 sm:grid-cols-[1.3fr_0.7fr_100px_110px] sm:items-center sm:gap-5">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center bg-white"><Icon className="h-5 w-5 text-[#d90429]" strokeWidth={1.7} /></span><span className="truncate text-sm font-medium">{item.name}</span></div>
              <span className="text-xs text-black/50">{item.project}</span><span className="text-xs text-black/40">{item.size}</span><div className="flex items-center justify-between gap-2"><span className="text-xs text-black/40">{item.updated}</span><button aria-label={`Download ${item.name}`}><Download className="h-4 w-4 text-black/35" /></button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinanceView({ entries, onNew, onExport }: { entries: LedgerEntry[]; onNew: () => void; onExport: () => void }) {
  const [filter, setFilter] = useState<"All" | TransactionType>("All");
  const income = entries.filter((entry) => entry.type === "Income").reduce((total, entry) => total + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === "Expense").reduce((total, entry) => total + entry.amount, 0);
  const visible = filter === "All" ? entries : entries.filter((entry) => entry.type === filter);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeading eyebrow="Restricted access" title="Financial ledger" description="Company income and expenses. Visible only to the Founder and Accountant." action={<div className="flex gap-2"><button onClick={onExport} className="flex items-center gap-2 border border-black/20 bg-white px-4 py-3 text-sm font-semibold"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Export CSV</span></button><button onClick={onNew} className="flex items-center gap-2 bg-[#d90429] px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add entry</button></div>} />

      <div className="mb-8 flex items-center gap-3 border-y border-[#d90429]/30 bg-[#d90429]/5 px-4 py-3 text-xs text-[#9f001d]"><ShieldCheck className="h-4 w-4 shrink-0" /><span><strong>Protected area.</strong> Role-based permissions limit this ledger to two authorized accounts.</span></div>

      <div className="grid gap-px bg-black/15 sm:grid-cols-3">
        {[
          ["Total income", currency.format(income), TrendingUp, "text-emerald-700"],
          ["Total expenses", currency.format(expenses), TrendingDown, "text-[#d90429]"],
          ["Net balance", currency.format(income - expenses), WalletCards, "text-black"],
        ].map(([label, value, Icon, color]) => {
          const StatIcon = Icon as LucideIcon;
          return <div key={String(label)} className="bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-xs font-medium text-black/45">{String(label)}</p><StatIcon className={`h-5 w-5 ${String(color)}`} /></div><p className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{String(value)}</p></div>;
        })}
      </div>

      <div className="mt-10 flex items-center justify-between border-b border-black">
        <h2 className="pb-4 text-lg font-semibold">Transactions</h2>
        <div className="flex">{(["All", "Income", "Expense"] as const).map((type) => <button key={type} onClick={() => setFilter(type)} className={`border-b-2 px-3 py-4 text-xs font-semibold ${filter === type ? "border-[#d90429] text-[#d90429]" : "border-transparent text-black/40"}`}>{type}</button>)}</div>
      </div>
      <div>
        {visible.map((entry) => (
          <div key={entry.id} className="grid gap-3 border-b border-black/12 py-5 sm:grid-cols-[100px_1fr_160px_140px] sm:items-center">
            <span className="text-xs text-black/40">{new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${entry.date}T00:00:00`))}</span>
            <div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center ${entry.type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-[#d90429]"}`}><ReceiptText className="h-4 w-4" /></span><div><p className="text-sm font-medium">{entry.description}</p><p className="mt-1 text-[11px] text-black/40">{entry.category}</p></div></div>
            <span className={`w-fit px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${entry.type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-[#d90429]"}`}>{entry.type}</span>
            <span className={`text-right text-sm font-semibold ${entry.type === "Income" ? "text-emerald-700" : "text-black"}`}>{entry.type === "Income" ? "+" : "-"}{currency.format(entry.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full max-w-lg bg-white p-6 sm:p-8" role="dialog" aria-modal="true">
            <div className="mb-8 flex items-start justify-between gap-5"><div><h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2><p className="mt-2 text-sm text-black/45">{subtitle}</p></div><button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center bg-black text-white" aria-label="Close modal"><X className="h-4 w-4" /></button></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WorkspaceApp;