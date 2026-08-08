-- A-5 first-payment probe: secret-gated read of the earliest ach: ledger row
-- (null until the first electronic payment settles). The daily cron turns a
-- non-null result into ONE manager thread ('ach-first') — the smoke that
-- proves the payment rail announces itself. Same gate as every cron RPC.
create or replace function public.get_first_ach_payment(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  select jsonb_build_object('id', id, 'unit', unit, 'amount', amount, 'date', date)
    into v from ledger_entries where id like 'ach:%'
    order by created_at limit 1;
  return v;
end $$;
revoke all on function public.get_first_ach_payment(text) from public;
grant execute on function public.get_first_ach_payment(text) to anon, authenticated;
