/* Pure sync engine (Phase B-5): row diffing, per-(table,pk) coalescing,
   drain batching, prime (server-truth without ops), shared-table scoping. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowKey, diffRows, SyncQueue } from "../src/lib/statesync.js";
import { LAYER_DEFS } from "../src/lib/layers.js";

const D = Object.fromEntries(LAYER_DEFS.map(d => [d.key, d]));

test("rowKey joins pk columns with a non-colliding separator", () => {
  assert.equal(rowKey(["unit", "field"], { unit: "131", field: "coi" }), "131\u0000coi");
  assert.notEqual(rowKey(["a", "b"], { a: "x y", b: "z" }), rowKey(["a", "b"], { a: "x", b: "y z" }));
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
  q.prime(D.notes, []);
  q.queue(D.notes, D.notes.toRows({ "131": "v1" }));
  q.queue(D.notes, D.notes.toRows({ "131": "v2" }));
  const batches = q.drain();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].table, "unit_notes");
  assert.deepEqual(batches[0].upserts, [{ unit: "131", text: "v2" }]);
  assert.equal(batches[0].deletes.length, 0);
});

test("SyncQueue upsert-then-revert coalesces to delete", () => {
  const q = new SyncQueue();
  q.prime(D.notes, D.notes.toRows({ "131": "orig" }));
  q.queue(D.notes, D.notes.toRows({ "131": "edited" }));
  q.queue(D.notes, D.notes.toRows({}));
  const [b] = q.drain();
  assert.equal(b.upserts.length, 0);
  assert.deepEqual(b.deletes, [{ unit: "131" }]);
});

test("drain clears pending but keeps cache", () => {
  const q = new SyncQueue();
  q.prime(D.comp, []);
  q.queue(D.comp, D.comp.toRows({ "131": { coi: "ok" } }));
  assert.ok(q.pendingFor("comp_state"));
  q.drain();
  assert.ok(!q.pendingFor("comp_state"));
  q.queue(D.comp, D.comp.toRows({ "131": { coi: "ok" } })); // identical to cache
  assert.equal(q.drain().length, 0);
});

test("prime does not produce ops", () => {
  const q = new SyncQueue();
  q.prime(D.notes, D.notes.toRows({ "131": "x" }));
  assert.equal(q.drain().length, 0);
});

test("shared table: contacts sync never deletes documents rows", () => {
  const q = new SyncQueue();
  q.prime(D.contacts, D.contacts.toRows({ edit: {}, dismissed: { "c:1": true }, custom: [] }));
  q.prime(D.documents, D.documents.toRows({ edit: {}, dismissed: { "d:1": true }, custom: [] }));
  q.queue(D.contacts, D.contacts.toRows({ edit: {}, dismissed: {}, custom: [] })); // clear contacts
  const batches = q.drain();
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].deletes, [{ collection: "contacts", id: "c:1" }]);
});

test("shared table: layer_settings keys stay independent", () => {
  const q = new SyncQueue();
  const fin = { opex: { taxes: 1 }, capRatePct: null };
  q.prime(D.financials, D.financials.toRows(fin));
  q.prime(D.ownerSheets, D.ownerSheets.toRows(["dash"]));
  q.queue(D.ownerSheets, D.ownerSheets.toRows(["dash", "roll"]));
  const batches = q.drain();
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].upserts, [{ key: "owner_sheets", data: ["dash", "roll"] }]);
});

test("re-prime replaces only the layer's own rows", () => {
  const q = new SyncQueue();
  q.prime(D.contacts, D.contacts.toRows({ edit: {}, dismissed: { "c:1": true }, custom: [] }));
  q.prime(D.documents, D.documents.toRows({ edit: {}, dismissed: { "d:1": true }, custom: [] }));
  q.prime(D.contacts, []); // server now has zero contacts rows
  q.queue(D.documents, D.documents.toRows({ edit: {}, dismissed: { "d:1": true }, custom: [] }));
  assert.equal(q.drain().length, 0); // documents unchanged vs its cache
});
