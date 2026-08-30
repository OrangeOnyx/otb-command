/* N-1 Matters & Planning + #14 Communications hub + #11 leasing pipeline
   (register rows; design: docs/superpowers/specs/2026-08-29-ac-harvest.md).
   comm_log is the landing zone for AC voice_intake history (H1.1 reference
   import, source='ac') and the N-2 meeting-notes surface (channel='meeting').
   Additive only; applied direct to prod 2026-08-29 via MCP SQL — NOT in the
   server migration history; this file is the record. */
begin;

create table public.matters (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  title text not null,
  kind text not null default 'general' check (kind in ('general','zoning','legal','insurance','capital','governance','leasing')),
  status text not null default 'open' check (status in ('open','monitoring','closed')),
  summary text not null default '',
  opened_on date not null default current_date,
  closed_on date,
  next_deadline date,
  next_deadline_note text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index matters_by_status on matters (property_id, status, next_deadline);

create table public.comm_log (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text,
  vendor_id text,
  matter_id text references matters(id) on delete set null,
  channel text not null default 'note' check (channel in ('voice','sms','email','letter','note','meeting')),
  direction text not null default '' check (direction in ('in','out','')),
  at timestamptz not null default now(),
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  summary text not null default '',
  body text not null default '',
  urgency text not null default 'normal',
  status text not null default '',
  agent text not null default '',
  payload jsonb,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index comm_log_by_unit on comm_log (property_id, unit, at desc);
create index comm_log_by_matter on comm_log (property_id, matter_id, at desc);

create table public.deals (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  prospect text not null default '',
  business text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  contact_website text not null default '',
  target_unit text not null default '',
  target_sf integer,
  proposed_rent text not null default '',
  stage text not null default 'inquiry' check (stage in ('inquiry','tour','loi','lease_draft','signed','lost')),
  lead_source text not null default '',
  notes text not null default '',
  next_action_at text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index deals_by_stage on deals (property_id, stage);

-- RLS content tier: owner+operator read · operator write. Tenant/vendor sealed.
do $$
declare t text;
begin
  foreach t in array array['matters','comm_log','deals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s read owner/operator" on %I for select using
      (member_role_in(org_id, property_id, array[''owner'',''operator'']))', t, t);
    execute format('create policy "%s insert operator" on %I for insert with check
      (member_role_in(org_id, property_id, array[''operator'']))', t, t);
    execute format('create policy "%s update operator" on %I for update
      using (member_role_in(org_id, property_id, array[''operator'']))
      with check (member_role_in(org_id, property_id, array[''operator'']))', t, t);
    execute format('create policy "%s delete operator" on %I for delete using
      (member_role_in(org_id, property_id, array[''operator'']))', t, t);
    execute format('create trigger stamp before insert or update on %I
      for each row execute function stamp_layer_row()', t, t);
  end loop;
end $$;

commit;
