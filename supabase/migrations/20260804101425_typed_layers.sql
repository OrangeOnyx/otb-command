-- Phase B-5 purge #7 (A): typed layer tables + backfill. property_state stays
-- until typed_layers_drop so the pre-drop guard can compare representations.
-- Applied to prod via merge_branch 2026-08-04 (branch typed-layers).

-- shared audit stamp (insert + update; origin is client-provided, untouched)
create or replace function public.stamp_layer_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', '');
  return new;
end $$;

create table comp_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  field text not null,
  state text not null check (state in ('u','ok','flag','na')),
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, unit, field)
);

create table unit_notes (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  text text not null,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, unit)
);

create table board_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  card_id text not null,
  lane text check (lane in ('watch','action','progress','done')),
  edit jsonb,
  dismissed boolean not null default false,
  custom jsonb,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, card_id)
);

create table directory_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  collection text not null check (collection in ('contacts','documents')),
  id text not null,
  edit jsonb,
  dismissed boolean not null default false,
  custom jsonb,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, collection, id)
);

create table site_features (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  id text not null,
  type text not null,
  label text not null default '',
  note text not null default '',
  x numeric not null,
  y numeric not null,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, id)
);

create table camera_overrides (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  camera_id text not null,
  x numeric,
  y numeric,
  aim_deg numeric,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, camera_id)
);

create table layer_settings (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  key text not null check (key in ('financials','owner_sheets')),
  data jsonb not null,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, key)
);

do $$
declare t text;
begin
  foreach t in array array['comp_state','unit_notes','board_state',
    'directory_state','site_features','camera_overrides','layer_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner+operator read" on %I for select using
      (member_role_in(org_id, property_id, array[''owner'',''operator'']))', t);
    execute format('create policy "operator insert" on %I for insert with check
      (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create policy "operator update" on %I for update
      using (member_role_in(org_id, property_id, array[''operator'']))
      with check (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create policy "operator delete" on %I for delete using
      (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create trigger stamp before insert or update on %I
      for each row execute function stamp_layer_row()', t);
    execute format('alter table %I replica identity full', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;

-- ── backfill from property_state ────────────────────────────────
insert into comp_state (org_id, property_id, unit, field, state)
select ps.org_id, ps.property_id, u.key, f.key, f.value #>> '{}'
from property_state ps,
     lateral jsonb_each(ps.data) u(key, value),
     lateral jsonb_each(u.value) f(key, value)
where ps.layer = 'comp';

insert into unit_notes (org_id, property_id, unit, text)
select ps.org_id, ps.property_id, n.key, n.value
from property_state ps, lateral jsonb_each_text(ps.data) n(key, value)
where ps.layer = 'notes';

with src as (select org_id, property_id, data from property_state where layer = 'actions'),
custom as (
  select s.org_id, s.property_id, c.value as card, (c.ordinality - 1)::int as pos,
         c.value ->> 'id' as id
  from src s, jsonb_array_elements(s.data -> 'custom') with ordinality c),
ids as (
  select s.org_id, s.property_id, k as id from src s, jsonb_object_keys(s.data -> 'lane') k
  union select s.org_id, s.property_id, k from src s, jsonb_object_keys(s.data -> 'edit') k
  union select s.org_id, s.property_id, k from src s, jsonb_object_keys(s.data -> 'dismissed') k
  union select org_id, property_id, id from custom)
insert into board_state (org_id, property_id, card_id, lane, edit, dismissed, custom, pos)
select i.org_id, i.property_id, i.id,
       s.data -> 'lane' ->> i.id,
       s.data -> 'edit' -> i.id,
       coalesce((s.data -> 'dismissed' ->> i.id)::boolean, false),
       c.card, c.pos
from ids i
join src s on s.property_id = i.property_id
left join custom c on c.property_id = i.property_id and c.id = i.id;

with src as (select org_id, property_id, layer as collection, data
             from property_state where layer in ('contacts','documents')),
custom as (
  select s.org_id, s.property_id, s.collection, c.value as card,
         (c.ordinality - 1)::int as pos, c.value ->> 'id' as id
  from src s, jsonb_array_elements(s.data -> 'custom') with ordinality c),
ids as (
  select s.org_id, s.property_id, s.collection, k as id
    from src s, jsonb_object_keys(s.data -> 'edit') k
  union select s.org_id, s.property_id, s.collection, k
    from src s, jsonb_object_keys(s.data -> 'dismissed') k
  union select org_id, property_id, collection, id from custom)
insert into directory_state (org_id, property_id, collection, id, edit, dismissed, custom, pos)
select i.org_id, i.property_id, i.collection, i.id,
       s.data -> 'edit' -> i.id,
       coalesce((s.data -> 'dismissed' ->> i.id)::boolean, false),
       c.card, c.pos
from ids i
join src s on s.property_id = i.property_id and s.collection = i.collection
left join custom c on c.property_id = i.property_id and c.collection = i.collection and c.id = i.id;

insert into site_features (org_id, property_id, id, type, label, note, x, y, pos)
select ps.org_id, ps.property_id, f.value ->> 'id', f.value ->> 'type',
       coalesce(f.value ->> 'label', ''), coalesce(f.value ->> 'note', ''),
       (f.value ->> 'x')::numeric, (f.value ->> 'y')::numeric, (f.ordinality - 1)::int
from property_state ps, jsonb_array_elements(ps.data) with ordinality f
where ps.layer = 'features';

insert into camera_overrides (org_id, property_id, camera_id, x, y, aim_deg)
select ps.org_id, ps.property_id, c.key,
       (c.value ->> 'x')::numeric, (c.value ->> 'y')::numeric,
       (c.value ->> 'aimDeg')::numeric
from property_state ps, lateral jsonb_each(ps.data) c(key, value)
where ps.layer = 'cameras';

insert into layer_settings (org_id, property_id, key, data)
select org_id, property_id,
       case layer when 'ownerSheets' then 'owner_sheets' else 'financials' end, data
from property_state where layer in ('financials','ownerSheets');
