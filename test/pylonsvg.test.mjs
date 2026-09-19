/* Guard for the pylon sign builders (src/lib/pylonsvg.js) against the real
   register (src/data/pylon.json): panel schedule geometry, tenant-of-record
   faces, the P13 reprint flag, roster counts and escaping. */
import test from "node:test";
import assert from "node:assert/strict";
import { pylonLayout, pylonSVG, pylonRoster, panelState, pylonSummary } from "../src/lib/pylonsvg.js";
import pylon from "../src/data/pylon.json" with { type: "json" };

const units = {
  "107": { unit: "107", dba: "Great American Cookies / Hershey's" },
  "149": { unit: "149", dba: "Jason's Deli" },
  "145": { unit: "145", dba: "Upstream Rehabilitation" },
  "119": { unit: "119", dba: "OUPAC Financial" },
};

test("layout follows the schedule: P1 2×8 · P2 4×8 · P3–P14 2×4 pairs", () => {
  const L = pylonLayout(pylon);
  assert.equal(L.panels.length, 14);
  const p = Object.fromEntries(L.panels.map(x => [x.panel, x]));
  assert.equal(p.P1.w, p.P2.w);
  assert.equal(p.P2.h, p.P1.h * 2);
  assert.equal(p.P3.w, p.P4.w);
  assert.ok(p.P3.w < p.P1.w / 2);
  assert.equal(p.P3.y, p.P4.y, "pairs share a row");
  assert.ok(p.P4.x > p.P3.x);
  assert.equal(p.P13.y, p.P14.y);
  assert.ok(p.P14.y > p.P12.y);
});

test("panel state: occupied · vacant · reprint when the installed face differs", () => {
  const p13 = pylon.panels.find(p => p.panel === "P13");
  assert.equal(panelState(p13, "Upstream Rehabilitation"), "reprint");
  assert.equal(panelState(p13, "Boulevard Nutrition"), "occupied");
  assert.equal(panelState({ panel: "Px", status: "vacant", unit: "" }, ""), "vacant");
});

test("roster + counts against the real register", () => {
  const { rows, counts } = pylonRoster(pylon, units);
  assert.equal(rows.length, 14);
  assert.equal(rows[0].panel, "P1");
  assert.equal(rows[1].tenant, "Jason's Deli");
  assert.equal(rows.find(r => r.panel === "P13").state, "reprint");
  assert.equal(counts.reprint, 1);
  assert.equal(counts.occupied + counts.vacant + counts.reprint, 14);
  assert.equal(pylonSummary(counts, 14), "14 panels · " + counts.occupied + " occupied · " + counts.vacant + " available · 1 reprint needed");
});

test("SVG: one clickable group per panel, faces show tenant / installed text, escaped", () => {
  const svg = pylonSVG(pylon, units, { selected: "P2" });
  assert.equal((svg.match(/class="py-panel/g) || []).length, 14);
  assert.match(svg, /data-panel="P2" data-unit="149"/);
  assert.match(svg, /py-panel py-occupied py-sel" data-panel="P2"/);
  assert.match(svg, /Jason&#39;s Deli|Jason's Deli/);
  assert.match(svg, /py-reprint" data-panel="P13"/);
  assert.match(svg, /Boulevard Nutr/, "the reprint panel shows what is physically installed");
  assert.match(svg, /Unit 123/, "an occupied panel whose tenant is not loaded falls back to the unit number");
  assert.match(svg, /Great American Cookies \/ Hershey&#39;s|Great American Cookies \/ Hershey's/);
  assert.match(svg, /ON THE/);
  assert.doesNotMatch(svg, /<script/);
  const vac = pylonSVG({ ...pylon, panels: [{ panel: "P1", size: "2x8", unit: "", status: "vacant" }] }, {});
  assert.match(vac, /AVAILABLE/);
  assert.match(vac, /url\(#pyHatch\)/);
});
