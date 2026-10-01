import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FT, KX, KY, LONG, SHORT, planToWorld, modelToPlan, layoutSuites, measuredFt, dimensionStrings, storefrontSigns } from "../src/lib/styled-twin-plan.js";

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const geometry = load("../src/data/geometry.json"), heights = load("../src/data/heights.json"), units = load("../src/data/units.public.json");
const site = load("../public/twin/site-context.json");
const suites = layoutSuites(geometry.demising, heights);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

test("plan frame is feet-true on both axes (A-1 anisotropic scale)", () => {
  const [x0] = planToWorld([0, 0]), [x1] = planToWorld([KX * 100, 0]);
  const [, z0] = planToWorld([0, 0]), [, z1] = planToWorld([0, KY * 100]);
  assert.ok(near((x1 - x0) / FT, 100) && near((z1 - z0) / FT, 100));
});

test("the twin's registration inverts back to the plan point", () => {
  const c = site.registration.frameChecks[0];
  const [x, y] = modelToPlan([c.modelPointMeters[0], c.modelPointMeters[2]], site.registration.matrix3x2);
  assert.ok(near(x, c.planPoint[0], 0.05) && near(y, c.planPoint[1], 0.05));
});

test("all 27 demised suites are built, once each", () => {
  const ids = suites.map(s => s.unit).sort();
  assert.equal(ids.length, 27);
  assert.deepEqual(ids, Object.keys(geometry.units).sort());
});

test("every suite's built frontage and depth equal the CAD/plat demising feet", () => {
  const bays = new Map([...geometry.demising.longBuilding.bays, ...geometry.demising.shortBuilding.bays].map(([u, ft]) => [u, ft]));
  for (const s of suites) {
    const m = measuredFt(s.corners), src = bays.get(s.unit) ?? bays.get("135");
    const [front, depth] = s.building === "long" ? [m.a, m.b] : [m.b, m.a];
    assert.ok(near(front, src), `${s.unit} frontage ${front} ≠ ${src}`);
    assert.ok(near(depth, s.depthFt), `${s.unit} depth ${depth} ≠ ${s.depthFt}`);
  }
});

test("building totals close: long 522.3' × 85.45', short 208.65' × 84.49'", () => {
  const long = suites.filter(s => s.building === "long"), short = suites.filter(s => s.building === "short" && s.unit !== "135B");
  const span = (list, axis) => (Math.max(...list.flatMap(s => s.corners.map(c => c[axis]))) - Math.min(...list.flatMap(s => s.corners.map(c => c[axis])))) / FT;
  assert.ok(near(span(long, 0), 522.3)); assert.ok(near(span(long, 1), 85.45));
  assert.ok(near(span(short, 1), 208.65));
  assert.ok(near(span(suites.filter(s => s.building === "short"), 0), 84.49));
});

test("the long building sits on A-1's own anchors (101 end, rear line, storefront face)", () => {
  const s101 = suites.find(s => s.unit === "101");
  assert.deepEqual(s101.plan[0], [LONG.x0, LONG.rearY]);
  assert.ok(near(s101.plan[2][1], LONG.frontY, 0.02));
  assert.equal(suites.find(s => s.unit === "135A").plan[0][0], SHORT.faceX);
});

test("heights are the survey labels (heights.json), never invented", () => {
  for (const s of suites) assert.equal(s.heightFt, heights[s.unit]);
  assert.equal(suites.find(s => s.unit === "101").heightFt, 23.6);
  assert.equal(suites.find(s => s.unit === "105").heightFt, 13.2);
});

test("dimension labels print the source feet and span the drawn geometry", () => {
  const dims = dimensionStrings(geometry.demising, suites);
  const f101 = dims.find(d => d.unit === "101");
  assert.equal(f101.text, "101 · 83'");
  assert.ok(near(Math.hypot(f101.to[0] - f101.from[0], f101.to[1] - f101.from[1]) / FT, 83));
  assert.ok(dims.some(d => d.text === "Long building 522.3'"));
  assert.ok(dims.some(d => d.text === "Short building 208.65'"));
  assert.equal(dims.filter(d => d.kind === "frontage").length, 26); // 27 suites, 135A/B share one frontage
});

test("storefront signs: one per tenant, vacant suites unsigned", () => {
  const signs = storefrontSigns(suites, units);
  assert.ok(!signs.some(s => s.suites.includes("131") || s.suites.includes("133")));
  assert.deepEqual(signs.find(s => s.text === "The Pink Paisley").suites, ["101", "103"]);
  assert.deepEqual(signs.find(s => s.text === "Fast Pass Tag & Title").suites, ["139", "141"]);
  assert.equal(signs.find(s => s.suites.includes("107")).text, "Great American Cookies");
});
