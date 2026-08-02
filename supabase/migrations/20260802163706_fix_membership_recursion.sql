-- Assert-suite catch: member_manage called default_property_id() inside an
-- org_members policy; the non-definer default read properties under RLS →
-- prop_read read org_members → member_manage → default_property_id() → loop
-- (stack depth exceeded on any authenticated insert relying on the column
-- defaults). Two-sided fix:

-- 1. The single-tenant bridge lookups are infra config reads — SECURITY
--    DEFINER makes them deterministic everywhere (column defaults included)
--    and breaks the RLS cycle at its root.
alter function public.default_org_id() security definer;
alter function public.default_property_id() security definer;

-- 2. member_manage needs no default lookup: member_can's org-wide leg
--    (m.property_id is null) already grants org-wide managers access to
--    every row, including org-wide (null-property) membership rows.
drop policy member_manage on org_members;
create policy member_manage on org_members for all
  using (member_can('manage_members', org_id, property_id))
  with check (member_can('manage_members', org_id, property_id));
