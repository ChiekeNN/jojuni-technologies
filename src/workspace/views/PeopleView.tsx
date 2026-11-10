/**
 * People: staff, clients and vendors.
 *
 * Three groups, because they are three different things to the company. Staff
 * are who the work is given to. Clients are who it is done for. Vendors are who
 * it is bought from. Mixing them into one flat list — which is what this page
 * used to do — means an invoice contact sits in an assignment menu, which is
 * the kind of small wrongness that makes a workspace stop being trusted.
 *
 * Only staff can be assigned work or join a project; that rule lives in
 * `assignablePeople` and every assignee list reads it.
 */
import { useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import { useWorkspace } from "../store";
import {
  initialsOf,
  peopleByCategory,
  peopleCounts,
  personSubtitle,
  projectProgress,
  splitName,
  telHref,
  whatsappHref,
  type Person,
  type PersonCategory,
} from "../model";
import { Avatar, Button, Chip, Field, IconButton, Modal, Panel, ProgressBar, Select, TextArea, TextInput, cx } from "../ui";

const TABS: { id: PersonCategory | "all"; label: string; icon: typeof Users }[] = [
  { id: "all", label: "Everyone", icon: Users },
  { id: "staff", label: "Staff", icon: UserRound },
  { id: "client", label: "Clients", icon: Building2 },
  { id: "vendor", label: "Vendors", icon: Wrench },
];

const CATEGORY_LABEL: Record<PersonCategory, string> = {
  staff: "Staff",
  client: "Client",
  vendor: "Vendor",
};

export function PeopleView({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const { state, actions } = useWorkspace();
  const [tab, setTab] = useState<PersonCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<PersonCategory | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);

  const counts = peopleCounts(state.people);
  const me = state.currentUserId;

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return state.people
      .filter((person) => tab === "all" || (person.category ?? "staff") === tab)
      .filter((person) => {
        if (!search) return true;
        const haystack = [
          person.name,
          person.email,
          person.phone,
          person.whatsapp,
          person.company,
          person.title,
          person.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => {
        // Staff first, then clients, then vendors, each alphabetical.
        const order: Record<PersonCategory, number> = { staff: 0, client: 1, vendor: 2 };
        const byCategory = order[a.category ?? "staff"] - order[b.category ?? "staff"];
        return byCategory || a.name.localeCompare(b.name);
      });
  }, [state.people, tab, query]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-black">People</h1>
          <p className="mt-1 text-sm text-black/50">
            {counts.staff} staff · {counts.client} clients · {counts.vendor} vendors
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button tone="ghost" onClick={() => setAdding("client")}>
            <Building2 className="h-3.5 w-3.5" /> Add client
          </Button>
          <Button tone="ghost" onClick={() => setAdding("vendor")}>
            <Wrench className="h-3.5 w-3.5" /> Add vendor
          </Button>
          <Button tone="primary" onClick={() => setAdding("staff")}>
            <Plus className="h-3.5 w-3.5" /> Add staff
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => {
            const count = item.id === "all" ? state.people.length : counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={tab === item.id}
                className={cx(
                  "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition",
                  tab === item.id ? "bg-black text-white" : "bg-white text-black/55 hover:text-black",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
                <span className={cx("tabular-nums", tab === item.id ? "text-white/60" : "text-black/30")}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-64 sm:flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people…"
            className="py-1.5 pl-7 text-xs"
            aria-label="Search people"
          />
        </div>
      </div>

      {!visible.length && (
        <Panel>
          <p className="py-8 text-center text-xs text-black/40">
            Nothing matches that. {tab !== "all" && `No ${CATEGORY_LABEL[tab].toLowerCase()} yet.`}
          </p>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((person) => {
          const category = person.category ?? "staff";
          const projects =
            category === "staff"
              ? state.projects.filter((project) => project.members.includes(person.id))
              : [];
          const openTodos =
            category === "staff"
              ? state.todos.filter((todo) => todo.assigneeId === person.id && !todo.done).length
              : 0;
          const doneTodos =
            category === "staff"
              ? state.todos.filter((todo) => todo.assigneeId === person.id && todo.done).length
              : 0;

          return (
            <Panel key={person.id}>
              <div className="flex items-start gap-3">
                <Avatar person={person} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-sm font-bold text-black">{person.name}</h2>
                    {category !== "staff" && (
                      <Chip tone={category === "client" ? "ok" : "dark"}>{CATEGORY_LABEL[category]}</Chip>
                    )}
                    {person.owner && <Chip tone="dark">Super admin</Chip>}
                    {person.id === me && <Chip tone="ok">You</Chip>}
                    {category === "vendor" && person.freelance && (
                      <span className="rounded bg-black/5 px-1 py-px text-[10px] font-semibold text-black/50">Freelance</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-black/45">{personSubtitle(person)}</p>
                  {person.company && category === "vendor" && !person.freelance && (
                    <p className="truncate text-[11px] text-black/35">{person.company}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <IconButton label={`Edit ${person.name}`} onClick={() => setEditing(person)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>
                  {!person.owner && (
                    <IconButton label={`Remove ${person.name}`} tone="danger" onClick={() => setDeleting(person)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  )}
                </div>
              </div>

              {/* Contact details. The links are real: tel: and wa.me both work
                  from a phone, which is where anyone would use them. */}
              <ul className="mt-3 space-y-1">
                {person.email && (
                  <li>
                    <a
                      href={`mailto:${person.email}`}
                      className="flex items-center gap-1.5 text-[11px] text-black/50 hover:text-black"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{person.email}</span>
                    </a>
                  </li>
                )}
                {person.phone && (
                  <li>
                    <a
                      href={telHref(person.phone)}
                      className="flex items-center gap-1.5 text-[11px] text-black/50 hover:text-black"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{person.phone}</span>
                    </a>
                  </li>
                )}
                {person.whatsapp && (
                  <li>
                    <a
                      href={whatsappHref(person.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800"
                    >
                      <MessageCircle className="h-3 w-3 shrink-0" />
                      <span className="truncate">WhatsApp {person.whatsapp}</span>
                    </a>
                  </li>
                )}
                {person.address && (
                  <li className="flex items-start gap-1.5 text-[11px] text-black/45">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{person.address}</span>
                  </li>
                )}
                {!person.email && !person.phone && !person.whatsapp && !person.address && (
                  <li className="text-[11px] text-black/30">No contact details yet.</li>
                )}
              </ul>

              {category === "staff" && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded border border-black/8 px-2 py-1.5">
                      <p className="text-base font-bold tabular-nums text-black">{openTodos}</p>
                      <p className="text-[10px] text-black/40">open to-dos</p>
                    </div>
                    <div className="rounded border border-black/8 px-2 py-1.5">
                      <p className="text-base font-bold tabular-nums text-black">{doneTodos}</p>
                      <p className="text-[10px] text-black/40">completed</p>
                    </div>
                  </div>

                  <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-black/35">
                    Projects ({projects.length})
                  </p>
                  <ul className="space-y-1">
                    {projects.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => onOpenProject(project.id)}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-black/65 hover:text-black">
                            {project.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-black/30">
                            {projectProgress(state, project.id)}%
                          </span>
                        </button>
                      </li>
                    ))}
                    {!projects.length && <li className="text-[11px] text-black/35">Not on a project yet.</li>}
                  </ul>
                </>
              )}
            </Panel>
          );
        })}
      </div>

      {tab === "all" || tab === "staff" ? (
        <Panel>
          <h2 className="mb-2 text-sm font-bold text-black">Workload across active projects</h2>
          <p className="mb-3 text-[11px] text-black/40">Staff only — clients and vendors are not on projects.</p>
          <div className="space-y-2">
            {state.projects
              .filter((project) => project.status === "active")
              .map((project) => (
                <div key={project.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-[11px] text-black/60">{project.name}</span>
                  <div className="flex -space-x-1">
                    {peopleByCategory(state.people, "staff")
                      .filter((person) => project.members.includes(person.id))
                      .map((person) => (
                        <Avatar key={person.id} person={person} size="xs" ring />
                      ))}
                  </div>
                  <div className="ml-auto w-28">
                    <ProgressBar value={projectProgress(state, project.id)} color={project.color} />
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      ) : null}

      <PersonForm
        open={adding !== null}
        category={adding ?? "staff"}
        onClose={() => setAdding(null)}
        onSubmit={(person) => {
          actions.addPerson(person);
          setAdding(null);
        }}
      />

      <PersonForm
        open={editing !== null}
        category={(editing?.category ?? "staff") as PersonCategory}
        person={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={(patch) => {
          if (!editing) return;
          actions.updatePerson(editing.id, patch);
          setEditing(null);
        }}
      />

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Remove person">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-black/70">
              Remove <span className="font-semibold text-black">{deleting.name}</span>
              {(deleting.category ?? "staff") === "staff"
                ? "? They come off every project, but the work already attached to them stays."
                : " from your contacts?"}
            </p>
            <div className="flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                tone="danger"
                onClick={() => {
                  actions.deletePerson(deleting.id);
                  setDeleting(null);
                }}
              >
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <p className="text-[11px] leading-relaxed text-black/35">
        People added here appear in every menu immediately. This workspace has no email server, so nobody is emailed an
        invitation. Staff can be assigned work and join projects; clients and vendors are contacts and are kept out of
        both.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit                                                          */
/* ------------------------------------------------------------------ */

type PersonDraft = Omit<Person, "id">;

function PersonForm({
  open,
  category,
  person,
  onClose,
  onSubmit,
}: {
  open: boolean;
  category: PersonCategory;
  person?: Person;
  onClose: () => void;
  onSubmit: (draft: PersonDraft) => void;
}) {
  const { state } = useWorkspace();
  const [firstName, setFirstName] = useState(person?.firstName ?? (person ? splitName(person.name).first : ""));
  const [lastName, setLastName] = useState(person?.lastName ?? (person ? splitName(person.name).last : ""));
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(person?.whatsapp ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [address, setAddress] = useState(person?.address ?? "");
  const [title, setTitle] = useState(person?.title ?? "");
  const [company, setCompany] = useState(person?.company ?? "");
  const [freelance, setFreelance] = useState(person?.freelance ?? false);
  const [color, setColor] = useState(person?.color ?? (category === "client" ? "#1d4ed8" : category === "vendor" ? "#b45309" : "#0f766e"));
  const [error, setError] = useState<string | null>(null);

  // Reset when the form is reopened for a different person. Keying the modal on
  // the person id would remount it, but the fields live here, so sync on open.
  const formKey = `${open}-${person?.id ?? "new"}-${category}`;
  const [lastKey, setLastKey] = useState(formKey);
  if (open && formKey !== lastKey) {
    setLastKey(formKey);
    setFirstName(person?.firstName ?? (person ? splitName(person.name).first : ""));
    setLastName(person?.lastName ?? (person ? splitName(person.name).last : ""));
    setPhone(person?.phone ?? "");
    setWhatsapp(person?.whatsapp ?? "");
    setEmail(person?.email ?? "");
    setAddress(person?.address ?? "");
    setTitle(person?.title ?? "");
    setCompany(person?.company ?? "");
    setFreelance(person?.freelance ?? false);
    setError(null);
  }

  const submit = () => {
    if (!firstName.trim()) {
      setError("A first name is required.");
      return;
    }
    // A client is a company's contact — without the company there is nothing to
    // invoice and nothing to look up later.
    if (category === "client" && !company.trim()) {
      setError("Clients need a company name.");
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      initials: initialsOf(fullName),
      title: title.trim() || (category === "staff" ? "Team member" : ""),
      email: email.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      address: address.trim(),
      company: company.trim(),
      freelance: category === "vendor" ? freelance : undefined,
      color,
      category,
      createdAt: person?.createdAt ?? new Date().toISOString(),
    });
  };

  const heading =
    category === "client" ? "Add a client" : category === "vendor" ? "Add a vendor" : "Add a staff member";

  return (
    <Modal open={open} onClose={onClose} title={person ? `Edit ${person.name}` : heading} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <TextInput autoFocus value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </Field>
        <Field label="Last name">
          <TextInput value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </Field>

        <Field label="Phone number">
          <TextInput
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+234 803 000 0000"
          />
        </Field>
        <Field label="WhatsApp number" hint="Leave blank if it is the same as the phone.">
          <TextInput
            type="tel"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="+234 803 000 0000"
          />
        </Field>

        <Field label="Email">
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label={category === "client" ? "Role at the company" : "Role"}>
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={category === "vendor" ? "e.g. Freelance designer" : "e.g. Director"}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Address">
            <TextArea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} />
          </Field>
        </div>

        {category === "client" && (
          <div className="sm:col-span-2">
            <Field label="Company name" hint="Required — this is who the invoice is made out to.">
              <TextInput value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Aviel Karis Limited" />
            </Field>
          </div>
        )}

        {category === "vendor" && (
          <>
            <div className="sm:col-span-2">
              <Field label="Company" hint="Leave blank for a freelancer.">
                <TextInput
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="e.g. Printworks Ltd"
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={freelance}
                onChange={(event) => setFreelance(event.target.checked)}
                className="accent-black"
              />
              <span className="text-xs text-black/70">
                Works for themselves (freelancer) — no company to record
              </span>
            </label>
          </>
        )}

        <Field label="Avatar colour">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-[38px] w-full cursor-pointer rounded border border-black/15 bg-white p-1"
          />
        </Field>
        <Field label="Type">
          <Select value={category} disabled>
            <option value="staff">Staff</option>
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
          </Select>
        </Field>
      </div>

      {error && <p className="mt-3 text-[11px] font-semibold text-[#d90429]">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button tone="primary" onClick={submit}>
          {person ? "Save changes" : `Add ${category === "staff" ? "person" : category}`}
        </Button>
      </div>

      {category === "staff" && !person && (
        <p className="mt-3 text-[10px] leading-relaxed text-black/35">
          Staff are added to the workspace directory and can be put on projects straight away. {state.people.length}{" "}
          people are already here.
        </p>
      )}
    </Modal>
  );
}
