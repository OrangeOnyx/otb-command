-- L15: stamp audit-log email from the caller's own profile (via auth.uid),
-- ignoring any client-supplied value, so the safe/vendor audit trail can't be
-- forged by the acting role.
create or replace function public.stamp_log_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := coalesce((select email from public.profiles where id = auth.uid()), new.email, '');
  return new;
end; $$;

drop trigger if exists safe_log_stamp_email on public.safe_log;
create trigger safe_log_stamp_email before insert on public.safe_log
  for each row execute function public.stamp_log_email();

drop trigger if exists vendor_log_stamp_email on public.vendor_log;
create trigger vendor_log_stamp_email before insert on public.vendor_log
  for each row execute function public.stamp_log_email();
