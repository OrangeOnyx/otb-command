-- Phase B code-port migration: app writers speak uuid; legacy slug columns
-- retire; purge #2 (open_trigger_thread created_by from membership).

-- 1. property_state PK: legacy slug → uuid stamp (client upserts infer this PK)
alter table property_state drop constraint property_state_pkey;
alter table property_state add constraint property_state_pkey primary key (property_id, layer);

-- 2. drop the legacy slug columns
alter table compliance_events drop column property_slug_legacy;
alter table esign_requests drop column org_slug_legacy;
alter table esign_requests drop column property_slug_legacy;
alter table ledger_entries drop column property_slug_legacy;
alter table maintenance_requests drop column org_slug_legacy;
alter table maintenance_requests drop column property_slug_legacy;
alter table property_state drop column property_slug_legacy;
alter table tenant_contacts drop column org_slug_legacy;
alter table tenant_contacts drop column property_slug_legacy;

-- 3. voice_settings: exactly one row per property; readers use the stamp
create unique index voice_settings_property_uq on voice_settings (property_id);

-- 4. get_brief_state: read by uuid (was property_id = 'otb' text)
create or replace function public.get_brief_state(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  select coalesce(jsonb_object_agg(layer, data), '{}'::jsonb) into v
  from property_state where property_id = default_property_id() and layer in ('financials','actions');
  return v;
end $$;

-- 5. voice_tour_state: settings row + booked list scoped by the stamp
create or replace function public.voice_tour_state(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_secret text; v_out jsonb;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  select jsonb_build_object(
    'settings', (select to_jsonb(s) - 'updated_at' from voice_settings s where s.property_id = default_property_id()),
    'booked', coalesce((select jsonb_agg(b.slot_key) from tour_bookings b
                        where b.property_id = default_property_id()
                          and b.slot_key >= to_char(now() - interval '1 day', 'YYYY-MM-DD"T"HH24:MI')), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;

-- 6. purge #2: created_by from operator membership, not a literal email;
--    thread + first message carry explicit tenancy stamps
create or replace function public.open_trigger_thread(p_secret text, p_agent text, p_title text, p_trigger text, p_content text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_secret text; v_org uuid; v_prop uuid; v_by text;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  if p_agent not in ('concierge','leasing','manager') then
    raise exception 'unknown agent %', p_agent;
  end if;
  select id into v_id from chat_threads where trigger_source = p_trigger;
  if v_id is not null then
    return null; -- already opened once — idempotent skip
  end if;
  v_org := default_org_id(); v_prop := default_property_id();
  select u.email into v_by
    from org_members m join auth.users u on u.id = m.user_id
   where m.org_id = v_org and (m.property_id is null or m.property_id = v_prop)
     and m.role = 'operator'
   order by m.created_at limit 1;
  insert into chat_threads (agent, title, created_by, trigger_source, org_id, property_id)
    values (p_agent, left(p_title, 80), coalesce(v_by, ''), p_trigger, v_org, v_prop)
    returning id into v_id;
  insert into chat_messages (thread_id, role, content, org_id, property_id)
    values (v_id, 'assistant', p_content, v_org, v_prop);
  return v_id;
end $$;
