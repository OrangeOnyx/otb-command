-- Rotation drill for the shared cron secret (build plan A-0, 2026-07-22).
-- Authorized by knowledge of the CURRENT secret — the same trust boundary as
-- every other secret-gated RPC in this project (256-bit value; brute force
-- infeasible via PostgREST). p_new is shape-checked (64 lowercase hex) so a
-- malformed rotation can never brick the cron. Same accepted definer-WARN
-- class as the existing secret-gated functions (audit 2026-07-08).
create or replace function public.rotate_shared_secret(p_old text, p_new text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_secret text;
begin
  if p_new is null or p_new !~ '^[0-9a-f]{64}$' then
    raise exception 'bad new secret shape';
  end if;
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_old then
    raise exception 'unauthorized';
  end if;
  update app_secrets set value = p_new where name = 'auto_trigger';
  return true;
end $$;
