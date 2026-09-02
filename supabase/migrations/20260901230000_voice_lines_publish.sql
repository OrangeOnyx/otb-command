-- voice_lines_publish: decision H-2 (operator pick "publish", punch list
-- 2026-09-01) — the Twilio bridge's two numbers become the published lines;
-- AC's Vapi/Retell number retires after a forwarding soak (runbook:
-- docs/h11-voice-cutover-runbook-2026-09-01.md). The numbers live on the
-- voice_settings row next to the greetings (same organ), typed E.164.
--   published_lines()  — any signed-in member (tenant/vendor included: a
--                        published number is public by definition) reads
--                        {tenant, leasing, updated_at}; '' = not published.
--   set_voice_lines()  — operator-only writer; normalizes any US format to
--                        E.164, raises on shape, refuses identical lines.
-- Additive + reversible (drop the two columns + three functions).

alter table public.voice_settings
  add column if not exists tenant_number  text not null default '',
  add column if not exists leasing_number text not null default '';

alter table public.voice_settings drop constraint if exists voice_settings_tenant_number_shape;
alter table public.voice_settings add constraint voice_settings_tenant_number_shape
  check (tenant_number = '' or tenant_number ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$');
alter table public.voice_settings drop constraint if exists voice_settings_leasing_number_shape;
alter table public.voice_settings add constraint voice_settings_leasing_number_shape
  check (leasing_number = '' or leasing_number ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$');

-- '' stays ''; "(337) 555-0100" / "337-555-0100" / "+1 337 555 0100" → '+13375550100';
-- anything else raises (NANP: area + exchange can't start with 0/1).
create or replace function public.voice_line_e164(p_raw text)
returns text language plpgsql immutable as $$
declare v_digits text := regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g');
begin
  if v_digits = '' then return ''; end if;
  if length(v_digits) = 11 and left(v_digits, 1) = '1' then v_digits := substr(v_digits, 2); end if;
  if v_digits !~ '^[2-9][0-9]{2}[2-9][0-9]{6}$' then
    raise exception 'phone shape: expected a 10-digit US number, got "%"', p_raw;
  end if;
  return '+1' || v_digits;
end $$;

create or replace function public.published_lines()
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('tenant', s.tenant_number, 'leasing', s.leasing_number, 'updated_at', s.updated_at)
       from voice_settings s where s.id = 'otb'),
    jsonb_build_object('tenant', '', 'leasing', '', 'updated_at', null));
$$;
revoke all on function public.published_lines() from public;
grant execute on function public.published_lines() to authenticated;

create or replace function public.set_voice_lines(p_tenant text, p_leasing text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_t text; v_l text;
begin
  if not is_operator() then
    raise exception 'unauthorized';
  end if;
  v_t := voice_line_e164(p_tenant);
  v_l := voice_line_e164(p_leasing);
  if v_t <> '' and v_t = v_l then
    raise exception 'tenant and leasing lines must differ';
  end if;
  update voice_settings set tenant_number = v_t, leasing_number = v_l, updated_at = now() where id = 'otb';
  if not found then
    raise exception 'voice_settings row missing';
  end if;
  return published_lines();
end $$;
revoke all on function public.set_voice_lines(text, text) from public;
grant execute on function public.set_voice_lines(text, text) to authenticated;
