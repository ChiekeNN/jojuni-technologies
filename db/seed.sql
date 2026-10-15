-- ---------------------------------------------------------------------------
-- Jojuni Technologies — demo seed data
--
-- Only inserts when a table is empty, so it is safe to run repeatedly:
--
--     npm run db:seed
--
-- This mirrors the demo content the workspace UI used to hard-code, which
-- makes a brand-new Neon database feel alive immediately.
-- ---------------------------------------------------------------------------

insert into public.projects (name, client, progress, due, color, members, position)
select v.*
from (
  values
    ('Meridian Commerce', 'Meridian Retail',  72, 'Sep 06', '#d90429', array['AM', 'EO', 'KI']::text[], 0),
    ('Northstar Mobile',  'Northstar Health', 45, 'Oct 18', '#000000', array['KI', 'BN']::text[],       1),
    ('Jojuni Automation', 'Internal',         86, 'Aug 30', '#6f6f6f', array['AM', 'KI']::text[],       2)
) as v (name, client, progress, due, color, members, position)
where not exists (select 1 from public.projects);

insert into public.tasks (title, project, status, assignee, due, priority, position)
select v.*
from (
  values
    ('Finalize checkout error states',   'Meridian Commerce', 'In progress', 'KI', 'Today',    'High',   0),
    ('Review sprint 4 deliverables',     'Northstar Mobile',  'Review',      'AM', 'Today',    'High',   1),
    ('Map client onboarding workflow',   'Jojuni Automation', 'To do',       'KI', 'Tomorrow', 'Medium', 2),
    ('Connect payment webhook',          'Meridian Commerce', 'To do',       'BN', 'Aug 28',   'High',   3),
    ('Prepare usability test notes',     'Northstar Mobile',  'In progress', 'KI', 'Aug 29',   'Medium', 4),
    ('Publish staging release',          'Jojuni Automation', 'Done',        'AM', 'Aug 24',   'Low',    5),
    ('Update product catalogue import',  'Meridian Commerce', 'Review',      'EO', 'Aug 30',   'Medium', 6)
) as v (title, project, status, assignee, due, priority, position)
where not exists (select 1 from public.tasks);

insert into public.ledger_entries (entry_date, description, category, type, amount)
select v.*
from (
  values
    ('2025-08-23'::date, 'Meridian milestone payment',  'Client income',     'Income',  2850000::numeric),
    ('2025-08-21'::date, 'AWS cloud infrastructure',    'Infrastructure',    'Expense',  186500::numeric),
    ('2025-08-19'::date, 'Northstar discovery deposit', 'Client income',     'Income',  1200000::numeric),
    ('2025-08-17'::date, 'Design software licenses',    'Software',          'Expense',   97000::numeric),
    ('2025-08-14'::date, 'Contract QA support',         'Contractors',       'Expense',  325000::numeric),
    ('2025-08-10'::date, 'Website care retainers',      'Recurring income',  'Income',   680000::numeric)
) as v (entry_date, description, category, type, amount)
where not exists (select 1 from public.ledger_entries);

insert into public.workspace_files (name, project, size_label, kind, updated_label)
select v.*
from (
  values
    ('Meridian product requirements.pdf', 'Meridian Commerce', '2.8 MB',  'document', '2 hours ago'),
    ('Northstar onboarding-flow.fig',     'Northstar Mobile',  '18.4 MB', 'image',    'Yesterday'),
    ('August delivery tracker.xlsx',      'Internal',          '920 KB',  'sheet',    'Yesterday'),
    ('API integration notes.pdf',         'Meridian Commerce', '1.2 MB',  'document', 'Aug 22'),
    ('Research interview summary.docx',   'Northstar Mobile',  '640 KB',  'document', 'Aug 20')
) as v (name, project, size_label, kind, updated_label)
where not exists (select 1 from public.workspace_files);

insert into public.workspace_messages (channel, name, initials, text, time_label)
select v.*
from (
  values
    ('Meridian Commerce', 'Ada Madu',  'AM', 'The client approved the updated checkout direction. Let us move the remaining states into review today.', '9:14 AM'),
    ('Meridian Commerce', 'Kene Ibe',  'KI', 'Perfect. I have the error states open now and will share the prototype link before lunch.', '9:21 AM'),
    ('Meridian Commerce', 'Bola Nnaji', 'BN', 'Webhook testing is also complete on staging. I added the edge cases to the release notes.', '9:37 AM')
) as v (channel, name, initials, text, time_label)
where not exists (select 1 from public.workspace_messages);
