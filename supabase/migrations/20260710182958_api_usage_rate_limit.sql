-- Per-user daily cost cap for the paid endpoints (concierge/voice).
-- Serverless-safe: the count lives in Postgres, not per-instance memory.
create table if not exists public.api_usage (
  email text not null,
  kind text not null,           -- 'concierge' | 'voice'
  day date not null default (now() at time zone 'utc')::date,
  n integer not null default 0,
  primary key (email, kind, day)
);
alter table public.api_usage enable row level security;
-- no direct client access; only the SECURITY DEFINER function below touches it
drop policy if exists "operator reads usage" on public.api_usage;
create policy "operator reads usage" on public.api_usage for select using (is_operator());

-- Atomically bump today's counter for the CALLER (email resolved server-side
-- from their own JWT — cannot be spoofed) and report whether they're at/over cap.
create or replace function public.check_and_bump_usage(p_kind text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_n integer;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then return false; end if;  -- no profile → deny
  insert into public.api_usage (email, kind, n)
    values (v_email, p_kind, 1)
  on conflict (email, kind, day) do update set n = public.api_usage.n + 1
  returning n into v_n;
  return v_n <= p_limit;  -- true = allowed (this request counted), false = over cap
end; $$;
revoke all on function public.check_and_bump_usage(text, integer) from anon;
