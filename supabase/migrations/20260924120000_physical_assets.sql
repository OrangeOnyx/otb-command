-- Durable physical identity, separate model bindings and append-only evidence.
-- Prepared migration only: applying it is a separate deployment action.
begin;

create table public.physical_assets (
  id text primary key check (id ~* '^pa_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  org_id uuid not null references public.orgs(id),
  property_id uuid not null references public.properties(id),
  type text not null check (type in ('unit','column','hvac','light','meter','shutoff','drain','roof','camera','sign','walkway','other')),
  label text not null check (length(trim(label)) between 1 and 120),
  unit text,
  notes text not null default '' check (length(notes) <= 4000),
  material text not null default '' check (length(material) <= 160),
  dimensions jsonb not null default '{"unit":"m"}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  verification text not null default 'unverified' check (verification in ('unverified','field-verified')),
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, org_id, property_id)
);
create index physical_assets_property_type on public.physical_assets(property_id, type);

create table public.physical_asset_bindings (
  id text primary key,
  asset_id text not null,
  org_id uuid not null,
  property_id uuid not null,
  source_key text not null check (length(trim(source_key)) between 1 and 350),
  model_id text not null default '',
  model_version text not null,
  object_id text not null default '',
  source_guids jsonb not null default '[]'::jsonb check (jsonb_typeof(source_guids) = 'array'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (asset_id, org_id, property_id) references public.physical_assets(id, org_id, property_id),
  unique (property_id, source_key, model_version)
);
create index physical_asset_bindings_asset on public.physical_asset_bindings(asset_id, created_at);

create table public.physical_asset_inspections (
  id text primary key,
  asset_id text not null,
  org_id uuid not null,
  property_id uuid not null,
  date date not null,
  condition text not null default 'uninspected' check (condition in ('uninspected','good','monitor','repair','urgent')),
  notes text not null default '' check (length(notes) <= 6000),
  dimensions jsonb not null default '{"unit":"m"}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  material text not null default '' check (length(material) <= 160),
  inspector text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  foreign key (asset_id, org_id, property_id) references public.physical_assets(id, org_id, property_id),
  unique (id, asset_id, org_id, property_id)
);
create index physical_asset_inspections_asset on public.physical_asset_inspections(asset_id, date desc, created_at desc);

create table public.physical_asset_photos (
  id text primary key,
  asset_id text not null,
  inspection_id text,
  org_id uuid not null,
  property_id uuid not null,
  path text not null unique,
  name text not null,
  mime text not null check (mime in ('image/jpeg','image/png','image/webp','image/gif')),
  size bigint not null check (size > 0 and size <= 26214400),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = asset_id and array_length(string_to_array(path, '/'), 1) = 2),
  foreign key (asset_id, org_id, property_id) references public.physical_assets(id, org_id, property_id),
  foreign key (inspection_id, asset_id, org_id, property_id) references public.physical_asset_inspections(id, asset_id, org_id, property_id)
);
create index physical_asset_photos_asset on public.physical_asset_photos(asset_id, created_at desc);

-- Reject mixed org/property pairs and immutable-identity edits even if someone
-- writes directly through the API rather than this UI.
create function public.guard_physical_asset() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.properties p where p.id = new.property_id and p.org_id = new.org_id) then
    raise exception 'Physical asset property does not belong to this organization';
  end if;
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.org_id is distinct from old.org_id or new.property_id is distinct from old.property_id) then
    raise exception 'Physical asset identity and tenancy are immutable';
  end if;
  if tg_op = 'UPDATE' then new.created_at := old.created_at; else new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger physical_asset_guard before insert or update on public.physical_assets
  for each row execute function public.guard_physical_asset();

-- A revision may update a source association on the same physical record, but
-- cannot silently transfer that source object to a different record. Serialize
-- concurrent claims for the same property/source key before checking ownership.
create function public.guard_physical_source_owner() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.property_id::text || ':' || new.source_key, 0));
  if exists (select 1 from public.physical_asset_bindings b
    where b.property_id = new.property_id and b.source_key = new.source_key and b.asset_id <> new.asset_id) then
    raise exception 'Source object already belongs to another physical asset; choose an unclaimed replacement object';
  end if;
  return new;
end $$;
create trigger physical_source_owner_guard before insert on public.physical_asset_bindings
  for each row execute function public.guard_physical_source_owner();

create function public.stamp_physical_asset_evidence() returns trigger language plpgsql set search_path = public as $$
begin
  new.created_at := now();
  if tg_table_name in ('physical_asset_inspections', 'physical_asset_photos') then
    new.created_by := lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;
  return new;
end $$;
create trigger physical_asset_binding_stamp before insert on public.physical_asset_bindings for each row execute function public.stamp_physical_asset_evidence();
create trigger physical_asset_inspection_stamp before insert on public.physical_asset_inspections for each row execute function public.stamp_physical_asset_evidence();
create trigger physical_asset_photo_stamp before insert on public.physical_asset_photos for each row execute function public.stamp_physical_asset_evidence();

alter table public.physical_assets enable row level security;
alter table public.physical_asset_bindings enable row level security;
alter table public.physical_asset_inspections enable row level security;
alter table public.physical_asset_photos enable row level security;
create policy "physical assets read" on public.physical_assets for select to authenticated
  using (public.member_role_in(org_id, property_id, array['owner','operator']));
create policy "physical assets insert" on public.physical_assets for insert to authenticated
  with check (public.member_role_in(org_id, property_id, array['operator']));
create policy "physical assets update" on public.physical_assets for update to authenticated
  using (public.member_role_in(org_id, property_id, array['operator']))
  with check (public.member_role_in(org_id, property_id, array['operator']));

do $$ declare t text; begin
  foreach t in array array['physical_asset_bindings','physical_asset_inspections','physical_asset_photos'] loop
    execute format('create policy "asset evidence read" on public.%I for select to authenticated using (public.member_role_in(org_id, property_id, array[''owner'',''operator'']))', t);
    execute format('create policy "asset evidence insert" on public.%I for insert to authenticated with check (public.member_role_in(org_id, property_id, array[''operator'']))', t);
  end loop;
end $$;
revoke all on public.physical_assets, public.physical_asset_bindings, public.physical_asset_inspections, public.physical_asset_photos from anon;
grant select, insert, update on public.physical_assets to authenticated;
grant select, insert on public.physical_asset_bindings, public.physical_asset_inspections, public.physical_asset_photos to authenticated;
revoke delete on public.physical_assets from authenticated;
revoke update, delete on public.physical_asset_bindings, public.physical_asset_inspections, public.physical_asset_photos from authenticated;

-- Atomic promotion prevents an orphan/duplicate asset if two operators try to
-- register the same model source concurrently. INVOKER preserves all table RLS.
create function public.save_physical_asset_with_bindings(p_asset jsonb, p_bindings jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare a public.physical_assets; b public.physical_asset_bindings; saved_bindings jsonb := '[]'::jsonb; item jsonb;
begin
  a := jsonb_populate_record(null::public.physical_assets, p_asset);
  insert into public.physical_assets(id,org_id,property_id,type,label,unit,notes,material,dimensions,verification,status)
    values(a.id,a.org_id,a.property_id,a.type,a.label,a.unit,a.notes,a.material,a.dimensions,a.verification,a.status)
    on conflict(id) do update set type=excluded.type,label=excluded.label,unit=excluded.unit,
      notes=excluded.notes,material=excluded.material,dimensions=excluded.dimensions,
      verification=excluded.verification,status=excluded.status
    where physical_assets.org_id = excluded.org_id and physical_assets.property_id = excluded.property_id
    returning * into a;
  if a.id is null then raise exception 'Physical asset identity belongs to another property'; end if;
  for item in select * from jsonb_array_elements(p_bindings) loop
    b := jsonb_populate_record(null::public.physical_asset_bindings, item);
    if b.asset_id <> a.id or b.org_id <> a.org_id or b.property_id <> a.property_id then
      raise exception 'Source binding must belong to the saved asset and property';
    end if;
    insert into public.physical_asset_bindings(id,asset_id,org_id,property_id,source_key,model_id,model_version,object_id,source_guids,metadata)
      values(b.id,b.asset_id,b.org_id,b.property_id,b.source_key,b.model_id,b.model_version,b.object_id,b.source_guids,b.metadata)
      returning * into b;
    saved_bindings := saved_bindings || to_jsonb(b);
  end loop;
  return jsonb_build_object('asset',to_jsonb(a),'bindings',saved_bindings);
end $$;
revoke all on function public.save_physical_asset_with_bindings(jsonb,jsonb) from public;
grant execute on function public.save_physical_asset_with_bindings(jsonb,jsonb) to authenticated;

-- Existing assets bucket policies are a historical single-property bridge.
-- Reuse bucketstore code, but isolate these photos with actual asset membership.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('physical-asset-photos', 'physical-asset-photos', false, 26214400, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "physical photo read" on storage.objects for select to authenticated using (
  bucket_id = 'physical-asset-photos' and exists (select 1 from public.physical_assets a
    where a.id = (storage.foldername(name))[1] and public.member_role_in(a.org_id, a.property_id, array['owner','operator'])));
create policy "physical photo insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'physical-asset-photos' and exists (select 1 from public.physical_assets a
    where a.id = (storage.foldername(name))[1] and public.member_role_in(a.org_id, a.property_id, array['operator'])));
-- Only cleanup of a failed upload is exposed by the client; no evidence delete UI.
create policy "physical photo cleanup" on storage.objects for delete to authenticated using (
  bucket_id = 'physical-asset-photos' and not exists (select 1 from public.physical_asset_photos p where p.path = storage.objects.name)
  and exists (select 1 from public.physical_assets a where a.id = (storage.foldername(name))[1]
    and public.member_role_in(a.org_id, a.property_id, array['operator'])));
commit;
