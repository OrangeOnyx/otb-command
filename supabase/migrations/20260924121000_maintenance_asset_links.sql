-- Optional physical-asset linkage on existing append-only work orders.
-- Requires 20260924120000_physical_assets.sql. Prepared only; not applied.
-- 2026-09-27: APPLIED to the isolated preview branch hefexnqkigirmzpmeggj (apply_migration) and
-- passed the 21-check RLS smoke (rolled back). Guard relaxed the same day (blank unit allowed;
-- column labels still rejected) and re-smoked on preview. NOT YET APPLIED ON PROD (kbhsghodquchkgfdzckc).
begin;

alter table public.maintenance_requests
  add column asset_id text,
  add column asset_label text,
  add column spatial_location jsonb,
  add constraint maintenance_asset_scope_fk foreign key (asset_id, org_id, property_id)
    references public.physical_assets(id, org_id, property_id),
  add constraint maintenance_asset_label_check check (
    asset_label is null or (asset_id is not null and length(asset_label) <= 160)),
  add constraint maintenance_spatial_location_check check (
    spatial_location is null or (jsonb_typeof(spatial_location) = 'object'
      and octet_length(spatial_location::text) <= 4000));
create index maintenance_requests_asset on public.maintenance_requests(property_id, asset_id)
  where asset_id is not null;

comment on column public.maintenance_requests.asset_id is 'Permanent physical asset identity; display/model labels never replace unit.';
comment on column public.maintenance_requests.asset_label is 'Asset label snapshot at request creation, not a current inspection finding.';
comment on column public.maintenance_requests.spatial_location is 'Optional source/model location reference; model coordinates are not surveyed positions or condition evidence.';

-- Validate the new relationship even for direct API inserts. Existing heads
-- remain untouched, and no update/delete policy is introduced.
create function public.guard_maintenance_asset_link() returns trigger
language plpgsql security invoker set search_path = public as $$
declare a public.physical_assets;
begin
  -- Blank units stay allowed (2026-09-27 operator ruling): the voice RPCs file
  -- p_unit as given, and a caller who cannot name a suite must still get a work
  -- order. The twin UI enforces a real suite client-side (maintenance-model.js).
  if trim(new.unit) ~* '^C[0-9]{1,3}$' then
    raise exception 'Choose a real suite or common-area, not a model column label';
  end if;
  if new.asset_id is not null then
    select * into a from public.physical_assets where id = new.asset_id
      and org_id = new.org_id and property_id = new.property_id;
    if not found or a.status <> 'active' then
      raise exception 'Linked physical asset must be active and belong to this property';
    end if;
    if (a.unit is null and new.unit <> 'common-area')
      or (a.unit is not null and new.unit <> a.unit) then
      raise exception 'Work order suite/common-area must match the physical asset';
    end if;
    new.asset_label := a.label;
  end if;
  return new;
end $$;
create trigger maintenance_asset_link_guard before insert on public.maintenance_requests
  for each row execute function public.guard_maintenance_asset_link();

-- Common-area requests and asset/spatial linkage are operator-created.
-- Existing owner read and assigned-vendor read/event/photo policies remain.
drop policy "mr insert tenant own unit" on public.maintenance_requests;
create policy "mr insert tenant own unit" on public.maintenance_requests for insert with check (
  public.member_role_in(org_id, property_id, array['tenant'])
  and unit <> 'common-area'
  and unit = public.current_tenant_unit(org_id, property_id)
  and asset_id is null and asset_label is null and spatial_location is null
  and created_by = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy "mr read tenant own unit" on public.maintenance_requests;
create policy "mr read tenant own unit" on public.maintenance_requests for select using (
  public.member_role_in(org_id, property_id, array['tenant'])
  and unit <> 'common-area' and unit = public.current_tenant_unit(org_id, property_id));

drop policy "me insert tenant note" on public.maintenance_events;
create policy "me insert tenant note" on public.maintenance_events for insert with check (
  public.member_role_in(org_id, property_id, array['tenant']) and kind = 'note'
  and exists (select 1 from public.maintenance_requests r
    where r.id = maintenance_events.request_id
      and r.org_id = maintenance_events.org_id and r.property_id = maintenance_events.property_id
      and r.unit <> 'common-area' and r.unit = public.current_tenant_unit(r.org_id, r.property_id)));
drop policy "me read tenant own unit" on public.maintenance_events;
create policy "me read tenant own unit" on public.maintenance_events for select using (
  public.member_role_in(org_id, property_id, array['tenant'])
  and exists (select 1 from public.maintenance_requests r
    where r.id = maintenance_events.request_id
      and r.org_id = maintenance_events.org_id and r.property_id = maintenance_events.property_id
      and r.unit <> 'common-area' and r.unit = public.current_tenant_unit(r.org_id, r.property_id)));

-- Retain request-id photo folders and the existing single-property bridge.
-- Explicitly exclude common areas even if a tenant contact is misconfigured.
alter policy "tenant rw own request photos" on storage.objects using (
  bucket_id = 'maintenance-photos'
  and public.member_role_in(public.default_org_id(), public.default_property_id(), array['tenant'])
  and (storage.foldername(name))[1] in (select r.id from public.maintenance_requests r
    where r.property_id = public.default_property_id() and r.unit <> 'common-area'
      and r.unit = public.current_tenant_unit(r.org_id, r.property_id)));
alter policy "tenant upload own request photos" on storage.objects with check (
  bucket_id = 'maintenance-photos'
  and public.member_role_in(public.default_org_id(), public.default_property_id(), array['tenant'])
  and (storage.foldername(name))[1] in (select r.id from public.maintenance_requests r
    where r.property_id = public.default_property_id() and r.unit <> 'common-area'
      and r.unit = public.current_tenant_unit(r.org_id, r.property_id)));

commit;
