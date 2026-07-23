-- A-2 Maintenance requests with photos (final build plan §Phase A, 2026-07-23).
-- First tenant-facing surface. (org_id, property_id)-shaped from day one:
-- this schema IS the product's work-order module (OTB = tenant #1).
-- Pattern notes: requests are INSERT-only; every state change is an
-- append-only maintenance_events row (the compliance-event pattern) —
-- current status/vendor are DERIVED from the latest events, never mutated.

-- 1) role lattice: + 'tenant'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['operator','owner','vendor','tenant','pending']));

-- 2) tenant roster: email → unit (like vendors, a magic-link match assigns
--    the role at first sign-in; operator manages rows from the M-1 sheet)
create table if not exists public.tenant_contacts (
  email text primary key,
  unit text not null,
  name text not null default '',
  org_id text not null default 'belle',
  property_id text not null default 'otb',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.tenant_contacts enable row level security;

-- 3) role helpers
create or replace function public.is_tenant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'tenant');
$$;
create or replace function public.current_tenant_unit()
returns text language sql stable security definer set search_path = public as $$
  select t.unit from public.tenant_contacts t
  join public.profiles p on lower(p.email) = t.email
  where p.id = auth.uid() and t.active
  limit 1;
$$;

drop policy if exists "operator manages tenant contacts" on public.tenant_contacts;
create policy "operator manages tenant contacts" on public.tenant_contacts
  for all using (is_operator()) with check (is_operator());
drop policy if exists "tenant reads own row" on public.tenant_contacts;
create policy "tenant reads own row" on public.tenant_contacts
  for select using (exists (select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.email) = tenant_contacts.email));

-- 4) sign-in role resolution: vendor > tenant > allowlist > pending
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email,
    case
      when exists (select 1 from public.vendors v where v.email = lower(new.email) and v.active) then 'vendor'
      when exists (select 1 from public.tenant_contacts t where t.email = lower(new.email) and t.active) then 'tenant'
      when exists (select 1 from public.authorized_emails a where a.email = lower(new.email)) then
        (select a.role from public.authorized_emails a where a.email = lower(new.email))
      else 'pending'
    end)
  on conflict (id) do nothing;
  return new;
end; $$;

-- 5) requests: INSERT-only head rows (no update/delete policies exist)
create table if not exists public.maintenance_requests (
  id text primary key,
  org_id text not null default 'belle',
  property_id text not null default 'otb',
  unit text not null,
  title text not null,
  detail text not null default '',
  urgency text not null default 'routine' check (urgency in ('emergency','urgent','routine')),
  created_by text not null default '',
  created_at timestamptz not null default now()
);
alter table public.maintenance_requests enable row level security;

-- 6) append-only event trail: status flips, vendor assignments, notes
create table if not exists public.maintenance_events (
  id bigint generated always as identity primary key,
  request_id text not null references public.maintenance_requests(id),
  kind text not null check (kind in ('status','assign','note')),
  status text check (status in ('open','in_progress','done','closed')),
  vendor_id text,
  note text not null default '',
  actor text not null default '',
  created_at timestamptz not null default now(),
  constraint maintenance_events_shape check (
    (kind = 'status' and status is not null)
    or (kind = 'assign' and vendor_id is not null)
    or (kind = 'note' and note <> '')
  )
);
alter table public.maintenance_events enable row level security;
create index if not exists maintenance_events_by_request
  on public.maintenance_events (request_id, created_at desc, id desc);
create index if not exists maintenance_requests_recent
  on public.maintenance_requests (property_id, created_at desc);

-- a vendor may see a request that has EVER been assigned to them
create or replace function public.mr_visible_to_vendor(rid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.maintenance_events e
    where e.request_id = rid and e.kind = 'assign' and e.vendor_id = current_vendor_id());
$$;

-- requests policies
drop policy if exists "mr read owner/operator" on public.maintenance_requests;
create policy "mr read owner/operator" on public.maintenance_requests
  for select using (is_owner_or_operator());
drop policy if exists "mr read tenant own unit" on public.maintenance_requests;
create policy "mr read tenant own unit" on public.maintenance_requests
  for select using (unit = current_tenant_unit());
drop policy if exists "mr read vendor assigned" on public.maintenance_requests;
create policy "mr read vendor assigned" on public.maintenance_requests
  for select using (mr_visible_to_vendor(id));
drop policy if exists "mr insert operator" on public.maintenance_requests;
create policy "mr insert operator" on public.maintenance_requests
  for insert with check (is_operator());
drop policy if exists "mr insert tenant own unit" on public.maintenance_requests;
create policy "mr insert tenant own unit" on public.maintenance_requests
  for insert with check (
    is_tenant() and unit = current_tenant_unit()
    and created_by = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- events policies
drop policy if exists "me read owner/operator" on public.maintenance_events;
create policy "me read owner/operator" on public.maintenance_events
  for select using (is_owner_or_operator());
drop policy if exists "me read tenant own unit" on public.maintenance_events;
create policy "me read tenant own unit" on public.maintenance_events
  for select using (exists (select 1 from public.maintenance_requests r
    where r.id = maintenance_events.request_id and r.unit = current_tenant_unit()));
drop policy if exists "me read vendor assigned" on public.maintenance_events;
create policy "me read vendor assigned" on public.maintenance_events
  for select using (mr_visible_to_vendor(request_id));
drop policy if exists "me insert operator" on public.maintenance_events;
create policy "me insert operator" on public.maintenance_events
  for insert with check (is_operator());
drop policy if exists "me insert tenant note" on public.maintenance_events;
create policy "me insert tenant note" on public.maintenance_events
  for insert with check (
    is_tenant() and kind = 'note'
    and exists (select 1 from public.maintenance_requests r
      where r.id = request_id and r.unit = current_tenant_unit())
  );
drop policy if exists "me insert vendor note or done" on public.maintenance_events;
create policy "me insert vendor note or done" on public.maintenance_events
  for insert with check (
    is_vendor() and mr_visible_to_vendor(request_id)
    and (kind = 'note' or (kind = 'status' and status = 'done'))
  );
-- append-only by construction: no update/delete policies exist.

-- 7) maintenance-photos bucket: folder per request id
insert into storage.buckets (id, name, public)
  values ('maintenance-photos','maintenance-photos', false)
on conflict (id) do nothing;
drop policy if exists "operator all maintenance-photos" on storage.objects;
create policy "operator all maintenance-photos" on storage.objects for all
  using (bucket_id = 'maintenance-photos' and is_operator())
  with check (bucket_id = 'maintenance-photos' and is_operator());
drop policy if exists "owner read maintenance-photos" on storage.objects;
create policy "owner read maintenance-photos" on storage.objects for select
  using (bucket_id = 'maintenance-photos' and is_owner_or_operator());
drop policy if exists "tenant rw own request photos" on storage.objects;
create policy "tenant rw own request photos" on storage.objects for select
  using (bucket_id = 'maintenance-photos' and (storage.foldername(name))[1] in
    (select id from public.maintenance_requests where unit = current_tenant_unit()));
drop policy if exists "tenant upload own request photos" on storage.objects;
create policy "tenant upload own request photos" on storage.objects for insert
  with check (bucket_id = 'maintenance-photos' and (storage.foldername(name))[1] in
    (select id from public.maintenance_requests where unit = current_tenant_unit()));
drop policy if exists "vendor read assigned request photos" on storage.objects;
create policy "vendor read assigned request photos" on storage.objects for select
  using (bucket_id = 'maintenance-photos' and mr_visible_to_vendor((storage.foldername(name))[1]));

-- 8) cron read: open (not done/closed) requests w/ derived status + vendor,
--    same shared-secret gate as open_trigger_thread
create or replace function public.get_open_maintenance(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_out jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_out from (
    select r.id, r.unit, r.title, r.urgency, r.created_at,
      coalesce((select e.status from maintenance_events e
        where e.request_id = r.id and e.kind = 'status'
        order by e.created_at desc, e.id desc limit 1), 'open') as status,
      (select e.vendor_id from maintenance_events e
        where e.request_id = r.id and e.kind = 'assign'
        order by e.created_at desc, e.id desc limit 1) as vendor_id
    from maintenance_requests r
  ) x
  where x.status not in ('done','closed');
  return v_out;
end $$;
revoke all on function public.get_open_maintenance(text) from public;
grant execute on function public.get_open_maintenance(text) to anon, authenticated;
