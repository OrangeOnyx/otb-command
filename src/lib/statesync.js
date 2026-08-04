/* Pure per-row sync engine (Phase B-5 typed layers). Diffs canonical row sets
   from the layer registry into minimal upsert/delete ops, coalesced per
   (table, pk-key) with last-op-wins. No Supabase imports — remote.pushOps
   executes the batches this produces. The cache holds SERVER truth per table;
   prime() sets it without generating ops (boot, realtime re-pull), queue()
   diffs a layer's current rows against it. Layers sharing a table
   (directory_state, layer_settings) are scoped by the registry's ownsRow so
   one layer never touches its table-mate's rows. */

export const rowKey = (pk, row) => pk.map(c => String(row[c])).join("\u0000");

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
    this.cache = new Map();   // table → Map(key → row)   — server truth
    this.pending = new Map(); // table → { pk, ops: Map(key → {op, row}) }
  }
  _table(table) {
    if (!this.cache.has(table)) this.cache.set(table, new Map());
    return this.cache.get(table);
  }
  _mine(def, t) {
    const out = [];
    for (const row of t.values()) if (def.ownsRow(row)) out.push(row);
    return out;
  }
  /* Set server truth for one layer without generating ops. */
  prime(def, rows) {
    const t = this._table(def.table);
    for (const [k, row] of [...t]) if (def.ownsRow(row)) t.delete(k);
    for (const r of rows || []) t.set(rowKey(def.pk, r), r);
  }
  /* Diff a layer's current canonical rows against server truth → pending ops. */
  queue(def, rows) {
    const t = this._table(def.table);
    const { upserts, deletes } = diffRows(this._mine(def, t), rows, def.pk);
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
