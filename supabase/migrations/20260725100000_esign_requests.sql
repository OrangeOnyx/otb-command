-- E-sign requests (belle-realty-pwa harvest #6, e-sign schema).
-- Token-based signing lifecycle: pending → sent → viewed → signed|declined|expired.
-- The uuid token IS the signer's credential — the signer never logs in; the
-- three signer-side transitions run ONLY through the token-gated SECURITY
-- DEFINER RPCs below (esign_get / esign_sign / esign_decline), granted to
-- anon. Operator manages requests via RLS (create / resend / cancel from the
-- unit drawer). NO outbound email — the operator copies the signing link and
-- message (deliberate v1 boundary; seam src/lib/esign.js builds the text).

create table if not exists public.esign_requests (
  id text primary key,
  org_id text not null default 'belle',
  property_id text not null default 'otb',
  unit text not null default '',
  title text not null,
  description text not null default '',
  signer_email text not null,
  signer_name text not null default '',
  doc_path text not null default '',      -- optional documents-bucket object path shown to the signer
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending','sent','viewed','signed','declined','expired')),
  expires_at timestamptz not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text not null default '',
  signature_data text not null default '',
  signer_ip text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
alter table public.esign_requests enable row level security;
create index if not exists esign_requests_unit
  on public.esign_requests (property_id, unit, created_at desc);

-- operator manages; owner reads. The signer path never touches the table
-- directly (RPCs below), so no anon policies exist.
drop policy if exists "esign read owner/operator" on public.esign_requests;
create policy "esign read owner/operator" on public.esign_requests
  for select using (public.is_owner_or_operator());
drop policy if exists "esign insert operator" on public.esign_requests;
create policy "esign insert operator" on public.esign_requests
  for insert with check (public.is_operator());
drop policy if exists "esign update operator" on public.esign_requests;
create policy "esign update operator" on public.esign_requests
  for update using (public.is_operator()) with check (public.is_operator());

-- ── signer-side RPCs (token = credential) ────────────────────────────────

-- Fetch the signing payload; stamps expired/viewed as side effects.
create or replace function public.esign_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.esign_requests;
begin
  select * into r from esign_requests where token = p_token;
  if not found then raise exception 'not found'; end if;
  if r.status in ('pending','sent','viewed') and now() > r.expires_at then
    update esign_requests set status = 'expired' where id = r.id;
    r.status := 'expired';
  elsif r.status in ('pending','sent') then
    update esign_requests set status = 'viewed', viewed_at = now() where id = r.id;
    r.status := 'viewed';
  end if;
  return jsonb_build_object(
    'id', r.id, 'title', r.title, 'description', r.description,
    'signer_name', r.signer_name, 'signer_email', r.signer_email,
    'unit', r.unit, 'status', r.status, 'expires_at', r.expires_at,
    'signed_at', r.signed_at, 'declined_at', r.declined_at,
    'decline_reason', r.decline_reason, 'has_doc', r.doc_path <> '');
end $$;

-- Document path for a LIVE request only (the API mints the signed URL).
create or replace function public.esign_doc_path(p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.esign_requests;
begin
  select * into r from esign_requests where token = p_token;
  if not found then raise exception 'not found'; end if;
  if r.status not in ('pending','sent','viewed','signed') or (r.status <> 'signed' and now() > r.expires_at) then
    raise exception 'not available';
  end if;
  return r.doc_path;
end $$;

-- Submit the signature. Fails closed on every non-open state.
create or replace function public.esign_sign(p_token uuid, p_signature text, p_ip text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.esign_requests;
begin
  select * into r from esign_requests where token = p_token;
  if not found then raise exception 'not found'; end if;
  if r.status = 'signed' then raise exception 'already signed'; end if;
  if r.status = 'declined' then raise exception 'request was declined'; end if;
  if r.status = 'expired' or now() > r.expires_at then
    update esign_requests set status = 'expired' where id = r.id;
    raise exception 'signing link has expired';
  end if;
  if coalesce(trim(p_signature), '') = '' then raise exception 'signature required'; end if;
  update esign_requests
     set status = 'signed', signed_at = now(),
         signature_data = left(p_signature, 200000),
         signer_ip = left(coalesce(p_ip, 'unknown'), 64)
   where id = r.id;
  return jsonb_build_object('id', r.id, 'title', r.title, 'signer_name', r.signer_name,
    'signer_email', r.signer_email, 'signed_at', now());
end $$;

-- Decline with a reason. Fails closed on signed/declined.
create or replace function public.esign_decline(p_token uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.esign_requests;
begin
  select * into r from esign_requests where token = p_token;
  if not found then raise exception 'not found'; end if;
  if r.status = 'signed' then raise exception 'document already signed'; end if;
  if r.status = 'declined' then raise exception 'already declined'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required'; end if;
  update esign_requests
     set status = 'declined', declined_at = now(), decline_reason = left(p_reason, 2000)
   where id = r.id;
  return jsonb_build_object('id', r.id, 'status', 'declined');
end $$;

revoke all on function public.esign_get(uuid) from public;
revoke all on function public.esign_doc_path(uuid) from public;
revoke all on function public.esign_sign(uuid, text, text) from public;
revoke all on function public.esign_decline(uuid, text) from public;
grant execute on function public.esign_get(uuid) to anon, authenticated;
grant execute on function public.esign_doc_path(uuid) to anon, authenticated;
grant execute on function public.esign_sign(uuid, text, text) to anon, authenticated;
grant execute on function public.esign_decline(uuid, text) to anon, authenticated;

-- Signer can read (sign-URL) ONLY a document attached to a live, unexpired
-- request — the API resolves the path via esign_doc_path first.
drop policy if exists "esign signer reads doc" on storage.objects;
create policy "esign signer reads doc" on storage.objects
  for select to anon
  using (bucket_id = 'documents' and exists (
    select 1 from public.esign_requests r
    where r.doc_path = storage.objects.name
      and (r.status = 'signed' or (r.status in ('pending','sent','viewed') and now() < r.expires_at))));
