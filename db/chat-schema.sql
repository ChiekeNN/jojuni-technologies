-- ---------------------------------------------------------------------------
-- Jojuni Technologies — internal chat
--
-- Run in the Supabase SQL editor for project xubpjwznjlltrjayjwcw.
-- Idempotent: safe to re-run.
--
-- Requires Supabase Auth. Every policy keys off `auth.uid()`, so a request with
-- only the publishable key but no session can read nothing at all.
--
-- See docs/chat-database-scope.md for why the rules are shaped this way.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- People
--
-- The workspace's own people list, mirrored here so membership can be a real
-- foreign key and so a thread member can be resolved to a name without the
-- browser having to trust what it is told.
-- ---------------------------------------------------------------------------

create table if not exists public.workspace_people (
  id          text primary key,
  -- The Supabase auth user this person is. Null for people who have not signed
  -- in yet; those rows are readable but cannot own anything.
  auth_uid    uuid references auth.users (id) on delete set null,
  name        text not null check (length(name) between 1 and 120),
  initials    text not null default '',
  title       text not null default '',
  email       text not null default '',
  color       text not null default '#111111',
  is_owner    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists workspace_people_auth_uid_idx on public.workspace_people (auth_uid);

-- ---------------------------------------------------------------------------
-- Threads and membership
-- ---------------------------------------------------------------------------

create table if not exists public.chat_threads (
  id          text primary key,
  kind        text not null check (kind in ('direct', 'group')),
  title       text not null default '',
  created_by  text not null references public.workspace_people (id) on delete cascade,
  color       text not null default '#111111',
  muted       boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.chat_thread_members (
  thread_id   text not null references public.chat_threads (id) on delete cascade,
  person_id   text not null references public.workspace_people (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (thread_id, person_id)
);

create index if not exists chat_thread_members_person_idx on public.chat_thread_members (person_id);

-- ---------------------------------------------------------------------------
-- Messages
--
-- One row per message. Attachments and reactions are jsonb arrays rather than
-- child tables: they are always read and written with their message, never
-- queried across messages, and inline keeps a send to a single insert.
-- ---------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id            text primary key,
  thread_id     text not null references public.chat_threads (id) on delete cascade,
  author_id     text not null references public.workspace_people (id) on delete cascade,
  kind          text not null default 'text' check (kind in ('text', 'image', 'file', 'voice', 'system')),
  body          text not null default '',
  attachments   jsonb not null default '[]'::jsonb,
  reactions     jsonb not null default '[]'::jsonb,
  reply_to      jsonb,
  forwarded_from jsonb,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz,
  deleted_at    timestamptz,
  deleted_by    text references public.workspace_people (id) on delete set null
);

create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);
create index if not exists chat_messages_author_idx on public.chat_messages (author_id);

-- ---------------------------------------------------------------------------
-- Helpers
--
-- SECURITY DEFINER so a policy on chat_thread_members can call them without
-- recursing into its own policy, which Postgres rejects.
-- ---------------------------------------------------------------------------

-- The workspace person behind the current Supabase auth user, or null.
create or replace function public.current_person_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.workspace_people where auth_uid = auth.uid() limit 1;
$$;

-- True when the signed-in person is a member of the thread.
create or replace function public.is_thread_member(target_thread text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_thread_members m
    where m.thread_id = target_thread
      and m.person_id = public.current_person_id()
  );
$$;

-- True when the signed-in person created the thread.
create or replace function public.is_thread_creator(target_thread text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads t
    where t.id = target_thread
      and t.created_by = public.current_person_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- No policy anywhere reads a role, a header or a claim the browser controls.
-- The only inputs are auth.uid() and rows in these tables.
-- ---------------------------------------------------------------------------

alter table public.workspace_people     enable row level security;
alter table public.chat_threads         enable row level security;
alter table public.chat_thread_members  enable row level security;
alter table public.chat_messages        enable row level security;

-- People: any signed-in user can read the staff directory (names are shown on
-- messages). You may only edit your own row.
drop policy if exists people_read on public.workspace_people;
create policy people_read on public.workspace_people
  for select to authenticated using (true);

drop policy if exists people_write_self on public.workspace_people;
create policy people_write_self on public.workspace_people
  for update to authenticated
  using (auth_uid = auth.uid())
  with check (auth_uid = auth.uid());

-- Threads: you see a thread only if you are in it. Deliberately no admin
-- escape hatch — the app promises groups are visible to members only, and a
-- policy that quietly disagreed would make that promise false.
drop policy if exists threads_read_member on public.chat_threads;
create policy threads_read_member on public.chat_threads
  for select to authenticated using (public.is_thread_member(id));

drop policy if exists threads_insert_self on public.chat_threads;
create policy threads_insert_self on public.chat_threads
  for insert to authenticated
  with check (created_by = public.current_person_id());

drop policy if exists threads_update_creator on public.chat_threads;
create policy threads_update_creator on public.chat_threads
  for update to authenticated
  using (created_by = public.current_person_id())
  with check (created_by = public.current_person_id());

drop policy if exists threads_delete_creator on public.chat_threads;
create policy threads_delete_creator on public.chat_threads
  for delete to authenticated using (created_by = public.current_person_id());

-- Membership: you can see who is in a thread you are in, and add people to it.
drop policy if exists members_read on public.chat_thread_members;
create policy members_read on public.chat_thread_members
  for select to authenticated using (public.is_thread_member(thread_id));

drop policy if exists members_insert on public.chat_thread_members;
create policy members_insert on public.chat_thread_members
  for insert to authenticated
  with check (
    public.is_thread_member(thread_id)
    or public.is_thread_creator(thread_id)
  );

-- You may remove yourself. Removing someone else needs you to be the creator.
drop policy if exists members_delete on public.chat_thread_members;
create policy members_delete on public.chat_thread_members
  for delete to authenticated
  using (person_id = public.current_person_id() or public.is_thread_creator(thread_id));

-- Messages: read only in threads you are in.
drop policy if exists messages_read_member on public.chat_messages;
create policy messages_read_member on public.chat_messages
  for select to authenticated using (public.is_thread_member(thread_id));

-- Author is whoever is signed in — not whoever the payload claims.
drop policy if exists messages_insert_member on public.chat_messages;
create policy messages_insert_member on public.chat_messages
  for insert to authenticated
  with check (
    public.is_thread_member(thread_id)
    and author_id = public.current_person_id()
  );

-- Edit and soft-delete your own. A trigger below stops the author being moved.
drop policy if exists messages_update_author on public.chat_messages;
create policy messages_update_author on public.chat_messages
  for update to authenticated
  using (author_id = public.current_person_id())
  with check (author_id = public.current_person_id());

drop policy if exists messages_delete_author on public.chat_messages;
create policy messages_delete_author on public.chat_messages
  for delete to authenticated using (author_id = public.current_person_id());

-- ---------------------------------------------------------------------------
-- Guard: a message cannot be re-attributed or moved to another thread
--
-- Without this, the update policy lets an author re-point their own message at
-- a different thread — which is how you would plant a message in a group you
-- were since removed from.
-- ---------------------------------------------------------------------------

create or replace function public.chat_messages_guard()
returns trigger
language plpgsql
as $$
begin
  if new.thread_id is distinct from old.thread_id then
    raise exception 'A message cannot be moved between conversations.';
  end if;
  if new.author_id is distinct from old.author_id then
    raise exception 'A message cannot be re-attributed.';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'A message timestamp cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_guard_trg on public.chat_messages;
create trigger chat_messages_guard_trg
  before update on public.chat_messages
  for each row execute function public.chat_messages_guard();

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Added now so turning realtime on later is a client change, not a migration.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: the staff group
--
-- The same people the workspace seeds, so a fresh database is not an empty
-- messenger. Rows without an auth_uid are readable but cannot sign in.
-- ---------------------------------------------------------------------------

insert into public.workspace_people (id, name, initials, title, email, color, is_owner)
values
  ('owner', 'Workspace Owner', 'WO', 'Founder / Super admin', 'hello@jojunitechnologies.com.ng', '#d90429', true),
  ('ada',   'Ada Madu',        'AM', 'Delivery lead',        'ada@jojunitechnologies.com.ng',   '#111111', false),
  ('emeka', 'Emeka Obi',       'EO', 'Finance & operations', 'emeka@jojunitechnologies.com.ng', '#6f6f6f', false),
  ('kene',  'Kene Ibe',        'KI', 'Product designer',     'kene@jojunitechnologies.com.ng',  '#0f766e', false),
  ('bola',  'Bola Nnaji',      'BN', 'Engineer',             'bola@jojunitechnologies.com.ng',  '#7c3aed', false)
on conflict (id) do nothing;

insert into public.chat_threads (id, kind, title, created_by, color)
values ('thread-staff', 'group', 'Staff', 'owner', '#d90429')
on conflict (id) do nothing;

insert into public.chat_thread_members (thread_id, person_id)
values
  ('thread-staff', 'owner'),
  ('thread-staff', 'ada'),
  ('thread-staff', 'emeka'),
  ('thread-staff', 'kene'),
  ('thread-staff', 'bola')
on conflict do nothing;
