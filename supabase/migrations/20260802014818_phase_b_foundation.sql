-- PHASE B-1 FOUNDATION (branch-first, 2026-08-01): tenancy core per
-- transfer-package/14 §Decision addendum. orgs → properties →
-- org_members(capabilities) → property_settings. Ported-table org/property
-- stamping and RLS rewrites land in follow-up migrations on this branch.

create table orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name       text not null,
  brand      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table properties (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id),
  slug       text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name       text not null,
  address    text not null default '',
  tz         text not null default 'America/Chicago',
  facts      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table org_members (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id),
  user_id      uuid not null,
  property_id  uuid references properties(id),
  role         text not null check (role in ('operator','owner','vendor','tenant')),
  capabilities text[] not null default '{}',
  unit_scope   text not null default '',
  created_at   timestamptz not null default now()
);

create unique index org_members_scope_uq on org_members
  (org_id, user_id, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table property_settings (
  property_id          uuid primary key references properties(id),
  ledger_start_ym      text check (ledger_start_ym ~ '^\d{4}-\d{2}$'),
  renewal_horizon_days integer not null default 180,
  occupancy_floor      numeric not null default 0.85,
  late_grace_days      integer not null default 5,
  late_flat            numeric not null default 100,
  late_per_day         numeric not null default 25,
  settings             jsonb not null default '{}'::jsonb
);

-- RLS: members read their own org's rows; all writes via definer RPCs
-- (same posture the OTB tables already use).
alter table orgs enable row level security;
alter table properties enable row level security;
alter table org_members enable row level security;
alter table property_settings enable row level security;

create policy org_read on orgs for select using (
  exists (select 1 from org_members m where m.org_id = orgs.id and m.user_id = auth.uid()));

create policy prop_read on properties for select using (
  exists (select 1 from org_members m where m.org_id = properties.org_id and m.user_id = auth.uid()
          and (m.property_id is null or m.property_id = properties.id)));

create policy member_read_own on org_members for select using (user_id = auth.uid());

create policy settings_read on property_settings for select using (
  exists (select 1 from properties p join org_members m on m.org_id = p.org_id
          where p.id = property_settings.property_id and m.user_id = auth.uid()
          and (m.property_id is null or m.property_id = p.id)));

-- helper: capability check used by every ported policy rewrite
create or replace function public.member_can(p_cap text, p_org uuid, p_property uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.property_id is null or m.property_id = p_property)
      and p_cap = any (m.capabilities));
$$;

-- seed: Orange Ocean → OTB with the purge-item-3 setting (LEDGER_START_YM
-- leaves code and becomes this row when the port lands)
with o as (
  insert into orgs (slug, name) values ('orange-ocean', 'Orange Ocean, LLC') returning id
), p as (
  insert into properties (org_id, slug, name, address)
  select o.id, 'otb', 'On The Boulevard Shopping Center',
         '101-149 Arnould Blvd, Lafayette, LA 70506' from o returning id
)
insert into property_settings (property_id, ledger_start_ym) select p.id, '2026-08' from p;
