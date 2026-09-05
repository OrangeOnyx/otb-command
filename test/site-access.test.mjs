import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { zoneTotal } from "../src/lib/parking.js";

/* A-1 access layer (REV 13) — ingress/egress traced from the architect CAD.
   These pin the property facts the layer depicts so a re-extract cannot
   silently move a curb cut, re-stripe a driveway, or drop the layer. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(join(root, "src/data/geometry.json"), "utf8"));
const { transform } = geometry.boundary;
const kx = transform.kxPxPerFt, ky = transform.kyPxPerFt;
const ax = a => transform.envelope.xRight - kx * (a + 25);
const by = b => transform.envelope.yBottom + ky * b;
const near = (v, t, tol = 0.6) => Math.abs(v - t) <= tol;

test("access + easements layers exist and are in the z-order plan.js expects", () => {
  assert.deepEqual(Object.keys(geometry.layers),
    ["base", "remoteLot", "parking", "access", "annotations", "easements", "generalNotes", "titleBlock"]);
  assert.ok(geometry.layers.access.length >= 60, "access layer looks empty");
  assert.ok(geometry.layers.easements.some(p => p.t === "path" && p.attrs.stroke === "#A87E2F"), "liquor line must live in the easements layer");
  assert.ok(!geometry.layers.annotations.some(p => p.t === "path"), "liquor line must NOT still be in annotations");
  assert.ok(!geometry.layers.parking.some(p => p.t === "text" && /UTILITY EASEMENT/.test(p.s)), "utility easements moved out of parking");
});

test("driveway inventory: 8 Belle cuts with CAD-exact throats (plat feet)", () => {
  const d = Object.fromEntries(geometry.access.driveways.map(x => [x.id, x]));
  assert.deepEqual(Object.keys(d), ["A", "B", "J", "P1", "P2", "P3", "M1", "M2"]);
  // Arnould: throat edges are the CAD curb ends (x 611.0/642.4 and 936.5/976.2 → a = x − 423.75)
  assert.deepEqual(d.A.throatA, [187.25, 218.65]);
  assert.deepEqual(d.B.throatA, [512.75, 552.45]);
  assert.ok(near(d.A.throatWidthFt, 31.4) && near(d.B.throatWidthFt, 39.7));
  // the plat's 187.98' Arnould dimension break lands on driveway A's west throat edge
  assert.ok(near(d.A.throatA[0], 187.98, 0.8));
  // Johnston cut sits immediately south of the notch corner (b −100)
  assert.equal(d.J.throatB[1], -100.0);
  assert.ok(near(d.J.throatWidthFt, 30.4));
  // Patricia: Lot 8 cut's south edge coincides with the Patricia × M.A. corner-return tangent (b −275)
  assert.ok(near(d.P3.throatB[0], -275, 0.5));
  assert.equal(d.M2.movement, "pedestrian");
  for (const x of geometry.access.driveways) assert.ok(x.cad && x.serves, `${x.id} missing provenance`);
});

test("Arnould head-in stalls no longer cross either driveway", () => {
  const ticks = geometry.layers.parking.filter(p => p.t === "line" && near(p.y2, by(-1), 0.3) && near(p.y1, by(-18.5), 0.3));
  assert.equal(ticks.length, 4 + 7 + 11 + 11 + 9, "38 stalls → 42 tick lines");
  const drivewayA = [ax(218.65), ax(187.25)], drivewayB = [ax(552.45), ax(512.75)]; // screen x ranges (x decreases with a)
  for (const t of ticks) {
    assert.ok(!(t.x1 > drivewayA[0] + 0.1 && t.x1 < drivewayA[1] - 0.1), `tick at x=${t.x1} inside driveway A`);
    assert.ok(!(t.x1 > drivewayB[0] + 0.1 && t.x1 < drivewayB[1] - 0.1), `tick at x=${t.x1} inside driveway B`);
  }
});

test("Arnould median: two raised segments with the 55' opening centered on driveway A, none east of a 506.3", () => {
  const m = geometry.access.arnouldMedian;
  assert.deepEqual(m.segmentsAFt, [[70.0, 172.5], [227.8, 506.3]]);
  const [o] = m.openings;
  const dA = geometry.access.driveways.find(x => x.id === "A");
  const c = (dA.throatA[0] + dA.throatA[1]) / 2;
  assert.ok(c > o.aFt[0] && c < o.aFt[1], "driveway A centre must fall inside the median opening");
  assert.ok(near(o.widthFt, o.aFt[1] - o.aFt[0], 0.1));
  const dB = geometry.access.driveways.find(x => x.id === "B");
  assert.ok(dB.throatA[0] > m.eastEndAFt, "driveway B lies past the median's east nose");
  // rendered: exactly two median rects in the Arnould band
  const rects = geometry.layers.access.filter(p => p.t === "rect" && p.attrs.fill === "#C9CEBE");
  assert.equal(rects.length, 2);
  for (const r of rects) assert.ok(r.y > 662 && r.y + r.h <= 752, "median must stay inside the Arnould R/W band");
});

test("every access primitive stays on the sheet (full-scope viewBox)", () => {
  const [vx, vy, vw, vh] = geometry.viewBox.full.split(" ").map(Number);
  const inside = (x, y) => x >= vx - 0.5 && x <= vx + vw + 0.5 && y >= vy - 0.5 && y <= vy + vh + 0.5;
  for (const p of geometry.layers.access) {
    const pts = p.t === "rect" ? [[p.x, p.y], [p.x + p.w, p.y + p.h]]
      : p.t === "line" ? [[p.x1, p.y1], [p.x2, p.y2]]
      : p.t === "text" ? [[p.x, p.y]]
      : [...p.d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]]);
    for (const [x, y] of pts) assert.ok(inside(x, y), `access prim off-sheet: ${JSON.stringify(p).slice(0, 100)}`);
    if (p.t === "rect") assert.ok(p.w > 0 && p.h > 0, "rect with non-positive size");
  }
});

test("parking reconciliation: 314 labeled + 10 CAD-striped unlabeled Johnston stalls = 324 = variance", () => {
  const pk = geometry.parking;
  assert.equal(zoneTotal(pk.zones), 314);
  assert.equal(pk.cadUnlabeled.reduce((s, z) => s + z.count, 0), 10);
  assert.equal(pk.totalStriped, 324);
  assert.equal(pk.totalStriped, pk.variance.provided);
  assert.equal(pk.totalPlat + 10, pk.totalStriped);
  // the row is drawn: 11 tick lines nosing the Johnston R/W at a 651–669.5
  const row = geometry.layers.parking.filter(p => p.t === "line" && near(p.x1, ax(651.05), 0.3) && near(p.x2, ax(669.55), 0.3));
  assert.equal(row.length, 11);
});

test("title block rev bumped with the geometry change", () => {
  assert.equal(geometry.rev, "REV 13");
  assert.ok(geometry.layers.titleBlock.some(p => p.t === "text" && /^REV 13/.test(p.s)));
});
