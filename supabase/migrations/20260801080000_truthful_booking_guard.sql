-- Queue #1 truthful booking (2026-08-01): lets the voice brain ask "has THIS
-- call already booked a tour?" so the claim guard never trips on a caller
-- restating a genuinely booked slot, and never lets a hallucinated one stand.
create or replace function public.voice_call_has_booking(p_secret text, p_call_sid text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'unauthorized';
  end if;
  if coalesce(p_call_sid, '') = '' then return false; end if;
  return exists (select 1 from tour_bookings where call_sid = p_call_sid);
end $$;

revoke all on function public.voice_call_has_booking(text, text) from public;
grant execute on function public.voice_call_has_booking(text, text) to anon, authenticated;
