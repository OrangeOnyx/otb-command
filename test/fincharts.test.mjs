/* Guard for the P-1 chart builders (src/lib/fincharts.js): donut shares and
   arc math, waterfall running totals, cap-rate sensitivity around the entered
   rate (reference placeholder flagged, never stored), escaping. */
import test from "node:test";
import assert from "node:assert/strict";
import { donutModel, donutSVG, waterfallModel, waterfallSVG, capSensitivity, fmtShort } from "../src/lib/fincharts.js";

test("donut: zero and invalid slices drop; shares sum to 1; start/end chain", () => {
  const m = donutModel([{ label: "Base", value: 750 }, { label: "CAM", value: 150 }, { label: "Tax", value: 0 }, { label: "Ins", value: null }, { label: "X", value: 100 }]);
  assert.equal(m.total, 1000);
  assert.deepEqual(m.slices.map(s => s.label), ["Base", "CAM", "X"]);
  assert.ok(Math.abs(m.slices.reduce((t, s) => t + s.share, 0) - 1) < 1e-9);
  assert.equal(m.slices[1].start, m.slices[0].end);
  assert.equal(m.slices[2].end, 1);
});

test("donut SVG: one path per slice, large-arc flag on >50%, single slice = full ring", () => {
  const svg = donutSVG([{ label: "Base <b>", value: 750, color: "#2F6B4F" }, { label: "CAM", value: 250, color: "#5F6E64" }], { centerLabel: "per year", centerValue: "$1,000" });
  assert.equal((svg.match(/<path/g) || []).length, 2);
  assert.match(svg, /A71 71 0 1 1/, "the 75% slice uses the large-arc flag");
  assert.match(svg, /Base &lt;b&gt;/);
  assert.match(svg, /\$1,000/);
  const one = donutSVG([{ label: "All", value: 5, color: "#000" }]);
  assert.match(one, /<circle/);
  assert.equal(donutSVG([{ label: "none", value: 0 }]), "");
});

test("waterfall: totals pin to zero, deltas float from the running total", () => {
  const m = waterfallModel([
    { label: "GPR", value: 1000, kind: "total" },
    { label: "Vacancy", value: -100, kind: "delta" },
    { label: "Income", value: 900, kind: "total" },
    { label: "Taxes", value: -200, kind: "delta" },
    { label: "bad", value: NaN, kind: "delta" },
    { label: "NOI", value: 700, kind: "total" },
  ]);
  assert.equal(m.bars.length, 5);
  assert.deepEqual(m.bars.map(b => [b.y0, b.y1]), [[0, 1000], [1000, 900], [0, 900], [900, 700], [0, 700]]);
  assert.equal(m.end, 700);
  assert.equal(m.lo, 0);
  assert.equal(m.hi, 1000);
});

test("waterfall SVG renders bars, links and labels; empty or flat input renders nothing", () => {
  const svg = waterfallSVG([
    { label: "Income", value: 900000, kind: "total", color: "#2F6B4F" },
    { label: "Taxes", value: -200000, kind: "delta", color: "#C25E33", note: "worksheet" },
    { label: "NOI", value: 700000, kind: "total", color: "#1E4F3C" },
  ]);
  assert.equal((svg.match(/class="wf-bar/g) || []).length, 3);
  assert.equal((svg.match(/class="wf-link"/g) || []).length, 2);
  assert.match(svg, /worksheet/);
  assert.match(svg, /−\$200K/);
  assert.equal(waterfallSVG([]), "");
  assert.equal(waterfallSVG([{ label: "z", value: 0, kind: "total" }]), "");
});

test("cap sensitivity: ±100bp in 25bp steps around the entered rate, current marked", () => {
  const s = capSensitivity(983000, 8.5);
  assert.equal(s.rows.length, 9);
  assert.deepEqual(s.rows.map(r => r.cap), [7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5]);
  assert.equal(s.rows.filter(r => r.current).length, 1);
  assert.equal(s.rows.find(r => r.current).cap, 8.5);
  assert.equal(Math.round(s.rows.find(r => r.current).value), Math.round(983000 / 0.085));
  assert.equal(s.reference, false);
});

test("cap sensitivity: no entered rate → reference placeholder, flagged; nothing without any rate", () => {
  const s = capSensitivity(500000, null, { reference: 8.5 });
  assert.equal(s.reference, true);
  assert.equal(s.base, 8.5);
  assert.deepEqual(capSensitivity(500000, null), { rows: [], reference: false });
  assert.deepEqual(capSensitivity(NaN, 8), { rows: [], reference: false });
});

test("short money", () => {
  assert.equal(fmtShort(1_045_596), "$1.05M");
  assert.equal(fmtShort(-55_742), "−$56K");
  assert.equal(fmtShort(950), "$950");
});
