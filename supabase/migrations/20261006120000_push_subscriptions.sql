-- Push alerts (2026-10-06, operator pick 1): every finalized phone call fans a
-- Web Push notification out to each device an owner/operator opted in on.
-- A device row = one browser PushSubscription. Users manage only their own
-- rows (RLS, owner/operator membership required to insert); the brain reads
-- and prunes through the secret-gated RPCs below (app_secrets 'voice_agent',
-- same gate as the voice_* RPCs) — no service-role key.

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  p256dh text not null,
  auth text not null,
  device text not null default '',
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_by_property on push_subscriptions (property_id);

alter table push_subscriptions enable row level security;
create policy "push read own" on push_subscriptions for select
  using (user_id = auth.uid());
create policy "push insert own owner/operator" on push_subscriptions for insert
  with check (user_id = auth.uid()
    and member_role_in(org_id, property_id, array['owner','operator']));
create policy "push update own" on push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push delete own" on push_subscriptions for delete
  using (user_id = auth.uid());

-- targets for a property-wide alert: every opted-in owner/operator device
-- whose user still holds the role (a revoked owner stops getting alerts)
create or replace function public.push_targets(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from push_subscriptions s
     where exists (select 1 from org_members m
                    where m.user_id = s.user_id and m.org_id = s.org_id
                      and (m.property_id is null or m.property_id = s.property_id)
                      and m.role in ('owner','operator'))
  ), '[]'::jsonb);
end $$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon, authenticated;

-- delivery bookkeeping: gone endpoints (404/410) are deleted, live ones stamped
create or replace function public.push_mark(p_secret text, p_ok text[], p_gone text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'voice_agent';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  delete from push_subscriptions where endpoint = any(coalesce(p_gone, '{}'));
  update push_subscriptions set last_ok_at = now() where endpoint = any(coalesce(p_ok, '{}'));
end $$;
revoke all on function public.push_mark(text, text[], text[]) from public;
grant execute on function public.push_mark(text, text[], text[]) to anon, authenticated;
