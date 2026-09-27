import test from "node:test";
import assert from "node:assert/strict";
import { cleanPhysicalAsset, cleanAssetInspection, cleanSourceBinding, derivePhysicalAsset, latestInspection } from "../src/lib/physical-assets-model.js";

test("physical identity survives label and source revisions; inspection facts are never seeded", () => {
  const a = cleanPhysicalAsset({ type: "column", label: "C01" });
  assert.match(a.id, /^pa_/);
  const b = cleanPhysicalAsset({ label: "West entry support" }, a);
  assert.equal(b.id, a.id);
  assert.equal(b.verification, "unverified");
  const old = cleanSourceBinding(a.id, { sourceKey: "model:old-guid", modelVersion: "1" });
  const next = cleanSourceBinding(a.id, { sourceKey: "model:new-guid", modelVersion: "2" });
  assert.equal(derivePhysicalAsset(b, [old, next]).bindings.length, 2);
  assert.equal(derivePhysicalAsset(b).condition, "uninspected");
  assert.throws(() => cleanPhysicalAsset({ id: cleanPhysicalAsset({ type: "column", label: "Other" }).id }, a), /identity/);
});

test("latest actual inspection date controls condition, regardless of delayed data entry", () => {
  const a = cleanPhysicalAsset({ type: "hvac", label: "RTU 1" });
  const newer = cleanAssetInspection(a.id, { date: "2026-09-24", condition: "repair", notes: "Operator observed leak" }, "2026-09-24T12:00:00Z");
  const old = cleanAssetInspection(a.id, { date: "2026-08-01", condition: "good" }, "2026-09-25T12:00:00Z");
  assert.equal(latestInspection([old, newer]).id, newer.id);
  assert.equal(derivePhysicalAsset(a, [], [old, newer]).condition, "repair");
  assert.throws(() => cleanAssetInspection(a.id, { date: "2026-02-30" }), /real/);
  assert.throws(() => cleanAssetInspection(a.id, { date: "2026-09-24", condition: "certified-safe" }), /condition/);
  assert.throws(() => cleanAssetInspection(a.id, { date: "2026-09-24", dimensions: { height: -1 } }), /positive/);
});

test("browser register retains permanent IDs, history and isolation and refuses false successful saves", async () => {
  const backing = new Map(); let blocked = false;
  globalThis.localStorage = {
    getItem: k => backing.get(k) || null,
    setItem: (k, v) => { if (blocked) throw new Error("Quota exceeded"); backing.set(k, v); },
  };
  const lib = await import("../src/lib/physical-assets.js?register-test");
  const col = { id: "model-guid-a", label: "C01", position: [1, 2, 3], dimensionsMeters: [0.5, 4, 0.5], sourceRefs: { wallGuids: ["w1"] } };
  await lib.initializePhysicalAssets({ units: [{ unit: "101" }], columns: [col], propertyKey: "test-a" });
  const initial = lib.getPhysicalAssetForModelObject(col.id);
  assert.equal(initial.unit, null);
  assert.equal(initial.condition, "uninspected");
  assert.deepEqual(initial.dimensions, { unit: "m" });
  assert.deepEqual(initial.bindings[0].metadata.dimensionsMeters, col.dimensionsMeters);
  await lib.savePhysicalAsset({ ...initial, label: "Renamed support" });
  await lib.bindModelSource(initial.id, { sourceKey: "model:changed", modelVersion: "next", objectId: "new-guid" });
  await lib.appendPhysicalAssetInspection(initial.id, { date: "2026-09-24", condition: "monitor", notes: "Paint wear" });
  const reloaded = await import("../src/lib/physical-assets.js?register-reload");
  await reloaded.initializePhysicalAssets({ units: [{ unit: "101" }], columns: [col], propertyKey: "test-a" });
  assert.equal(reloaded.getPhysicalAssetForModelObject(col.id).id, initial.id);
  assert.equal(reloaded.getPhysicalAsset(initial.id).label, "Renamed support");
  assert.equal(reloaded.getPhysicalAsset(initial.id).bindings.length, 2);
  assert.equal(reloaded.getPhysicalAsset(initial.id).condition, "monitor");
  await reloaded.initializePhysicalAssets({ propertyKey: "test-a", items: [{ sourceKey: "hvac:existing-1", type: "hvac", label: "Inventory RTU", unit: "101", metadata: { planPosition: [50, 60] } }] });
  const imported = reloaded.getPhysicalAssetForSource("hvac:existing-1");
  assert.equal(imported.condition, "uninspected");
  assert.equal(imported.bindings[0].metadata.position, undefined);
  assert.deepEqual(imported.bindings[0].metadata.planPosition, [50, 60]);
  await assert.rejects(reloaded.bindModelSource(imported.id, { sourceKey: reloaded.physicalAssetSourceKey(col), modelVersion: "new-revision" }), /another physical asset/);
  await assert.rejects(reloaded.addPhysicalAssetPhoto({ type: "text/html", size: 40 }, initial.id), /photo/);
  await assert.rejects(reloaded.addPhysicalAssetPhoto({ type: "image/png", size: 0 }, initial.id), /contain data/);
  blocked = true;
  await assert.rejects(reloaded.savePhysicalAsset({ ...initial, label: "Unsaved rename" }), /Quota/);
  assert.equal(reloaded.getPhysicalAsset(initial.id).label, "Renamed support");
  assert.equal(reloaded.getPhysicalAssetsStatus().persistence, "error");
  blocked = false;
  await reloaded.initializePhysicalAssets({ propertyKey: "test-b" });
  assert.equal(reloaded.listPhysicalAssets().length, 0);
  assert.equal(reloaded.getPhysicalAsset(initial.id), null);
  backing.set("otb-physical-assets:v1:corrupt", "broken-json");
  await assert.rejects(reloaded.initializePhysicalAssets({ propertyKey: "corrupt" }));
  assert.equal(backing.get("otb-physical-assets:v1:corrupt"), "broken-json");
});
