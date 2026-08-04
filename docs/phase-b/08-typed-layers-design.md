# Phase B-5 / Purge #7 — Typed Layer Tables + Realtime (Design)

**Date:** 2026-08-04 · **Status:** APPROVED (operator, full delegation)
**Driver ranking (operator):** B multi-user foundation → A multi-device self-clobber → C typed-model correctness.

## Problem

All 9 persisted layers (`comp · notes · actions · contacts · documents ·
financials · ownerSheets · features · cameras`) live in `property_state` as one
JSON blob per layer. Every store mutation debounces 800 ms and then upserts
**all nine whole-layer blobs** (src/main.js sync block). Remote state is read
once at boot; there is no realtime. Consequence: any stale tab — operator on
phone + desktop today, a second operator under Phase C tomorrow — clobbers
every layer with its whole snapshot. Last-write-wins at snapshot granularity is
the bug class; purge #7 (final-build-plan §B-5) retires it.

## Decision

Replace `property_state` with typed per-row tables + a realtime channel.
Approach 2 (typed tables without realtime) and approach 3 (finer JSON blob
rows) were considered and rejected — realtime is thin plumbing once rows
exist, and finer blobs are a dead end (no typed queries, no per-table RLS).

## Schema

Seven tables + two `property_settings` rows. Every table:
`(org_id uuid, property_id uuid)` stamped · RLS via
`member_role_in(org_id, property_id, roles[])` (write = operator, read =
owner/operator — same posture `property_state` has today) · `updated_by text`,
`updated_at timestamptz`, and `origin text` (per-session client tag for
realtime self-echo suppression).

| Layer | Table | PK (after property_id) | Columns |
|---|---|---|---|
| comp | `comp_state` | (unit, field) | `state text` — valid states enforced by CHECK; `compliance_events` remains the audit trail |
| notes | `unit_notes` | (unit) | `text text` |
| actions | `board_state` | (card_id) | `lane text NULL`, `edit jsonb NULL`, `dismissed bool NOT NULL DEFAULT false`, `custom jsonb NULL` — one row per touched card; seeded cards with no overrides have no row |
| contacts + documents | `directory_state` | (collection, id) | `collection text CHECK IN ('contacts','documents')`, `edit jsonb NULL`, `dismissed bool`, `custom jsonb NULL` |
| features | `site_features` | (id) | `type text`, `label text`, `note text`, `x numeric`, `y numeric` |
| cameras | `camera_overrides` | (camera_id) | `x numeric NULL`, `y numeric NULL`, `aim_deg numeric NULL` |
| financials | `property_settings` key `financials` | (key) | jsonb `{ opex: {...}, capRatePct }` |
| ownerSheets | `property_settings` key `owner_sheets` | (key) | jsonb string[] |

`property_state` is **dropped in the same migration** after backfill +
in-SQL verification (below). Purge #7 complete — no parallel write paths, no
dual-write window.

Row semantics mirror the store's override model exactly: a row exists only
where the operator diverged from seed/SOT (notes override, board card touched,
camera dragged). Deleting an override (note reverts to SOT, camera cleared,
feature removed) = row DELETE, not a null-ing update.

## Client architecture

**Registry grows a row contract (src/lib/layers.js).** Each `LAYER_DEFS` entry
gains:

- `toRows(layerState)` → canonical row array for the layer (used by sync
  diffing, backfill verification in tests, initial seed-push, and import).
- `fromRows(rows)` → layer state (used by `loadState` reassembly and realtime
  folding).
- Shared `diffRows(prevRows, nextRows)` (one generic function, not per-layer)
  → minimal upsert/delete op set keyed by PK. Every mutation recomputes the
  affected layer's `toRows` and diffs against the last-flushed row cache —
  one uniform mechanism for mutations, import, and seed-push alike (layers
  are small; the diff is cheap).

Round-trip law per layer: `fromRows(toRows(s))` ≡ `s` (unit-tested).

**Store (src/store.js).** Public API (reads, mutations, subscribe/emit,
exportJSON/importJSON, snapshot shape) is **unchanged — views are untouched.**
Internally each mutation, in addition to `persist()` + `emit`, enqueues a
row-level op `{table, pk, op: 'upsert'|'delete', row}` on a sync queue.
localStorage remains the offline cache and the whole of local-only (no-env)
mode.

**Sync queue (src/lib/remote.js).** Debounced flush (800 ms, unchanged
cadence): ops coalesce by (table, pk) — last op wins — then batch per table
(`upsert` array / `delete` by PK list). Flush failures keep ops queued and
retry on next mutation or a 30 s timer; a warning surfaces in console exactly
like today's `sync push failed`. `loadState()` reassembles the full snapshot
from the typed tables at boot via `fromRows` per layer; `hydrateRemote` is
unchanged. Import (`importJSON`) computes ops as a full diff old→new and rides
the same queue.

**Realtime (new, src/lib/realtime.js).** One Supabase channel per property:
`postgres_changes` on the 7 tables filtered `property_id=eq.<uuid>`. Incoming
change → skip if `origin` = this session's tag → fold the row through the
layer's `fromRows` merge into store state → validate through the existing
`applySnapshot` branch for that layer → `emit(layerKey)` → views re-render
through the subscription they already have. Channel drop → resubscribe with a
full `loadState()` re-pull (missed-window repair). Realtime publication is
enabled for the 7 tables in the migration.

**Conflict rule:** per-row last-write-wins. At (unit, field) / (card) / (pin)
granularity this is correct behavior, not a compromise.

## Migration & rollout (B-1 discipline)

1. **Supabase branch** (schema+data), migrations authored + applied on branch.
2. Migration `typed_layers`: create 7 tables + RLS + realtime publication →
   backfill by exploding `property_state` jsonb per layer → **in-SQL
   verification**: reassemble each layer from rows and `ASSERT` jsonb equality
   with the blob (modulo key order) **before** `DROP TABLE property_state` in
   the same transaction.
3. Code port on master (registry contract, store queue, remote, realtime).
   ⚠ **Merge coupling:** master speaks the new schema — no `vercel deploy`
   until `merge_branch`, then deploy immediately.
4. `assert-suite.sql` extended to the 7 new tables × 5 personas (operator
   write / owner read-only / tenant-vendor-stranger blind), plus
   realtime-publication presence asserts. SUITE_PASS_ROLLBACK on branch gates
   the merge.
5. Two-browser realtime smoke on branch preview (edit in A appears in B; no
   self-echo loops).
6. `merge_branch` → immediate `vercel deploy --prod` → re-run assert suite
   against prod as the smoke → delete branch (stop billing).

## Testing

- Round-trip + op-coalescing unit tests per layer (pure, in `test/`).
- Freshness/regression: full suite (289) must stay green — store public API
  frozen makes this mostly automatic.
- RLS: assert suite (above).
- Realtime: branch smoke (manual, two browsers) — not unit-tested; the folding
  path shares `applySnapshot` validation which is already covered.

## Explicitly out of scope (YAGNI)

- Per-layer owner visibility RLS (the open owner-layer decision) — enabled by
  this schema, decided later.
- New audit/event tables beyond `compliance_events` — `updated_by/updated_at`
  suffice.
- CRDT/merge semantics beyond per-row LWW.
- Multi-property UI (property switcher is B-3).
