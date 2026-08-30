/* Register #8: governance made dynamic — LLC records, covenant tracking,
   governance deadlines (feeds S-1 + T-1). Repo-locked instrument FACTS stay in
   facts.js; these are operator-entered records layered on top. Content tier
   (owner+operator read · operator write · stamp trigger).
   Applied direct to prod 2026-08-29 via MCP SQL — NOT in the server migration
   history; this file is the record. */
begin;
create table public.governance_items (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  kind text not null default 'record' check (kind in ('entity','covenant','deadline','record')),
  title text not null,
  entity text not null default '',
  ref text not null default '',
  due_on date,
  recurring text not null default '' check (recurring in ('','annual')),
  status text not null default 'open' check (status in ('open','satisfied','waived')),
  notes text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index governance_items_by_due on governance_items (property_id, status, due_on);
do $$
begin
  execute 'alter table governance_items enable row level security';
  execute 'create policy "governance read owner/operator" on governance_items for select using
    (member_role_in(org_id, property_id, array[''owner'',''operator'']))';
  execute 'create policy "governance insert operator" on governance_items for insert with check
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "governance update operator" on governance_items for update
    using (member_role_in(org_id, property_id, array[''operator'']))
    with check (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "governance delete operator" on governance_items for delete using
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create trigger stamp before insert or update on governance_items
    for each row execute function stamp_layer_row()';
end $$;
commit;
