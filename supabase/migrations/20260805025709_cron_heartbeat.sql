-- B-4 observability: automation heartbeat (docs/phase-b/11). Every proactive
-- detector rides the ONE daily auto-trigger cron; if Vercel cron dies, all
-- alerting goes quiet at once — silently. The cron records each completed
-- run here; the D-1 card bricks past 26h. Additive only.
create table public.cron_heartbeats (
  id          text primary key,
  org_id      uuid not null default default_org_id(),
  property_id uuid not null default default_property_id(),
  ran_at      timestamptz not null default now(),
  summary     jsonb not null default '{}'::jsonb
);

alter table public.cron_heartbeats enable row level security;

create policy "heartbeat read member" on public.cron_heartbeats
  for select to public
  using (public.member_role_in(org_id, property_id, array['operator','owner']));
-- no insert/update/delete policies: writes go only through the definer RPC

create or replace function public.post_cron_heartbeat(p_secret text, p_id text, p_summary jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_secret text; v timestamptz := now();
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  insert into cron_heartbeats (id, ran_at, summary)
  values (p_id, v, coalesce(p_summary, '{}'::jsonb))
  on conflict (id) do update set ran_at = excluded.ran_at, summary = excluded.summary;
  return v;
end $$;
revoke all on function public.post_cron_heartbeat(text, text, jsonb) from public;
grant execute on function public.post_cron_heartbeat(text, text, jsonb) to anon, authenticated;
