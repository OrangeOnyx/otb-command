-- PHASE B-1 step 3: RLS ported to membership. Policies reach FINAL scoped
-- form (row org_id/property_id) in one pass; the profiles→org_members
-- transition is confined to member_role_in()'s legacy leg (dropped in a
-- later "drop-legacy" migration once users are migrated). Zero-arg helpers
-- (is_operator & co.) are kept — storage.objects policies still use them
-- until the storage port.

-- scoped membership primitive (legacy profiles leg = transition bridge)
create or replace function public.member_role_in(p_org uuid, p_prop uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.property_id is null or m.property_id = p_prop)
      and m.role = any (p_roles))
  or exists (
    select 1 from profiles where id = auth.uid() and role = any (p_roles));
$$;

-- property-aware resolvers (zero-arg versions kept for storage; these
-- overloads prevent cross-property unit/vendor collisions)
create or replace function public.current_tenant_unit(p_org uuid, p_prop uuid)
returns text language sql stable security definer set search_path = public as $$
  select t.unit from tenant_contacts t
  join profiles p on lower(p.email) = t.email
  where p.id = auth.uid() and t.active
    and t.org_id = p_org and t.property_id = p_prop
  limit 1;
$$;

create or replace function public.current_vendor_id(p_org uuid, p_prop uuid)
returns text language sql stable security definer set search_path = public as $$
  select v.id from vendors v
  join profiles p on lower(p.email) = v.email
  where p.id = auth.uid() and v.active
    and v.org_id = p_org and v.property_id = p_prop
  limit 1;
$$;

-- request visibility + thread ownership become scope-aware internally
-- (signatures unchanged, so their policies need no edits)
create or replace function public.mr_visible_to_vendor(rid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from maintenance_events e
    join maintenance_requests r on r.id = e.request_id
    where e.request_id = rid and e.kind = 'assign'
      and e.vendor_id = public.current_vendor_id(r.org_id, r.property_id));
$$;

create or replace function public.owns_thread(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_threads ct
    join profiles p on p.id = auth.uid()
    where ct.id = t
      and (ct.created_by = p.email
           or public.member_role_in(ct.org_id, ct.property_id, array['operator'])));
$$;

-- ---- policy rewrites (drop + recreate, explicit) ----

-- chat_threads
drop policy "insert own threads" on chat_threads;
create policy "insert own threads" on chat_threads for insert with check (
  member_role_in(org_id, property_id, array['owner','operator'])
  and created_by = (select email from profiles where id = auth.uid()));
drop policy "read own threads or operator" on chat_threads;
create policy "read own threads or operator" on chat_threads for select using (
  member_role_in(org_id, property_id, array['operator'])
  or (member_role_in(org_id, property_id, array['owner','operator'])
      and created_by = (select email from profiles where id = auth.uid())));
drop policy "operator delete threads" on chat_threads;
create policy "operator delete threads" on chat_threads for delete using (
  member_role_in(org_id, property_id, array['operator']));

-- chat_messages ("insert/read own threads" ride the owns_thread redefinition)
drop policy "operator delete messages" on chat_messages;
create policy "operator delete messages" on chat_messages for delete using (
  member_role_in(org_id, property_id, array['operator']));

-- compliance_events
drop policy "compliance_events insert operator" on compliance_events;
create policy "compliance_events insert operator" on compliance_events for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "compliance_events read owner/operator" on compliance_events;
create policy "compliance_events read owner/operator" on compliance_events for select using (
  member_role_in(org_id, property_id, array['owner','operator']));

-- esign_requests
drop policy "esign insert operator" on esign_requests;
create policy "esign insert operator" on esign_requests for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "esign read owner/operator" on esign_requests;
create policy "esign read owner/operator" on esign_requests for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "esign update operator" on esign_requests;
create policy "esign update operator" on esign_requests for update
  using (member_role_in(org_id, property_id, array['operator']))
  with check (member_role_in(org_id, property_id, array['operator']));

-- ledger_entries
drop policy "ledger insert operator" on ledger_entries;
create policy "ledger insert operator" on ledger_entries for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "ledger read owner/operator" on ledger_entries;
create policy "ledger read owner/operator" on ledger_entries for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "ledger read tenant own unit" on ledger_entries;
create policy "ledger read tenant own unit" on ledger_entries for select using (
  member_role_in(org_id, property_id, array['tenant'])
  and unit = current_tenant_unit(org_id, property_id));

-- maintenance_requests
drop policy "mr insert operator" on maintenance_requests;
create policy "mr insert operator" on maintenance_requests for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "mr insert tenant own unit" on maintenance_requests;
create policy "mr insert tenant own unit" on maintenance_requests for insert with check (
  member_role_in(org_id, property_id, array['tenant'])
  and unit = current_tenant_unit(org_id, property_id)
  and created_by = lower(coalesce((auth.jwt() ->> 'email'), '')));
drop policy "mr read owner/operator" on maintenance_requests;
create policy "mr read owner/operator" on maintenance_requests for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "mr read tenant own unit" on maintenance_requests;
create policy "mr read tenant own unit" on maintenance_requests for select using (
  unit = current_tenant_unit(org_id, property_id));
-- "mr read vendor assigned" rides mr_visible_to_vendor redefinition

-- maintenance_events
drop policy "me insert operator" on maintenance_events;
create policy "me insert operator" on maintenance_events for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "me insert tenant note" on maintenance_events;
create policy "me insert tenant note" on maintenance_events for insert with check (
  member_role_in(org_id, property_id, array['tenant'])
  and kind = 'note'
  and exists (select 1 from maintenance_requests r
              where r.id = maintenance_events.request_id
                and r.unit = current_tenant_unit(r.org_id, r.property_id)));
drop policy "me insert vendor note or done" on maintenance_events;
create policy "me insert vendor note or done" on maintenance_events for insert with check (
  member_role_in(org_id, property_id, array['vendor'])
  and mr_visible_to_vendor(request_id)
  and (kind = 'note' or (kind = 'status' and status = 'done')));
drop policy "me read owner/operator" on maintenance_events;
create policy "me read owner/operator" on maintenance_events for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "me read tenant own unit" on maintenance_events;
create policy "me read tenant own unit" on maintenance_events for select using (
  exists (select 1 from maintenance_requests r
          where r.id = maintenance_events.request_id
            and r.unit = current_tenant_unit(r.org_id, r.property_id)));
-- "me read vendor assigned" rides mr_visible_to_vendor redefinition

-- occupancy_samples / owner_briefs / tour_bookings / voice_calls / voice_settings
drop policy "occupancy read owner/operator" on occupancy_samples;
create policy "occupancy read owner/operator" on occupancy_samples for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "owner_briefs_read" on owner_briefs;
create policy "owner_briefs_read" on owner_briefs for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "tb read owner/operator" on tour_bookings;
create policy "tb read owner/operator" on tour_bookings for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "tb operator delete" on tour_bookings;
create policy "tb operator delete" on tour_bookings for delete using (
  member_role_in(org_id, property_id, array['operator']));
drop policy "vc read owner/operator" on voice_calls;
create policy "vc read owner/operator" on voice_calls for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "vs read owner/operator" on voice_settings;
create policy "vs read owner/operator" on voice_settings for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "vs operator write" on voice_settings;
create policy "vs operator write" on voice_settings for update
  using (member_role_in(org_id, property_id, array['operator']))
  with check (member_role_in(org_id, property_id, array['operator']));

-- property_state
drop policy "operator delete state" on property_state;
create policy "operator delete state" on property_state for delete using (
  member_role_in(org_id, property_id, array['operator']));
drop policy "operator insert state" on property_state;
create policy "operator insert state" on property_state for insert with check (
  member_role_in(org_id, property_id, array['operator']));
drop policy "operator update state" on property_state;
create policy "operator update state" on property_state for update
  using (member_role_in(org_id, property_id, array['operator']))
  with check (member_role_in(org_id, property_id, array['operator']));
drop policy "owner+operator read state" on property_state;
create policy "owner+operator read state" on property_state for select using (
  member_role_in(org_id, property_id, array['owner','operator']));

-- safe_log
drop policy "operator read log" on safe_log;
create policy "operator read log" on safe_log for select using (
  member_role_in(org_id, property_id, array['operator']));
drop policy "owner+operator insert own log" on safe_log;
create policy "owner+operator insert own log" on safe_log for insert with check (
  member_role_in(org_id, property_id, array['owner','operator']));

-- tenant_contacts ("tenant reads own row" is email-keyed, inherently safe)
drop policy "operator manages tenant contacts" on tenant_contacts;
create policy "operator manages tenant contacts" on tenant_contacts for all
  using (member_role_in(org_id, property_id, array['operator']))
  with check (member_role_in(org_id, property_id, array['operator']));

-- vendor_log
drop policy "operator read vendor log" on vendor_log;
create policy "operator read vendor log" on vendor_log for select using (
  member_role_in(org_id, property_id, array['operator']));
drop policy "participants insert vendor log" on vendor_log;
create policy "participants insert vendor log" on vendor_log for insert with check (
  member_role_in(org_id, property_id, array['owner','operator','vendor']));

-- vendors
drop policy "operator writes vendors" on vendors;
create policy "operator writes vendors" on vendors for all
  using (member_role_in(org_id, property_id, array['operator']))
  with check (member_role_in(org_id, property_id, array['operator']));
drop policy "owner+operator read vendors" on vendors;
create policy "owner+operator read vendors" on vendors for select using (
  member_role_in(org_id, property_id, array['owner','operator']));
drop policy "vendor reads own row" on vendors;
create policy "vendor reads own row" on vendors for select using (
  id = current_vendor_id(org_id, property_id));

-- authorized_emails (org-scoped: org-wide operators manage invites)
drop policy "operator manages authorized emails" on authorized_emails;
create policy "operator manages authorized emails" on authorized_emails for all
  using (member_role_in(org_id, null, array['operator']))
  with check (member_role_in(org_id, null, array['operator']));

-- api_usage stays on legacy is_operator() — global table, no org column
