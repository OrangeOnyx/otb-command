-- Phase B-5 purge #7 (B): verify the typed backfill equals the blobs, port the
-- last property_state reader, then drop the table. The verification RAISES on
-- any mismatch, so at merge time a bad backfill aborts the merge with
-- property_state intact. Applied to prod via merge_branch 2026-08-04; the
-- guard passed against live prod data (comp 297 rows verified equal).

do $$
declare ok boolean;
begin
  select coalesce((select data from property_state where layer='comp'), '{}'::jsonb) =
    (select coalesce(jsonb_object_agg(unit, per_unit), '{}'::jsonb)
       from (select unit, jsonb_object_agg(field, state) as per_unit
             from comp_state group by unit) x) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: comp'; end if;

  select coalesce((select data from property_state where layer='notes'), '{}'::jsonb) =
    (select coalesce(jsonb_object_agg(unit, to_jsonb(text)), '{}'::jsonb) from unit_notes) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: notes'; end if;

  select coalesce((select data from property_state where layer='actions'),
                  '{"lane":{},"edit":{},"dismissed":{},"custom":[]}'::jsonb) =
    jsonb_build_object(
      'lane',      coalesce((select jsonb_object_agg(card_id, lane) from board_state where lane is not null), '{}'::jsonb),
      'edit',      coalesce((select jsonb_object_agg(card_id, edit) from board_state where edit is not null), '{}'::jsonb),
      'dismissed', coalesce((select jsonb_object_agg(card_id, to_jsonb(dismissed)) filter (where dismissed) from board_state), '{}'::jsonb),
      'custom',    coalesce((select jsonb_agg(custom order by pos) from board_state where custom is not null), '[]'::jsonb)) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: actions'; end if;

  select bool_and(o) from (
    select coalesce((select data from property_state where layer = v.coll),
                    '{"edit":{},"dismissed":{},"custom":[]}'::jsonb) =
      jsonb_build_object(
        'edit',      coalesce((select jsonb_object_agg(id, edit) from directory_state where collection = v.coll and edit is not null), '{}'::jsonb),
        'dismissed', coalesce((select jsonb_object_agg(id, to_jsonb(dismissed)) filter (where dismissed) from directory_state where collection = v.coll), '{}'::jsonb),
        'custom',    coalesce((select jsonb_agg(custom order by pos) from directory_state where collection = v.coll and custom is not null), '[]'::jsonb)) as o
    from (values ('contacts'), ('documents')) v(coll)) t into ok;
  if not ok then raise exception 'typed_layers verify FAIL: directory'; end if;

  select coalesce((select data from property_state where layer='features'), '[]'::jsonb) =
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', type,
       'label', label, 'note', note, 'x', x, 'y', y) order by pos), '[]'::jsonb)
     from site_features) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: features'; end if;

  select coalesce((select data from property_state where layer='cameras'), '{}'::jsonb) =
    (select coalesce(jsonb_object_agg(camera_id,
       jsonb_strip_nulls(jsonb_build_object('x', x, 'y', y, 'aimDeg', aim_deg))), '{}'::jsonb)
     from camera_overrides) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: cameras'; end if;

  select coalesce((select data from property_state where layer='financials'), 'null'::jsonb) =
         coalesce((select data from layer_settings where key='financials'), 'null'::jsonb) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: financials'; end if;

  select coalesce((select data from property_state where layer='ownerSheets'), 'null'::jsonb) =
         coalesce((select data from layer_settings where key='owner_sheets'), 'null'::jsonb) into ok;
  if not ok then raise exception 'typed_layers verify FAIL: ownerSheets'; end if;
end $$;

-- port the last reader: same signature, same auto_trigger secret gate,
-- same return shape { financials, actions }
create or replace function public.get_brief_state(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from app_secrets where name = 'auto_trigger';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  v := jsonb_build_object(
    'financials', coalesce((select data from layer_settings
                            where property_id = default_property_id() and key = 'financials'), '{}'::jsonb),
    'actions', jsonb_build_object(
      'lane',      coalesce((select jsonb_object_agg(card_id, lane)
                             from board_state where property_id = default_property_id() and lane is not null), '{}'::jsonb),
      'edit',      coalesce((select jsonb_object_agg(card_id, edit)
                             from board_state where property_id = default_property_id() and edit is not null), '{}'::jsonb),
      'dismissed', coalesce((select jsonb_object_agg(card_id, to_jsonb(dismissed)) filter (where dismissed)
                             from board_state where property_id = default_property_id()), '{}'::jsonb),
      'custom',    coalesce((select jsonb_agg(custom order by pos)
                             from board_state where property_id = default_property_id() and custom is not null), '[]'::jsonb)));
  return v;
end $$;

drop table property_state;
