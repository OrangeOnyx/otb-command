-- A2 Owner Intelligence Brief: monthly generated documents (html + model).
-- Reads: owner/operator via RLS. Writes: ONLY via the secret-gated
-- SECURITY DEFINER fns below (same app_secrets 'auto_trigger' row the cron
-- uses) — no service-role key, no client write path.
create table public.owner_briefs (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  html text not null,
  model jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.owner_briefs enable row level security;
create policy "owner_briefs_read" on public.owner_briefs
  for select to public using (is_owner_or_operator());
-- no INSERT/UPDATE/DELETE policies: deny-all for clients

create or replace function public.get_owner_brief_model(p_secret text, p_month text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_secret text; v_model jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  select model into v_model from owner_briefs where month = p_month;
  return v_model;
end $$;

create or replace function public.put_owner_brief(p_secret text, p_month text, p_html text, p_model jsonb)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_secret text;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  insert into owner_briefs (month, html, model) values (p_month, p_html, p_model)
  on conflict (month) do nothing;
  return found; -- false = month already stored (idempotent re-run)
end $$;

create or replace function public.get_brief_state(p_secret text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  select coalesce(jsonb_object_agg(layer, data), '{}'::jsonb) into v
  from property_state where property_id = 'otb' and layer in ('financials','actions');
  return v;
end $$;
