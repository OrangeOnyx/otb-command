-- Event-sourced compliance (otb-ops harvest #3): append-only trail of every
-- C-1 matrix cell change. State itself still lives in property_state.comp;
-- this table is the WHO/WHEN/WHAT audit history behind it.
create table public.compliance_events (
  id bigint generated always as identity primary key,
  property_id text not null default 'otb',
  unit text not null,
  field text not null,
  old_state text not null,
  new_state text not null,
  changed_by text not null default '',
  created_at timestamptz not null default now()
);

alter table public.compliance_events enable row level security;

-- read: owner + operator (same visibility as the C-1 sheet)
create policy "compliance_events read owner/operator" on public.compliance_events
  for select to public using (public.is_owner_or_operator());

-- insert: operator only (owners are read-only in the app)
create policy "compliance_events insert operator" on public.compliance_events
  for insert to public with check (public.is_operator());

-- append-only by construction: no update/delete policies exist.

create index compliance_events_recent
  on public.compliance_events (property_id, created_at desc);
