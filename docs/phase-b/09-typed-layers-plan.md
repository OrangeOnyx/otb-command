# Typed Layer Tables + Realtime (Purge #7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `property_state` JSON-blob table with 7 typed per-row tables, per-row delta sync, and a realtime channel, per `docs/phase-b/08-typed-layers-design.md`.

**Architecture:** The layer registry (`src/lib/layers.js`) gains a row contract (`table/pk/toRows/fromRows`); a pure seam (`src/lib/statesync.js`) diffs row sets into minimal upsert/delete ops; `remote.js` batches ops to Supabase and reassembles snapshots at boot; a realtime channel folds remote changes back through the store. Store public API and views are untouched. DB work rides a Supabase branch, merge-gated by the assert suite (B-1 discipline).

**Tech Stack:** Vanilla JS (Vite), `node --test`, Supabase (Postgres RLS + Realtime), Supabase MCP for branch/migrations.

## Global Constraints

- Snapshot shape (localStorage, exportJSON/importJSON, `hydrateRemote`) is FROZEN — views and store public API unchanged.
- Row semantics: a row exists only where the operator diverged (except `comp_state`: full grid, matching today's blob).
- Conflict rule: per-row last-write-wins. No CRDTs.
- All tables `(org_id, property_id)`-stamped with `default_org_id()`/`default_property_id()` defaults; RLS read = owner+operator, write = operator, via `member_role_in(org_id, property_id, array[...])` — the exact `property_state` posture.
- ⚠ MERGE COUPLING: after the code port, master speaks the new schema — NO `vercel deploy` until `merge_branch`, then deploy immediately.
- Quality gate before every commit: `npm test` green (289+ tests).
- Secrets: never on disk/chat/repo; branch keys via `npx vercel env pull` drill or MCP, deleted after use.
- Layer keys ↔ tables: comp→`comp_state` · notes→`unit_notes` · actions→`board_state` · contacts+documents→`directory_state` · features→`site_features` · cameras→`camera_overrides` · financials+ownerSheets→`layer_settings` (keys `financials`/`owner_sheets`).

---

### Task 1: Row contract in the layer registry

**Files:**
- Modify: `src/lib/layers.js`
- Test: `test/layers-rows.test.mjs` (new)

**Interfaces:**
- Produces: each `LAYER_DEFS` entry gains `{ table, pk, toRows(layerState), fromRows(rows) }`; new export `ROW_TABLES` (unique table list). `toRows` returns rows WITHOUT tenancy stamps/origin (added at flush). `fromRows` accepts raw DB rows (extra columns ignored) and must return the exact layer state shape.
- PKs (after `property_id`): comp `["unit","field"]` · notes `["unit"]` · actions `["card_id"]` · contacts/documents `["collection","id"]` · features `["id"]` · cameras `["camera_id"]` · financials/ownerSheets `["key"]`.

- [ ] **Step 1: Write failing round-trip tests**

```js
// test/layers-rows.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAYER_DEFS } from "../src/lib/layers.js";

const D = Object.fromEntries(LAYER_DEFS.map(d => [d.key, d]));

const FIX = {
  comp: { "131": { coi: "ok", lease: "flag" }, "105": { coi: "u" } },
  notes: { "131": "LOI pending", "105": "call re: sign" },
  actions: {
    lane: { "seed:1": "done" }, edit: { "seed:1": { title: "T" } },
    dismissed: { "seed:2": true },
    custom: [{ id: "user:a", kind: "task", lane: "action", title: "A", detail: "", due: "" },
             { id: "user:b", kind: "task", lane: "watch", title: "B", detail: "d", due: "2026-09-01" }]
  },
  contacts: { edit: { "c:1": { phone: "337" } }, dismissed: { "c:2": true },
              custom: [{ id: "c:u1", name: "Smoke Co" }] },
  documents: { edit: {}, dismissed: {}, custom: [{ id: "d:u1", title: "Plat" }] },
  financials: { opex: { taxes: 1000, insurance: 0, cam: 0, mgmt: 0, utilities: 0, reserves: 0 }, capRatePct: 7.5 },
  ownerSheets: ["dash", "roll"],
  features: [{ id: "sf1", type: "shutoff", label: "L", note: "", x: 100.5, y: 200 },
             { id: "sf2", type: "other", label: "", note: "n", x: 1, y: 2 }],
  cameras: { cam1: { x: 10, y: 20, aimDeg: 90 }, cam2: { aimDeg: 45 } },
};

for (const [key, fixture] of Object.entries(FIX)) {
  test(`round-trip ${key}: fromRows(toRows(s)) === s`, () => {
    const d = D[key];
    assert.ok(d.table && d.pk && d.toRows && d.fromRows, `${key} has row contract`);
    assert.deepEqual(d.fromRows(d.toRows(fixture)), fixture);
  });
}

test("board rows: fully-empty overrides produce no row", () => {
  const rows = D.actions.toRows({ lane: {}, edit: {}, dismissed: {}, custom: [] });
  assert.equal(rows.length, 0);
});

test("custom order survives via pos", () => {
  const rows = D.actions.toRows(FIX.actions);
  const customs = rows.filter(r => r.custom).sort((a, b) => a.pos - b.pos);
  assert.deepEqual(customs.map(r => r.card_id), ["user:a", "user:b"]);
});

test("directory rows carry the collection discriminator", () => {
  const rows = D.contacts.toRows(FIX.contacts);
  assert.ok(rows.every(r => r.collection === "contacts"));
});

test("camera rows omit absent x/y and round-trip partial overrides", () => {
  const rows = D.cameras.toRows(FIX.cameras);
  const cam2 = rows.find(r => r.camera_id === "cam2");
  assert.equal(cam2.x, null); assert.equal(cam2.y, null); assert.equal(cam2.aim_deg, 45);
});
```

- [ ] **Step 2: Run — expect FAIL** (`node --test test/layers-rows.test.mjs` → contract fields undefined)

- [ ] **Step 3: Implement the contract in `src/lib/layers.js`**

Append table/pk/toRows/fromRows to each `LAYER_DEFS` entry (keep existing `key`/`empty` untouched). Full implementation:

```js
/* ── row contract (Phase B-5 typed layers) ────────────────────────
   toRows(layerState) → canonical row array (no tenancy stamps — remote adds
   org_id/property_id/origin at flush). fromRows(rows) → layer state; extra DB
   columns ignored. Law: fromRows(toRows(s)) ≡ s (test/layers-rows.test.mjs).
   pos int preserves array order (custom cards, features) across the DB. */
const numOrNull = v => (Number.isFinite(+v) && v !== null && v !== "" ? +v : null);

const overrideRows = collection => ({
  toRows(s) {
    const ids = new Set([
      ...Object.keys(s.edit || {}), ...Object.keys(s.dismissed || {}),
      ...(s.custom || []).map(c => c.id),
    ]);
    if (!collection) for (const k of Object.keys(s.lane || {})) ids.add(k);
    const rows = [];
    for (const id of ids) {
      const custom = (s.custom || []).find(c => c.id === id) || null;
      const row = {
        edit: s.edit?.[id] || null,
        dismissed: !!s.dismissed?.[id],
        custom,
        pos: custom ? (s.custom || []).findIndex(c => c.id === id) : null,
      };
      if (collection) { row.collection = collection; row.id = id; }
      else { row.card_id = id; row.lane = s.lane?.[id] || null; }
      if (!row.lane && !row.edit && !row.dismissed && !row.custom && !collection) continue;
      if (collection && !row.edit && !row.dismissed && !row.custom) continue;
      rows.push(row);
    }
    return rows;
  },
  fromRows(rows) {
    const s = collection ? { edit: {}, dismissed: {}, custom: [] }
                         : { lane: {}, edit: {}, dismissed: {}, custom: [] };
    const customs = [];
    for (const r of rows || []) {
      const id = collection ? r.id : r.card_id;
      if (!collection && r.lane) s.lane[id] = r.lane;
      if (r.edit) s.edit[id] = r.edit;
      if (r.dismissed) s.dismissed[id] = true;
      if (r.custom) customs.push(r);
    }
    s.custom = customs.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)).map(r => r.custom);
    return s;
  },
});

const singletonRows = key => ({
  toRows: s => [{ key, data: s }],
  fromRows: rows => (rows || []).find(r => r.key === key)?.data,
});
```

Then merge into `LAYER_DEFS` (replace the existing array literal — every entry keeps its `empty`):

```js
export const LAYER_DEFS = [
  { key: "comp", empty: null, table: "comp_state", pk: ["unit", "field"],
    toRows(s) {
      const rows = [];
      for (const [unit, fields] of Object.entries(s || {}))
        for (const [field, state] of Object.entries(fields || {}))
          rows.push({ unit, field, state });
      return rows;
    },
    fromRows(rows) {
      const s = {};
      for (const r of rows || []) { (s[r.unit] ||= {})[r.field] = r.state; }
      return s;
    } },
  { key: "notes", empty: () => ({}), table: "unit_notes", pk: ["unit"],
    toRows: s => Object.entries(s || {}).map(([unit, text]) => ({ unit, text })),
    fromRows: rows => Object.fromEntries((rows || []).map(r => [r.unit, r.text])) },
  { key: "actions", empty: () => ({ lane: {}, edit: {}, dismissed: {}, custom: [] }),
    table: "board_state", pk: ["card_id"], ...overrideRows(null) },
  { key: "contacts", empty: emptyColl, table: "directory_state",
    pk: ["collection", "id"], ...overrideRows("contacts") },
  { key: "documents", empty: emptyColl, table: "directory_state",
    pk: ["collection", "id"], ...overrideRows("documents") },
  { key: "financials", empty: () => ({ opex: emptyOpex(), capRatePct: null }),
    table: "layer_settings", pk: ["key"], ...singletonRows("financials") },
  { key: "ownerSheets", empty: () => [...DEFAULT_OWNER_SHEETS],
    table: "layer_settings", pk: ["key"], ...singletonRows("owner_sheets") },
  { key: "features", empty: () => [], table: "site_features", pk: ["id"],
    toRows: s => (s || []).map((f, i) => ({ id: f.id, type: f.type,
      label: f.label, note: f.note, x: f.x, y: f.y, pos: i })),
    fromRows: rows => (rows || []).slice()
      .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
      .map(r => ({ id: r.id, type: r.type, label: r.label, note: r.note, x: +r.x, y: +r.y })) },
  { key: "cameras", empty: () => ({}), table: "camera_overrides", pk: ["camera_id"],
    toRows: s => Object.entries(s || {}).map(([camera_id, o]) => ({
      camera_id, x: numOrNull(o.x), y: numOrNull(o.y), aim_deg: numOrNull(o.aimDeg) })),
    fromRows(rows) {
      const s = {};
      for (const r of rows || []) {
        const o = {};
        if (r.x != null && r.y != null) { o.x = +r.x; o.y = +r.y; }
        if (r.aim_deg != null) o.aimDeg = +r.aim_deg;
        if (Object.keys(o).length) s[r.camera_id] = o;
      }
      return s;
    } },
];

export const ROW_TABLES = [...new Set(LAYER_DEFS.map(d => d.table))];
```

⚠ `overrideRows`/`singletonRows`/`numOrNull` must be defined ABOVE `LAYER_DEFS`. `emptyColl`/`emptyOpex` already exist above it.

- [ ] **Step 4: Run tests — expect PASS** (`node --test test/layers-rows.test.mjs`), then full suite `npm test` (existing layers/store tests must stay green — `LAYER_KEYS`, `emptyLayers`, `snapshotOf` unchanged).

- [ ] **Step 5: Commit** — `git add src/lib/layers.js test/layers-rows.test.mjs && git commit -m "Add typed-row contract to the layer registry (B-5)"`

---

### Task 2: Pure sync seam — diff, coalesce, batch

**Files:**
- Create: `src/lib/statesync.js`
- Test: `test/statesync.test.mjs` (new)

**Interfaces:**
- Consumes: `LAYER_DEFS` row contract (Task 1).
- Produces:
  - `rowKey(pk, row)` → stable string key from PK cols.
  - `diffRows(prevRows, nextRows, pk)` → `{ upserts: row[], deletes: row[] }` (deletes carry PK cols only; upserts only for added/changed rows by deep-equal).
  - `SyncQueue` class: `queue(layerDef, rows)` (diffs vs internal per-layer cache, coalesces by (table,key) last-op-wins, updates cache), `drain()` → `[{ table, upserts, deletes }]` and clears pending (cache stays), `pendingFor(table)` → bool, `prime(layerDef, rows)` (set cache without producing ops — boot + realtime re-pull).

- [ ] **Step 1: Write failing tests**

```js
// test/statesync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowKey, diffRows, SyncQueue } from "../src/lib/statesync.js";
import { LAYER_DEFS } from "../src/lib/layers.js";

const notesDef = LAYER_DEFS.find(d => d.key === "notes");
const compDef = LAYER_DEFS.find(d => d.key === "comp");

test("rowKey joins pk columns", () => {
  assert.equal(rowKey(["unit", "field"], { unit: "131", field: "coi" }), "131 coi");
});

test("diffRows: added, changed, removed, unchanged", () => {
  const prev = [{ unit: "131", text: "a" }, { unit: "105", text: "b" }];
  const next = [{ unit: "131", text: "a2" }, { unit: "149", text: "c" }];
  const { upserts, deletes } = diffRows(prev, next, ["unit"]);
  assert.deepEqual(upserts.map(r => r.unit).sort(), ["131", "149"]);
  assert.deepEqual(deletes, [{ unit: "105" }]);
});

test("diffRows deep-equals row values (no spurious upserts)", () => {
  const a = [{ unit: "131", text: "same" }];
  const { upserts, deletes } = diffRows(a, [{ unit: "131", text: "same" }], ["unit"]);
  assert.equal(upserts.length + deletes.length, 0);
});

test("SyncQueue coalesces per row, last op wins", () => {
  const q = new SyncQueue();
  q.prime(notesDef, []);
  q.queue(notesDef, notesDef.toRows({ "131": "v1" }));
  q.queue(notesDef, notesDef.toRows({ "131": "v2" }));
  const batches = q.drain();
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].upserts, [{ unit: "131", text: "v2" }]);
  assert.equal(batches[0].deletes.length, 0);
});

test("SyncQueue upsert-then-revert coalesces to delete", () => {
  const q = new SyncQueue();
  q.prime(notesDef, notesDef.toRows({ "131": "orig" }));
  q.queue(notesDef, notesDef.toRows({ "131": "edited" }));
  q.queue(notesDef, notesDef.toRows({}));           // revert to SOT → row delete
  const [b] = q.drain();
  assert.equal(b.upserts.length, 0);
  assert.deepEqual(b.deletes, [{ unit: "131" }]);
});

test("drain clears pending but keeps cache", () => {
  const q = new SyncQueue();
  q.prime(compDef, []);
  q.queue(compDef, compDef.toRows({ "131": { coi: "ok" } }));
  assert.ok(q.pendingFor("comp_state"));
  q.drain();
  assert.ok(!q.pendingFor("comp_state"));
  q.queue(compDef, compDef.toRows({ "131": { coi: "ok" } })); // same as cache
  assert.equal(q.drain().length, 0);
});

test("prime does not produce ops", () => {
  const q = new SyncQueue();
  q.prime(notesDef, notesDef.toRows({ "131": "x" }));
  assert.equal(q.drain().length, 0);
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing)

- [ ] **Step 3: Implement `src/lib/statesync.js`**

```js
/* Pure per-row sync engine (Phase B-5). Diffs canonical row sets from the
   layer registry into minimal upsert/delete ops, coalesced per (table, pk).
   No Supabase imports — remote.js executes the batches this produces. */

export const rowKey = (pk, row) => pk.map(c => String(row[c])).join(" ");

const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function diffRows(prevRows, nextRows, pk) {
  const prev = new Map((prevRows || []).map(r => [rowKey(pk, r), r]));
  const next = new Map((nextRows || []).map(r => [rowKey(pk, r), r]));
  const upserts = [], deletes = [];
  for (const [k, row] of next) if (!prev.has(k) || !deepEq(prev.get(k), row)) upserts.push(row);
  for (const [k, row] of prev) if (!next.has(k))
    deletes.push(Object.fromEntries(pk.map(c => [c, row[c]])));
  return { upserts, deletes };
}

export class SyncQueue {
  constructor() {
    this.cache = new Map();   // table → Map(key → row)   (server truth)
    this.pending = new Map(); // table → { pk, ops: Map(key → {op,row}) }
  }
  _table(def) {
    if (!this.cache.has(def.table)) this.cache.set(def.table, new Map());
    return this.cache.get(def.table);
  }
  /* Set server truth for a layer without generating ops (boot, re-pull).
     Layers can share a table (directory_state, layer_settings) — prime and
     queue therefore only touch this layer's OWN rows within the table. */
  prime(def, rows) {
    const t = this._table(def);
    for (const k of this._layerKeys(def, t)) t.delete(k);
    for (const r of rows || []) t.set(rowKey(def.pk, r), r);
  }
  _layerKeys(def, t) {
    // keys in the cache belonging to this layer (matters for shared tables)
    const mine = new Set((def.toRows ? [] : []));
    const out = [];
    for (const [k, row] of t) {
      if (def.table === "directory_state" && row.collection !== (def.key === "contacts" ? "contacts" : "documents")) continue;
      if (def.table === "layer_settings" && row.key !== (def.key === "financials" ? "financials" : "owner_sheets")) continue;
      out.push(k);
    }
    return out;
  }
  queue(def, rows) {
    const t = this._table(def);
    const prev = this._layerKeys(def, t).map(k => t.get(k));
    const { upserts, deletes } = diffRows(prev, rows, def.pk);
    if (!upserts.length && !deletes.length) return;
    if (!this.pending.has(def.table))
      this.pending.set(def.table, { pk: def.pk, ops: new Map() });
    const p = this.pending.get(def.table);
    for (const r of upserts) { p.ops.set(rowKey(def.pk, r), { op: "upsert", row: r }); t.set(rowKey(def.pk, r), r); }
    for (const r of deletes) { p.ops.set(rowKey(def.pk, r), { op: "delete", row: r }); t.delete(rowKey(def.pk, r)); }
  }
  pendingFor(table) { return this.pending.has(table); }
  drain() {
    const out = [];
    for (const [table, { pk, ops }] of this.pending) {
      const upserts = [], deletes = [];
      for (const { op, row } of ops.values()) (op === "upsert" ? upserts : deletes).push(row);
      out.push({ table, pk, upserts, deletes });
    }
    this.pending.clear();
    return out;
  }
}
```

⚠ Simplification during implementation: `_layerKeys`'s per-layer filter can instead live on the layer def as `ownsRow(row)` (contacts: `r.collection==='contacts'`; financials: `r.key==='financials'`; all single-table layers: `() => true`) — add `ownsRow` to `LAYER_DEFS` in Task 1 if this reads cleaner. Keep behavior identical: shared-table layers must never delete each other's rows.

- [ ] **Step 4: Run tests — PASS**, then `npm test`.

- [ ] **Step 5: Commit** — `"Add pure per-row sync engine (statesync seam, B-5)"`

---

### Task 3: Supabase branch + migration A (create + backfill + verify)

**Files:**
- Create: `supabase-branch` via MCP `create_branch` (name `typed-layers`) — schema+data branch, ~$0.01/hr, delete at merge.
- Migration on branch via MCP `apply_migration`, name `typed_layers`.

**Interfaces:**
- Produces: 7 tables live on branch, backfilled from `property_state` (which REMAINS until migration B); realtime publication + `REPLICA IDENTITY FULL`; shared stamp trigger.

- [ ] **Step 1: `create_branch` (MCP)** — confirm cost, note project_ref.

- [ ] **Step 2: `apply_migration` name `typed_layers`:**

```sql
-- Phase B-5 purge #7 (A): typed layer tables + backfill. property_state stays
-- until migration B (drop) so verification can compare both representations.

-- shared audit stamp (insert + update; origin is client-provided, untouched)
create or replace function public.stamp_layer_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', '');
  return new;
end $$;

create table comp_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  field text not null,
  state text not null check (state in ('u','ok','flag','na')),
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, unit, field)
);

create table unit_notes (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  unit text not null,
  text text not null,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, unit)
);

create table board_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  card_id text not null,
  lane text check (lane in ('watch','action','progress','done')),
  edit jsonb,
  dismissed boolean not null default false,
  custom jsonb,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, card_id)
);

create table directory_state (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  collection text not null check (collection in ('contacts','documents')),
  id text not null,
  edit jsonb,
  dismissed boolean not null default false,
  custom jsonb,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, collection, id)
);

create table site_features (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  id text not null,
  type text not null,
  label text not null default '',
  note text not null default '',
  x numeric not null,
  y numeric not null,
  pos integer,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, id)
);

create table camera_overrides (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  camera_id text not null,
  x numeric,
  y numeric,
  aim_deg numeric,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, camera_id)
);

create table layer_settings (
  org_id uuid not null default default_org_id() references orgs(id),
  property_id uuid not null default default_property_id() references properties(id),
  key text not null check (key in ('financials','owner_sheets')),
  data jsonb not null,
  origin text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (property_id, key)
);

do $$
declare t text;
begin
  foreach t in array array['comp_state','unit_notes','board_state',
    'directory_state','site_features','camera_overrides','layer_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner+operator read" on %I for select using
      (member_role_in(org_id, property_id, array[''owner'',''operator'']))', t);
    execute format('create policy "operator insert" on %I for insert with check
      (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create policy "operator update" on %I for update
      using (member_role_in(org_id, property_id, array[''operator'']))
      with check (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create policy "operator delete" on %I for delete using
      (member_role_in(org_id, property_id, array[''operator'']))', t);
    execute format('create trigger stamp before insert or update on %I
      for each row execute function stamp_layer_row()', t);
    execute format('alter table %I replica identity full', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;

-- ── backfill from property_state ────────────────────────────────
insert into comp_state (org_id, property_id, unit, field, state)
select ps.org_id, ps.property_id, u.key, f.key, f.value #>> '{}'
from property_state ps,
     lateral jsonb_each(ps.data) u(key, value),
     lateral jsonb_each(u.value) f(key, value)
where ps.layer = 'comp';

insert into unit_notes (org_id, property_id, unit, text)
select ps.org_id, ps.property_id, n.key, n.value
from property_state ps, lateral jsonb_each_text(ps.data) n(key, value)
where ps.layer = 'notes';

with src as (select org_id, property_id, data from property_state where layer = 'actions'),
custom as (
  select s.org_id, s.property_id, c.value as card, (c.ordinality - 1)::int as pos,
         c.value ->> 'id' as id
  from src s, jsonb_array_elements(s.data -> 'custom') with ordinality c),
ids as (
  select s.org_id, s.property_id, k as id from src s, jsonb_object_keys(s.data -> 'lane') k
  union select s.org_id, s.property_id, k from src s, jsonb_object_keys(s.data -> 'edit') k
  union select s.org_id, s.property_id, k from src s, jsonb_object_keys(s.data -> 'dismissed') k
  union select org_id, property_id, id from custom)
insert into board_state (org_id, property_id, card_id, lane, edit, dismissed, custom, pos)
select i.org_id, i.property_id, i.id,
       s.data -> 'lane' ->> i.id,
       s.data -> 'edit' -> i.id,
       coalesce((s.data -> 'dismissed' ->> i.id)::boolean, false),
       c.card, c.pos
from ids i
join src s on s.property_id = i.property_id
left join custom c on c.property_id = i.property_id and c.id = i.id;

with src as (select org_id, property_id, layer as collection, data
             from property_state where layer in ('contacts','documents')),
custom as (
  select s.org_id, s.property_id, s.collection, c.value as card,
         (c.ordinality - 1)::int as pos, c.value ->> 'id' as id
  from src s, jsonb_array_elements(s.data -> 'custom') with ordinality c),
ids as (
  select s.org_id, s.property_id, s.collection, k as id
    from src s, jsonb_object_keys(s.data -> 'edit') k
  union select s.org_id, s.property_id, s.collection, k
    from src s, jsonb_object_keys(s.data -> 'dismissed') k
  union select org_id, property_id, collection, id from custom)
insert into directory_state (org_id, property_id, collection, id, edit, dismissed, custom, pos)
select i.org_id, i.property_id, i.collection, i.id,
       s.data -> 'edit' -> i.id,
       coalesce((s.data -> 'dismissed' ->> i.id)::boolean, false),
       c.card, c.pos
from ids i
join src s on s.property_id = i.property_id and s.collection = i.collection
left join custom c on c.property_id = i.property_id and c.collection = i.collection and c.id = i.id;

insert into site_features (org_id, property_id, id, type, label, note, x, y, pos)
select ps.org_id, ps.property_id, f.value ->> 'id', f.value ->> 'type',
       coalesce(f.value ->> 'label', ''), coalesce(f.value ->> 'note', ''),
       (f.value ->> 'x')::numeric, (f.value ->> 'y')::numeric, (f.ordinality - 1)::int
from property_state ps, jsonb_array_elements(ps.data) with ordinality f
where ps.layer = 'features';

insert into camera_overrides (org_id, property_id, camera_id, x, y, aim_deg)
select ps.org_id, ps.property_id, c.key,
       (c.value ->> 'x')::numeric, (c.value ->> 'y')::numeric,
       (c.value ->> 'aimDeg')::numeric
from property_state ps, lateral jsonb_each(ps.data) c(key, value)
where ps.layer = 'cameras';

insert into layer_settings (org_id, property_id, key, data)
select org_id, property_id,
       case layer when 'ownerSheets' then 'owner_sheets' else 'financials' end, data
from property_state where layer in ('financials','ownerSheets');
```

- [ ] **Step 3: Verify backfill on branch (MCP `execute_sql`, one query per layer — every `*_ok` must be `true`):**

```sql
select
  coalesce((select data from property_state where layer='comp'), '{}'::jsonb) =
  (select coalesce(jsonb_object_agg(unit, per_unit), '{}'::jsonb)
     from (select unit, jsonb_object_agg(field, to_jsonb(state) #>> '{}') as per_unit
           from comp_state group by unit) x) as comp_ok;
```

⚠ If jsonb string-vs-value comparison trips here, use this exact form instead: `jsonb_object_agg(field, state)` builds strings already — assert with `= (select data from property_state where layer='comp')`. Diagnose any mismatch with a per-unit `except`-style query before proceeding. Remaining checks:

```sql
select coalesce((select data from property_state where layer='notes'), '{}'::jsonb) =
  (select coalesce(jsonb_object_agg(unit, to_jsonb(text)), '{}'::jsonb) from unit_notes) as notes_ok;

select coalesce((select data from property_state where layer='actions'),
                '{"lane":{},"edit":{},"dismissed":{},"custom":[]}'::jsonb) =
  jsonb_build_object(
    'lane',      coalesce((select jsonb_object_agg(card_id, to_jsonb(lane) #>> '{}') from board_state where lane is not null), '{}'::jsonb),
    'edit',      coalesce((select jsonb_object_agg(card_id, edit) from board_state where edit is not null), '{}'::jsonb),
    'dismissed', coalesce((select jsonb_object_agg(card_id, to_jsonb(dismissed)) filter (where dismissed) from board_state), '{}'::jsonb),
    'custom',    coalesce((select jsonb_agg(custom order by pos) from board_state where custom is not null), '[]'::jsonb)) as actions_ok;

-- contacts + documents: same shape as actions minus lane, per collection
select bool_and(ok) as directory_ok from (
  select coll, coalesce((select data from property_state where layer = coll),
                        '{"edit":{},"dismissed":{},"custom":[]}'::jsonb) =
    jsonb_build_object(
      'edit',      coalesce((select jsonb_object_agg(id, edit) from directory_state where collection = coll and edit is not null), '{}'::jsonb),
      'dismissed', coalesce((select jsonb_object_agg(id, to_jsonb(dismissed)) filter (where dismissed) from directory_state where collection = coll), '{}'::jsonb),
      'custom',    coalesce((select jsonb_agg(custom order by pos) from directory_state where collection = coll and custom is not null), '[]'::jsonb)) as ok
  from (values ('contacts'), ('documents')) v(coll)) t;

select coalesce((select data from property_state where layer='features'), '[]'::jsonb) =
  (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', type,
     'label', label, 'note', note, 'x', x, 'y', y) order by pos), '[]'::jsonb)
   from site_features) as features_ok;

select coalesce((select data from property_state where layer='cameras'), '{}'::jsonb) =
  (select coalesce(jsonb_object_agg(camera_id,
     jsonb_strip_nulls(jsonb_build_object('x', x, 'y', y, 'aimDeg', aim_deg))), '{}'::jsonb)
   from camera_overrides) as cameras_ok;

select (select data from property_state where layer='financials') =
       (select data from layer_settings where key='financials') as financials_ok;
select (select data from property_state where layer='ownerSheets') =
       (select data from layer_settings where key='owner_sheets') as owner_sheets_ok;
```

Numeric-fidelity note: `features`/`cameras` round-trip through `::numeric` — if a check fails on `20` vs `20.0`, compare with a normalizing cast and eyeball the actual rows; do NOT proceed on an unexplained mismatch.

- [ ] **Step 4:** Record branch project_ref + verification results in the session log. No commit (DB-only task).

---

### Task 4: remote.js port — typed load + batched ops

**Files:**
- Modify: `src/lib/remote.js` (replace `loadState`/`pushState`)

**Interfaces:**
- Consumes: `LAYER_DEFS` (Task 1), batches from `SyncQueue.drain()` (Task 2).
- Produces:
  - `loadState()` → snapshot object keyed by layer (only layers with rows) — SAME contract main.js already consumes, plus `loadState.lastRows` map (table → raw rows) so boot can `prime()` the queue.
  - `pushOps(batches, origin)` → applies each `{table, pk, upserts, deletes}`; returns `{ error }` with first error or null.
  - `fetchLayerRows(table)` → raw rows for one table (realtime re-pull).

- [ ] **Step 1: Replace the state block in `src/lib/remote.js`** (delete old `loadState` + `pushState`, and the now-unused `LAYER_KEYS as LAYERS` import — import `LAYER_DEFS` instead):

```js
import { LAYER_DEFS } from "./layers.js"; // single source — no twin list

/* ── typed layer state (Phase B-5, purge #7) ─────────────────────
   One row per diverged item across 7 typed tables; snapshot shape is
   reassembled via each layer's fromRows so store/views never changed. */
export async function fetchLayerRows(table) {
  const ctx = await propertyContext();
  const { data, error } = await sb.from(table).select("*").eq("property_id", ctx.property_id);
  if (error) throw error;
  return data || [];
}

export async function loadState() {
  const tables = [...new Set(LAYER_DEFS.map(d => d.table))];
  const results = await Promise.all(tables.map(t => fetchLayerRows(t)));
  const byTable = Object.fromEntries(tables.map((t, i) => [t, results[i]]));
  loadState.lastRows = byTable;
  const out = {};
  for (const d of LAYER_DEFS) {
    const rows = byTable[d.table];
    if (!rows.length) continue;
    const v = d.fromRows(rows);
    if (v === undefined) continue;                        // singleton key absent
    if (Array.isArray(v) ? v.length : Object.keys(v).length || d.key === "financials")
      out[d.key] = v;
  }
  return out;
}

/* Apply drained SyncQueue batches. Upserts in one call per table; deletes
   grouped (single-col pk via .in(); composite via per-row .match()). */
export async function pushOps(batches, origin) {
  const ctx = await propertyContext();
  for (const { table, pk, upserts, deletes } of batches) {
    if (upserts.length) {
      const rows = upserts.map(r => ({ ...r, org_id: ctx.org_id, property_id: ctx.property_id, origin }));
      const { error } = await sb.from(table).upsert(rows, { onConflict: ["property_id", ...pk].join(",") });
      if (error) return { error };
    }
    if (deletes.length) {
      if (pk.length === 1) {
        const { error } = await sb.from(table).delete()
          .eq("property_id", ctx.property_id).in(pk[0], deletes.map(r => r[pk[0]]));
        if (error) return { error };
      } else {
        for (const r of deletes) {
          const { error } = await sb.from(table).delete()
            .eq("property_id", ctx.property_id).match(Object.fromEntries(pk.map(c => [c, r[c]])));
          if (error) return { error };
        }
      }
    }
  }
  return { error: null };
}
```

⚠ Keep the comp-layer emptiness special case honest: `financials` with all-zero opex is still `{opex:{...}, capRatePct:null}` — the `|| d.key === "financials"` guard above keeps a legitimately-empty-looking financials object flowing; simplify to `out[d.key] = v` unconditionally (minus `undefined`) if the emptiness filter proves unnecessary — `hydrateRemote` treats missing and empty identically. Prefer the simpler form if `npm test` and boot smoke agree.

- [ ] **Step 2:** `node --check src/lib/remote.js` && `npm test` (remote.js has no direct unit tests; suite guards the registry contract).

- [ ] **Step 3: Commit** — `"Port remote state sync to typed layer tables (B-5)"` ⚠ From this commit forward master speaks the branch schema — NO deploy until merge.

---

### Task 5: Store additions — layer access + per-layer hydrate

**Files:**
- Modify: `src/store.js`

**Interfaces:**
- Produces: `getLayerState(key)` → live layer state reference (callers must not mutate); `hydrateLayer(key, layerState, meta)` → reset that layer to empty, apply through `applySnapshot` validation, persist, `emit(key, { remote: true, ...meta })`.
- Consumes: nothing new.

- [ ] **Step 1: Add both exports** (place after `hydrateRemote`):

```js
/* ---------- per-layer access + realtime fold (B-5) ---------- */
export function getLayerState(key) { return state[key]; }

/* Replace ONE layer with server truth (realtime re-pull). Reset-then-apply:
   applySnapshot merges INTO existing state, so a remote delete only lands if
   the layer is first reset to empty. emit carries remote:true so the sync
   wiring in main.js does not diff-push the server's own change back. */
export function hydrateLayer(key, layerState, meta = {}) {
  const defaults = emptyLayers({ comp: baselineComp });
  if (!(key in defaults)) return;
  state[key] = defaults[key];
  applySnapshot({ [key]: layerState });
  persist();
  emit(key, { remote: true, ...meta });
}
```

- [ ] **Step 2:** `node --check src/store.js` && `npm test`.
- [ ] **Step 3: Commit** — `"Add per-layer store hydrate for realtime folding (B-5)"`

---

### Task 6: main.js — per-row sync wiring + boot seed

**Files:**
- Modify: `src/main.js` (the `wireSync` function and the boot state block)

**Interfaces:**
- Consumes: `SyncQueue` (Task 2), `pushOps`/`loadState.lastRows` (Task 4), `getLayerState` (Task 5), `LAYER_DEFS`.
- Produces: module-level `syncQueue` + `CLIENT_ORIGIN` (session tag) shared with Task 7's realtime wiring.

- [ ] **Step 1: Replace `wireSync` wholesale** (current body pushes the whole snapshot; exact existing code is the `wireSync` function around `src/main.js:295`):

```js
/* push operator edits to the shared backend (per-row diffs, debounced) */
import { LAYER_DEFS } from "./lib/layers.js";
import { SyncQueue } from "./lib/statesync.js";
import { getLayerState } from "./store.js";   // merge with the existing ./store.js import line

export const CLIENT_ORIGIN = crypto.randomUUID();
export const syncQueue = new SyncQueue();
const DEFS = Object.fromEntries(LAYER_DEFS.map(d => [d.key, d]));

function wireSync() {
  let t = null;
  const flush = async () => {
    const batches = syncQueue.drain();
    if (!batches.length) return;
    try {
      const { error } = await pushOps(batches, CLIENT_ORIGIN);
      if (error) {
        console.warn("sync push failed:", error.message);
        for (const b of batches)                       // re-queue: replay rows through the diff on next tick
          for (const d of LAYER_DEFS.filter(x => x.table === b.table))
            syncQueue.queue(d, d.toRows(getLayerState(d.key)));
        clearTimeout(t); t = setTimeout(flush, 30000); // retry
      }
    } catch (e) { console.warn("sync error:", e); clearTimeout(t); t = setTimeout(flush, 30000); }
  };
  subscribe((type, detail) => {
    if (type === "selection") return;
    if (detail && detail.remote) return;               // realtime fold — already server truth
    const keys = type === "import" ? Object.keys(DEFS) : (DEFS[type] ? [type] : []);
    if (!keys.length) return;
    for (const k of keys) syncQueue.queue(DEFS[k], DEFS[k].toRows(getLayerState(k)));
    clearTimeout(t);
    t = setTimeout(flush, 800);
  });
}
```

⚠ `import` is no longer skipped — a JSON import now syncs (today it silently doesn't; design fixes that). `exportJSON`/`pushState` imports that become unused must be pruned from the import lines (`exportJSON` is still used by the export button — keep it; remove `pushState`, add `pushOps`).

- [ ] **Step 2: Update the boot state block** (currently `const remote = await loadState(); if (Object.keys(remote).length) hydrateRemote(remote); else if (account.role === "operator") await pushState(JSON.parse(exportJSON()));`):

```js
try {
  const remote = await loadState();
  for (const d of LAYER_DEFS)                      // prime the queue with server truth
    syncQueue.prime(d, (loadState.lastRows?.[d.table] || []).filter(r => !d.ownsRow || d.ownsRow(r)));
  if (Object.keys(remote).length) hydrateRemote(remote);
  else if (account.role === "operator") {          // seed empty backend from local
    for (const d of LAYER_DEFS) syncQueue.queue(d, d.toRows(getLayerState(d.key)));
    await pushOps(syncQueue.drain(), CLIENT_ORIGIN);
  }
} catch (e) { console.warn("remote state:", e); }
```

(If Task 2 adopted the `ownsRow` refinement, prime filters by it as shown; otherwise prime with the full table rows for the FIRST of the two defs sharing a table and `[]` for the second — do not double-prime a shared table. `SyncQueue.prime` per the Task 2 implementation already scopes deletion to the layer's own keys.)

- [ ] **Step 3:** `node --check src/main.js` && `npm test` && `npm run build` (Vite must resolve the new imports).
- [ ] **Step 4: Commit** — `"Wire per-row layer sync + boot seed to typed tables (B-5)"`

---

### Task 7: Realtime channel + fold-in

**Files:**
- Create: `src/lib/realtime.js`
- Modify: `src/main.js` (wire after login for owner/operator)

**Interfaces:**
- Consumes: `sb`, `propertyContext`, `fetchLayerRows` (remote.js); `hydrateLayer` (store); `syncQueue`, `CLIENT_ORIGIN` (main.js — passed in, not imported, to avoid a cycle).
- Produces: `startRealtime({ syncQueue, origin })` — subscribes one channel; per-table debounced re-pull → `prime` → `hydrateLayer`.

- [ ] **Step 1: Implement `src/lib/realtime.js`:**

```js
/* Realtime fold-in (Phase B-5): one channel per property on the 7 typed layer
   tables. A remote change marks the table dirty and debounces a per-table
   re-pull (rows are small; wholesale re-pull dodges incremental-fold bugs and
   covers DELETE uniformly). Guards: (1) own-origin events skipped — REPLICA
   IDENTITY FULL puts `origin` on old rows so deletes are covered too;
   (2) a table with locally-pending ops defers its re-pull until after flush,
   so an echo can never clobber unpushed local edits. Channel drop → full
   resubscribe + re-pull all (missed-window repair). */
import { sb, propertyContext, fetchLayerRows } from "./remote.js";
import { LAYER_DEFS } from "./layers.js";
import { hydrateLayer } from "../store.js";

const TABLES = [...new Set(LAYER_DEFS.map(d => d.table))];

export async function startRealtime({ syncQueue, origin }) {
  if (!sb) return;
  const ctx = await propertyContext();
  const timers = {};
  const repull = async table => {
    if (syncQueue.pendingFor(table)) {           // local edits in flight — retry shortly
      clearTimeout(timers[table]);
      timers[table] = setTimeout(() => repull(table), 1000);
      return;
    }
    try {
      const rows = await fetchLayerRows(table);
      for (const d of LAYER_DEFS.filter(x => x.table === table)) {
        const mine = rows.filter(r => !d.ownsRow || d.ownsRow(r));
        syncQueue.prime(d, mine);
        const v = d.fromRows(mine);
        hydrateLayer(d.key, v === undefined ? undefined : v);
      }
    } catch (e) { console.warn("realtime re-pull:", table, e.message); }
  };
  const schedule = table => { clearTimeout(timers[table]); timers[table] = setTimeout(() => repull(table), 250); };

  const subscribe = () => {
    const ch = sb.channel("layers:" + ctx.property_id);
    for (const table of TABLES) {
      ch.on("postgres_changes",
        { event: "*", schema: "public", table, filter: "property_id=eq." + ctx.property_id },
        payload => {
          const o = payload.new?.origin ?? payload.old?.origin;
          if (o && o === origin) return;         // own echo
          schedule(table);
        });
    }
    ch.subscribe(status => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setTimeout(() => { sb.removeChannel(ch); subscribe(); TABLES.forEach(schedule); }, 3000);
      }
    });
  };
  subscribe();
}
```

⚠ `hydrateLayer(key, undefined)` (singleton with no row) resets the layer to its empty default — correct for a remotely-cleared layer. `financials`' empty needs no override; `comp`'s baseline comes from `hydrateLayer` internals (Task 5).

- [ ] **Step 2: Wire in `src/main.js` boot** — after `initRouter()` for owner + operator roles (both benefit; RLS blocks others anyway):

```js
import { startRealtime } from "./lib/realtime.js";
// … inside boot(), after initRouter():
if (account.role === "operator" || account.role === "owner")
  startRealtime({ syncQueue, origin: CLIENT_ORIGIN }).catch(e => console.warn("realtime:", e));
```

- [ ] **Step 3:** `node --check` both files, `npm test`, `npm run build`.
- [ ] **Step 4: Commit** — `"Add realtime layer channel with per-table fold-in (B-5)"`

---

### Task 8: api/concierge.js liveDigest port

**Files:**
- Modify: `api/concierge.js` (the `liveDigest` function, ~line 225)

**Interfaces:**
- Consumes: `LAYER_DEFS.fromRows` (imported from `../src/lib/layers.js` — api files already import src/lib seams, e.g. `digestState`).
- Produces: same `liveDigest(token) → string` contract; `digestState` untouched.

- [ ] **Step 1: Replace the property_state REST read:**

```js
import { LAYER_DEFS } from "../src/lib/layers.js";

/* Best-effort live-state digest; never blocks an answer. */
async function liveDigest(token) {
  try {
    const t = await tenancyContext(token);
    if (!t) return "";
    const tables = [...new Set(LAYER_DEFS.map(d => d.table))];
    const results = await Promise.all(tables.map(tb =>
      supaJson("/rest/v1/" + tb + "?property_id=eq." + t.property_id + "&select=*", token)
        .catch(() => [])));
    const byTable = Object.fromEntries(tables.map((tb, i) => [tb, Array.isArray(results[i]) ? results[i] : []]));
    const layers = {};
    for (const d of LAYER_DEFS) {
      const rows = byTable[d.table].filter(r => !d.ownsRow || d.ownsRow(r));
      if (!rows.length) continue;
      const v = d.fromRows(rows);
      if (v !== undefined) layers[d.key] = v;
    }
    return digestState(layers);
  } catch { return ""; }
}
```

- [ ] **Step 2:** `node --check api/concierge.js` && `npm test`.
- [ ] **Step 3: Commit** — `"Port concierge liveDigest to typed layer tables (B-5)"`

---

### Task 9: Migration B (RPC port + drop) + assert-suite extension

**Files:**
- Migration on branch via MCP `apply_migration`, name `typed_layers_drop`.
- Modify: `docs/phase-b/assert-suite.sql`

**Interfaces:**
- Consumes: verified backfill (Task 3 step 3 MUST be all-true first).
- Produces: `get_brief_state` reads typed tables; `property_state` gone; suite covers the 7 tables.

- [ ] **Step 1: `apply_migration` name `typed_layers_drop`** — copy the CURRENT `get_brief_state` body from migration `20260802162433_code_port_uuid.sql` (secret-check lines verbatim) and swap only the select:

```sql
-- Phase B-5 purge #7 (B): port the last property_state reader, then drop it.
create or replace function public.get_brief_state(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from app_secrets where name = 'cron_secret';
  if v_secret is null or v_secret <> p_secret then raise exception 'unauthorized'; end if;
  v := jsonb_build_object(
    'financials', coalesce((select data from layer_settings
                            where property_id = default_property_id() and key = 'financials'), '{}'::jsonb),
    'actions', jsonb_build_object(
      'lane',      coalesce((select jsonb_object_agg(card_id, to_jsonb(lane) #>> '{}')
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
```

⚠ Before writing this, `execute_sql`: `select prosrc from pg_proc where proname='get_brief_state'` on the BRANCH and confirm the secret-check lines + `app_secrets` name match what ships above — the 20260802162433 file is the reference but the branch is the truth. Also confirm no other function references property_state: `select proname from pg_proc p join pg_language l on l.oid=p.prolang where l.lanname in ('sql','plpgsql') and prosrc ilike '%property_state%';` — expect ONLY get_brief_state before this migration, zero rows after.

- [ ] **Step 2: Extend `docs/phase-b/assert-suite.sql`** — replace every `property_state` reference:
  - Setup block: replace `insert into property_state (layer, data) values ('notes', '{}'::jsonb);` with representative typed rows:

```sql
  insert into comp_state (unit, field, state) values ('131', 'coi', 'flag');
  insert into unit_notes (unit, text) values ('131', 'suite note');
  insert into board_state (card_id, lane) values ('smoke-card', 'action');
  insert into directory_state (collection, id, dismissed) values ('contacts', 'smoke-c', true);
  insert into site_features (id, type, x, y, pos) values ('sf-smoke', 'shutoff', 10, 20, 0);
  insert into camera_overrides (camera_id, aim_deg) values ('cam-smoke', 90);
  insert into layer_settings (key, data) values ('financials', '{"opex":{},"capRatePct":null}'::jsonb);
```

  - Operator section: replace the `property_state` read/insert asserts with a per-table loop:

```sql
  -- typed layers (B-5): operator reads all 7 + writes
  select count(*) into n from comp_state;        if n < 1 then raise exception 'FAIL op comp_state read'; end if;
  select count(*) into n from unit_notes;        if n < 1 then raise exception 'FAIL op unit_notes read'; end if;
  select count(*) into n from board_state;       if n < 1 then raise exception 'FAIL op board_state read'; end if;
  select count(*) into n from directory_state;   if n < 1 then raise exception 'FAIL op directory_state read'; end if;
  select count(*) into n from site_features;     if n < 1 then raise exception 'FAIL op site_features read'; end if;
  select count(*) into n from camera_overrides;  if n < 1 then raise exception 'FAIL op camera_overrides read'; end if;
  select count(*) into n from layer_settings;    if n < 1 then raise exception 'FAIL op layer_settings read'; end if;
  insert into unit_notes (unit, text) values ('105', 'op write');
  update comp_state set state = 'ok' where unit = '131' and field = 'coi';
```

  - Owner section: replace the `property_state` asserts — owner reads all 7 (`if n < 1 … 'FAIL owner <table> read'`), then write-blocked probes:

```sql
  begin
    insert into unit_notes (unit, text) values ('149', 'owner write');
    raise exception 'FAIL owner unit_notes insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update comp_state set state = 'na' where unit = '131' and field = 'coi';
    raise exception 'FAIL owner comp_state update was allowed';
  exception when insufficient_privilege then null; end;
```

  ⚠ RLS UPDATE with no visible rows updates 0 rows silently instead of raising — the owner CAN see the row (read policy), so the `with check` violation DOES raise here; keep the probe as written but if it fails with "0 rows" semantics on the branch, assert via `get diagnostics` row count = 0 instead.

  - Vendor / tenant / stranger sections: each gains `select count(*) into n from comp_state; if n <> 0 then raise exception 'FAIL <persona> comp_state visible'; end if;` (repeat for all 7 tables — these personas must be blind).
  - Add a publication assert in the setup (before persona switches):

```sql
  select count(*) into n from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename in
   ('comp_state','unit_notes','board_state','directory_state','site_features','camera_overrides','layer_settings');
  if n <> 7 then raise exception 'FAIL realtime publication: % of 7', n; end if;
  select count(*) into n from information_schema.tables where table_name = 'property_state';
  if n <> 0 then raise exception 'FAIL property_state still exists'; end if;
```

- [ ] **Step 3: Run the suite on the branch** (MCP `execute_sql`, entire file) — expected failure message `SUITE_PASS_ROLLBACK`, anything else = real failure, fix before proceeding.
- [ ] **Step 4:** `npm test` (repo suite) still green.
- [ ] **Step 5: Commit** — `"Extend assert suite to typed layer tables; retire property_state asserts (B-5)"`

---

### Task 10: Branch smoke — boot + two-browser realtime

**Files:** none (drill). Uses the `.env` swap drill (07-25 lesson: move `.env` aside, RESTORE after).

- [ ] **Step 1:** Pull branch URL + anon key via MCP (`get_project_url` / `get_publishable_keys` against the branch ref). Write `.env.branch-smoke` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; move `.env` aside; copy `.env.branch-smoke` → `.env`.
- [ ] **Step 2:** `npm run dev`; log in (magic-link — operator email must exist on branch; the branch carries prod data so adam@ membership rides along). Verify: app boots, R-1/D-1 render, comp matrix shows persisted states (backfill visible through the typed path).
- [ ] **Step 3:** Two-browser smoke (browser A + incognito B, both operator): flag a comp cell in A → appears in B without reload (≤2 s); add a note in B → appears in A; drag a feature pin in A → moves in B; delete the note in B → clears in A (DELETE folding). Watch consoles: zero `sync push failed`, zero re-pull warnings, no echo loops (network tab: no infinite re-pull cycle).
- [ ] **Step 4:** Kill dev server. RESTORE `.env` (move the original back). Delete `.env.branch-smoke`.
- [ ] **Step 5:** Record results in the session log. Fix-and-repeat until clean.

---

### Task 11: Merge gate — merge, deploy, prod smoke, close out

- [ ] **Step 1:** Preconditions checklist: Task 3 verification all-true · suite SUITE_PASS_ROLLBACK on branch · repo `npm test` green · Task 10 smoke clean · working tree committed.
- [ ] **Step 2:** MCP `merge_branch` (typed-layers → prod). Both migrations land atomically from prod's perspective.
- [ ] **Step 3:** IMMEDIATELY `npx vercel deploy --prod` (merge coupling) and confirm `Aliased: https://orangeoceanatlas.com`.
- [ ] **Step 4:** Prod smoke: re-run the assert suite against PROD (`execute_sql`) — expect `SUITE_PASS_ROLLBACK`, 0 residue (suite is self-rolling-back). Then `select count(*) from comp_state` ≈ 297 (27 units × 11 fields), `select proname … prosrc ilike '%property_state%'` = 0 rows, and a browser check: log in at orangeoceanatlas.com, C-1 matrix + W-1 board + P-1 worksheet all show pre-merge state (backfill served through typed tables).
- [ ] **Step 5:** Verify prod bundle carries the port: `curl -s https://orangeoceanatlas.com/assets/*.js | grep -o "comp_state\|layer_settings" | sort -u` (per the deployed-means-done rule).
- [ ] **Step 6:** Export executable DDL: pull both migrations from the merged history into `supabase/migrations/` (real prod versions, timestamped names), commit.
- [ ] **Step 7:** MCP `delete_branch` (stop billing).
- [ ] **Step 8:** Update `HANDOFF.md` (new session-tail block: purge #7 DONE, realtime live, operator smoke items) + `CLAUDE.md` persisted-layers line (property_state → 7 typed tables + realtime). Commit + push.
- [ ] **Step 9:** Operator smoke note for the handoff: open the app on phone + desktop simultaneously; edit a note on one — watch it appear on the other.

---

## Self-review notes

- Spec coverage: schema (T3) · registry contract (T1) · diff/queue (T2) · remote port (T4) · store fold (T5) · wiring + seed (T6) · realtime (T7) · liveDigest (T8) · RPC port + drop + suite (T9) · branch smoke (T10) · merge/deploy/close (T11). Spec's "in-SQL verification before drop" is realized as Task 3 step 3 (assertive queries) gating Task 9 — two migrations on one branch, atomic at merge; spec note already reflects the refinement.
- Shared-table hazard (directory_state, layer_settings) handled in SyncQueue.prime/queue scoping + optional `ownsRow`; Tasks 6–8 reference `ownsRow` guardedly so either Task 2 form works.
- Order preservation (custom cards, features) via `pos` everywhere: schema, backfill, toRows/fromRows, verification, get_brief_state.
- `import` event now syncs (deliberate behavior change, flagged in Task 6).
