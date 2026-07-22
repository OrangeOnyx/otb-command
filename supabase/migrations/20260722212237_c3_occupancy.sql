-- C3 parking occupancy samples (append-only; uploaded from the capture
-- machine via the secret-gated RPC below; read = owner/operator).
create table public.occupancy_samples (
  frame text not null,
  camera text not null,
  stall text not null,
  ts timestamptz not null,
  state text not null check (state in ('occupied','empty','unclear')),
  created_at timestamptz not null default now(),
  primary key (frame, stall)
);

alter table public.occupancy_samples enable row level security;

create policy "occupancy read owner/operator" on public.occupancy_samples
  for select to public using (public.is_owner_or_operator());
-- no insert/update/delete policies: writes go only through the definer RPC

create index occupancy_samples_ts_idx on public.occupancy_samples (ts desc);
create index occupancy_samples_stall_ts_idx on public.occupancy_samples (stall, ts desc);

create or replace function public.post_occupancy_samples(p_secret text, p_samples jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_secret text; n integer;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  insert into occupancy_samples (frame, camera, stall, ts, state)
  select s->>'frame', s->>'camera', s->>'stall', (s->>'ts')::timestamptz,
         s->>'state'
  from jsonb_array_elements(p_samples) s
  on conflict (frame, stall) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
