-- Phase B merge-gate item (e): full RLS assert suite — 5 personas (operator ·
-- owner · vendor · tenant · authenticated stranger) against the stamped
-- tables under membership-only RLS (17 Phase-B + 5 SOP + 7 AC-harvest +
-- governance_items = 30). Self-contained: seeds synthetic
-- auth.users (the on_auth_user_created trigger builds profiles+org_members),
-- asserts, then ABORTS via `SUITE_PASS_ROLLBACK` so nothing persists.
-- Expected outcome: the statement FAILS with message SUITE_PASS_ROLLBACK.
-- Any other error = a real assertion failure (message says which).
-- Run on the phase-b branch before merge, and re-run against prod AFTER
-- merge as the post-merge smoke (same expected outcome).
do $$
declare
  uid_op  uuid := gen_random_uuid();
  uid_own uuid := gen_random_uuid();
  uid_ven uuid := gen_random_uuid();
  uid_ten uuid := gen_random_uuid();
  uid_str uuid := gen_random_uuid();
  n int; v_thread uuid; v_sop_link text;
begin
  ------------------------------------------------------------------
  -- SETUP (privileged): role sources, then users (trigger fires), then data
  ------------------------------------------------------------------
  insert into vendors (id, company, kind, contact, email, active, coi_note)
    values ('smoke-vendor', 'Smoke Vendor Co', 'service', 'Smokey', 'smoke-vendor@example.com', true, '');
  insert into tenant_contacts (email, unit, name, active)
    values ('smoke-tenant@example.com', '131', 'Smoke Tenant', true);
  insert into authorized_emails (email, role)
    values ('smoke-op@example.com', 'operator'), ('smoke-owner@example.com', 'owner');

  insert into auth.users (id, email) values
    (uid_op,  'smoke-op@example.com'),
    (uid_own, 'smoke-owner@example.com'),
    (uid_ven, 'smoke-vendor@example.com'),
    (uid_ten, 'smoke-tenant@example.com'),
    (uid_str, 'smoke-stranger@example.com');

  -- trigger built memberships?
  select count(*) into n from org_members where user_id in (uid_op, uid_own, uid_ven, uid_ten);
  if n <> 4 then raise exception 'FAIL trigger memberships: got % of 4', n; end if;
  select count(*) into n from org_members where user_id = uid_str;
  if n <> 0 then raise exception 'FAIL stranger got a membership'; end if;
  if (select property_id from org_members where user_id = uid_op) is not null then
    raise exception 'FAIL operator membership should be org-wide'; end if;
  if (select unit_scope from org_members where user_id = uid_ten) <> '131' then
    raise exception 'FAIL tenant unit_scope'; end if;
  if (select unit_scope from org_members where user_id = uid_ven) <> 'smoke-vendor' then
    raise exception 'FAIL vendor unit_scope'; end if;

  -- typed layers (B-5): property_state must be GONE, the 7 typed tables
  -- published for realtime, and one representative row seeded in each
  select count(*) into n from information_schema.tables where table_name = 'property_state';
  if n <> 0 then raise exception 'FAIL property_state still exists'; end if;
  select count(*) into n from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename in
   ('comp_state','unit_notes','board_state','directory_state','site_features','camera_overrides','layer_settings');
  if n <> 7 then raise exception 'FAIL realtime publication: % of 7', n; end if;

  -- one representative row per stamped table (tenancy stamps via defaults)
  insert into comp_state (unit, field, state) values ('131', 'coi', 'flag')
    on conflict (property_id, unit, field) do update set state = 'flag';
  insert into unit_notes (unit, text) values ('131', 'suite note')
    on conflict (property_id, unit) do update set text = excluded.text; -- prod holds real notes now
  insert into board_state (card_id, lane) values ('smoke-card', 'action');
  insert into directory_state (collection, id, dismissed) values ('contacts', 'smoke-c', true);
  insert into site_features (id, type, x, y, pos) values ('sf-suite', 'shutoff', 10, 20, 99);
  insert into camera_overrides (camera_id, aim_deg) values ('cam-suite', 90);
  insert into layer_settings (key, data) values ('financials', '{"opex":{},"capRatePct":null}'::jsonb)
    on conflict (property_id, key) do update set data = excluded.data;
  insert into ledger_entries (id, unit, type, code, amount, date) values
    ('smoke:131', '131', 'charge', 'rent', 100, current_date),
    ('smoke:105', '105', 'charge', 'rent', 200, current_date);
  insert into maintenance_requests (id, unit, title, created_by)
    values ('mr-smoke', '131', 'Smoke MR', 'smoke-tenant@example.com');
  insert into maintenance_events (request_id, kind, vendor_id, actor)
    values ('mr-smoke', 'assign', 'smoke-vendor', 'suite');
  insert into esign_requests (id, unit, title, signer_email, expires_at)
    values ('es-smoke', '131', 'Smoke doc', 'smoke-tenant@example.com', now() + interval '7 days');
  insert into compliance_events (unit, field, old_state, new_state) values ('131', 'coi', 'na', 'ok');
  insert into occupancy_samples (frame, camera, stall, ts, state) values ('smoke-frame', 'cam', 's1', now(), 'occupied');
  insert into owner_briefs (month, html, model) values ('2026-07', '<p>smoke</p>', '{}'::jsonb)
    on conflict (month) do update set html = excluded.html; -- prod holds a real July brief now; rolled back regardless
  insert into chat_threads (agent, title, created_by) values ('manager', 'smoke thread', 'smoke-op@example.com')
    returning id into v_thread;
  insert into chat_messages (thread_id, role, content) values (v_thread, 'assistant', 'smoke');
  insert into tour_bookings (slot_key, name, phone) values ('2026-08-05T10:00', 'Smoke Lead', '3370000000');
  insert into voice_calls (call_sid, line) values ('CAsmoke', 'leasing');
  insert into safe_log (action, path) values ('view', 'smoke.pdf');
  insert into vendor_log (action, path) values ('upload', 'smoke-vendor/coi.pdf');
  -- SOP module (H1.3): representative rows across the 5 typed tables
  insert into sop_categories (id, name) values ('smoke-sop-cat', 'Smoke SOP Category');
  insert into sop_procedures (id, category_id, title, frequency)
    values ('smoke-sop-proc', 'smoke-sop-cat', 'Smoke Procedure', 'daily');
  insert into sop_steps (id, procedure_id, step_number, title)
    values ('smoke-sop-step', 'smoke-sop-proc', 1, 'Smoke step');
  insert into sop_assignments (id, procedure_id, due_on)
    values ('smoke-sop-asg', 'smoke-sop-proc', current_date);
  insert into sop_completions (id, procedure_id, assignment_id, completed_by)
    values ('smoke-sop-comp', 'smoke-sop-proc', 'smoke-sop-asg', 'smoke-op@example.com');
  -- AC harvest (2026-08-29): representative rows across the 7 new tables.
  -- payment_history / lease_abstracts / rent_escalation_ref are READ-ONLY
  -- landings (no client write policies); hvac_units/matters/comm_log/deals
  -- are content tier (operator write).
  insert into payment_history (id, unit, period, amount_due, amount_paid, status)
    values ('smoke-ph', '131', '2025-07', 100, 100, 'paid');
  insert into lease_abstracts (id, unit, commencement, expiration)
    values ('smoke-la', '131', '2024-01-01', '2029-01-01');
  insert into rent_escalation_ref (id, unit, abstract_id, effective_on, new_rent)
    values ('smoke-re', '131', 'smoke-la', '2027-01-01', 1234);
  insert into hvac_units (id, unit, unit_label, tenant, system_type)
    values ('smoke-hv', '131', '131', 'Smoke Tenant', 'PKG Unit');
  insert into matters (id, title, kind, status, next_deadline)
    values ('smoke-mt', 'Smoke Matter', 'zoning', 'open', current_date + 30);
  insert into comm_log (id, unit, matter_id, channel, summary)
    values ('smoke-cm', '131', 'smoke-mt', 'note', 'Smoke correspondence');
  insert into deals (id, prospect, target_unit, stage)
    values ('smoke-dl', 'Smoke Prospect', '131', 'inquiry');
  insert into governance_items (id, kind, title, entity, due_on)
    values ('smoke-gv', 'deadline', 'Smoke annual report', 'Belle Realty of Lafayette, LLC', current_date + 60);

  ------------------------------------------------------------------
  -- OPERATOR: sees everything; writes money + state
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_op::text, 'role', 'authenticated', 'email', 'smoke-op@example.com')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from ledger_entries;        if n < 2 then raise exception 'FAIL op ledger read %', n; end if;
  select count(*) into n from comp_state;            if n < 1 then raise exception 'FAIL op comp_state read'; end if;
  select count(*) into n from unit_notes;            if n < 1 then raise exception 'FAIL op unit_notes read'; end if;
  select count(*) into n from board_state;           if n < 1 then raise exception 'FAIL op board_state read'; end if;
  select count(*) into n from directory_state;       if n < 1 then raise exception 'FAIL op directory_state read'; end if;
  select count(*) into n from site_features;         if n < 1 then raise exception 'FAIL op site_features read'; end if;
  select count(*) into n from camera_overrides;      if n < 1 then raise exception 'FAIL op camera_overrides read'; end if;
  select count(*) into n from layer_settings;        if n < 1 then raise exception 'FAIL op layer_settings read'; end if;
  select count(*) into n from maintenance_requests;  if n < 1 then raise exception 'FAIL op mr read'; end if;
  select count(*) into n from maintenance_events;    if n < 1 then raise exception 'FAIL op me read'; end if;
  select count(*) into n from esign_requests;        if n < 1 then raise exception 'FAIL op esign read'; end if;
  select count(*) into n from compliance_events;     if n < 1 then raise exception 'FAIL op comp read'; end if;
  select count(*) into n from occupancy_samples;     if n < 1 then raise exception 'FAIL op occ read'; end if;
  select count(*) into n from owner_briefs;          if n < 1 then raise exception 'FAIL op brief read'; end if;
  select count(*) into n from chat_threads;          if n < 1 then raise exception 'FAIL op threads read'; end if;
  select count(*) into n from chat_messages;         if n < 1 then raise exception 'FAIL op messages read'; end if;
  select count(*) into n from tour_bookings;         if n < 1 then raise exception 'FAIL op tours read'; end if;
  select count(*) into n from voice_calls;           if n < 1 then raise exception 'FAIL op calls read'; end if;
  select count(*) into n from voice_settings;        if n < 1 then raise exception 'FAIL op vsettings read'; end if;
  select count(*) into n from safe_log;              if n < 1 then raise exception 'FAIL op safe read'; end if;
  select count(*) into n from vendor_log;            if n < 1 then raise exception 'FAIL op vlog read'; end if;
  select count(*) into n from vendors;               if n < 1 then raise exception 'FAIL op vendors read'; end if;
  select count(*) into n from tenant_contacts;       if n < 1 then raise exception 'FAIL op tcontacts read'; end if;
  select count(*) into n from sop_categories;        if n < 1 then raise exception 'FAIL op sop_categories read'; end if;
  select count(*) into n from sop_procedures;        if n < 1 then raise exception 'FAIL op sop_procedures read'; end if;
  select count(*) into n from sop_steps;             if n < 1 then raise exception 'FAIL op sop_steps read'; end if;
  select count(*) into n from sop_assignments;       if n < 1 then raise exception 'FAIL op sop_assignments read'; end if;
  select count(*) into n from sop_completions;       if n < 1 then raise exception 'FAIL op sop_completions read'; end if;
  select count(*) into n from payment_history;       if n < 1 then raise exception 'FAIL op payment_history read'; end if;
  select count(*) into n from lease_abstracts;       if n < 1 then raise exception 'FAIL op lease_abstracts read'; end if;
  select count(*) into n from rent_escalation_ref;   if n < 1 then raise exception 'FAIL op rent_escalation_ref read'; end if;
  select count(*) into n from hvac_units;            if n < 1 then raise exception 'FAIL op hvac_units read'; end if;
  select count(*) into n from matters;               if n < 1 then raise exception 'FAIL op matters read'; end if;
  select count(*) into n from comm_log;              if n < 1 then raise exception 'FAIL op comm_log read'; end if;
  select count(*) into n from deals;                 if n < 1 then raise exception 'FAIL op deals read'; end if;
  select count(*) into n from governance_items;      if n < 1 then raise exception 'FAIL op governance read'; end if;

  insert into ledger_entries (id, unit, type, code, amount, date)
    values ('smoke:op', '131', 'payment', 'rent', 100, current_date);
  insert into unit_notes (unit, text) values ('105', 'operator write')
    on conflict (property_id, unit) do update set text = excluded.text;
  update comp_state set state = 'ok' where unit = '131' and field = 'coi';
  delete from camera_overrides where camera_id = 'cam-suite'; -- operator delete allowed
  -- SOP: operator edits content, logs completions; the completion trail is
  -- append-only even for the operator (no update/delete policy → 0 rows hit)
  update sop_procedures set description = 'edited' where id = 'smoke-sop-proc';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL op sop_procedures update hit %', n; end if;
  insert into sop_completions (id, procedure_id, completed_by)
    values ('smoke-sop-comp-2', 'smoke-sop-proc', 'smoke-op@example.com');
  delete from sop_assignments where id = 'smoke-sop-asg'; -- occurrence hygiene allowed
  select assignment_id into strict v_sop_link from sop_completions where id = 'smoke-sop-comp';
  if v_sop_link is not null then raise exception 'FAIL sop completion link should set-null on occurrence delete'; end if;
  update sop_completions set notes = 'tamper' where id = 'smoke-sop-comp';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL op sop_completions update was allowed'; end if;
  delete from sop_completions where id = 'smoke-sop-comp';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL op sop_completions delete was allowed'; end if;
  -- AC harvest: the archival landings are read-only EVEN for the operator
  -- (no write policies — imports run privileged); content-tier tables accept
  -- operator writes.
  update payment_history set notes = 'tamper' where id = 'smoke-ph';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL op payment_history update was allowed'; end if;
  delete from lease_abstracts where id = 'smoke-la';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL op lease_abstracts delete was allowed'; end if;
  update hvac_units set tenant = 'edited' where id = 'smoke-hv';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL op hvac_units update hit %', n; end if;
  update matters set status = 'monitoring' where id = 'smoke-mt';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL op matters update hit %', n; end if;
  insert into comm_log (id, unit, channel, summary)
    values ('smoke-cm-2', '131', 'meeting', 'Operator meeting note');
  update deals set stage = 'tour' where id = 'smoke-dl';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL op deals update hit %', n; end if;
  update governance_items set status = 'satisfied' where id = 'smoke-gv';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL op governance update hit %', n; end if;
  execute 'reset role';

  ------------------------------------------------------------------
  -- OWNER: reads the owner surface; money writes blocked; safe_log
  -- insert allowed but read-back operator-only
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_own::text, 'role', 'authenticated', 'email', 'smoke-owner@example.com')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from ledger_entries;     if n < 3 then raise exception 'FAIL owner ledger read %', n; end if;
  select count(*) into n from comp_state;         if n < 1 then raise exception 'FAIL owner comp_state read'; end if;
  select count(*) into n from unit_notes;         if n < 2 then raise exception 'FAIL owner unit_notes read %', n; end if;
  select count(*) into n from board_state;        if n < 1 then raise exception 'FAIL owner board_state read'; end if;
  select count(*) into n from directory_state;    if n < 1 then raise exception 'FAIL owner directory_state read'; end if;
  select count(*) into n from site_features;      if n < 1 then raise exception 'FAIL owner site_features read'; end if;
  select count(*) into n from layer_settings;     if n < 1 then raise exception 'FAIL owner layer_settings read'; end if;
  select count(*) into n from owner_briefs;       if n < 1 then raise exception 'FAIL owner brief read'; end if;
  select count(*) into n from occupancy_samples;  if n < 1 then raise exception 'FAIL owner occ read'; end if;
  select count(*) into n from vendors;            if n < 1 then raise exception 'FAIL owner vendors read'; end if;
  select count(*) into n from sop_procedures;     if n < 1 then raise exception 'FAIL owner sop read'; end if;
  select count(*) into n from sop_completions;    if n < 1 then raise exception 'FAIL owner sop completions read'; end if;
  begin
    insert into sop_completions (id, procedure_id, completed_by)
      values ('smoke-sop-owner', 'smoke-sop-proc', 'smoke-owner@example.com');
    raise exception 'FAIL owner sop completion insert was allowed';
  exception when insufficient_privilege then null; end;
  update sop_procedures set description = 'owner edit' where id = 'smoke-sop-proc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL owner sop_procedures update was allowed'; end if;
  begin
    insert into ledger_entries (id, unit, type, date) values ('smoke:bad', '131', 'charge', current_date);
    raise exception 'FAIL owner ledger insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into unit_notes (unit, text) values ('149', 'owner write');
    raise exception 'FAIL owner unit_notes insert was allowed';
  exception when insufficient_privilege then null; end;
  update comp_state set state = 'na' where unit = '131' and field = 'coi';
  get diagnostics n = row_count; -- owner sees the row; RLS update must hit 0
  if n <> 0 then raise exception 'FAIL owner comp_state update was allowed'; end if;
  -- AC harvest + governance: owner reads, never writes
  select count(*) into n from payment_history;    if n < 1 then raise exception 'FAIL owner payment_history read'; end if;
  select count(*) into n from lease_abstracts;    if n < 1 then raise exception 'FAIL owner lease_abstracts read'; end if;
  select count(*) into n from hvac_units;         if n < 1 then raise exception 'FAIL owner hvac_units read'; end if;
  select count(*) into n from matters;            if n < 1 then raise exception 'FAIL owner matters read'; end if;
  select count(*) into n from comm_log;           if n < 1 then raise exception 'FAIL owner comm_log read'; end if;
  select count(*) into n from deals;              if n < 1 then raise exception 'FAIL owner deals read'; end if;
  select count(*) into n from governance_items;   if n < 1 then raise exception 'FAIL owner governance read'; end if;
  begin
    insert into comm_log (id, channel, summary) values ('smoke-cm-owner', 'note', 'owner write');
    raise exception 'FAIL owner comm_log insert was allowed';
  exception when insufficient_privilege then null; end;
  update matters set status = 'closed' where id = 'smoke-mt';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL owner matters update was allowed'; end if;
  update deals set stage = 'lost' where id = 'smoke-dl';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL owner deals update was allowed'; end if;
  update governance_items set status = 'waived' where id = 'smoke-gv';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL owner governance update was allowed'; end if;
  insert into safe_log (action, path) values ('view', 'owner-smoke.pdf'); -- allowed
  select count(*) into n from safe_log;      if n <> 0 then raise exception 'FAIL owner safe read should be blind, got %', n; end if;
  select count(*) into n from vendor_log;    if n <> 0 then raise exception 'FAIL owner vlog read should be blind'; end if;
  select count(*) into n from tenant_contacts; if n <> 0 then raise exception 'FAIL owner tcontacts should be blind'; end if;
  execute 'reset role';

  ------------------------------------------------------------------
  -- TENANT: own-unit scope only; the 105 entry must be invisible
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_ten::text, 'role', 'authenticated', 'email', 'smoke-tenant@example.com')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from ledger_entries where unit = '105';
  if n <> 0 then raise exception 'FAIL tenant sees unit 105 ledger'; end if;
  select count(*) into n from ledger_entries where unit = '131';
  if n < 1 then raise exception 'FAIL tenant blind to own ledger'; end if;
  select count(*) into n from maintenance_requests; if n < 1 then raise exception 'FAIL tenant mr read'; end if;
  select count(*) into n from tenant_contacts;      if n <> 1 then raise exception 'FAIL tenant tcontacts self-read %', n; end if;
  select (select count(*) from comp_state) + (select count(*) from unit_notes)
       + (select count(*) from board_state) + (select count(*) from directory_state)
       + (select count(*) from site_features) + (select count(*) from camera_overrides)
       + (select count(*) from layer_settings) into n;
  if n <> 0 then raise exception 'FAIL tenant sees typed layers (%)', n; end if;
  select (select count(*) from sop_categories) + (select count(*) from sop_procedures)
       + (select count(*) from sop_steps) + (select count(*) from sop_assignments)
       + (select count(*) from sop_completions) into n;
  if n <> 0 then raise exception 'FAIL tenant sees sop tables (%)', n; end if;
  select (select count(*) from payment_history) + (select count(*) from lease_abstracts)
       + (select count(*) from rent_escalation_ref) + (select count(*) from hvac_units)
       + (select count(*) from matters) + (select count(*) from comm_log)
       + (select count(*) from deals) + (select count(*) from governance_items) into n;
  if n <> 0 then raise exception 'FAIL tenant sees harvest tables (%)', n; end if;
  select count(*) into n from vendors;              if n <> 0 then raise exception 'FAIL tenant sees vendors'; end if;
  select count(*) into n from esign_requests;       if n <> 0 then raise exception 'FAIL tenant sees esign'; end if;
  insert into maintenance_requests (id, unit, title, created_by)
    values ('mr-smoke-2', '131', 'Tenant filed', 'smoke-tenant@example.com'); -- allowed, own unit
  begin
    insert into maintenance_requests (id, unit, title, created_by)
      values ('mr-smoke-3', '105', 'Wrong unit', 'smoke-tenant@example.com');
    raise exception 'FAIL tenant filed for another unit';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  ------------------------------------------------------------------
  -- VENDOR: assigned work orders + own vendor row; money blind
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_ven::text, 'role', 'authenticated', 'email', 'smoke-vendor@example.com')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from maintenance_requests where id = 'mr-smoke';
  if n <> 1 then raise exception 'FAIL vendor blind to assigned mr'; end if;
  select count(*) into n from maintenance_requests where id = 'mr-smoke-2';
  if n <> 0 then raise exception 'FAIL vendor sees unassigned mr'; end if;
  select count(*) into n from vendors; if n <> 1 then raise exception 'FAIL vendor own-row read %', n; end if;
  select count(*) into n from ledger_entries;   if n <> 0 then raise exception 'FAIL vendor sees ledger'; end if;
  select (select count(*) from comp_state) + (select count(*) from unit_notes)
       + (select count(*) from board_state) + (select count(*) from directory_state)
       + (select count(*) from site_features) + (select count(*) from camera_overrides)
       + (select count(*) from layer_settings) into n;
  if n <> 0 then raise exception 'FAIL vendor sees typed layers (%)', n; end if;
  select (select count(*) from sop_categories) + (select count(*) from sop_procedures)
       + (select count(*) from sop_steps) + (select count(*) from sop_assignments)
       + (select count(*) from sop_completions) into n;
  if n <> 0 then raise exception 'FAIL vendor sees sop tables (%)', n; end if;
  select (select count(*) from payment_history) + (select count(*) from lease_abstracts)
       + (select count(*) from rent_escalation_ref) + (select count(*) from hvac_units)
       + (select count(*) from matters) + (select count(*) from comm_log)
       + (select count(*) from deals) + (select count(*) from governance_items) into n;
  if n <> 0 then raise exception 'FAIL vendor sees harvest tables (%)', n; end if;
  insert into maintenance_events (request_id, kind, status, actor)
    values ('mr-smoke', 'status', 'done', 'smoke-vendor@example.com'); -- allowed: assigned + done
  begin
    insert into maintenance_events (request_id, kind, status, actor)
      values ('mr-smoke-2', 'status', 'done', 'smoke-vendor@example.com');
    raise exception 'FAIL vendor wrote to unassigned mr';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  ------------------------------------------------------------------
  -- STRANGER (authenticated, zero memberships): blind + write-blocked
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_str::text, 'role', 'authenticated', 'email', 'smoke-stranger@example.com')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from ledger_entries;       if n <> 0 then raise exception 'FAIL stranger ledger'; end if;
  select (select count(*) from comp_state) + (select count(*) from unit_notes)
       + (select count(*) from board_state) + (select count(*) from directory_state)
       + (select count(*) from site_features) + (select count(*) from camera_overrides)
       + (select count(*) from layer_settings) into n;
  if n <> 0 then raise exception 'FAIL stranger sees typed layers (%)', n; end if;
  select (select count(*) from sop_categories) + (select count(*) from sop_procedures)
       + (select count(*) from sop_steps) + (select count(*) from sop_assignments)
       + (select count(*) from sop_completions) into n;
  if n <> 0 then raise exception 'FAIL stranger sees sop tables (%)', n; end if;
  select (select count(*) from payment_history) + (select count(*) from lease_abstracts)
       + (select count(*) from rent_escalation_ref) + (select count(*) from hvac_units)
       + (select count(*) from matters) + (select count(*) from comm_log)
       + (select count(*) from deals) + (select count(*) from governance_items) into n;
  if n <> 0 then raise exception 'FAIL stranger sees harvest tables (%)', n; end if;
  select count(*) into n from maintenance_requests; if n <> 0 then raise exception 'FAIL stranger mr'; end if;
  select count(*) into n from vendors;              if n <> 0 then raise exception 'FAIL stranger vendors'; end if;
  select count(*) into n from tenant_contacts;      if n <> 0 then raise exception 'FAIL stranger tcontacts'; end if;
  select count(*) into n from chat_threads;         if n <> 0 then raise exception 'FAIL stranger threads'; end if;
  select count(*) into n from safe_log;             if n <> 0 then raise exception 'FAIL stranger safe'; end if;
  select count(*) into n from occupancy_samples;    if n <> 0 then raise exception 'FAIL stranger occ'; end if;
  select count(*) into n from org_members;          if n <> 0 then raise exception 'FAIL stranger org_members'; end if;
  begin
    insert into ledger_entries (id, unit, type, date) values ('smoke:str', '131', 'charge', current_date);
    raise exception 'FAIL stranger ledger insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into unit_notes (unit, text) values ('105', 'stranger write');
    raise exception 'FAIL stranger unit_notes insert allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise exception 'SUITE_PASS_ROLLBACK';
end $$;
