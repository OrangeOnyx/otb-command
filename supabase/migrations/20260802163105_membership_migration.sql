-- Phase B merge-gate item (d): real users → org_members; membership becomes
-- the sole RLS authority. profiles.role remains ONLY as the sign-up landing +
-- client display mirror (kept in sync by handle_new_user / promote_authorized).

-- 1. Backfill existing users into org_members (idempotent; at merge time this
--    runs against prod profiles — operator org-wide, others property-scoped).
insert into org_members (org_id, user_id, property_id, role, capabilities, unit_scope)
select o.id, p.id,
       case when p.role = 'operator' then null else prop.id end,
       p.role,
       case p.role
         when 'operator' then array['view_financials','write_ledger','manage_members','manage_property']
         when 'owner' then array['view_financials']
         else '{}'::text[]
       end,
       case p.role
         when 'tenant' then coalesce((select t.unit from tenant_contacts t where t.email = lower(p.email) and t.active limit 1), '')
         when 'vendor' then coalesce((select v.id from vendors v where lower(v.email) = lower(p.email) and v.active limit 1), '')
         else ''
       end
from profiles p
cross join (select id from orgs where slug = 'orange-ocean') o
cross join (select id from properties where slug = 'otb') prop
where p.role in ('operator','owner','vendor','tenant')
on conflict do nothing;

-- 2. Sign-up trigger also creates the membership (new users are never
--    RLS-blind); role resolution order unchanged: vendor → tenant → allowlist.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text; v_org uuid; v_prop uuid; v_scope text;
begin
  select 'vendor', v.org_id, v.property_id, v.id into v_role, v_org, v_prop, v_scope
    from vendors v where v.email = lower(new.email) and v.active limit 1;
  if v_role is null then
    select 'tenant', t.org_id, t.property_id, t.unit into v_role, v_org, v_prop, v_scope
      from tenant_contacts t where t.email = lower(new.email) and t.active limit 1;
  end if;
  if v_role is null then
    select a.role, a.org_id,
           case when a.role = 'operator' then null else default_property_id() end, ''
      into v_role, v_org, v_prop, v_scope
      from authorized_emails a where a.email = lower(new.email) limit 1;
  end if;
  insert into public.profiles (id, email, role)
    values (new.id, new.email, coalesce(v_role, 'pending'))
    on conflict (id) do nothing;
  if v_role is not null then
    insert into org_members (org_id, user_id, property_id, role, capabilities, unit_scope)
    values (v_org, new.id, v_prop, v_role,
      case v_role when 'operator' then array['view_financials','write_ledger','manage_members','manage_property']
                  when 'owner' then array['view_financials'] else '{}'::text[] end,
      coalesce(v_scope, ''))
    on conflict do nothing;
  end if;
  return new;
end $$;

-- 3. Stuck-pending promotion (the trigger only fires at first sign-up):
--    operator authorizes an email after the user already signed in → this RPC
--    syncs profiles.role AND creates the membership. Client authorizeEmail
--    calls it; manage_members capability gates it.
create or replace function public.promote_authorized(p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_role text; v_org uuid;
begin
  if not member_can('manage_members', default_org_id(), default_property_id()) then
    raise exception 'unauthorized';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  select role, org_id into v_role, v_org from authorized_emails where email = lower(p_email);
  if v_uid is null or v_role is null then return false; end if;
  update profiles set role = v_role where id = v_uid and role = 'pending';
  insert into org_members (org_id, user_id, property_id, role, capabilities, unit_scope)
  values (coalesce(v_org, default_org_id()), v_uid,
          case when v_role = 'operator' then null else default_property_id() end, v_role,
          case v_role when 'operator' then array['view_financials','write_ledger','manage_members','manage_property']
                      when 'owner' then array['view_financials'] else '{}'::text[] end, '')
  on conflict do nothing;
  return true;
end $$;

-- 4. Operators manage memberships (member_can is SECURITY DEFINER — no
--    policy recursion on org_members).
create policy member_manage on org_members for all
  using (member_can('manage_members', org_id, coalesce(property_id, default_property_id())))
  with check (member_can('manage_members', org_id, coalesce(property_id, default_property_id())));

-- 5. DROP THE LEGACY LEG: member_role_in is membership-only from here.
create or replace function public.member_role_in(p_org uuid, p_prop uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.property_id is null or m.property_id = p_prop)
      and m.role = any (p_roles));
$$;

-- 6. Global helpers (api_usage + profiles admin policies) go membership-based:
--    "operator in any org" — refined per-org when multi-org administration lands.
create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where user_id = auth.uid() and role = 'operator');
$$;
create or replace function public.is_owner_or_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where user_id = auth.uid() and role in ('owner','operator'));
$$;

-- 7. Retire the unreferenced profiles-era zero-arg helpers.
drop function public.current_tenant_unit();
drop function public.current_vendor_id();
drop function public.is_tenant();
drop function public.is_vendor();

-- NOTE: step 4's member_manage policy is corrected in the follow-up
-- migration fix_membership_recursion (the coalesce(default_property_id())
-- call recursed through properties RLS).
