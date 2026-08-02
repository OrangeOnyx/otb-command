-- PHASE B-1 step 2 (purge #1): every property-scoped row carries uuid
-- (org_id, property_id). Legacy text columns ('belle'/'otb') rename to
-- *_slug_legacy and drop in the code-port migration — the branch merges only
-- when app writers speak uuid, so nothing deployed ever sees the rename.
-- default_org_id()/default_property_id() are the SINGLE-TENANT BRIDGE: they
-- let un-ported RPC writers keep inserting correctly; they are dropped when
-- multi-property onboarding lands and writers must be explicit.

create or replace function public.default_org_id() returns uuid
language sql stable set search_path = public as
$$ select id from orgs order by created_at limit 1 $$;

create or replace function public.default_property_id() returns uuid
language sql stable set search_path = public as
$$ select id from properties order by created_at limit 1 $$;

-- rename legacy text columns out of the way
alter table compliance_events    rename column property_id to property_slug_legacy;
alter table ledger_entries       rename column property_id to property_slug_legacy;
alter table property_state       rename column property_id to property_slug_legacy;
alter table esign_requests       rename column property_id to property_slug_legacy;
alter table esign_requests       rename column org_id      to org_slug_legacy;
alter table maintenance_requests rename column property_id to property_slug_legacy;
alter table maintenance_requests rename column org_id      to org_slug_legacy;
alter table tenant_contacts      rename column property_id to property_slug_legacy;
alter table tenant_contacts      rename column org_id      to org_slug_legacy;

-- stamp all 17 property-scoped tables (defaults fill existing prod rows at
-- merge time with the sole org/property — exactly right for single-asset)
do $$
declare t text;
begin
  foreach t in array array[
    'chat_threads','chat_messages','compliance_events','esign_requests',
    'ledger_entries','maintenance_requests','maintenance_events',
    'occupancy_samples','owner_briefs','property_state','safe_log',
    'tenant_contacts','tour_bookings','vendor_log','vendors',
    'voice_calls','voice_settings']
  loop
    execute format(
      'alter table %I
         add column org_id uuid not null default public.default_org_id() references orgs(id),
         add column property_id uuid not null default public.default_property_id() references properties(id)', t);
    execute format('create index %I on %I (org_id, property_id)', t || '_tenancy_ix', t);
  end loop;
end $$;

-- invite gate becomes org-scoped (property-agnostic by design)
alter table authorized_emails
  add column org_id uuid not null default public.default_org_id() references orgs(id);

-- deliberately global: app_secrets · api_usage · profiles (profiles is
-- superseded by org_members at the RLS-rewrite step, not stamped)
