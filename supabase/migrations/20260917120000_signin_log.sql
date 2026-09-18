-- D-24b option 1 (operator ruling 2026-09-17, register row #24): sign-in audit
-- trail. One row per session start, written ONLY by the log_signin definer RPC
-- (email from the caller's JWT, role from the caller's profile — nothing
-- client-supplied can forge identity). Operator-only read (D-1 "Sign-ins"
-- KPI). Deliberately NOT a page-view log: AC's audit_log was 2,622 rows of
-- which 2,525 were page views — the 93 sign-ins were the signal. Additive;
-- shape mirrors client_errors (capped definer RPC, retention on the write
-- path). APPLIED on prod 2026-09-17 via MCP apply_migration.
create table public.signin_log (
  id          bigint generated always as identity primary key,
  org_id      uuid not null default default_org_id(),
  property_id uuid not null default default_property_id(),
  at          timestamptz not null default now(),
  email       text not null default '',
  role        text not null default 'pending',
  page        text not null default '',
  ua          text not null default ''
);
create index signin_log_at_idx on public.signin_log (at desc);
create index signin_log_email_at_idx on public.signin_log (email, at desc);

alter table public.signin_log enable row level security;
create policy "signin log read operator" on public.signin_log
  for select to public
  using (public.member_role_in(org_id, property_id, array['operator']));
-- no direct write policies: inserts only via the definer RPC below

create or replace function public.log_signin(p_page text, p_ua text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text; v_role text;
begin
  if auth.uid() is null then return false; end if; -- authed sessions only
  v_email := lower(coalesce(auth.jwt()->>'email', ''));
  v_role := coalesce((select role from profiles where id = auth.uid()), 'pending');
  -- one row per session start: a reload storm inside 10 minutes is the same
  -- session, not ten sign-ins
  if exists (select 1 from signin_log
             where email = v_email and at > now() - interval '10 minutes') then
    return false;
  end if;
  -- 400-day retention sweep rides the write path (low volume by design)
  delete from signin_log where at < now() - interval '400 days';
  insert into signin_log (email, role, page, ua)
  values (v_email, left(v_role, 40), left(coalesce(p_page,''), 200), left(coalesce(p_ua,''), 300));
  return true;
end $$;
revoke all on function public.log_signin(text, text) from public;
grant execute on function public.log_signin(text, text) to authenticated;
