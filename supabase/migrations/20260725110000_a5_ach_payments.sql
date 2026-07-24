-- A-5 Stripe ACH groundwork (gate 3A, decided 2026-07-22; pairs with the
-- Aug 1 ledger go-live). The webhook (api/stripe-webhook.mjs) posts verified
-- payment_intent.succeeded events as ledger 'payment' rows through this
-- secret-gated RPC — same app_secrets 'auto_trigger' row and idempotency
-- discipline as post_rent_charges ('ach:<pi_id>' ids make Stripe's at-least-
-- once delivery a no-op). Tenants see the payment land on M-1 via the
-- tenant-portal-lite read policy; operators in the drawer ledger.

create or replace function public.post_ach_payments(p_secret text, p_entries jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_secret text; n integer;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  insert into ledger_entries (id, unit, type, code, amount, date, description, entered_by)
  select e->>'id', e->>'unit', 'payment', 'rent', (e->>'amount')::numeric,
         (e->>'date')::date, coalesce(e->>'description',''), 'stripe'
  from jsonb_array_elements(p_entries) e
  where (e->>'id') like 'ach:%' and (e->>'amount')::numeric > 0
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.post_ach_payments(text, jsonb) from public;
grant execute on function public.post_ach_payments(text, jsonb) to anon, authenticated;
