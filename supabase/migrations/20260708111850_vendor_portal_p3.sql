-- P3 Vendor Portal: vendor role + roster + sealed per-vendor doc storage.
-- Also closes a latent hole: new sign-ins used to default to role 'owner'.

-- 1) roles: allow 'vendor' + least-privilege 'pending'; new users are pending
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['operator','owner','vendor','pending']));
alter table public.profiles alter column role set default 'pending';

-- 2) vendor roster (seeded from the SOT "Vendor List" sheet; re-seed via
--    tools/extract-vendors.py). Email maps a magic-link login to its vendor row.
create table if not exists public.vendors (
  id text primary key,
  company text not null,
  email text unique,
  kind text not null default 'service' check (kind in ('service','payee','person')),
  contact text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.vendors enable row level security;

-- 3) role helpers
create or replace function public.is_vendor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'vendor');
$$;
create or replace function public.current_vendor_id()
returns text language sql stable security definer set search_path = public as $$
  select v.id from public.vendors v
  join public.profiles p on lower(p.email) = v.email
  where p.id = auth.uid() and v.active
  limit 1;
$$;

-- vendors table policies (create after helpers exist)
drop policy if exists "owner+operator read vendors" on public.vendors;
create policy "owner+operator read vendors" on public.vendors for select using (is_owner_or_operator());
drop policy if exists "vendor reads own row" on public.vendors;
create policy "vendor reads own row" on public.vendors for select using (id = current_vendor_id());
drop policy if exists "operator writes vendors" on public.vendors;
create policy "operator writes vendors" on public.vendors for all using (is_operator()) with check (is_operator());

-- 4) new sign-ins: vendor email -> vendor role; everyone else pending until
--    the operator promotes them (profiles.role default is now 'pending')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email,
    case when exists (select 1 from public.vendors v where v.email = lower(new.email) and v.active)
         then 'vendor' else 'pending' end)
  on conflict (id) do nothing;
  return new;
end; $$;

-- 5) vendor-docs bucket: operator manages all; a vendor sees + uploads ONLY
--    inside their own <vendor_id>/ folder
insert into storage.buckets (id, name, public) values ('vendor-docs','vendor-docs', false)
on conflict (id) do nothing;
drop policy if exists "operator all vendor-docs" on storage.objects;
create policy "operator all vendor-docs" on storage.objects for all
  using (bucket_id = 'vendor-docs' and is_operator())
  with check (bucket_id = 'vendor-docs' and is_operator());
drop policy if exists "vendor read own folder" on storage.objects;
create policy "vendor read own folder" on storage.objects for select
  using (bucket_id = 'vendor-docs' and (storage.foldername(name))[1] = current_vendor_id());
drop policy if exists "vendor upload own folder" on storage.objects;
create policy "vendor upload own folder" on storage.objects for insert
  with check (bucket_id = 'vendor-docs' and (storage.foldername(name))[1] = current_vendor_id());

-- 6) audit log (mirrors safe_log)
create table if not exists public.vendor_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email text not null default '',
  action text not null check (action in ('view','upload','delete')),
  path text not null
);
alter table public.vendor_log enable row level security;
drop policy if exists "operator read vendor log" on public.vendor_log;
create policy "operator read vendor log" on public.vendor_log for select using (is_operator());
drop policy if exists "participants insert vendor log" on public.vendor_log;
create policy "participants insert vendor log" on public.vendor_log for insert
  with check (is_owner_or_operator() or is_vendor());

-- 7) seal owner/operator surfaces away from the vendor + pending roles
--    (previously any authenticated user could read these)
drop policy if exists "authenticated read state" on public.property_state;
create policy "owner+operator read state" on public.property_state for select using (is_owner_or_operator());
drop policy if exists "auth read documents" on storage.objects;
create policy "owner+operator read documents" on storage.objects for select
  using (bucket_id = 'documents' and is_owner_or_operator());
drop policy if exists "auth read assets" on storage.objects;
create policy "owner+operator read assets" on storage.objects for select
  using (bucket_id = 'assets' and is_owner_or_operator());
