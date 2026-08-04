/* Row-contract law (Phase B-5 typed layers): fromRows(toRows(s)) ≡ s for every
   registered layer, plus the structural guarantees the sync engine and the
   SQL backfill both rely on (empty-row omission, pos ordering, collection
   discriminator, camera partial overrides, shared-table ownsRow scoping). */
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

test("board rows: dismissed-only card omits row once un-dismissed", () => {
  const rows = D.actions.toRows({ lane: {}, edit: {}, dismissed: { x: true }, custom: [] });
  assert.equal(rows.length, 1);
  const after = D.actions.toRows({ lane: {}, edit: {}, dismissed: {}, custom: [] });
  assert.equal(after.length, 0); // restoreActions → row deletes via diff
});

test("custom order survives via pos", () => {
  const rows = D.actions.toRows(FIX.actions);
  const customs = rows.filter(r => r.custom).sort((a, b) => a.pos - b.pos);
  assert.deepEqual(customs.map(r => r.card_id), ["user:a", "user:b"]);
});

test("feature order survives via pos", () => {
  const rows = D.features.toRows(FIX.features);
  assert.deepEqual(rows.map(r => [r.id, r.pos]), [["sf1", 0], ["sf2", 1]]);
  const shuffled = [rows[1], rows[0]];
  assert.deepEqual(D.features.fromRows(shuffled).map(f => f.id), ["sf1", "sf2"]);
});

test("directory rows carry the collection discriminator", () => {
  const rows = D.contacts.toRows(FIX.contacts);
  assert.ok(rows.length > 0);
  assert.ok(rows.every(r => r.collection === "contacts"));
});

test("camera rows omit absent x/y and round-trip partial overrides", () => {
  const rows = D.cameras.toRows(FIX.cameras);
  const cam2 = rows.find(r => r.camera_id === "cam2");
  assert.equal(cam2.x, null); assert.equal(cam2.y, null); assert.equal(cam2.aim_deg, 45);
});

test("ownsRow scopes shared tables (directory_state, layer_settings)", () => {
  assert.ok(D.contacts.ownsRow({ collection: "contacts", id: "x" }));
  assert.ok(!D.contacts.ownsRow({ collection: "documents", id: "x" }));
  assert.ok(D.financials.ownsRow({ key: "financials" }));
  assert.ok(!D.financials.ownsRow({ key: "owner_sheets" }));
  assert.ok(D.ownerSheets.ownsRow({ key: "owner_sheets" }));
  for (const k of ["comp", "notes", "actions", "features", "cameras"])
    assert.ok(D[k].ownsRow({ anything: 1 }), k + " owns all rows of its table");
});

test("singleton fromRows returns undefined when its key row is absent", () => {
  assert.equal(D.financials.fromRows([]), undefined);
  assert.equal(D.financials.fromRows([{ key: "owner_sheets", data: [] }]), undefined);
});
