-- Queue #3 dedupe guard (2026-08-01): the voice agent triple-filed one AC
-- issue on the 07-28 live smoke. Same unit + same title (case/space-blind)
-- within 10 minutes now returns the EXISTING ticket id instead of minting a
-- new one. Cross-unit and >10-min repeats still file fresh.
create or replace function public.voice_file_maintenance(
  p_secret text, p_unit text, p_title text, p_detail text, p_urgency text,
  p_caller text default ''::text)
returns text
language plpgsql security definer set search_path to 'public'
as $function$
declare v_secret text; v_id text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  if p_urgency not in ('emergency','urgent','routine') then
    raise exception 'bad urgency';
  end if;
  if coalesce(p_unit, '') = '' or coalesce(p_title, '') = '' then
    raise exception 'unit and title required';
  end if;

  select id into v_id from maintenance_requests
   where unit = p_unit
     and lower(btrim(title)) = lower(btrim(p_title))
     and created_at > now() - interval '10 minutes'
   order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  v_id := 'vr-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);
  insert into maintenance_requests (id, unit, title, detail, urgency, created_by)
    values (v_id, p_unit, p_title, coalesce(p_detail, ''), p_urgency,
            'voice:' || coalesce(p_caller, ''));
  insert into maintenance_events (request_id, kind, status, actor)
    values (v_id, 'status', 'open', 'voice-agent');
  return v_id;
end $function$;
