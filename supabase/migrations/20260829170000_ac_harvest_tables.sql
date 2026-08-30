/* Wave H2 harvest landings (design: docs/superpowers/specs/2026-08-29-ac-harvest.md).
   Additive only. payment_history = H-1 shape (b): a dedicated read-only predecessor
   record — the append-only ledger stays born-clean; reversible (drop table) if the
   operator later picks (a). lease_abstracts/rent_escalation_ref = register #10 PORT
   (reference data for the lease assembler). hvac_units = register #18 seed.
   Applied direct to prod 2026-08-29 via MCP SQL — NOT in the server migration
   history; this file is the record. */
begin;

create table public.payment_history (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  amount_due numeric,
  amount_paid numeric not null default 0,
  paid_at timestamptz,
  status text not null default '' check (status in ('paid','partial','unpaid','late','')),
  late_fee numeric not null default 0,
  method text not null default '',
  check_number text not null default '',
  notes text not null default '',
  source text not null default 'ac',
  created_at timestamptz not null default now()
);
create index payment_history_by_unit on payment_history (property_id, unit, period desc);

create table public.lease_abstracts (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  commencement text not null default '',
  expiration text not null default '',
  original_term text not null default '',
  base_rent numeric,
  rent_psf numeric,
  escalations jsonb,
  renewal_options jsonb,
  security_deposit numeric,
  fields jsonb not null default '{}'::jsonb,
  confidence text not null default '',
  source text not null default 'ac',
  created_at timestamptz not null default now()
);
create index lease_abstracts_by_unit on lease_abstracts (property_id, unit);

create table public.rent_escalation_ref (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  abstract_id text references lease_abstracts(id) on delete set null,
  effective_on text not null default '',
  previous_rent numeric,
  new_rent numeric,
  increase_type text not null default '',
  increase_value text not null default '',
  notice_required text not null default '',
  notice_status text not null default '',
  notes text not null default '',
  source text not null default 'ac',
  created_at timestamptz not null default now()
);
create index rent_escalation_ref_by_unit on rent_escalation_ref (property_id, unit, effective_on);

create table public.hvac_units (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null default '',
  unit_label text not null default '',
  tenant text not null default '',
  system_type text not null default '',
  install_year integer,
  system_index integer,
  lease_responsibility text not null default '',
  replacement_history text not null default '',
  maintenance_contracts integer,
  source text not null default 'ac',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index hvac_units_by_unit on hvac_units (property_id, unit);

-- RLS: harvest landings are read-only from the client (owner+operator read; no
-- write policies — imports run privileged). hvac_units is content-tier: the
-- typed table replaces hvac.json as the editable record going forward.
do $$
declare t text;
begin
  foreach t in array array['payment_history','lease_abstracts','rent_escalation_ref','hvac_units'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "harvest read owner/operator" on %I for select using
      (member_role_in(org_id, property_id, array[''owner'',''operator'']))', t);
  end loop;
  create policy "hvac insert operator" on hvac_units for insert with check
    (member_role_in(org_id, property_id, array['operator']));
  create policy "hvac update operator" on hvac_units for update
    using (member_role_in(org_id, property_id, array['operator']))
    with check (member_role_in(org_id, property_id, array['operator']));
  create policy "hvac delete operator" on hvac_units for delete using
    (member_role_in(org_id, property_id, array['operator']));
  create trigger stamp before insert or update on hvac_units
    for each row execute function stamp_layer_row();
end $$;

commit;
