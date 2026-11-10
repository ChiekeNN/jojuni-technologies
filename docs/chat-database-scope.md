# Internal chat on a database — scope

**Status:** schema + client written, not yet connected. Nothing has changed for
users until the two environment variables below are set.

## The problem with what shipped

The chat works, but it is local-first: every thread, message and reaction sits in
one browser's `localStorage`. Two staff on two laptops have two separate chat
histories. Groups are private within a browser, not between people. That is fine
for a demo and useless for a company.

## What this closes

A database, so that:

- A message sent on one device appears on another.
- A group genuinely has members who are not the person who created it.
- Permissions are enforced where they cannot be edited with devtools.

## Decisions, and why

### 1. Postgres in Supabase, reached from the browser

The workspace is a static SPA on Vercel. Supabase gives a Postgres database with
Row Level Security and auth, and both are reachable from the browser with a
publishable key. That key is safe to ship **only because every table is behind
RLS** — the key identifies the project, not the user.

Chosen over the existing Neon `DATABASE_URL` route (`/api/workspace/*`) because
that path has been open since PR #24 and never worked in production. A chat
needs auth, and Supabase Auth is the part we would otherwise have to build and
secure ourselves.

### 2. Anonymous sign-in, not email/password — for now

The workspace currently has **no login**: it opens straight in, as the super
admin. Adding mandatory email/password would mean staff cannot get in until they
have an account, and there is no invite flow yet.

So: the browser signs in **anonymously** on first load. That produces a real
`auth.uid()` — which is what makes RLS enforceable — without asking anyone for a
password. A background pass upgrades the session to a full account by attaching
an email and password, without losing the identity, when the person is ready.

**This is a stepping stone, not the destination.** The end state is each staff
member with their own account, and the anonymous path turned off. That is a
deliberate follow-up, listed below, not something to leave forever.

### 3. The local chat stays, and stays primary when offline

`hydrate` reads from the database; writes go to the database and the local copy.
If the database is unreachable the chat behaves exactly as it does today. That
matters because the connection here is not always good, and losing the ability to
read yesterday's messages when the network drops is worse than a delayed send.

### 4. Old per-project `chats` are left alone

`state.chats` (the Campfire tabs) is a separate, older, project-scoped chat. It
is **not** migrated into the new messenger. Mixing them would be guesswork about
which project conversation belongs in which thread, and nobody asked for it.

## Schema

Two tables, because membership is the thing being protected.

```
chat_threads      id, kind, title, created_by, color, created_at
chat_thread_members  thread_id, person_id            (primary key, both)
chat_messages     id, thread_id, author_id, kind, body, attachments, reactions,
                  reply_to, forwarded_from, created_at, edited_at,
                  deleted_at, deleted_by
```

Postgres arrays are used for `attachments` and `reactions` rather than child
tables. They are always read and written with their message, never queried
across messages, and keeping them inline means one insert per message rather
than three.

## Row Level Security — the part that has to be right

RLS is the whole reason this is safe, so the rules are written explicitly:

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `chat_threads` | member only | creator is the signed-in user | creator | creator |
| `chat_thread_members` | member of that thread | member of that thread | — | own membership, or thread creator |
| `chat_messages` | member of the thread | member, and `author_id = auth.uid()` | author | author |
| `workspace_people` | signed in | signed in | own row | — |

Things that are deliberately *not* granted:

- **The super admin cannot read a thread they are not in.** The policy has no
  admin clause. The app already says groups are visible to members only, and a
  policy that quietly disagrees would make that statement a lie.
- **Nobody can edit someone else's message**, including an admin. Deleting
  someone else's message is **not** permitted by RLS either — see the next
  section, because this is a real difference from the local version.

## Where this differs from what shipped — please read

The local build let the super admin delete anyone's message. That cannot be
done safely with a publishable key in the browser, for a simple reason:

> A delete rule that says "or the super admin" has to know who is an admin. In
> this app that fact lives in the workspace data — which the person holding the
> key could edit. Anyone could make themselves an admin and then delete anything.

Two honest options:

1. **Server-side delete** — a small API route holding the service key, which
   checks the caller's role and soft-deletes. Correct, but needs a server and a
   real session.
2. **Moderation, not deletion** — an admin can hide a message from everyone.
   Same effect, and expressible in RLS without a trusted role claim.

Until one is chosen, the database version enforces **author-only** deletion. I
would rather say that plainly than ship an admin override that does not actually
hold.

## Setup — what has to happen before this is live

1. Apply `db/chat-schema.sql` to the Supabase project. **Not run yet** — it
   cannot be previewed locally and this project holds another app's tables.
2. Set in Vercel (Production and Preview):
   - `VITE_SUPABASE_URL` — `https://xubpjwznjlltrjayjwcw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — the publishable key
3. Turn on **anonymous sign-ins** in Supabase Auth settings. Currently off.
4. Add the production URL to the auth redirect allow-list. Currently
   `site_url` is `http://localhost:3000`, so email confirmation links would
   point at a laptop.

Without step 1 and 2 the app falls back to local-only and the chat works exactly
as it does today. That is the safe failure mode: a missing key must not break a
working feature.

## Not in scope yet

- **Realtime.** Two people on two devices will see each other's messages after a
  reload, not instantly. Supabase Realtime is a channel subscription and a
  publish-list entry; it belongs in the follow-up that also turns off anonymous
  auth, so that presence is keyed to real people.
- **File storage.** Attachments over 400 KB still go to IndexedDB, which is
  per-browser — so an attachment sent from one device will not arrive on
  another. Moving them to Supabase Storage is the natural follow-up; the schema
  already carries the file metadata.
- **Migrating existing local chats.** The seeded threads and every message
  already in a browser stay in that browser. Importing them would be a one-off
  script writing to the user's own rows.
- **Accounts for staff**, and turning anonymous sign-in off. See decision 2.

## Order of work

1. Schema + client (**done**, unapplied).
2. Apply schema, set the two environment variables, enable anonymous auth.
3. Verify RLS with a real second user: a non-member must fail to read a thread.
4. Realtime.
5. Storage for attachments.
6. Real accounts, anonymous auth off, plus the moderation decision above.
