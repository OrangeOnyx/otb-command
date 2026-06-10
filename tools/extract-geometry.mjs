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
// Arnould Blvd (east frontage → bottom band) — REV 10: near R/W edge TRUE
// at b=0 (y 662, coincident with the boundary line); the 80' R/W clips at
// the sheet margin y 752 (the full far edge would land at y ≈ 813, under
// the notes band). Centerline drawn true at 40' out.
base.push(rect(0, 662, 1480, 90, { fill: "#DDE0D4" }));
base.push(line(0, 662, 1480, 662, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 752, 1480, 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, r2(662 + ky * 40), 1480, r2(662 + ky * 40), { stroke: "#FCFCF9", "stroke-width": 2, "stroke-dasharray": "26 20" }));
base.push(text(700, 726, "A R N O U L D   B O U L E V A R D   ( 8 0 '  R / W   C O N C R E T E )",
  { class: "svg-street", "font-size": "18", "text-anchor": "middle" }));
// Patricia (north → right band) — REV 10: true 50' R/W, near edge at a=-25
// (x 1360); extends through the full-scope view past Marie Antoinette
base.push(rect(1360, -310, r2(kx * 50), 1062, { fill: "#DDE0D4" }));
base.push(line(1360, -310, 1360, 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(r2(1360 + kx * 50), -310, r2(1360 + kx * 50), 752, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(text(r2(1360 + kx * 25), 376, "P A T R I C I A   S T   ( 5 0 '  R / W )",
  { class: "svg-street", "font-size": "15", "text-anchor": "middle", transform: "rotate(90 " + r2(1360 + kx * 25) + " 376)" }));
// Johnston (south → left band) — REV 10: near edge follows the TRUE R/W arc
// (R=1872.44', boundary course 4 extended along the same circle); far side
// of the ±100' R/W lies beyond the sheet edge
{
  const cc = (P, Q, S) => {
    const d = 2 * (P[0] * (Q[1] - S[1]) + Q[0] * (S[1] - P[1]) + S[0] * (P[1] - Q[1]));
    return [
      ((P[0] ** 2 + P[1] ** 2) * (Q[1] - S[1]) + (Q[0] ** 2 + Q[1] ** 2) * (S[1] - P[1]) + (S[0] ** 2 + S[1] ** 2) * (P[1] - Q[1])) / d,
      ((P[0] ** 2 + P[1] ** 2) * (S[0] - Q[0]) + (Q[0] ** 2 + Q[1] ** 2) * (P[0] - S[0]) + (S[0] ** 2 + S[1] ** 2) * (Q[0] - P[0])) / d
    ];
  };
  const seg = main.segs[3];
  const S_ = toAB(seg.start), M_ = toAB(seg.midArc), E_ = toAB(seg.end);
  const C_ = cc(S_, M_, E_);
  const R_ = Math.hypot(S_[0] - C_[0], S_[1] - C_[1]);           // ≈ 1872.44
  const side = Math.sign(S_[0] - C_[0]);
  const aAt = b => C_[0] + side * Math.sqrt(R_ * R_ - (b - C_[1]) ** 2);
  const bTop = -515.2, bBot = 47.7;                               // y -310 … 752
  const JT = toXY([aAt(bTop), bTop]), JB = toXY([aAt(bBot), bBot]);
  const JM = toXY([aAt((bTop + bBot) / 2), (bTop + bBot) / 2]);
  const sw = ((JM[0] - JT[0]) * (JB[1] - JT[1]) - (JM[1] - JT[1]) * (JB[0] - JT[0])) > 0 ? 1 : 0;
  const arc = "M " + r2(JT[0]) + " " + r2(JT[1]) + " A " + r2(R_ * kx) + " " + r2(R_ * ky) + " 0 0 " + sw + " " + r2(JB[0]) + " " + r2(JB[1]);
  base.push(path(arc + " L 0 752 L 0 -310 Z", { fill: "#DDE0D4" }));
  base.push(path(arc, { fill: "none", stroke: "#AEB4A2", "stroke-width": 2 }));
  base.push(text(28, 376, "J O H N S T O N   S T   ·   U S   H W Y   1 6 7   ( ± 1 0 0 '  R / W )",
    { class: "svg-street", "font-size": "14", "text-anchor": "middle", transform: "rotate(-90 28 376)" }));
  // JD Bank corner return — Johnston × Arnould (plat: R=30.00' L=49.38'
  // CH=N08°37'26"E 43.99', bank parcel corner; street edge only, NOT Belle)
  const aC = aAt(0);
  const T1 = toXY([aC - 30, 0]), T2 = toXY([aAt(-30), -30]), TM = toXY([aC - 8.79, -8.79]);
  const sw2 = ((TM[0] - T1[0]) * (T2[1] - T1[1]) - (TM[1] - T1[1]) * (T2[0] - T1[0])) > 0 ? 1 : 0;
  base.push(path("M " + r2(T1[0]) + " " + r2(T1[1]) + " A " + r2(30 * kx) + " " + r2(30 * ky) + " 0 0 " + sw2 + " " + r2(T2[0]) + " " + r2(T2[1]),
    { fill: "none", stroke: "#AEB4A2", "stroke-width": 2 }));
}
// parcel boundary — plat-exact metes & bounds (REV 5); notch at Johnston ×
// Arnould corner is the excluded (sold) parcel per courses 2–3
base.push(path(bdPath,
  { fill: "none", stroke: "#1C2B26", "stroke-width": "1.4", "stroke-dasharray": "14 5 3 5" }));
base.push(text(178, 500, "NOT A PART",
  { class: "svg-lab", "font-size": "10", "text-anchor": "middle", "letter-spacing": ".22em" }));
base.push(text(178, 514, "(EXCLUDED CORNER PARCEL)",
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
  // stall striping per plat (REV 9): 6 at the M.A. frontage, 8 mid-lot,
  // 10 along the east (deep) line, 8 at the rear — 32 total, labeled rows
  const P7 = (da, db) => toXY([POB7[0] + da, POB7[1] + db]);
  const TICK7 = { stroke: "#C9CEBE", "stroke-width": 1 };
  const row7 = (da0, da1, db0, db1, n) => { // n stalls → n+1 vertical ticks
    for (let i = 0; i <= n; i++) {
      const da = da0 + (i * (da1 - da0)) / n;
      const A = P7(da, db0), B = P7(da, db1);
      remoteLot.push(line(r2(A[0]), r2(A[1]), r2(B[0]), r2(B[1]), TICK7));
    }
  };
  row7(8, 62, -2, -20.5, 6);        // 6 SPACES — frontage row (noses M.A.)
  row7(3, 75, -55, -73.5, 8);       // 8 SPACES — mid row
  row7(3, 75, -112, -130.5, 8);     // 8 SPACES — rear row
  {                                  // 10' utility easement along the rear lot line (plat)
    const A = P7(3, -140.2), B = P7(75, -140.2);
    remoteLot.push(line(r2(A[0]), r2(A[1]), r2(B[0]), r2(B[1]),
      { stroke: "#8A937F", "stroke-width": 1, "stroke-dasharray": "6 4" }));
  }
  for (let i = 0; i <= 10; i++) {   // 10 SPACES — east-line column (horizontal ticks)
    const db = -26 - i * 9;
    const A = P7(56, db), B = P7(74.5, db);
    remoteLot.push(line(r2(A[0]), r2(A[1]), r2(B[0]), r2(B[1]), TICK7));
  }
  const l7y = (db) => r2(P7(37, db)[1]);
  remoteLot.push(text(cx, l7y(-96), "LOT 7 — REMOTE PARKING · 110 MARIE ANTOINETTE ST",
    { class: "svg-lab", "font-size": "10", "text-anchor": "middle", "font-weight": "600" }));
  remoteLot.push(text(cx, l7y(-88.5), "LOT 7, BLOCK M · PARCEL 6009649 · 32 SPACES PER PLAT (6+8+10+8)",
    { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }));
  remoteLot.push(text(cx, r2(yT - 10), "OVERFLOW / CROSS-PARKING · FILL ORDER: MAIN FIELD → LOT 8 → LOT 7",
    { class: "svg-lab", "font-size": "9.5", "text-anchor": "middle" }));
  remoteLot.push(text(r2(xR + 10), r2((yT + yB) / 2), "S38°32'00\"E 75.00' FRONTAGE · 150.17' DEEP",
    { class: "svg-lab", "font-size": "8", "text-anchor": "middle", transform: "rotate(90 " + r2(xR + 10) + " " + r2((yT + yB) / 2) + ")" }));
  remoteLot.push(line(cx, r2(yB), cx, 96, { stroke: "#8A937F", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
}

/* ── parking layer: storefront row, liquor line, main field, Lot 8 ── */
const parking = [];
/* Parking zones per plat striping + labels (REV 9). All positions derive
   from raster-measured (a,b) feet (200 dpi, 6.667 px/ft; crops reference/
   park-*). Counts are the plat's own "N SPACES" labels — tallied below.
   Liquor line lives in the annotations layer (true course crosses the
   short building) — see LIQ below.

   PLAT STALL TALLY (per plat labels):
     field angled bands  36+36+14+14 = 100
     Arnould head-in row  7+11+11+9  =  38
     storefront row                  =  56
     Lot 6 zone           16+12      =  28
     Lot 8 pocket         10+5+4     =  19
     rear M.A. parallel   4+4+4+4+2  =  18
     Johnston strip       8+2        =  10
     Lot 7 remote         6+8+10+8   =  32   (remoteLot layer)
     JD Bank parcel       6+7        =  13   (reciprocal easement)
     TOTAL                           = 314
   vs variance 99-11797 "324 provided" → Δ −10 UNRECONCILED (surfaced;
   variance-era striping may differ from the 2019 plat revision).        */
const PAVE = { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1 };
const TICK = { stroke: "#C9CEBE", "stroke-width": 1 };
const SPINE = { stroke: "#C2C8B5", "stroke-width": 1.2 };
const zlab = (x, y, s, fs = 7.5, extra = {}) =>
  text(r2(x), r2(y), s, { class: "svg-lab", "font-size": String(fs), "text-anchor": "middle", ...extra });
const ax = a => r2(ENV.xRight - kx * (a + 25));   // a-ft → screen x
const by = b => r2(ENV.yBottom + ky * b);          // b-ft → screen y  (b ≤ 0)

// pavement fields
parking.push(rect(ax(546), by(-167), r2(ax(118) - ax(546)), r2(660 - by(-167)), PAVE));            // central field
parking.push(rect(ax(637.3), by(-185.2), r2(ax(127.2) - ax(637.3)), r2(by(-166) - by(-185.2)), PAVE)); // storefront strip
parking.push(rect(1132, 98, 226, r2(by(-234.7) - 98), PAVE));                                      // Lot 8 pocket
parking.push(rect(ax(622), by(-300) + 2, r2(ax(102) - ax(622)), r2(by(-281.3) - by(-300)) - 2, PAVE)); // rear M.A. strip
parking.push(rect(ax(625), by(-143), r2(ax(562) - ax(625)), r2(by(-122) - by(-143)), PAVE));       // Johnston strip

// ── Arnould head-in row: 4 × ~107' modules, 7 + 11 + 11 + 9 = 38 ──
{
  const MOD = [[118, 225, 7], [225, 332, 11], [332, 439, 11], [439, 546, 9]];
  MOD.forEach(([a0, a1, n]) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + 4 + (i * (a1 - a0 - 8)) / n;
      parking.push(line(ax(a), by(-18.5), ax(a), by(-1), TICK));
    }
    parking.push(zlab((ax(a0) + ax(a1)) / 2, 621, n + " SPACES", 7));
  });
}

// ── field angled bands: two double-loaded herringbone bands, one-way aisles;
//    plat labels 36 (west segment) + 14 (east segment) per band ──
{
  const BANDS = [[-42.9, -78.2], [-103.7, -139.7]];   // [b near Arnould, b far]
  BANDS.forEach(([b0, b1]) => {
    const ySp = (by(b0) + by(b1)) / 2;
    const segs = [[217.2, 405], [438, 496.2]];
    segs.forEach(([a0, a1]) => {
      parking.push(line(ax(a0), r2(ySp), ax(a1), r2(ySp), SPINE));
      for (let a = a0 + 4; a <= a1 - 4; a += 10.39) {
        parking.push(line(ax(a), by(b0) - 3, r2(ax(a) - 12), r2(ySp - 2), TICK));   // Arnould-side stalls
        parking.push(line(ax(a), r2(ySp + 2), r2(ax(a) - 12), by(b1) + 3, TICK));   // far-side stalls
      }
    });
    // planting islands: west cap, mid L-island, east teardrop (per plat)
    const iy = r2(by(b1) - 2), ih = r2(by(b0) - by(b1) + 4);
    parking.push(rect(r2(ax(217.2) - 4), iy, 10, ih, { ...PAVE, fill: "#DDE0D4", rx: 5 }));
    parking.push(rect(ax(432.5), iy, r2(ax(405) - ax(432.5)), ih, { ...PAVE, fill: "#DDE0D4", rx: 5 }));
    parking.push(rect(ax(507), iy, r2(ax(496.2) - ax(507)), ih, { ...PAVE, fill: "#DDE0D4", rx: 5 }));
    parking.push(zlab((ax(217.2) + ax(405)) / 2, ySp + 2.5, "36 SPACES", 7, { "font-weight": "600" }));
    parking.push(zlab((ax(438) + ax(496.2)) / 2, ySp + 2.5, "14 SPACES", 7, { "font-weight": "600" }));
  });
  // variance + tally — in the aisle between the two bands
  parking.push(zlab(655, 486, "MAIN PARKING FIELD — FILLS FIRST · VARIANCE ENTRY 99-11797: 324 PROVIDED / 344 REQUIRED", 9.5, { "font-weight": "600" }));
  parking.push(zlab(655, 499, "PLAT STRIPING TALLY 314 = FIELD 100 + ARNOULD 38 + STOREFRONT 56 + LOT 6 28 + LOT 8 19 + REAR M.A. 18 + JOHNSTON 10 + LOT 7 32 + JD BANK ESMT 13 · Δ −10 VS VARIANCE — UNRECONCILED", 6.5));
}

// ── storefront row: 56 angled stalls nosing the long-building walkway ──
{
  for (let a = 131; a <= 633.5; a += 8.96) {
    parking.push(line(ax(a), by(-168.5), r2(ax(a) - 13), by(-184.8), TICK));
  }
  parking.push(zlab(380, 327, "56 SPACES", 7.5, { "font-weight": "600" }));
  parking.push(zlab(900, 327, "56 SPACES", 7.5, { "font-weight": "600" }));
}

// ── Lot 6 zone: 16-space island module + 12 head-in at the short-bldg walkway ──
{
  parking.push(rect(ax(185.7), by(-137.4), r2(ax(144.5) - ax(185.7)), r2(by(-65.4) - by(-137.4)), PAVE));
  parking.push(rect(ax(183), by(-71), r2(ax(147) - ax(183)), 11, { ...PAVE, fill: "#DDE0D4", rx: 5 }));
  parking.push(rect(ax(183), r2(by(-131.5) - 11), r2(ax(147) - ax(183)), 11, { ...PAVE, fill: "#DDE0D4", rx: 5 }));
  parking.push(line(ax(165.1), r2(by(-71.5)), ax(165.1), r2(by(-128.5)), SPINE));
  for (let b = -73; b >= -128; b -= 9) {
    parking.push(line(ax(147), by(b), ax(183), by(b), TICK));
  }
  parking.push(zlab(ax(165.1) - 9, (by(-65.4) + by(-137.4)) / 2, "16 SPACES", 7,
    { transform: "rotate(-90 " + r2(ax(165.1) - 9) + " " + r2((by(-65.4) + by(-137.4)) / 2) + ")" }));
  // 12-space column nosing the walkway in front of the short building
  parking.push(rect(ax(116.7), by(-151), r2(ax(98.5) - ax(116.7)), r2(by(-42.9) - by(-151)), PAVE));
  for (let b = -42.9; b >= -150.9; b -= 9) {
    parking.push(line(ax(98.5), by(b), ax(116.7), by(b), TICK));
  }
  parking.push(zlab(ax(107.6), (by(-42.9) + by(-150.9)) / 2, "12 SPACES", 7,
    { transform: "rotate(-90 " + r2(ax(107.6)) + " " + r2((by(-42.9) + by(-150.9)) / 2) + ")" }));
  // handicap loading pad at the column's liquor-line end (per plat)
  parking.push(rect(ax(116.7), by(-155.4), r2(ax(98.5) - ax(116.7)), r2(by(-149.4) - by(-155.4)), { fill: "url(#hatch2)", stroke: "#CDD2C2", "stroke-width": 1 }));
}

// ── Lot 8 pocket: 10 + 5 + 4 = 19 (plat; working estimate was ±15) ──
{
  for (let i = 0; i <= 10; i++) parking.push(line(r2(1186.5 + i * 13.05), by(-252.9), r2(1186.5 + i * 13.05), by(-234.7) - 2, TICK)); // 10 nose the 135 end walk
  for (let i = 0; i <= 5; i++) parking.push(line(r2(1233.7 + i * 16.9), by(-300) + 4, r2(1233.7 + i * 16.9), by(-288), TICK));        // 5 nose M.A.
  for (let i = 0; i <= 4; i++) parking.push(line(1154, by(-252 - i * 9), 1188, by(-252 - i * 9), TICK));                               // 4 nose the breezeway walk
  parking.push(zlab(1242, (by(-288) + by(-252.9)) / 2 + 3, "LOT 8 — 19 SPACES PER PLAT (10+5+4)", 7.5, { "font-weight": "600" }));
}

// ── rear M.A. parallel row: 4+4+4+4+2 = 18 (10' utility easement strip) ──
{
  const G = [[102, 192, 4], [211, 279, 4], [279, 379, 4], [379, 479, 4], [577, 620, 2]];
  G.forEach(([a0, a1, n]) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i * (a1 - a0)) / n;
      parking.push(line(ax(a), by(-283), ax(a), by(-297), TICK));
    }
  });
  parking.push(zlab(ax(528), by(-289) + 2.5, "REAR PARKING — 18 PARALLEL (4+4+4+4+2)", 6.5));
}

// ── Johnston strip (Lot 1): 8 head-in + 2 at the pylon sign = 10 ──
{
  for (let i = 0; i <= 8; i++) {
    const a = 565.3 + (i * 57) / 8;
    parking.push(line(ax(a), by(-122.4), ax(a), by(-140.4), TICK));
  }
  parking.push(zlab((ax(565.3) + ax(622.3)) / 2, by(-146) + 6, "8 SPACES", 7));
  parking.push(rect(ax(668), by(-160), r2(ax(656) - ax(668)), 11, { fill: "url(#hatch2)", stroke: "#5F6E64", "stroke-width": 1 }));
  for (let i = 0; i <= 2; i++) parking.push(line(ax(656 - i * 9), by(-147), ax(656 - i * 9), by(-163), TICK));
  parking.push(zlab(ax(640), by(-152), "PYLON SIGN · 2 SP", 6, { "text-anchor": "start" }));
}

// ── JD Bank parcel (NOT A PART): bank building + 6+7 = 13 easement spaces ──
{
  parking.push(rect(ax(634.3), by(-54.9), r2(ax(571.3) - ax(634.3)), r2(by(-14.4) - by(-54.9)), { fill: "url(#hatch2)", stroke: "#5F6E64", "stroke-width": 1.2 }));
  parking.push(zlab((ax(571.3) + ax(634.3)) / 2, (by(-14.4) + by(-54.9)) / 2 + 3, "JD BANK", 8, { "font-weight": "600" }));
  for (let i = 0; i <= 6; i++) parking.push(line(ax(553), by(-22 - i * 9), ax(571), by(-22 - i * 9), TICK));   // 6 along the notch line
  for (let i = 0; i <= 7; i++) parking.push(line(ax(652), by(-20 - i * 9), ax(668), by(-20 - i * 9), TICK));   // 7 along Johnston
  parking.push(zlab(183, 528, "JD BANK — 13 SPACES (6+7)", 7.5, { "font-weight": "600" }));
  parking.push(zlab(183, 539, "RECIPROCAL EASEMENT $250/MO · EXP. 12/30/2034", 6.5));
}

/* ── easement overlays (REV 11) — live easements drawn, expired recorded
   in the audit block only. Perimeter 10' utility easement labeled on the
   plat along Arnould, Patricia and M.A. (also Johnston — not drawn, it
   tracks the R/W arc); City of Lafayette electric easement entry 577566
   at the rear (plat marker 14); 5×5' guy easement at the pylon sign.   */
{
  const ESMT = { stroke: "#8A937F", "stroke-width": 1, "stroke-dasharray": "6 4", "pointer-events": "none" };
  parking.push(line(ax(-25), by(-10), ax(550), by(-10), ESMT));            // Arnould — 10' in from b=0, clipped at the notch
  parking.push(zlab(ax(583), by(-6), "10' UTILITY EASEMENT", 6));
  parking.push(line(r2(ax(-15)), 100, r2(ax(-15)), 658, ESMT));            // Patricia — 10' in from a=-25
  parking.push(zlab(ax(-17.5), 250, "10' UTILITY EASEMENT", 6,
    { transform: "rotate(-90 " + ax(-17.5) + " 250)" }));
  parking.push(line(ax(-20), by(-290), ax(635), by(-290), ESMT));          // M.A. — 10' in from b=-300
  parking.push(zlab(112, by(-290) - 3, "10' UTIL ESMT", 6));
  // City of Lafayette electric easement — Entry 577566 (plat marker 14)
  parking.push(rect(ax(571.2), by(-293.4), r2(ax(547.2) - ax(571.2)), r2(by(-272.4) - by(-293.4)),
    { fill: "none", stroke: "#8A937F", "stroke-width": 1, "stroke-dasharray": "4 3" }));
  parking.push(zlab((ax(547.2) + ax(571.2)) / 2, by(-271) + 8, "ELEC. ESMT 577566", 5.5));
  // 5×5' guy easement at the pylon-sign pocket (plat marker 10 area)
  parking.push(rect(ax(663), by(-155), r2(ax(658) - ax(663)), r2(by(-150) - by(-155)),
    { fill: "none", stroke: "#8A937F", "stroke-width": 1, "stroke-dasharray": "3 2" }));
}

/* ── building placements — plat-exact demising (REV 6) ──────────────
   Long building: 85.45' deep, demising widths from the plat's dimension
   strings (Montagnet & Domingue). Widths marked "derived" are SF-proportional
   splits inside a measured plat envelope (today's demising differs from the
   2019 plat-era tenancy there). Patricia → Johnston order.                 */
const LB_DEPTH = 85.45;          // plat: end-wall dimension string ("85.45'" on the west end wall)
const LB_REAR_SETBACK = 18.73;   // plat dim: rear face 18.73' off M.A. R/W (REV 9 correction —
                                 // was 10', assumed from the utility easement; the 18.73' strip
                                 // holds the rear parallel parking + 10' utility easement)
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

/* ── liquor line — Our Savior's Church easement §3a, TRUE COURSE (REV 8) ──
   Raster-traced from the plat at 200 dpi, 6.667 px/ft (tools/measure-liquor*.py).
   Straight run: S38°32'00"E parallel to Arnould at 165.11' off the R/W
   (surveyed tie: S51°28'00"W 181.31' from the Arnould boundary to the
   Lots 9–11 north line; liquor line measured 16.2' north of that line).
   Run length 594.45' per the plat's own dimension string along the line
   (100 + 100 + 12.98 + 87.02 + 100 + 100 + 94.45), tangent point → east
   boundary exit; raster check 594.2'. West end: circular arc, raster-fit
   R 174.1' (three further dash centroids fit within 0.7 px — and ≈ the
   175-ft figure of §3a), centered on the church parcel corner across
   Marie Antoinette; the arc crosses the short building at 139/137 and
   exits over Patricia St. East end: crosses the Johnston-side boundary
   and curves into the R/W (off-parcel tail, clipped at the sheet edge).
   The plat also jogs the line around a sign pocket at the east boundary
   (~10', not drawn). Restricted side = church side (M.A., screen-top).  */
const LIQ = {
  bearing: "S38°32'00\"E",
  offsetFromArnouldFt: 165.11,
  runFt: 594.45,
  tangentAFt: 68.63,
  radiusFt: 174.1
};
LIQ.centerAB = [LIQ.tangentAFt, -(LIQ.offsetFromArnouldFt + LIQ.radiusFt)];
const liqT = toXY([LIQ.tangentAFt, -LIQ.offsetFromArnouldFt]);            // tangent pt (inside short bldg)
const liqE = toXY([LIQ.tangentAFt + LIQ.runFt, -LIQ.offsetFromArnouldFt]); // east boundary exit
const liqTail = toXY([707.4, -171.9]);                                     // off-parcel SE tail, clipped
const liqAW = -85;                                                          // arc render end (Patricia band)
const liqBW = LIQ.centerAB[1] + Math.sqrt(LIQ.radiusFt ** 2 - (liqAW - LIQ.centerAB[0]) ** 2);
const liqW = toXY([liqAW, liqBW]);
const liqPath =
  "M " + r2(liqTail[0]) + " " + r2(liqTail[1]) +
  " L " + r2(liqE[0]) + " " + r2(liqE[1]) +
  " L " + r2(liqT[0]) + " " + r2(liqT[1]) +
  // sweep 0 verified by midArc cross product (arc bows toward Patricia corner)
  " A " + r2(LIQ.radiusFt * kx) + " " + r2(LIQ.radiusFt * ky) + " 0 0 0 " + r2(liqW[0]) + " " + r2(liqW[1]);

/* ── annotations ── */
const annotations = [
  // long-bldg callout sits on the covered-walkway strip (its old REV 6 spot
  // above the building is now the rear M.A. parking strip)
  text(640, r2(lbY + lbH + 14.5), "LONG BLDG 101–133 — BACKS MARIE ANTOINETTE · 101 AT JOHNSTON END · STOREFRONTS FACE LOT 1",
    { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }),
  text(r2(sbXRight), 671.5, "SHORT BLDG 135–149 — 149 ANCHORS ARNOULD CORNER",
    { class: "svg-lab", "font-size": "8.5", "text-anchor": "end" }),
  path(liqPath, { fill: "none", stroke: "#A87E2F", "stroke-width": 2, "stroke-dasharray": "14 7", "pointer-events": "none" }),
  text(300, r2(liqT[1] - 6.5), "LIQUOR RESTRICTED THIS SIDE OF LINE ▲",
    { class: "svg-lab", "font-size": "9", "font-weight": "600", fill: "#A87E2F", "pointer-events": "none" }),
  text(300, r2(liqT[1] + 14), "LIQUOR PERMITTED THIS SIDE OF LINE ▼ — PER OUR SAVIOR'S CHURCH EASEMENT §3a (WAIVER SURVIVES TERMINATION)",
    { class: "svg-lab", "font-size": "9", "font-weight": "600", fill: "#A87E2F", "pointer-events": "none" }),
  text(300, r2(liqT[1] + 27), "TRUE COURSE PER PLAT: S38°32'00\"E 594.45' AT 165.1' OFF ARNOULD R/W · WEST END ARCS R≈175' AROUND CHURCH PARCEL CORNER ACROSS M.A.",
    { class: "svg-lab", "font-size": "7.5", fill: "#A87E2F", "pointer-events": "none" })
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
  "4.  PARKING FILL ORDER: MAIN FIELD → LOT 8 (19 SP PER PLAT, PATRICIA/M.A. CORNER) → LOT 7 (REMOTE, BLK M, 32 SP PER PLAT). ZONING ALSO REQUIRES 20% GREEN AREA. CROSS-PARKING LICENSES NON-EXCLUSIVE — NO ASSIGNED STALLS.",
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
  text(1078, 890, "REV 11 — EASEMENT & UTILITY OVERLAYS PER PLAT", { class: "svg-lab", "font-size": "9" }),
  path("M1296 936 L1322 930 L1315 936 L1322 942 Z", { fill: "#1C2B26" }),
  text(1332, 940, "N", { "dominant-baseline": "middle", "font-family": "'IBM Plex Mono',monospace", "font-size": "10", "font-weight": "600", fill: "#1C2B26" }),
  text(1212, 962, "PLAN ROTATED — TRUE NORTH AT RIGHT (PATRICIA ST)", { class: "svg-lab", "font-size": "7.5", "text-anchor": "middle" })
];

const geometry = {
  rev: "REV 11",
  source: "Recorded plat — Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019 (boundary per legal description; buildings per plat demising strings; liquor line + parking zones/stall counts per plat trace)",
  viewBox: { main: "0 0 1480 990", full: "0 -310 1480 1300" },
  demising: {
    longBuilding: { depthFt: LB_DEPTH, rearSetbackFt: LB_REAR_SETBACK, eastGapFt: LB_EAST_GAP, lengthFt: r2(lbLen), bays: LB_BAYS },
    shortBuilding: {
      depthFt: SB_DEPTH, patriciaOffsetFt: SB_FACE_FROM_PATRICIA_RW, arnouldOffsetFt: SB_NORTH_FROM_ARNOULD_RW, lengthFt: r2(sbLen), bays: SB_BAYS,
      split135: "mid-depth wall: 135A breezeway/west square + 135B Patricia/east square, each 42.245' × 37.4' = 1,580 SF; both front M.A. (135A door to breezeway, 135B rear door to Patricia)"
    }
  },
  liquorLine: {
    bearing: LIQ.bearing,
    offsetFromArnouldFt: LIQ.offsetFromArnouldFt,
    offsetDerivation: "surveyed tie S51°28'00\"W 181.31' (Arnould R/W → Lots 9–11 north line) minus 16.2' raster (liquor line north of that lot line); run height constant at two stations 390' apart",
    runFt: LIQ.runFt,
    runDimString: "plat: 100.00 + 100.00 + 12.98 + 87.02 + 100.00 + 100.00 + 94.45 (S38°32'00\"E), tangent point → east boundary; raster check 594.2'",
    tangentAFt: LIQ.tangentAFt,
    eastExitAFt: r2(LIQ.tangentAFt + LIQ.runFt),
    arc: {
      centerAB: LIQ.centerAB,
      radiusFt: LIQ.radiusFt,
      note: "raster fit through 5 dash centroids (max residual 0.7 px ≈ 0.1'); ≈ the 175-ft figure of easement §3a; center = church parcel corner across Marie Antoinette"
    },
    offParcel: "west arc continues across Patricia St; east tail curves into Johnston R/W (drawn clipped at sheet edges); plat jogs the line ~10' around a sign pocket at the east boundary (not drawn)",
    crossings: "enters short bldg storefront face at b≈-165.9 (unit 139), crosses the 139/137 wall, exits rear face at b≈-178.4 (unit 137); permitted side holds 149/145/143/141 and most of 139",
    source: "raster trace at 200 dpi (6.667 px/ft, plat scale 1\"=30') — tools/measure-liquor*.py, crops reference/hunt-*"
  },
  parking: {
    source: "plat 'N SPACES' striping labels, raster-located at 200 dpi (crops reference/park-*); zone positions in (a,b) feet",
    zones: [
      { zone: "main field — two angled double-loaded herringbone bands, one-way aisles (stalls 9.00' × 23.70')", count: 100, detail: "per band: 36 (west segment) + 14 (east segment); bands at b -42.9..-78.2 and -103.7..-139.7, a 217..496" },
      { zone: "Arnould frontage head-in row", count: 38, detail: "4 × ~100' lot modules: 7 + 11 + 11 + 9; none in front of Jason's Deli (sidewalk/landscape only); last 75.12' module before the notch is a driveway apron" },
      { zone: "storefront row (long building)", count: 56, detail: "single angled row between the liquor line and the covered walkway, labeled '56 SPACES' twice on the plat" },
      { zone: "Lot 6 west-field zone", count: 28, detail: "16-space island module (a 144.5-185.7) + 12 head-in at the short-bldg walkway (3 handicap symbols + loading pad at the liquor-line end)" },
      { zone: "Lot 8 pocket (Patricia × M.A. corner)", count: 19, detail: "10 nosing the 135 end walk + 5 nosing M.A. + 4 nosing the breezeway walk — working estimate was ±15, plat says 19" },
      { zone: "rear M.A. parallel row (18.73' strip with 10' utility easement)", count: 18, detail: "modules 4+4+4+4+2; gap at the City of Lafayette electric easement (entry 577566)" },
      { zone: "Johnston strip (Lot 1, south of the notch)", count: 10, detail: "8 head-in + 2 at the pylon sign pocket" },
      { zone: "Lot 7 Block M remote", count: 32, detail: "6 (M.A. frontage) + 8 (mid) + 10 (east line) + 8 (rear) — working estimate was ±24, plat says 32" },
      { zone: "JD Bank parcel (NOT A PART — reciprocal easement spaces)", count: 13, detail: "6 along the notch line + 7 along Johnston; matches the easement's 13 exactly" }
    ],
    totalPlat: 314,
    variance: { entry: "99-11797", provided: 324, required: 344 },
    reconciliation: "plat striping labels total 314 vs variance 324 provided — Δ -10 UNRECONCILED (surfaced, not adjusted; variance-era striping may differ from the 7/19/2019 plat revision)"
  },
  streets: {
    marieAntoinette: { rwFt: 40, edges: "true — band y 20.55…96 (b -340…-300), both edges exact" },
    arnould: { rwFt: 80, edges: "near edge true at b=0 (y 662, on the boundary); centerline true at 40'; far edge clipped at the sheet margin y 752 (full width would reach y ≈ 813)" },
    patricia: { rwFt: 50, edges: "true — near edge a=-25 (x 1360), far edge a=-75 (x 1452.6)" },
    johnston: { rwFt: "±100", edges: "near edge = true R/W arc, R 1872.44' (boundary course 4 extended along the same circle); far side beyond the sheet" },
    cornerReturns: {
      patriciaArnould: "R=25 L=39.27 (boundary course 9)",
      maPatricia: "R=25 L=39.27 (course 7)",
      johnstonMA: "R=30 L=48.65 (course 5)",
      bankCorner: "R=30.00 L=49.38 CH=N08°37'26\"E 43.99 (bank parcel corner per plat — street edge only, NOT Belle)"
    }
  },
  easements: {
    utility10ft: "perimeter 10' utility easement per plat labels — DRAWN along Arnould (b -10, clipped at the notch), Patricia (a -15), Marie Antoinette (b -290, under the rear parking row) and Lot 7's rear lot line; also labeled along Johnston on the plat (not drawn — tracks the R/W arc)",
    electric: { entry: "577566", holder: "City of Lafayette", location: "rear strip, a 547.2–571.2 × b -272.4…-293.4 (plat marker 14) — explains the gap in the rear parallel row", drawn: true },
    guy: { size: "5×5 ft", location: "at the pylon-sign pocket on the Johnston-side boundary (plat marker 10 area)", drawn: true },
    drainageExpired: [
      { entry: "77-0783", note: "15' temporary drainage easement, EXPIRED — Lot 7 west side (not drawn)" },
      { entry: "77-000784", note: "15' temporary drainage easement, EXPIRED — Patricia St near the liquor-line crossing (not drawn)" },
      { entry: "77-000785", note: "15' temporary drainage easement, EXPIRED — Patricia at the Jason's Deli corner, plat marker 17 (not drawn)" }
    ],
    church: "Our Savior's Church access & parking easement — $350/mo, 25-yr, Sundays + 6pm–midnight, area-wide (no plat outline); §3a liquor waiver is the drawn liquor line",
    jdBank: "JD Bank reciprocal easement — 13 bank spaces drawn in the notch; $250/mo to Belle; 50/50 maintenance; expires 12/30/2034; supersedes 2004-00057697",
    titleMarkers: "plat circled exception markers: 10/11/13 (Lot 7 south line), 14 (electric 577566), 16/17 (drainage), 25/27 (Entry 03-060864, Lot 7/pylon area), 26/28 (Lot 2 area) — Fidelity ATC 2007054432 Schedule B §2",
    signPocket: "pylon sign pocket at the east boundary with 2 spaces (drawn); the plat jogs the liquor line ~10' around it (jog not drawn)"
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
