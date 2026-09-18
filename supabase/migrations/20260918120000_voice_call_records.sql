-- Voice call records (2026-09-18): every call on the tenant / leasing lines
-- becomes an owner-readable record — summary, intent, urgency, unit, the full
-- transcript, the outcome (work order / tour / lead / package) and, when the
-- operator adds Twilio API credentials, the recording reference. The bridge
-- posts call start / end to the brain (/api/voice-agent); the brain writes
-- through these secret-gated RPCs (app_secrets 'voice_agent', same gate as
-- voice_log_turn). A finalized call is mirrored into comm_log (source='voice')
-- so L-1 lists it beside every other channel — owner+operator read via the
-- existing comm_log policies; nothing here opens a new client write path.

alter table public.voice_calls
  add column if not exists ended_at              timestamptz,
  add column if not exists duration_s            integer,
  add column if not exists summary               text not null default '',
  add column if not exists intent                text not null default '',
  add column if not exists urgency               text not null default '',
  add column if not exists unit                  text not null default '',
  add column if not exists caller_name           text not null default '',
  add column if not exists callback              text not null default '',
  add column if not exists outcome               jsonb not null default '{}'::jsonb,
  add column if not exists transcript            text not null default '',
  add column if not exists recording_sid         text not null default '',
  add column if not exists recording_status      text not null default '',
  add column if not exists recording_duration_s  integer,
  add column if not exists notified_at           timestamptz,
  add column if not exists finalized_at          timestamptz;

alter table public.voice_calls drop constraint if exists voice_calls_intent_check;
alter table public.voice_calls add constraint voice_calls_intent_check
  check (intent in ('', 'maintenance', 'leasing', 'billing', 'general'));
alter table public.voice_calls drop constraint if exists voice_calls_urgency_check;
alter table public.voice_calls add constraint voice_calls_urgency_check
  check (urgency in ('', 'emergency', 'urgent', 'routine'));

create index if not exists voice_calls_open on public.voice_calls (started_at)
  where finalized_at is null;

-- 1) call start — the row exists even if the caller never says a word
create or replace function public.voice_call_start(
  p_secret text, p_call_sid text, p_line text, p_caller text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  if p_line not in ('tenant','leasing') then raise exception 'bad line'; end if;
  if coalesce(p_call_sid, '') = '' then raise exception 'call sid required'; end if;
  insert into voice_calls (call_sid, line, caller)
    values (p_call_sid, p_line, coalesce(p_caller, ''))
    on conflict (call_sid) do nothing;
end $$;
revoke all on function public.voice_call_start(text, text, text, text) from public;
grant execute on function public.voice_call_start(text, text, text, text) to anon, authenticated;

-- 2) outcome merge — each tool success (work order, tour, lead, package) lands
--    as one key so the finalized record can link to what the call produced
create or replace function public.voice_call_outcome(
  p_secret text, p_call_sid text, p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  if p_key !~ '^[a-z_]{1,32}$' then raise exception 'bad key'; end if;
  update voice_calls set outcome = outcome || jsonb_build_object(p_key, p_value)
   where call_sid = p_call_sid;
end $$;
revoke all on function public.voice_call_outcome(text, text, text, jsonb) from public;
grant execute on function public.voice_call_outcome(text, text, text, jsonb) to anon, authenticated;

-- 3) recording status (Twilio RecordingStatusCallback, validated in the brain)
create or replace function public.voice_call_recording(
  p_secret text, p_call_sid text, p_recording_sid text, p_status text,
  p_duration integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  update voice_calls
     set recording_sid = coalesce(p_recording_sid, recording_sid),
         recording_status = coalesce(p_status, ''),
         recording_duration_s = coalesce(p_duration, recording_duration_s)
   where call_sid = p_call_sid;
  -- keep the L-1 mirror current when the recording lands after finalize
  update comm_log
     set payload = coalesce(payload, '{}'::jsonb)
                   || jsonb_build_object('recording_sid', coalesce(p_recording_sid, ''),
                                         'recording_status', coalesce(p_status, '')),
         updated_at = now()
   where id = 'vc:' || p_call_sid;
end $$;
revoke all on function public.voice_call_recording(text, text, text, text, integer) from public;
grant execute on function public.voice_call_recording(text, text, text, text, integer) to anon, authenticated;

-- 4) finalize — summary + classification from the brain, transcript rebuilt
--    from the call's chat thread, comm_log mirror upserted. Idempotent.
create or replace function public.voice_call_finalize(
  p_secret text, p_call_sid text, p_summary text, p_intent text, p_urgency text,
  p_unit text default '', p_caller_name text default '', p_callback text default '',
  p_duration integer default null, p_transcript text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_call voice_calls%rowtype; v_transcript text; v_title text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  select * into v_call from voice_calls where call_sid = p_call_sid;
  if v_call.call_sid is null then raise exception 'unknown call'; end if;

  v_transcript := coalesce(nullif(p_transcript, ''), (
    select string_agg(case when m.role = 'user' then 'Caller: ' else 'Agent: ' end || m.content,
                      E'\n' order by m.at, m.id)
      from chat_messages m where m.thread_id = v_call.thread_id), '');

  update voice_calls
     set summary = left(coalesce(p_summary, ''), 600),
         intent = case when p_intent in ('maintenance','leasing','billing','general') then p_intent else 'general' end,
         urgency = case when p_urgency in ('emergency','urgent','routine') then p_urgency else 'routine' end,
         unit = left(coalesce(p_unit, ''), 20),
         caller_name = left(coalesce(p_caller_name, ''), 120),
         callback = left(coalesce(p_callback, ''), 40),
         duration_s = coalesce(p_duration, duration_s),
         transcript = v_transcript,
         ended_at = coalesce(ended_at, now()),
         finalized_at = now()
   where call_sid = p_call_sid
   returning * into v_call;

  v_title := case v_call.intent when 'maintenance' then 'Maintenance call'
                                when 'leasing' then 'Leasing call'
                                when 'billing' then 'Billing call'
                                else 'Call' end
             || case when v_call.unit <> '' then ' · unit ' || v_call.unit else '' end;

  insert into comm_log (id, unit, channel, direction, at, contact_name, contact_phone,
                        summary, body, urgency, status, agent, payload, source, updated_by)
  values ('vc:' || p_call_sid,
          nullif(v_call.unit, ''), 'voice', 'in', v_call.started_at,
          v_call.caller_name, coalesce(nullif(v_call.callback, ''), v_call.caller),
          left(coalesce(nullif(v_call.summary, ''), v_title), 300),
          left(v_transcript, 4000),
          v_call.urgency, 'new', 'voice-' || v_call.line,
          jsonb_build_object(
            'call_sid', v_call.call_sid, 'line', v_call.line, 'intent', v_call.intent,
            'duration_s', v_call.duration_s, 'outcome', v_call.outcome,
            'recording_sid', v_call.recording_sid, 'recording_status', v_call.recording_status,
            'thread_id', v_call.thread_id),
          'voice', 'voice-agent')
  on conflict (id) do update set
    unit = excluded.unit, at = excluded.at, contact_name = excluded.contact_name,
    contact_phone = excluded.contact_phone, summary = excluded.summary, body = excluded.body,
    urgency = excluded.urgency, agent = excluded.agent,
    payload = coalesce(comm_log.payload, '{}'::jsonb) || excluded.payload,
    updated_at = now(), updated_by = excluded.updated_by;

  return jsonb_build_object('comm_id', 'vc:' || p_call_sid, 'transcript', v_transcript,
                            'outcome', v_call.outcome, 'started_at', v_call.started_at);
end $$;
revoke all on function public.voice_call_finalize(text, text, text, text, text, text, text, text, integer, text) from public;
grant execute on function public.voice_call_finalize(text, text, text, text, text, text, text, text, integer, text) to anon, authenticated;

-- 5) calls the bridge never closed out (bridge outage / pre-redeploy): the
--    daily sweeper finalizes anything older than p_older_min with a transcript
create or replace function public.voice_calls_pending(p_secret text, p_older_min integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'call_sid', vc.call_sid, 'line', vc.line, 'caller', vc.caller, 'started_at', vc.started_at,
      'messages', coalesce((select jsonb_agg(jsonb_build_object('role', m.role, 'content', m.content) order by m.at, m.id)
                              from chat_messages m where m.thread_id = vc.thread_id), '[]'::jsonb))
      order by vc.started_at)
    from voice_calls vc
    where vc.finalized_at is null
      and vc.started_at < now() - make_interval(mins => greatest(p_older_min, 1))
      and vc.started_at > now() - interval '30 days'
      and vc.thread_id is not null
  ), '[]'::jsonb);
end $$;
revoke all on function public.voice_calls_pending(text, integer) from public;
grant execute on function public.voice_calls_pending(text, integer) to anon, authenticated;

-- 6) leasing lead from the phone → W-1 pipeline (deals, stage inquiry)
create or replace function public.voice_leasing_lead(
  p_secret text, p_call_sid text, p_name text, p_phone text,
  p_email text default '', p_interest text default '', p_unit text default '')
returns text language plpgsql security definer set search_path = public as $$
declare v_secret text; v_id text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  if coalesce(p_name, '') = '' then raise exception 'name required'; end if;
  select id into v_id from deals where source = 'voice:' || p_call_sid limit 1;
  if v_id is not null then return v_id; end if;
  v_id := 'vl' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4);
  insert into deals (id, prospect, contact_phone, contact_email, target_unit, stage,
                     lead_source, notes, source, updated_by)
    values (v_id, left(p_name, 120), left(coalesce(p_phone, ''), 40),
            lower(left(coalesce(p_email, ''), 120)), left(coalesce(p_unit, ''), 20),
            'inquiry', 'voice', left(coalesce(p_interest, ''), 1000),
            'voice:' || p_call_sid, 'voice-agent');
  return v_id;
end $$;
revoke all on function public.voice_leasing_lead(text, text, text, text, text, text, text) from public;
grant execute on function public.voice_leasing_lead(text, text, text, text, text, text, text) to anon, authenticated;

-- 7) who gets the call email: every allow-listed owner + operator
create or replace function public.voice_notify_recipients(p_secret text)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  return coalesce((select array_agg(distinct lower(email)) from authorized_emails
                    where role in ('owner','operator') and email <> ''), '{}'::text[]);
end $$;
revoke all on function public.voice_notify_recipients(text) from public;
grant execute on function public.voice_notify_recipients(text) to anon, authenticated;

create or replace function public.voice_call_mark_notified(p_secret text, p_call_sid text)
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  update voice_calls set notified_at = now() where call_sid = p_call_sid;
end $$;
revoke all on function public.voice_call_mark_notified(text, text) from public;
grant execute on function public.voice_call_mark_notified(text, text) to anon, authenticated;

-- 8) recording lookup for the authenticated audio proxy (RLS read on
--    voice_calls already = owner/operator; security invoker keeps it that way)
create or replace function public.voice_recording_for(p_recording_sid text)
returns jsonb language sql security invoker set search_path = public as $$
  select jsonb_build_object('call_sid', call_sid, 'recording_sid', recording_sid,
                            'status', recording_status)
    from voice_calls where recording_sid = p_recording_sid and recording_sid <> '' limit 1;
$$;
revoke all on function public.voice_recording_for(text) from public;
grant execute on function public.voice_recording_for(text) to authenticated;
