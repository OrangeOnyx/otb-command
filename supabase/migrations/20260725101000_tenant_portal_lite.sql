-- Tenant-portal-lite (belle-realty-pwa harvest #6, tenant-portal schema).
-- The donor portal's core reads, mapped onto the existing tenant role
-- (magic-link → tenant_contacts → unit-scoped M-1):
--   1) tenant reads their OWN unit's ledger trail (balance + history on M-1;
--      client math is the same pure fold operators use, src/lib/ledger.js).
-- Append-only invariants unchanged — tenants gain NO insert/update anywhere
-- on the ledger. Payments stay operator-logged (rent is all-electronic per
-- the A-4 SOP; A-5 Stripe ACH lands on this same read surface).

drop policy if exists "ledger read tenant own unit" on public.ledger_entries;
create policy "ledger read tenant own unit" on public.ledger_entries
  for select using (public.is_tenant() and unit = public.current_tenant_unit());
