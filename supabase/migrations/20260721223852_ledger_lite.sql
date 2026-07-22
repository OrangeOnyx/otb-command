-- Ledger-lite (belle-realty-pwa harvest #4): per-unit charge/payment trail.
-- Append-only by construction: entries are never updated or deleted — a void
-- is ITSELF an entry (type 'void', void_of -> target). Balances and aging are
-- client-side pure folds (src/lib/ledger.js) at 27-unit scale.
-- Reads: owner/operator. Client inserts: operator only. Monthly rent charges:
-- ONLY via the secret-gated RPC below (same app_secrets 'auto_trigger' row the
-- cron uses) — deterministic ids make re-runs no-ops.
create table public.ledger_entries (
  id text primary key,          -- 'rent:YYYY-MM:unit' (cron) · 'late:YYYY-MM:unit' (fees) · random for manual
  property_id text not null default 'otb',
  unit text not null,
  type text not null check (type in ('charge','late_fee','nsf','adjustment','payment','credit','write_off','void')),
  code text check (code in ('rent','late_fee','nsf','parking','misc')),
  amount numeric(10,2) not null default 0 check (amount >= 0),
  date date not null,
  due date,
  description text not null default '',
  void_of text references public.ledger_entries(id),
  entered_by text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ledger_entries enable row level security;

create policy "ledger read owner/operator" on public.ledger_entries
  for select to public using (public.is_owner_or_operator());

create policy "ledger insert operator" on public.ledger_entries
  for insert to public with check (public.is_operator());

-- append-only: no update/delete policies exist.

create index ledger_entries_unit on public.ledger_entries (property_id, unit, date);
create index ledger_entries_date on public.ledger_entries (property_id, date);

-- cron path: bulk-post monthly rent charges (idempotent via on conflict)
create or replace function public.post_rent_charges(p_secret text, p_charges jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_secret text; n integer;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  insert into ledger_entries (id, unit, type, code, amount, date, due, description, entered_by)
  select c->>'id', c->>'unit', 'charge', 'rent', (c->>'amount')::numeric,
         (c->>'date')::date, (c->>'due')::date, coalesce(c->>'description',''), 'cron'
  from jsonb_array_elements(p_charges) c
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
