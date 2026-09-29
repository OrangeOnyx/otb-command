import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  suiteId, panelId, frontageBays, frontageChecks, joinChecks, signLayout,
  elevationGeometry, elevationSvg, signSvg, opsOverlay, entityRecords
} from "../tools/cre-library/otb-slice.mjs";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const geometry = load("src/data/geometry.json");
const heights = load("src/data/heights.json");
const pylon = load("src/data/pylon.json");
const unitsPublic = load("src/data/units.public.json");
const fakeSrc = (id) => ({ id, revision: "r", sha256: "0".repeat(64) });
const S = { geometry: fakeSrc("g"), heights: fakeSrc("h"), pylon: fakeSrc("p"), units: fakeSrc("u"), board: fakeSrc("b") };

test("suite lookup keys satisfy the library ID pattern and keep labels distinct", () => {
  const pat = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  const ids = unitsPublic.map((u) => suiteId(u.unit));
  for (const id of ids) assert.match(id, pat);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(suiteId("117.5"), "suite-otb-117-5");
  assert.equal(suiteId("135A"), "suite-otb-135a");
  assert.equal(panelId("P13"), "panel-otb-johnston-pylon-p13");
});

test("frontage bays close on the recorded building lengths", () => {
  const checks = frontageChecks(geometry, heights, unitsPublic);
  for (const which of ["long", "short"]) assert.equal(checks.find((c) => c.check === `${which}-frontage-closure`).result, "pass");
});

test("long-building elevation reads Johnston (101) on the viewer's left", () => {
  const bays = frontageBays(geometry, heights, "long");
  assert.equal(bays[0].label, "101");
  assert.equal(bays.at(-1).label, "133");
  assert.equal(bays[0].x0Ft, 0);
  assert.equal(frontageBays(geometry, heights, "short")[0].entityIds[0], "suite-otb-135a");
});

test("16.4 ft heights stay flagged unresolved (script fallback is indistinguishable)", () => {
  assert.equal(frontageChecks(geometry, heights, unitsPublic).find((c) => c.check === "parapet-height-provenance").result, "unresolved");
});

test("every unit and every pylon panel binds to a suite record", () => {
  const recs = entityRecords({ S, geometry, unitsPublic, pylon, assetIds: { long: "a-l", short: "a-s", sign: "a-g" } });
  const suites = recs.filter((r) => r.record_type === "suite");
  assert.equal(suites.length, unitsPublic.length);
  for (const c of joinChecks(unitsPublic, pylon, suites)) assert.equal(c.result, "pass", c.basis);
});

test("sign layout follows the operator schedule, not the reference board", () => {
  const { cells, width, height } = signLayout(pylon);
  assert.equal(cells.length, pylon.panels.length);
  assert.equal(width, 8);
  assert.equal(height, 2 + 4 + 6 * 2);
  assert.deepEqual(cells.slice(2, 4).map((c) => [c.key, c.x]), [["P3", 0], ["P4", 4]]);
});

test("geometry SVGs carry no tenancy and no script; overlay carries it separately", () => {
  const svg = elevationSvg(elevationGeometry(geometry, heights, "long"), "t") + signSvg(pylon, "t");
  assert.doesNotMatch(svg, /<script/i);
  for (const u of unitsPublic) if (u.dba) assert.ok(!svg.includes(u.dba), `tenant name leaked into geometry: ${u.dba}`);
  const ov = opsOverlay(unitsPublic, pylon, S);
  assert.equal(ov.suites.length, unitsPublic.length);
  const reads = pylon.panels.filter((p) => p.physicalReads);
  for (const p of reads) assert.equal(ov.panels.find((x) => x.panel_key === p.panel).state, "conflict");
});
