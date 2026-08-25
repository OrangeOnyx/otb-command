-- H1.3 SOP module (design docs/superpowers/specs/2026-08-25-sop-module-design.md).
-- Additive: 5 typed tables + membership RLS + 2 secret-gated cron RPCs.
-- Ported from Asset Command's sop_* schema; occurrence status is DERIVED
-- (completion link + due date), never stored — AC's Manus-scheduler columns
-- die here. Applied direct to prod 2026-08-25 (additive convention; via MCP
-- SQL, so not in the server migration history — this file is the record).
-- Smoked same session: wrong-secret raise on both RPCs; body under rollback
-- (idempotent insert 1→0, tenancy stamps on otb, source='cron', done-flag
-- folds from completion link, assignment on-delete-set-null), 0 residue.

create table public.sop_categories (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  name text not null,
  description text not null default '',
  icon text not null default '',
  sort_order integer not null default 0,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create table public.sop_procedures (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  category_id text not null references sop_categories(id),
  title text not null,
  description text not null default '',
  frequency text not null default 'as_needed' check (frequency in
    ('daily','weekly','biweekly','monthly','quarterly','annually','as_needed')),
  estimated_minutes integer,
  assignee text not null default '',
  unit text,
  comp_field text,
  is_active boolean not null default true,
  version integer not null default 1,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create table public.sop_steps (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  procedure_id text not null references sop_procedures(id),
  step_number integer not null,
  title text not null,
  instructions text not null default '',
  is_checkpoint boolean not null default false,
  warning_note text not null default '',
  photo_key text,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

-- scheduled occurrences (AC "assignments"): schedule scaffolding, no status
-- column — completed/overdue/pending derive from completions + due_on
create table public.sop_assignments (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  procedure_id text not null references sop_procedures(id),
  assignee text not null default '',
  due_on date not null,
  source text not null default '',
  created_at timestamptz not null default now()
);

-- append-only completion trail; occurrence link survives occurrence hygiene
create table public.sop_completions (
  id text primary key,
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  procedure_id text not null references sop_procedures(id),
  assignment_id text references sop_assignments(id) on delete set null,
  completed_by text not null default '',
  completed_at timestamptz not null default now(),
  notes text not null default '',
  duration_minutes integer,
  photo_key text,
  source text not null default '',
  created_at timestamptz not null default now()
);

create index sop_procedures_by_category on sop_procedures (property_id, category_id);
create index sop_steps_by_procedure on sop_steps (procedure_id, step_number);
create index sop_assignments_by_due on sop_assignments (property_id, due_on desc);
create index sop_completions_by_procedure on sop_completions (procedure_id, completed_at desc);

-- RLS: owner+operator read · operator write; completions append-only
-- (no update/delete policies), assignments insert/delete only (reschedule =
-- clear + re-materialize). Tenant/vendor: no policies — sealed.
do $$
declare t text;
begin
  foreach t in array array['sop_categories','sop_procedures','sop_steps',
    'sop_assignments','sop_completions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "sop read owner/operator" on %I for select using
      (member_role_in(org_id, property_id, array[''owner'',''operator'']))', t);
    execute format('create policy "sop insert operator" on %I for insert with check
      (member_role_in(org_id, property_id, array[''operator'']))', t);
  end loop;
  foreach t in array array['sop_categories','sop_procedures','sop_steps'] loop
    execute format('create policy "sop update operator" on %I for update
      using (member_role_in(org_id, property_id, array[''operator'']))
      with check (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create policy "sop delete operator" on %I for delete using
      (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create trigger stamp before insert or update on %I
      for each row execute function stamp_layer_row()', t);
  end loop;
  create policy "sop delete operator" on sop_assignments for delete using
    (member_role_in(org_id, property_id, array['operator']));
end $$;

-- cron read leg: active scheduled procedures + occurrences (≤400d back —
-- covers the annual period) with completion-link done flag folded in.
-- Same app_secrets('auto_trigger') gate as get_open_maintenance.
create or replace function public.get_sop_schedule(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v_out jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  select jsonb_build_object(
    'procedures', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'frequency', p.frequency, 'assignee', p.assignee))
      from sop_procedures p where p.is_active and p.frequency <> 'as_needed'), '[]'::jsonb),
    'occurrences', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'procedure_id', a.procedure_id, 'due_on', a.due_on,
        'done', exists (select 1 from sop_completions c where c.assignment_id = a.id)))
      from sop_assignments a where a.due_on >= current_date - 400), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.get_sop_schedule(text) from public;
grant execute on function public.get_sop_schedule(text) to anon, authenticated;

-- cron write leg: materialize current-period occurrences — deterministic ids
-- + on-conflict-do-nothing = idempotent (post_rent_charges idiom). Tenancy
-- stamps ride the single-tenant defaults (same documented fence as rent).
create or replace function public.post_sop_occurrences(p_secret text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_secret text; n integer;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then
    raise exception 'unauthorized';
  end if;
  insert into sop_assignments (id, procedure_id, assignee, due_on, source)
  select r->>'id', r->>'procedure_id', coalesce(r->>'assignee',''),
         (r->>'due_on')::date, 'cron'
  from jsonb_array_elements(p_rows) r
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.post_sop_occurrences(text, jsonb) from public;
grant execute on function public.post_sop_occurrences(text, jsonb) to anon, authenticated;
