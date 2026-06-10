/* Deterministic geometry extraction — emits src/data/geometry.json.
   Schematic frame replicates baseline/OTB_Command_v7.html drawPlan() exactly;
   the parcel boundary (REV 5) is traced from the recorded metes & bounds
   (Montagnet & Domingue plat, 5/20/1994, last rev. 7/19/2019 — legal description),
   rotated 90° CW: Johnston=left, Patricia=right, Marie Antoinette=top, Arnould=bottom.
   Re-run with `npm run extract-geometry` after editing this file. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const units = JSON.parse(readFileSync(join(root, "src/data/units.json"), "utf8"));
const SF = Object.fromEntries(units.map(u => [u.unit, u.sf]));

const rect = (x, y, w, h, attrs = {}) => ({ t: "rect", x, y, w, h, attrs });
const line = (x1, y1, x2, y2, attrs = {}) => ({ t: "line", x1, y1, x2, y2, attrs });
const text = (x, y, s, attrs = {}) => ({ t: "text", x, y, s, attrs });
const path = (d, attrs = {}) => ({ t: "path", d, attrs });

/* ════════════════════════════════════════════════════════════════════
   PLAT-EXACT BOUNDARY (REV 5) — recorded metes & bounds, Block I tract.
   Source: legal description, Montagnet & Domingue plat (traced 6/10/2026
   from plat-of-survey-detailed.pdf; crops in reference/).
   ════════════════════════════════════════════════════════════════════ */
const D2R = Math.PI / 180;
// quadrant bearing → compass azimuth (degrees)
const az = ([q1, d, m, s, q2]) => {
  const deg = d + m / 60 + s / 3600;
  if (q1 === "N" && q2 === "E") return deg;
  if (q1 === "S" && q2 === "E") return 180 - deg;
  if (q1 === "S" && q2 === "W") return 180 + deg;
  return 360 - deg; // N…W
};
const dir = a => [Math.sin(a * D2R), Math.cos(a * D2R)]; // ENU unit vector
const fmtB = ([q1, d, m, s, q2]) =>
  q1 + d + "°" + String(m).padStart(2, "0") + "'" + String(s).padStart(2, "0") + "\"" + q2;

const MAIN_TRACT = {
  name: "Block I tract — Arnould Heights Subd. + Ext. No. 1 (partition of Lots 1 & 2)",
  commence: "SW R/W corner, Arnould Blvd × Patricia St; thence S38°32'00\"E 25.00' to POB",
  courses: [
    { type: "line", bearing: ["S", 38, 32, 0, "E"], dist: 550.12, along: "Arnould Blvd" },
    { type: "line", bearing: ["S", 51, 28, 0, "W"], dist: 100.00, along: "excluded corner parcel NW line" },
    { type: "line", bearing: ["S", 38, 32, 0, "E"], dist: 120.61, along: "excluded corner parcel SW line" },
    { type: "curve", side: "L", R: 1872.44, L: 168.53, chordBearing: ["S", 51, 7, 34, "W"], chord: 168.48, along: "Johnston St / US 167" },
    { type: "curve", side: "R", R: 30.00, L: 48.65, chordBearing: ["N", 84, 59, 34, "W"], chord: 43.49, along: "Johnston × Marie Antoinette return" },
    { type: "line", bearing: ["N", 38, 32, 0, "W"], dist: 641.77, along: "Marie Antoinette St" },
    { type: "curve", side: "R", R: 25.00, L: 39.27, chordBearing: ["N", 6, 28, 0, "E"], chord: 35.36, along: "Marie Antoinette × Patricia return" },
    { type: "line", bearing: ["N", 51, 28, 0, "E"], dist: 250.00, along: "Patricia St" },
    { type: "curve", side: "R", R: 25.00, L: 39.27, chordBearing: ["S", 83, 32, 0, "E"], chord: 35.36, along: "Patricia × Arnould return" }
  ]
};
const LOT7_TRACT = {
  name: "Lot 7, Block M — Arnould Heights Subd. Ext. No. 1 (remote parking, parcel 6009649)",
  commence: "SW R/W corner, Marie Antoinette St × Patricia St; thence S38°32'00\"E 25.00' to POB",
  courses: [
    { type: "line", bearing: ["S", 38, 32, 0, "E"], dist: 75.00 },
    { type: "line", bearing: ["S", 51, 28, 0, "W"], dist: 150.17 },
    { type: "line", bearing: ["N", 38, 43, 28, "W"], dist: 100.00 },
    { type: "line", bearing: ["N", 51, 28, 0, "E"], dist: 125.50 },
    { type: "curve", side: "R", R: 25.00, L: 39.27, chordBearing: ["S", 83, 32, 0, "E"], chord: 35.36 }
  ]
};

// integrate courses in ENU feet from POB(0,0); curves positioned by chord, mid-arc kept for sweep/extents
function traceCourses(courses) {
  let P = [0, 0];
  const segs = [];
  for (const c of courses) {
    const start = P;
    if (c.type === "line") {
      const v = dir(az(c.bearing));
      P = [start[0] + c.dist * v[0], start[1] + c.dist * v[1]];
      segs.push({ ...c, start, end: P });
    } else {
      const v = dir(az(c.chordBearing));
      const end = [start[0] + c.chord * v[0], start[1] + c.chord * v[1]];
      const m = Math.sqrt(c.R * c.R - (c.chord / 2) ** 2);
      const ctr0 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      const cv = dir(az(c.chordBearing) + (c.side === "R" ? 90 : -90));
      const ctr = [ctr0[0] + m * cv[0], ctr0[1] + m * cv[1]];
      const w = [ctr0[0] - ctr[0], ctr0[1] - ctr[1]];
      const wl = Math.hypot(w[0], w[1]);
      const midArc = [ctr[0] + (w[0] / wl) * c.R, ctr[1] + (w[1] / wl) * c.R];
      segs.push({ ...c, start, end, midArc });
      P = end;
    }
  }
  return { segs, closureFt: Math.hypot(P[0], P[1]) };
}

const main = traceCourses(MAIN_TRACT.courses);
const lot7 = traceCourses(LOT7_TRACT.courses);
if (main.closureFt > 0.1) throw new Error("Main tract does not close: " + main.closureFt.toFixed(3) + " ft");
if (lot7.closureFt > 0.5) throw new Error("Lot 7 tract does not close: " + lot7.closureFt.toFixed(3) + " ft");

// street-grid components: a along S38°32'00"E (Arnould direction, Patricia→Johnston),
// b along N51°28'00"E (toward Arnould). Streets are complementary (38°32' + 51°28' = 90°).
const Av = dir(az(["S", 38, 32, 0, "E"])), Bv = dir(az(["N", 51, 28, 0, "E"]));
const toAB = ([e, n]) => [e * Av[0] + n * Av[1], e * Bv[0] + n * Bv[1]];

const abPts = main.segs.flatMap(s => [s.start, s.end, s.midArc].filter(Boolean).map(toAB));
const aMin = Math.min(...abPts.map(p => p[0])), aMax = Math.max(...abPts.map(p => p[0]));
const bMin = Math.min(...abPts.map(p => p[1])), bMax = Math.max(...abPts.map(p => p[1]));

// fit the true boundary into the schematic envelope the REV 4 sketch occupied
// (x 70→1360, y 96→662) so streets, buildings, and parking stay registered.
// kx ≠ ky by ~1.9% (sheet is slightly squashed) — documented anisotropy.
const ENV = { xRight: 1360, xLeft: 70, yBottom: 662, yTop: 96 };
const kx = (ENV.xRight - ENV.xLeft) / (aMax - aMin);
const ky = (ENV.yBottom - ENV.yTop) / (bMax - bMin);
const toXY = ab => [ENV.xRight - kx * (ab[0] - aMin), ENV.yBottom + ky * (ab[1] - bMax)];
const r2 = n => Math.round(n * 100) / 100;

let bdPath = "";
const scr = []; // screen-space segs for labels
main.segs.forEach((s, i) => {
  const S = toXY(toAB(s.start)), E = toXY(toAB(s.end));
  if (i === 0) bdPath += "M " + r2(S[0]) + " " + r2(S[1]);
  if (s.type === "line") {
    bdPath += " L " + r2(E[0]) + " " + r2(E[1]);
    scr.push({ ...s, S, E });
  } else {
    const M = toXY(toAB(s.midArc));
    const sweep = ((M[0] - S[0]) * (E[1] - S[1]) - (M[1] - S[1]) * (E[0] - S[0])) > 0 ? 1 : 0;
    bdPath += " A " + r2(s.R * kx) + " " + r2(s.R * ky) + " 0 0 " + sweep + " " + r2(E[0]) + " " + r2(E[1]);
    scr.push({ ...s, S, E, M });
  }
});
bdPath += " Z";

// bearing/distance labels, plat-style (positions chosen against the sheet layout)
const mid = s => [(s.S[0] + s.E[0]) / 2, (s.S[1] + s.E[1]) / 2];
const lbl = (x, y, str, extra = {}) => text(r2(x), r2(y), str, { class: "svg-lab", "font-size": "8", ...extra });
const courseLabels = [
  lbl(mid(scr[0])[0], 673, fmtB(scr[0].bearing) + " — 550.12'", { "text-anchor": "middle" }),                       // Arnould
  lbl(scr[1].S[0] - 8, mid(scr[1])[1], fmtB(scr[1].bearing) + " 100.00'",
    { "text-anchor": "middle", transform: "rotate(-90 " + r2(scr[1].S[0] - 8) + " " + r2(mid(scr[1])[1]) + ")" }),  // notch NW line
  lbl(mid(scr[2])[0], scr[2].S[1] - 7, fmtB(scr[2].bearing) + " 120.61'", { "text-anchor": "middle" }),             // notch SW line
  lbl(60, mid(scr[3])[1], "R=1872.44' L=168.53' CH=S51°07'34\"W",
    { "text-anchor": "middle", transform: "rotate(-90 60 " + r2(mid(scr[3])[1]) + ")" }),                           // Johnston curve
  lbl(140, 452, "R=30.00' L=48.65'"),                                                                               // Johnston × M.A. return
  lbl(720, 91, fmtB(scr[5].bearing) + " — 641.77'", { "text-anchor": "middle" }),                                   // Marie Antoinette
  lbl(1374, mid(scr[7])[1], fmtB(scr[7].bearing) + " — 250.00'",
    { "text-anchor": "middle", transform: "rotate(90 1374 " + r2(mid(scr[7])[1]) + ")" }),                          // Patricia
  lbl(1305, 644, "R=25.00' L=39.27'", { "text-anchor": "end" })                                                     // Patricia × Arnould return
];

/* ── base layer: streets, parcel boundary, notch labels, sidewalks ── */
const base = [];
// Marie Antoinette (west frontage → top band) — TRUE position: 40' R/W
// abutting the boundary at y=96 (far R/W edge at b=-340)
const MA_TOP = r2(ENV.yBottom - ky * 340); // 20.55
base.push(rect(0, MA_TOP, 1480, r2(96 - MA_TOP), { fill: "#DDE0D4" }));
base.push(line(0, MA_TOP, 1480, MA_TOP, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 96, 1480, 96, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 58.3, 1480, 58.3, { stroke: "#FCFCF9", "stroke-width": 2, "stroke-dasharray": "26 20" }));
base.push(text(700, 64, "M A R I E   A N T O I N E T T E   S T R E E T   ( 4 0 '  R / W   A S P H A L T )",
  { class: "svg-street", "font-size": "16", "text-anchor": "middle" }));
// Arnould Blvd (east frontage → bottom band)
base.push(rect(0, 676, 1480, 76, { fill: "#DDE0D4" }));
base.push(line(0, 676, 1480, 676, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 752, 1480, 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 714, 1480, 714, { stroke: "#FCFCF9", "stroke-width": 2, "stroke-dasharray": "26 20" }));
base.push(text(700, 720, "A R N O U L D   B O U L E V A R D   ( 8 0 '  R / W   C O N C R E T E )",
  { class: "svg-street", "font-size": "18", "text-anchor": "middle" }));
// Patricia (north → right band)
base.push(rect(1396, 0, 84, 752, { fill: "#DDE0D4" }));
base.push(line(1396, 0, 1396, 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(text(1440, 376, "P A T R I C I A   S T   ( 5 0 '  R / W )",
  { class: "svg-street", "font-size": "15", "text-anchor": "middle", transform: "rotate(90 1440 376)" }));
// Johnston (south → left band)
base.push(rect(0, 0, 50, 752, { fill: "#DDE0D4" }));
base.push(line(50, 0, 50, 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(text(28, 376, "J O H N S T O N   S T   ·   U S   H W Y   1 6 7   ( ± 1 0 0 '  R / W )",
  { class: "svg-street", "font-size": "14", "text-anchor": "middle", transform: "rotate(-90 28 376)" }));
// parcel boundary — plat-exact metes & bounds (REV 5); notch at Johnston ×
// Arnould corner is the excluded (sold) parcel per courses 2–3
base.push(path(bdPath,
  { fill: "none", stroke: "#1C2B26", "stroke-width": "1.4", "stroke-dasharray": "14 5 3 5" }));
base.push(text(178, 556, "NOT A PART",
  { class: "svg-lab", "font-size": "10", "text-anchor": "middle", "letter-spacing": ".22em" }));
base.push(text(178, 572, "(EXCLUDED CORNER PARCEL)",
  { class: "svg-lab", "font-size": "7.5", "text-anchor": "middle" }));
base.push(...courseLabels);

/* ── remote lot layer: Lot 7, Block M — plat-exact trapezoid (REV 6) ──
   POB sits across Marie Antoinette at the Patricia corner: ab = (0, -340)
   (far M.A. R/W edge, 25' along S38°32'E from the corner, per commencement). */
const remoteLot = [];
{
  const POB7 = [0, -340];
  let p7 = "";
  const pts7 = [];
  lot7.segs.forEach((s, i) => {
    const S = toXY([POB7[0] + toAB(s.start)[0], POB7[1] + toAB(s.start)[1]]);
    const E = toXY([POB7[0] + toAB(s.end)[0], POB7[1] + toAB(s.end)[1]]);
    if (i === 0) p7 += "M " + r2(S[0]) + " " + r2(S[1]);
    if (s.type === "line") { p7 += " L " + r2(E[0]) + " " + r2(E[1]); pts7.push(S, E); }
    else {
      const M = toXY([POB7[0] + toAB(s.midArc)[0], POB7[1] + toAB(s.midArc)[1]]);
      const sweep = ((M[0] - S[0]) * (E[1] - S[1]) - (M[1] - S[1]) * (E[0] - S[0])) > 0 ? 1 : 0;
      p7 += " A " + r2(s.R * kx) + " " + r2(s.R * ky) + " 0 0 " + sweep + " " + r2(E[0]) + " " + r2(E[1]);
      pts7.push(S, E, M);
    }
  });
  p7 += " Z";
  const xL = Math.min(...pts7.map(p => p[0])), xR = Math.max(...pts7.map(p => p[0]));
  const yT = Math.min(...pts7.map(p => p[1])), yB = Math.max(...pts7.map(p => p[1]));
  const cx = r2((xL + xR) / 2);
  remoteLot.push(path(p7, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1 }));
  remoteLot.push(path(p7, { fill: "none", stroke: "#1C2B26", "stroke-width": 1.2, "stroke-dasharray": "14 5 3 5" }));
  // stall striping — two double-loaded rows (±24 spaces), schematic until item 4
  for (let r = 0; r < 2; r++) {
    const ry = r2(yT + 78 + r * 86);
    remoteLot.push(line(r2(xL + 16), ry, r2(xR - 16), ry, { stroke: "#C2C8B5", "stroke-width": 1.2 }));
    for (let rx = Math.ceil(xL + 16); rx <= xR - 16; rx += 20)
      remoteLot.push(line(r2(rx), ry - 24, r2(rx), ry + 24, { stroke: "#C9CEBE", "stroke-width": 1 }));
  }
  remoteLot.push(text(cx, r2(yB - 22), "LOT 7 — REMOTE PARKING · 110 MARIE ANTOINETTE ST",
    { class: "svg-lab", "font-size": "10", "text-anchor": "middle", "font-weight": "600" }));
  remoteLot.push(text(cx, r2(yB - 8), "LOT 7, BLOCK M · PARCEL 6009649 · ±24 SPACES",
    { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }));
  remoteLot.push(text(cx, r2(yT - 10), "OVERFLOW / CROSS-PARKING · FILL ORDER: MAIN FIELD → LOT 8 → LOT 7",
    { class: "svg-lab", "font-size": "9.5", "text-anchor": "middle" }));
  remoteLot.push(text(r2(xR + 10), r2((yT + yB) / 2), "S38°32'00\"E 75.00' FRONTAGE · 150.17' DEEP",
    { class: "svg-lab", "font-size": "8", "text-anchor": "middle", transform: "rotate(90 " + r2(xR + 10) + " " + r2((yT + yB) / 2) + ")" }));
  remoteLot.push(line(cx, r2(yB), cx, 96, { stroke: "#8A937F", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
}

/* ── parking layer: storefront row, liquor line, main field, Lot 8 ── */
const parking = [];
// storefront head-in parking — concrete row in front of long building (per plat)
parking.push(rect(150, 302, 914, 40, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1 }));
for (let x = 168; x <= 1050; x += 30)
  parking.push(line(x, 304, x, 340, { stroke: "#C9CEBE", "stroke-width": 1 }));
// liquor line — Our Savior's Church easement §3a (traced from recorded plat; bearing approx.)
parking.push(line(82, 360, 1352, 360, { stroke: "#A87E2F", "stroke-width": 2, "stroke-dasharray": "14 7" }));
parking.push(text(300, 354, "LIQUOR RESTRICTED THIS SIDE OF LINE ▲",
  { class: "svg-lab", "font-size": "9", "font-weight": "600", fill: "#A87E2F" }));
parking.push(text(300, 374, "LIQUOR PERMITTED THIS SIDE OF LINE ▼ — PER OUR SAVIOR'S CHURCH EASEMENT §3a (WAIVER SURVIVES TERMINATION)",
  { class: "svg-lab", "font-size": "9", "font-weight": "600", fill: "#A87E2F" }));
// main parking field — Arnould side of liquor line
parking.push(rect(306, 386, 734, 258, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1, rx: 3 }));
for (let r = 0; r < 2; r++) {
  const y = 434 + r * 92;
  parking.push(line(336, y, 1010, y, { stroke: "#C2C8B5", "stroke-width": 1.2 }));
  for (let x = 336; x <= 1010; x += 33)
    parking.push(line(x - 9, y - 22, x + 9, y + 22, { stroke: "#C9CEBE", "stroke-width": 1 }));
}
parking.push(text(673, 656, "MAIN PARKING FIELD · FILLS FIRST · 324 STALLS SITE-WIDE PER VARIANCE ENTRY 99-11797 (344 REQUIRED)",
  { class: "svg-lab", "font-size": "10.5", "text-anchor": "middle" }));
// LOT 8 — pocket at Patricia × M.A. corner (added 3/26/98 per plat rev.);
// extent fitted between the long building's Patricia end and Patricia R/W —
// exact trace pending item 4
parking.push(rect(1136, 102, 218, 98, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1, rx: 3 }));
parking.push(line(1154, 150, 1336, 150, { stroke: "#C2C8B5", "stroke-width": 1.2 }));
for (let x = 1154; x <= 1336; x += 22)
  parking.push(line(x, 128, x, 172, { stroke: "#C9CEBE", "stroke-width": 1 }));
parking.push(text(1245, 192, "LOT 8 — ±15 SPACES (PATRICIA / M.A. CORNER)",
  { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }));

/* ── building placements — plat-exact demising (REV 6) ──────────────
   Long building: 85.45' deep, demising widths from the plat's dimension
   strings (Montagnet & Domingue). Widths marked "derived" are SF-proportional
   splits inside a measured plat envelope (today's demising differs from the
   2019 plat-era tenancy there). Patricia → Johnston order.                 */
const LB_DEPTH = 85.45;          // plat: end-wall dimension string
const LB_REAR_SETBACK = 10;      // rear face at the 10' utility easement off M.A. R/W
const LB_EAST_GAP = 19.07;       // plat: building SE corner to boundary at Johnston end
const LB_BAYS = [ // [unit, width ft, source]
  ["133", 14.88, "derived: 1,272 SF / 85.45' inside plat 37.2' (POLITICS) block"],
  ["131", 22.32, "derived: 1,907 SF / 85.45' inside plat 37.2' (POLITICS) block"],
  ["129", 20.9, "plat"], ["127", 29.7, "plat"], ["125", 20.3, "plat"], ["123", 41.7, "plat"],
  ["121", 20.0, "plat"], ["119.5", 23.1, "plat"], ["119", 23.2, "plat"],
  ["117.5", 20.2, "plat (string conflicts with plat SF 1,769 → 20.7'; string governs)"],
  ["117", 25.4, "plat"], ["115", 25.4, "plat"],
  ["113", 30.78, "derived: SF split of plat 80.8' (LOT 12) block"],
  ["111", 19.96, "derived: SF split of plat 80.8' (LOT 12) block"],
  ["109", 30.07, "derived: SF split of plat 80.8' (LOT 12) block"],
  ["107", 20.4, "plat"], ["105", 26.0, "plat"],
  ["103", 33.21, "derived: SF split of plat 108.00' (BROTHER'S) end block"],
  ["101", 74.79, "derived: SF split of plat 108.00' (BROTHER'S) end block"]
];
/* Short building: along Patricia, 84.49' deep, 208.65' long (plat wall dim).
   Jason's Deli (149) at the Arnould end. 1,917 SF bays share the residual
   evenly. 135 (plat: POLITICS 3,160) is the 37.4' M.A.-end section split at
   MID-DEPTH into two ~square units (42.245' × 37.4' = 1,580 SF each), both
   fronting M.A.: 135A on the breezeway (west) side — front door to the
   breezeway, double doors to M.A.; 135B on the Patricia (east) side —
   double doors to M.A., rear door to Patricia. Operator-confirmed.        */
const SB_DEPTH = 84.49;
const SB_FACE_FROM_PATRICIA_RW = 26.5;  // scaled from plat (no string)
const SB_NORTH_FROM_ARNOULD_RW = 26.0;  // scaled from plat (no string)
const SB_BAYS = [ // Marie Antoinette end → Arnould end
  ["135", 37.4, "plat: POLITICS 3,160 section — mid-depth split into 135A (breezeway square) / 135B (Patricia square)"],
  ["137", 24.3, "plat"],
  ["139", 23.0875, "derived: (208.65 − 54.6 − 24.3 − 37.4) / 4"],
  ["141", 23.0875, "derived"], ["143", 23.0875, "derived"], ["145", 23.0875, "derived"],
  ["149", 54.6, "plat"]
];

const placed = {};
// long building: rear backs M.A.; east face 19.07' from the boundary's Johnston terminus
const lbAEast = 641.77 - LB_EAST_GAP;
const lbLen = LB_BAYS.reduce((s, b) => s + b[1], 0);
const lbY = r2(ENV.yBottom - ky * (300 - LB_REAR_SETBACK));
const lbH = r2(ky * LB_DEPTH);
{
  let a = lbAEast - lbLen; // west (Patricia-side) end
  LB_BAYS.forEach(([unit, w]) => {
    const x = ENV.xRight - kx * (a + w + 25);
    placed[unit] = { x: r2(x), y: lbY, w: r2(kx * w - 2), h: lbH };
    a += w;
  });
}
// short building: along Patricia; stacked from the M.A. end toward Arnould
const sbXRight = r2(ENV.xRight - kx * SB_FACE_FROM_PATRICIA_RW);
const sbW = r2(kx * SB_DEPTH);
const sbLen = SB_BAYS.reduce((s, b) => s + b[1], 0);
const sbYSouth = r2(ENV.yBottom - ky * SB_NORTH_FROM_ARNOULD_RW); // Arnould-end face
const sbYNorth = r2(sbYSouth - ky * sbLen);                        // M.A.-end face
{
  let off = 0; // feet from the M.A. end
  SB_BAYS.forEach(([unit, w]) => {
    const y = r2(sbYNorth + ky * off), h = r2(ky * w - 2);
    if (unit === "135") {
      // mid-depth split: two squares side by side, both fronting M.A.
      const half = kx * (SB_DEPTH / 2);
      placed["135A"] = { x: r2(sbXRight - sbW), y, w: r2(half - 2), h };          // breezeway (west) square
      placed["135B"] = { x: r2(sbXRight - sbW + half), y, w: r2(half - 2), h };   // Patricia (east) square
    } else {
      placed[unit] = { x: r2(sbXRight - sbW), y, w: sbW, h };
    }
    off += w;
  });
}

// sidewalks along both storefront faces (base layer, below buildings)
base.push(rect(r2(placed["101"].x), r2(lbY + lbH + 2), r2(kx * lbLen - 2), 18, { fill: "#E2E5D9", stroke: "#CDD2C2", "stroke-width": 1 }));
base.push(rect(r2(sbXRight - sbW - 20), sbYNorth, 18, r2(ky * sbLen), { fill: "#E2E5D9", stroke: "#CDD2C2", "stroke-width": 1 }));

/* ── annotations ── */
const annotations = [
  text(160, 110, "LONG BLDG 101–133 — BACKS MARIE ANTOINETTE · 101 AT JOHNSTON END · STOREFRONTS FACE LOT 1",
    { class: "svg-lab", "font-size": "9.5" }),
  text(r2(sbXRight), r2(sbYSouth + 14), "SHORT BLDG 135–149 — 149 ANCHORS ARNOULD CORNER",
    { class: "svg-lab", "font-size": "9.5", "text-anchor": "end" })
];

/* ── general notes sheet band ── */
const generalNotes = [
  rect(70, 778, 978, 200, { fill: "#F6F7F1", stroke: "#1C2B26", "stroke-width": 1.2 }),
  line(70, 806, 1048, 806, { stroke: "#1C2B26", "stroke-width": 1 }),
  text(84, 798, "GENERAL NOTES",
    { fill: "#1C2B26", style: "font-family:'Big Shoulders Display',sans-serif;font-weight:700;font-size:15px;letter-spacing:.1em" })
];
const NOTES = [
  "1.  PARKING VARIANCE ENTRY 99-11797 — 324 PROVIDED / 344 REQUIRED. FLOOR SPACE “LIMITED TO AVAILABLE PARKING SPACES.” ASSESS EVERY LEASE OR LICENSE AGAINST THIS FIGURE.",
  "2.  OUR SAVIOR'S CHURCH ACCESS & PARKING EASEMENT — $350/MO · 25-YR TERM · SUNDAYS + 6PM–MIDNIGHT · §3a LIQUOR WAIVER SURVIVES TERMINATION (ENABLES RESTAURANT LEASING WITHIN 175 FT).",
  "3.  JD BANK RECIPROCAL EASEMENT — $250/MO TO BELLE + 13 BANK SPACES · 50/50 MAINTENANCE SPLIT · EXPIRES 12/30/2034 · SUPERSEDES ENTRY 2004-00057697.",
  "4.  PARKING FILL ORDER: MAIN FIELD → LOT 8 (±15 SP, PATRICIA/M.A. CORNER) → LOT 7 (REMOTE, BLK M, ±24 SP). ZONING ALSO REQUIRES 20% GREEN AREA. CROSS-PARKING LICENSES NON-EXCLUSIVE — NO ASSIGNED STALLS.",
  "5.  LEGAL: LOTS 1–3, 1–14, PARTITION OF LOTS 1 & 2 BLK I + REMOTE PARCEL, BLK M, ARNOLD HEIGHTS SUBD. EXT. NO. 1 · 4.84 AC · OUTSIDE SFHA. ASSESSOR: 6026783 · 6026784 · 6026785 · 6026788 · 6009649 (REMOTE).",
  "6.  STREET SPELLING VARIANTS ‘ARNAULD / ARNOLD / ARNOULD’ — TITLE CHECK PENDING (P0). PLAT: MONTAGNET & DOMINGUE, INC., 5/20/1994, LAST REV. 7/19/2019."
];
NOTES.forEach((n, i) => generalNotes.push(text(84, 826 + i * 25, n, { class: "svg-lab", "font-size": "9.5" })));

/* ── title block ── */
const titleBlock = [
  rect(1064, 778, 296, 200, { fill: "#F6F7F1", stroke: "#1C2B26", "stroke-width": 1.4 }),
  line(1064, 806, 1360, 806, { stroke: "#1C2B26", "stroke-width": 1 }),
  line(1064, 902, 1360, 902, { stroke: "#1C2B26", "stroke-width": 1 }),
  text(1078, 798, "ON THE BOULEVARD",
    { fill: "#1C2B26", style: "font-family:'Big Shoulders Display',sans-serif;font-weight:700;font-size:17px;letter-spacing:.08em" }),
  text(1078, 826, "BELLE REALTY OF LAFAYETTE, LLC", { class: "svg-lab", "font-size": "9" }),
  text(1078, 842, "SHEET A-1 · SITE PLAN · ZONED CH", { class: "svg-lab", "font-size": "9" }),
  text(1078, 858, "62,883 SF · 27 UNITS · 2 BLDGS + REMOTE LOT", { class: "svg-lab", "font-size": "9" }),
  text(1078, 874, "GEOMETRY PER RECORDED PLAT (ROTATED 90° CW)", { class: "svg-lab", "font-size": "9" }),
  text(1078, 890, "REV 7 — 135A/B MID-DEPTH SQUARE SPLIT (PLAT + OPERATOR)", { class: "svg-lab", "font-size": "9" }),
  path("M1296 936 L1322 930 L1315 936 L1322 942 Z", { fill: "#1C2B26" }),
  text(1332, 940, "N", { "dominant-baseline": "middle", "font-family": "'IBM Plex Mono',monospace", "font-size": "10", "font-weight": "600", fill: "#1C2B26" }),
  text(1212, 962, "PLAN ROTATED — TRUE NORTH AT RIGHT (PATRICIA ST)", { class: "svg-lab", "font-size": "7.5", "text-anchor": "middle" })
];

const geometry = {
  rev: "REV 7",
  source: "Recorded plat — Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019 (boundary per legal description; buildings per plat demising strings; parking/liquor line still schematic)",
  viewBox: { main: "0 0 1480 990", full: "0 -310 1480 1300" },
  demising: {
    longBuilding: { depthFt: LB_DEPTH, rearSetbackFt: LB_REAR_SETBACK, eastGapFt: LB_EAST_GAP, lengthFt: r2(lbLen), bays: LB_BAYS },
    shortBuilding: {
      depthFt: SB_DEPTH, patriciaOffsetFt: SB_FACE_FROM_PATRICIA_RW, arnouldOffsetFt: SB_NORTH_FROM_ARNOULD_RW, lengthFt: r2(sbLen), bays: SB_BAYS,
      split135: "mid-depth wall: 135A breezeway/west square + 135B Patricia/east square, each 42.245' × 37.4' = 1,580 SF; both front M.A. (135A door to breezeway, 135B rear door to Patricia)"
    }
  },
  // audit record: metes & bounds in feet + the feet→px transform used for the boundary
  boundary: {
    mainTract: { ...MAIN_TRACT, closureFt: r2(main.closureFt) },
    lot7BlockM: { ...LOT7_TRACT, closureFt: r2(lot7.closureFt), note: "courses recorded; outline retrace pending (Phase 3 item 2/4)" },
    transform: {
      kxPxPerFt: r2(kx * 1000) / 1000, kyPxPerFt: r2(ky * 1000) / 1000,
      envelope: ENV, aRangeFt: [r2(aMin), r2(aMax)], bRangeFt: [r2(bMin), r2(bMax)],
      note: "fit to REV 4 sheet envelope; ~1.9% anisotropy keeps streets/buildings registered"
    }
  },
  // layer order = z-order: base under everything, buildings drawn by plan.js between parking and annotations
  layers: { base, remoteLot, parking, annotations, generalNotes, titleBlock },
  units: placed
};

writeFileSync(join(root, "src/data/geometry.json"), JSON.stringify(geometry, null, 1) + "\n");
console.log("geometry.json written:",
  Object.keys(placed).length, "unit rects,",
  Object.values(geometry.layers).reduce((s, l) => s + l.length, 0), "primitives");
console.log("main tract closure:", main.closureFt.toFixed(4) + " ft;",
  "lot 7 closure:", lot7.closureFt.toFixed(4) + " ft");
console.log("scale:", kx.toFixed(4), "px/ft (x),", ky.toFixed(4), "px/ft (y);",
  "a:", r2(aMin), "→", r2(aMax), "ft; b:", r2(bMin), "→", r2(bMax), "ft");
