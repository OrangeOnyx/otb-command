/* F-4: HVAC PM contract tracking — operator-entered preventive-maintenance
   contracts per unit (feeds the unit drawer + T-1). Next due is DERIVED in
   the client (last_service_on + frequency, else starts_on) — never stored.
   The §9.01 covenant fact (149 · Butcher Air Conditioning · monthly) stays
   repo-locked in src/lib/facts.js; no seed rows here. Content tier like
   governance_items (owner+operator read · operator write · stamp trigger).
   Additive — no existing table touched.
   NOT YET APPLIED — apply via MCP apply_migration when the door is open;
   this file is the record. */
begin;
create table public.hvac_contracts (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  vendor_id text not null default '',
  vendor_name text not null default '',
  scope text not null default '',
  frequency text not null default 'monthly' check (frequency in ('monthly','quarterly','semiannual','annual')),
  starts_on date,
  ends_on date,
  last_service_on date,
  status text not null default 'active' check (status in ('active','lapsed','ended')),
  ref text not null default '',
  notes text not null default '',
  source text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index hvac_contracts_by_unit on hvac_contracts (property_id, unit, status);
do $$
begin
  execute 'alter table hvac_contracts enable row level security';
  execute 'create policy "hvac contracts read owner/operator" on hvac_contracts for select using
    (member_role_in(org_id, property_id, array[''owner'',''operator'']))';
  execute 'create policy "hvac contracts insert operator" on hvac_contracts for insert with check
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "hvac contracts update operator" on hvac_contracts for update
    using (member_role_in(org_id, property_id, array[''operator'']))
    with check (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "hvac contracts delete operator" on hvac_contracts for delete using
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create trigger stamp before insert or update on hvac_contracts
    for each row execute function stamp_layer_row()';
end $$;
commit;
