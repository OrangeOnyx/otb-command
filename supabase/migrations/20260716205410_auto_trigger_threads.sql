-- Harvest #2: belle-realty-pwa AutoTriggerService → OTB (2026-07-16).
-- Cron-opened AI-1 threads, idempotent by trigger_source; the RPC is the only
-- unauthenticated write path and it is gated by a shared secret held in
-- app_secrets (RLS deny-all) + the Vercel CRON_SECRET env.

alter table public.chat_threads add column if not exists trigger_source text;
create unique index if not exists chat_threads_trigger_source_key
  on public.chat_threads (trigger_source) where trigger_source is not null;

create table if not exists public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
-- no policies on purpose: deny-all to anon/authenticated; only definer fns read it.

create or replace function public.open_trigger_thread(
  p_secret text, p_agent text, p_title text, p_trigger text, p_content text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_secret text;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  if p_agent not in ('concierge','leasing','manager') then
    raise exception 'unknown agent %', p_agent;
  end if;
  select id into v_id from chat_threads where trigger_source = p_trigger;
  if v_id is not null then
    return null; -- already opened once — idempotent skip
  end if;
  insert into chat_threads (agent, title, created_by, trigger_source)
    values (p_agent, left(p_title, 80), 'adam@adamabdalla.com', p_trigger)
    returning id into v_id;
  insert into chat_messages (thread_id, role, content)
    values (v_id, 'assistant', p_content);
  return v_id;
end $$;

revoke all on function public.open_trigger_thread(text,text,text,text,text) from public;
grant execute on function public.open_trigger_thread(text,text,text,text,text) to anon, authenticated;

-- SECRET REDACTED FOR REPO COPY. The live migration seeded app_secrets row
-- 'auto_trigger' with the shared cron secret (mirrors Vercel env CRON_SECRET).
-- Applying this file fresh: set the real value out-of-band, e.g.
--   insert into public.app_secrets (name, value) values ('auto_trigger', '<SECRET>')
--     on conflict (name) do update set value = excluded.value;
insert into public.app_secrets (name, value)
  values ('auto_trigger', '<REDACTED-SET-OUT-OF-BAND>')
  on conflict (name) do nothing;
