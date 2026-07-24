-- A-3 voice lines (Twilio ConversationRelay). Phone callers have no session,
-- so every write rides a secret-gated SECURITY DEFINER RPC on a NEW app_secrets
-- row 'voice_agent' (held by the Fly bridge + Vercel brain env — rotated via
-- rotate_voice_secret, itself gated on the operator-held auto_trigger secret,
-- same drill as A-0). Same accepted definer pattern as the cron family.

-- 1) let the transcript tables carry the two phone personas
alter table public.chat_threads drop constraint if exists chat_threads_agent_check;
alter table public.chat_threads add constraint chat_threads_agent_check
  check (agent in ('concierge','leasing','manager','voice-tenant','voice-leasing'));

-- 2) operator-editable voice settings (single row; §14 "property settings" shape)
create table if not exists public.voice_settings (
  id text primary key default 'otb',
  tour_windows jsonb not null default '[{"dow":2,"start":"10:00","end":"12:00"},{"dow":2,"start":"14:00","end":"16:00"},{"dow":4,"start":"10:00","end":"12:00"},{"dow":4,"start":"14:00","end":"16:00"}]',
  slot_minutes int not null default 30 check (slot_minutes between 15 and 120),
  greeting_tenant text not null default 'Thanks for calling On The Boulevard tenant services. How can I help?',
  greeting_leasing text not null default 'Thanks for calling On The Boulevard leasing. How can I help?',
  updated_at timestamptz not null default now()
);
alter table public.voice_settings enable row level security;
drop policy if exists "vs read owner/operator" on public.voice_settings;
create policy "vs read owner/operator" on public.voice_settings
  for select using (is_owner_or_operator());
drop policy if exists "vs operator write" on public.voice_settings;
create policy "vs operator write" on public.voice_settings
  for update using (is_operator()) with check (is_operator());
insert into public.voice_settings (id) values ('otb') on conflict (id) do nothing;

-- 3) tour bookings (voice-agent writes via RPC only; operator may free a slot)
create table if not exists public.tour_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null unique check (slot_key ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  name text not null,
  phone text not null,
  interest text not null default '',
  call_sid text not null default '',
  created_at timestamptz not null default now()
);
alter table public.tour_bookings enable row level security;
drop policy if exists "tb read owner/operator" on public.tour_bookings;
create policy "tb read owner/operator" on public.tour_bookings
  for select using (is_owner_or_operator());
drop policy if exists "tb operator delete" on public.tour_bookings;
create policy "tb operator delete" on public.tour_bookings
  for delete using (is_operator());

-- 4) call → thread map (one transcript thread per Twilio CallSid)
create table if not exists public.voice_calls (
  call_sid text primary key,
  line text not null check (line in ('tenant','leasing')),
  caller text not null default '',
  thread_id uuid references public.chat_threads(id) on delete set null,
  started_at timestamptz not null default now()
);
alter table public.voice_calls enable row level security;
drop policy if exists "vc read owner/operator" on public.voice_calls;
create policy "vc read owner/operator" on public.voice_calls
  for select using (is_owner_or_operator());

-- 5) the voice secret (placeholder value no one knows — set for real via
--    rotate_voice_secret before the bridge goes live)
insert into public.app_secrets (name, value)
  values ('voice_agent', md5(random()::text || clock_timestamp()::text))
  on conflict (name) do nothing;

create or replace function public.rotate_voice_secret(p_auto_secret text, p_new text)
returns text language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_auto_secret then
    raise exception 'unauthorized';
  end if;
  if p_new !~ '^[0-9a-f]{64}$' then
    raise exception 'secret shape: expected 64 hex chars';
  end if;
  update app_secrets set value = p_new where name = 'voice_agent';
  return 'rotated';
end $$;
revoke all on function public.rotate_voice_secret(text, text) from public;
grant execute on function public.rotate_voice_secret(text, text) to anon, authenticated;

-- 6) tour state: settings + future booked slot keys (brain computes open slots)
create or replace function public.voice_tour_state(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_out jsonb;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  select jsonb_build_object(
    'settings', (select to_jsonb(s) - 'updated_at' from voice_settings s where s.id = 'otb'),
    'booked', coalesce((select jsonb_agg(b.slot_key) from tour_bookings b
                        where b.slot_key >= to_char(now() - interval '1 day', 'YYYY-MM-DD"T"HH24:MI')), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.voice_tour_state(text) from public;
grant execute on function public.voice_tour_state(text) to anon, authenticated;

-- 7) book a tour (unique slot_key = the conflict gate)
create or replace function public.voice_book_tour(
  p_secret text, p_slot_key text, p_name text, p_phone text,
  p_interest text default '', p_call_sid text default '')
returns text language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  if coalesce(p_name, '') = '' or coalesce(p_phone, '') = '' then
    raise exception 'name and phone required';
  end if;
  begin
    insert into tour_bookings (slot_key, name, phone, interest, call_sid)
      values (p_slot_key, p_name, p_phone, coalesce(p_interest, ''), coalesce(p_call_sid, ''));
  exception when unique_violation then
    return 'conflict';
  end;
  return 'ok';
end $$;
revoke all on function public.voice_book_tour(text, text, text, text, text, text) from public;
grant execute on function public.voice_book_tour(text, text, text, text, text, text) to anon, authenticated;

-- 8) file a maintenance request from the tenant line (head row + open event,
--    actor 'voice-agent' — flows into M-1/W-1 and the aging cron unchanged)
create or replace function public.voice_file_maintenance(
  p_secret text, p_unit text, p_title text, p_detail text,
  p_urgency text, p_caller text default '')
returns text language plpgsql security definer set search_path = public as $$
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
  v_id := 'vr-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);
  insert into maintenance_requests (id, unit, title, detail, urgency, created_by)
    values (v_id, p_unit, p_title, coalesce(p_detail, ''), p_urgency,
            'voice:' || coalesce(p_caller, ''));
  insert into maintenance_events (request_id, kind, status, actor)
    values (v_id, 'status', 'open', 'voice-agent');
  return v_id;
end $$;
revoke all on function public.voice_file_maintenance(text, text, text, text, text, text) from public;
grant execute on function public.voice_file_maintenance(text, text, text, text, text, text) to anon, authenticated;

-- 9) transcript logging: one thread per call, two messages per turn
create or replace function public.voice_log_turn(
  p_secret text, p_call_sid text, p_line text, p_caller text,
  p_user text, p_assistant text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_secret text; v_thread uuid;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  if p_line not in ('tenant','leasing') then
    raise exception 'bad line';
  end if;
  select thread_id into v_thread from voice_calls where call_sid = p_call_sid;
  if v_thread is null then
    insert into chat_threads (agent, title, created_by)
      values ('voice-' || p_line,
              left(coalesce(nullif(p_user, ''), 'voice call'), 80),
              'voice:' || coalesce(p_caller, ''))
      returning id into v_thread;
    insert into voice_calls (call_sid, line, caller, thread_id)
      values (p_call_sid, p_line, coalesce(p_caller, ''), v_thread)
      on conflict (call_sid) do update set thread_id = excluded.thread_id;
  end if;
  if coalesce(p_user, '') <> '' then
    insert into chat_messages (thread_id, role, content) values (v_thread, 'user', p_user);
  end if;
  if coalesce(p_assistant, '') <> '' then
    insert into chat_messages (thread_id, role, content) values (v_thread, 'assistant', p_assistant);
  end if;
  return v_thread;
end $$;
revoke all on function public.voice_log_turn(text, text, text, text, text, text) from public;
grant execute on function public.voice_log_turn(text, text, text, text, text, text) to anon, authenticated;
