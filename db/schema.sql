-- ---------------------------------------------------------------------------
-- Jojuni Technologies — Neon (PostgreSQL) schema
--
-- Idempotent: every statement is safe to re-run. Apply it with:
--
--     npm run db:migrate          (preferred — uses the WS driver, multi-statement)
--
-- or paste this whole file into the Neon console SQL editor
-- (Neon dashboard -> your project -> SQL Editor -> Run).
--
-- No extensions are required: gen_random_uuid() ships with PostgreSQL 13+.
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 200),
  client      text not null default 'Internal',
  progress    integer not null default 0 check (progress >= 0 and progress <= 100),
  due         text not null default '',
  color       text not null default '#000000',
  members     text[] not null default '{}',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint projects_name_unique unique (name)
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 300),
  project     text not null default 'Internal',
  status      text not null default 'To do'
              check (status in ('To do', 'In progress', 'Review', 'Done')),
  assignee    text not null default '',
  due         text not null default 'No date',
  priority    text not null default 'Medium'
              check (priority in ('Low', 'Medium', 'High')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_project_idx on public.tasks (project);

create table if not exists public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  entry_date  date not null default current_date,
  description text not null check (length(description) between 1 and 500),
  category    text not null default 'Other',
  type        text not null check (type in ('Income', 'Expense')),
  amount      numeric(14, 2) not null check (amount >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ledger_entries_date_idx on public.ledger_entries (entry_date desc);

create table if not exists public.workspace_files (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) between 1 and 400),
  project       text not null default 'Internal',
  size_label    text not null default '',
  kind          text not null default 'document'
                check (kind in ('document', 'image', 'sheet')),
  updated_label text not null default 'Just now',
  -- Reserved for a future object store (e.g. Vercel Blob). File *bytes* are
  -- not stored in Postgres; only metadata is.
  storage_url   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists workspace_files_created_idx on public.workspace_files (created_at desc);

create table if not exists public.workspace_messages (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null default 'General',
  name        text not null check (length(name) between 1 and 200),
  initials    text not null default '',
  text        text not null check (length(text) between 1 and 2000),
  time_label  text not null default 'Now',
  created_at  timestamptz not null default now()
);

create index if not exists workspace_messages_channel_idx
  on public.workspace_messages (channel, created_at);

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 200),
  email       text not null check (length(email) between 3 and 320),
  company     text not null default '',
  brief       text not null check (length(brief) between 1 and 5000),
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'won', 'lost')),
  source      text not null default 'website',
  created_at  timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Workspace owner account + sessions
--
-- The workspace is super-admin only. There is no username: one owner account
-- is matched by password alone (scrypt, see api/_lib/password.ts).
--
-- `password_hash` below is a scrypt hash, not the password. It is the single
-- supported way the initial credential exists in this repository.
-- ---------------------------------------------------------------------------

create table if not exists public.workspace_accounts (
  id            uuid primary key default gen_random_uuid(),
  label         text not null default 'Workspace owner',
  role          text not null default 'founder'
                check (role in ('founder', 'accountant', 'staff')),
  password_hash text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Seeds the owner account once. `on conflict` is not available without a
-- natural key, so the insert is guarded by a not-exists check: re-running
-- db:migrate never resets a password that has since been changed.
insert into public.workspace_accounts (label, role, password_hash)
select 'Workspace owner', 'founder',
       'scrypt$16384$8$1$0GrbX1jiy2gPf6w30nti9w==$rnMK13NTy70/LaY3pW3obQ44J2xG4iKNlZN6ieWK52azLlHiXhhtTaVSwz1Y9gdmP/dF3l2WTEzXNq3cV15dfA=='
where not exists (select 1 from public.workspace_accounts);

create table if not exists public.workspace_sessions (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  subject     text not null default 'owner',
  role        text not null default 'founder'
              check (role in ('founder', 'accountant', 'staff')),
  label       text not null default 'Workspace owner',
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists workspace_sessions_expiry_idx
  on public.workspace_sessions (expires_at);

create table if not exists public.workspace_login_attempts (
  client_key  text primary key,
  attempts    integer not null default 0 check (attempts >= 0),
  first_at    timestamptz not null default now()
);
