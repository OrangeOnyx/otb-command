-- C3 pipeline heartbeat (carry-forward problem #3: sampler/classify/upload
-- chain has died silently 3×; nothing watched the watchers). The daily
-- auto-trigger cron calls this secret-gated freshness probe and opens an
-- idempotent manager thread when occupancy_samples goes stale.
-- Same shared-secret gate as open_trigger_thread / get_open_maintenance.

create or replace function public.get_occupancy_freshness(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_out jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  select jsonb_build_object(
    'latest_ts', (select max(ts) from occupancy_samples),
    'samples_7d', (select count(*) from occupancy_samples
                   where ts > now() - interval '7 days')
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.get_occupancy_freshness(text) from public;
grant execute on function public.get_occupancy_freshness(text) to anon, authenticated;
