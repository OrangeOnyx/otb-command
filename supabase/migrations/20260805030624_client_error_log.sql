-- B-4 error tracking, no-vendor baseline (docs/phase-b/11 option 3):
-- authed clients report uncaught errors via a capped definer RPC; operator
-- reads them (D-1 card shows a 24h count). Additive. A Sentry-class vendor
-- can replace this later without a schema fight — the table just stops
-- growing.
create table public.client_errors (
  id          bigint generated always as identity primary key,
  org_id      uuid not null default default_org_id(),
  property_id uuid not null default default_property_id(),
  at          timestamptz not null default now(),
  email       text not null default '',
  page        text not null default '',
  message     text not null,
  stack       text not null default '',
  ua          text not null default ''
);
create index client_errors_at_idx on public.client_errors (at desc);

alter table public.client_errors enable row level security;
create policy "client errors read operator" on public.client_errors
  for select to public
  using (public.member_role_in(org_id, property_id, array['operator']));
-- no direct write policies: inserts only via the capped definer RPC

create or replace function public.log_client_error(p_page text, p_message text, p_stack text, p_ua text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then return false; end if; -- authed sessions only
  v_email := coalesce(auth.jwt()->>'email', '');
  -- per-user hourly cap: an error loop must not flood the table
  if (select count(*) from client_errors
      where email = v_email and at > now() - interval '1 hour') >= 50 then
    return false;
  end if;
  -- 30-day retention sweep rides the write path (low volume by design)
  delete from client_errors where at < now() - interval '30 days';
  insert into client_errors (email, page, message, stack, ua)
  values (v_email, left(coalesce(p_page,''), 200), left(coalesce(p_message,''), 500),
          left(coalesce(p_stack,''), 2000), left(coalesce(p_ua,''), 300));
  return true;
end $$;
revoke all on function public.log_client_error(text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text) to authenticated;
