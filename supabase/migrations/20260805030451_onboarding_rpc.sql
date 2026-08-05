-- C-1 onboarding rail (docs/phase-c/01): one secret-gated RPC = one property
-- onboarding. Additive + dormant — creates nothing until an operator runs a
-- real intake through tools/onboard-property.mjs. All-or-nothing: any raise
-- rolls the whole intake back. Org reused by slug; a duplicate property slug
-- under the org RAISES (never clobbers).
create or replace function public.onboard_property(p_secret text, p_intake jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_secret text; v_org uuid; v_prop uuid; v_n int := 0; r jsonb;
  v_org_slug text := p_intake->'org'->>'slug';
  v_prop_slug text := p_intake->'property'->>'slug';
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  if v_org_slug is null or v_prop_slug is null then raise exception 'intake missing org/property slug'; end if;

  select id into v_org from orgs where slug = v_org_slug;
  if v_org is null then
    insert into orgs (slug, name, brand)
    values (v_org_slug, p_intake->'org'->>'name',
            coalesce(p_intake->'org'->'brand', '{}'::jsonb))
    returning id into v_org;
  end if;

  if exists (select 1 from properties where org_id = v_org and slug = v_prop_slug) then
    raise exception 'property % already exists under org %', v_prop_slug, v_org_slug;
  end if;

  insert into properties (org_id, slug, name, address, tz, facts)
  values (v_org, v_prop_slug, p_intake->'property'->>'name',
          coalesce(p_intake->'property'->>'address', ''),
          coalesce(p_intake->'property'->>'tz', 'America/Chicago'),
          coalesce(p_intake->'property'->'facts', '[]'::jsonb))
  returning id into v_prop;

  insert into property_settings (property_id, ledger_start_ym, renewal_horizon_days,
                                 occupancy_floor, late_grace_days, late_flat, late_per_day, settings)
  values (v_prop,
          p_intake->'settings'->>'ledger_start_ym',
          coalesce((p_intake->'settings'->>'renewal_horizon_days')::int, 180),
          coalesce((p_intake->'settings'->>'occupancy_floor')::numeric, 0.85),
          coalesce((p_intake->'settings'->>'late_grace_days')::int, 5),
          coalesce((p_intake->'settings'->>'late_flat')::numeric, 100),
          coalesce((p_intake->'settings'->>'late_per_day')::numeric, 25),
          coalesce(p_intake->'settings'->'settings', '{}'::jsonb));

  for r in select * from jsonb_array_elements(coalesce(p_intake->'authorized', '[]'::jsonb)) loop
    if r->>'role' not in ('operator','owner','vendor','tenant') then
      raise exception 'bad role % for %', r->>'role', r->>'email';
    end if;
    insert into authorized_emails (email, role, added_by, org_id)
    values (lower(trim(r->>'email')), r->>'role', 'onboard:' || v_prop_slug, v_org)
    on conflict (email) do update set role = excluded.role, org_id = excluded.org_id;
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('org_id', v_org, 'property_id', v_prop, 'authorized', v_n);
end $$;
revoke all on function public.onboard_property(text, jsonb) from public;
grant execute on function public.onboard_property(text, jsonb) to anon, authenticated;
