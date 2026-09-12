-- F-1 invoices: per-unit, per-month documents over the append-only ledger.
-- ADDITIVE ONLY — one new table + policies + stamp trigger; nothing existing is
-- altered or dropped. The row stores the send/void lifecycle and a snapshot of
-- amount + entry_ids; PAID IS DERIVED CLIENT-SIDE from ledger_entries (FIFO,
-- src/lib/invoice.js) and never written here. id = the invoice number
-- (INV-YYYYMM-<unit>, deterministic). Content tier like governance_items
-- (owner+operator read · operator write · stamp trigger) PLUS a tenant
-- own-unit read modelled on "ledger read tenant own unit".
-- Not in the layer registry → NOT added to the realtime publication.
-- APPLIED to otb prod (kbhsghodquchkgfdzckc) 2026-09-11 via MCP apply_migration
-- (in server migration history as `invoices`).
begin;
create table public.invoices (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  ym text not null check (ym ~ '^\d{4}-\d{2}$'),
  amount numeric(10,2) not null default 0,
  entry_ids jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','sent','void')),
  sent_on date,
  sent_via text not null default '',
  notes text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index invoices_by_unit_month on invoices (property_id, unit, ym);
do $$
begin
  execute 'alter table invoices enable row level security';
  execute 'create policy "invoices read owner/operator" on invoices for select using
    (member_role_in(org_id, property_id, array[''owner'',''operator'']))';
  execute 'create policy "invoices read tenant own unit" on invoices for select using
    (member_role_in(org_id, property_id, array[''tenant''])
     and unit = current_tenant_unit(org_id, property_id))';
  execute 'create policy "invoices insert operator" on invoices for insert with check
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "invoices update operator" on invoices for update
    using (member_role_in(org_id, property_id, array[''operator'']))
    with check (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create policy "invoices delete operator" on invoices for delete using
    (member_role_in(org_id, property_id, array[''operator'']))';
  execute 'create trigger stamp before insert or update on invoices
    for each row execute function stamp_layer_row()';
end $$;
commit;
