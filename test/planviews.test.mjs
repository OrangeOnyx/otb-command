/* Guard for the A-1 view presets (src/lib/planviews.js): every view is a
   complete toolbar state over the same overlay keys; matchView round-trips a
   view and rejects a hand-modified state. */
import test from "node:test";
import assert from "node:assert/strict";
import { PLAN_VIEWS, OVERLAY_KEYS, viewById, matchView } from "../src/lib/planviews.js";

test("seven views in AC's order, unique ids, complete overlay maps", () => {
  assert.deepEqual(PLAN_VIEWS.map(v => v.id), ["leasing", "ops", "systems", "common", "signage", "roof", "site"]);
  assert.equal(new Set(PLAN_VIEWS.map(v => v.id)).size, 7);
  for (const v of PLAN_VIEWS) {
    assert.deepEqual(Object.keys(v.overlays).sort(), [...OVERLAY_KEYS].sort(), v.id);
    assert.ok(["status", "expiry", "rent", "sf", "use", "hvac"].includes(v.mode), v.id);
    assert.ok(["main", "full"].includes(v.scope), v.id);
    assert.ok(v.unitOpacity > 0 && v.unitOpacity <= 1, v.id);
    assert.ok(v.label && v.hint, v.id);
  }
});

test("view intent: site = full scope; roof + systems fade the suites and show roof imagery; leasing shows photos only", () => {
  assert.equal(viewById("site").scope, "full");
  assert.ok(viewById("roof").unitOpacity < 0.5);
  assert.equal(viewById("roof").overlays.roof, true);
  assert.equal(viewById("systems").mode, "hvac");
  assert.equal(viewById("systems").overlays.roof, true);
  const l = viewById("leasing");
  assert.deepEqual(OVERLAY_KEYS.filter(k => l.overlays[k]), ["photos"]);
  assert.equal(viewById("nope"), null);
});

test("matchView round-trips a view and drops out when a chip changes", () => {
  for (const v of PLAN_VIEWS) {
    assert.equal(matchView({ mode: v.mode, scope: v.scope, unitOpacity: v.unitOpacity, overlays: { ...v.overlays } }), v.id);
  }
  const ops = viewById("ops");
  assert.equal(matchView({ mode: ops.mode, scope: ops.scope, unitOpacity: ops.unitOpacity, overlays: { ...ops.overlays, cameras: false } }), "");
  assert.equal(matchView({ mode: "rent", scope: "main", unitOpacity: 1, overlays: { photos: true } }), "");
  assert.equal(matchView({ mode: "status", scope: "main", unitOpacity: 0.99, overlays: { photos: true } }), "leasing", "opacity within a slider tick still matches");
});
