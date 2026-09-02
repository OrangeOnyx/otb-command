-- access_assignment: operator assigns what an email IS (owner / vendor / tenant)
-- from the sidebar "Sign-in access…" panel; SOT write-back so a future fresh
-- sign-in self-resolves via handle_new_user, plus in-place promotion when the
-- user is already parked in 'pending'. Applied to prod 2026-09-01 via MCP
-- apply_migration (in server migration history). Smoked: gate raise without
-- claims · owner/tenant/vendor write-back bodies · bad-role + unknown-vendor
-- raises · dismiss refuses real members — all under rollback, 0 residue.

create or replace function public.assign_role(p_email text, p_role text, p_scope text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_uid uuid; v_org uuid; v_prop uuid;
begin
  if not member_can('manage_members', default_org_id(), default_property_id()) then
    raise exception 'unauthorized';
  end if;
  if p_role not in ('owner','vendor','tenant') then
    raise exception 'role must be owner, vendor, or tenant';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  v_org := default_org_id(); v_prop := default_property_id();

  -- SOT write-back: the durable fact lives where sign-up resolution reads it
  -- (vendors.email / tenant_contacts.email / authorized_emails) — a future
  -- fresh sign-in of this email resolves via handle_new_user with no operator step.
  if p_role = 'vendor' then
    if p_scope = '' then raise exception 'vendor assignment needs a vendor id'; end if;
    update vendors set email = null where email = v_email and id <> p_scope; -- email is UNIQUE
    update vendors set email = v_email, active = true where id = p_scope;
    if not found then raise exception 'unknown vendor %', p_scope; end if;
  elsif p_role = 'tenant' then
    if p_scope = '' then raise exception 'tenant assignment needs a unit'; end if;
    insert into tenant_contacts (email, unit, name, active, org_id, property_id)
    values (v_email, p_scope, '', true, v_org, v_prop)
    on conflict (email) do update set unit = excluded.unit, active = true;
  else
    insert into authorized_emails (email, role, added_by, org_id)
    values (v_email, 'owner', coalesce(auth.jwt() ->> 'email', ''), v_org)
    on conflict (email) do update set role = 'owner';
  end if;

  -- already signed in and parked in 'pending'? promote in place, properly scoped
  select id into v_uid from auth.users where lower(email) = v_email limit 1;
  if v_uid is null then return false; end if;
  update profiles set role = p_role where id = v_uid and role = 'pending';
  insert into org_members (org_id, user_id, property_id, role, capabilities, unit_scope)
  values (v_org, v_uid, v_prop, p_role,
          case p_role when 'owner' then array['view_financials'] else '{}'::text[] end,
          case p_role when 'owner' then '' else p_scope end)
  on conflict do nothing;
  return true;
end $$;

-- dismiss_pending: remove a stray sign-up entirely (pending + membership-less
-- only — can never touch a real member; auth.users delete cascades the profile).
create or replace function public.dismiss_pending(p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not member_can('manage_members', default_org_id(), default_property_id()) then
    raise exception 'unauthorized';
  end if;
  select u.id into v_uid from auth.users u
    join profiles p on p.id = u.id and p.role = 'pending'
    where lower(u.email) = lower(trim(p_email))
      and not exists (select 1 from org_members m where m.user_id = u.id)
    limit 1;
  if v_uid is null then return false; end if;
  delete from auth.users where id = v_uid;
  return true;
end $$;
