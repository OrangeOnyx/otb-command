-- Website tour requests (2026-09-18, Vercel Pro lifted the function cap): the
-- public /tour page posts a lead to /api/tour-lead; the function calls this
-- secret-gated RPC (app_secrets 'voice_agent' — the same server-side gate the
-- phone leads use). One deals row per request (stage inquiry, lead_source
-- 'web', source 'web:<id>') + a comm_log note so L-1 shows it beside the
-- calls. Abuse guard: at most 40 web leads per rolling day, then the RPC
-- refuses and the page tells the visitor to call.
create or replace function public.web_tour_lead(
  p_secret text, p_name text, p_phone text, p_email text default '',
  p_unit text default '', p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_id text; v_today integer;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name required'; end if;
  if coalesce(btrim(p_phone), '') = '' and coalesce(btrim(p_email), '') = '' then raise exception 'phone or email required'; end if;
  select count(*) into v_today from deals where lead_source = 'web' and created_at > now() - interval '1 day';
  if v_today >= 40 then raise exception 'daily web lead cap'; end if;

  v_id := 'wl' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4);
  insert into deals (id, prospect, contact_phone, contact_email, target_unit, stage,
                     lead_source, notes, next_action_at, source, updated_by)
    values (v_id, left(btrim(p_name), 120), left(coalesce(p_phone, ''), 40),
            lower(left(coalesce(p_email, ''), 120)), left(coalesce(p_unit, ''), 20),
            'inquiry', 'web', left(coalesce(p_note, ''), 1000),
            to_char(now() + interval '1 day', 'YYYY-MM-DD'), 'web:' || v_id, 'tour-site');
  insert into comm_log (id, unit, channel, direction, at, contact_name, contact_phone, contact_email,
                        summary, body, urgency, status, agent, payload, source, updated_by)
    values ('wl:' || v_id, nullif(left(coalesce(p_unit, ''), 20), ''), 'note', 'in', now(),
            left(btrim(p_name), 120), left(coalesce(p_phone, ''), 40), lower(left(coalesce(p_email, ''), 120)),
            'Tour request from the website' || case when coalesce(p_unit, '') <> '' then ' · Suite ' || p_unit else '' end,
            left(coalesce(p_note, ''), 4000), 'routine', 'new', 'tour-site',
            jsonb_build_object('lead', v_id, 'kind', 'web_tour'), 'web', 'tour-site');
  return jsonb_build_object('lead', v_id);
end $$;
revoke all on function public.web_tour_lead(text, text, text, text, text, text) from public;
grant execute on function public.web_tour_lead(text, text, text, text, text, text) to anon, authenticated;
