-- Queue #2 unbooked-lead cron (2026-08-01): leasing voice_calls from the last
-- 14 days that never produced a tour_bookings row. Fed to voiceLeadCandidates
-- by the daily auto-trigger cron; threads are idempotent by voice-lead:<sid>.
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
    where vc.line = 'leasing'
      and vc.started_at > now() - interval '14 days'
      and not exists (select 1 from tour_bookings tb where tb.call_sid = vc.call_sid)
  ), '[]'::jsonb);
end $$;

revoke all on function public.get_unbooked_voice_leads(text) from public;
grant execute on function public.get_unbooked_voice_leads(text) to anon, authenticated;
