-- STATUS: NOT YET APPLIED ON PROD (apply_migration blocked 2026-09-23) — operator: paste this file into the Supabase SQL editor for kbhsghodquchkgfdzckc.
-- 2026-09-23 main-line router: the published office number (337-769-1554)
-- forwards onto the tenant Twilio line, which now takes leasing calls too.
-- Those calls persist as line='tenant' (voice_calls.line CHECK is still
-- tenant|leasing), so the unbooked-lead sweep must also pick up any call the
-- finalize summary classified as intent='leasing'. Body otherwise unchanged
-- from 20260801090000_unbooked_voice_leads.sql.
create or replace function public.get_unbooked_voice_leads(p_secret text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'unauthorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'call_sid', vc.call_sid, 'caller', vc.caller, 'started_at', vc.started_at)
      order by vc.started_at)
    from voice_calls vc
    where (vc.line = 'leasing' or vc.intent = 'leasing')
      and vc.started_at > now() - interval '14 days'
      and not exists (select 1 from tour_bookings tb where tb.call_sid = vc.call_sid)
  ), '[]'::jsonb);
end $$;

revoke all on function public.get_unbooked_voice_leads(text) from public;
grant execute on function public.get_unbooked_voice_leads(text) to anon, authenticated;
