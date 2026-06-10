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
  lbl(876, 92, fmtB(scr[5].bearing) + " — 641.77'", { "text-anchor": "middle" }),                                   // Marie Antoinette
  lbl(1374, mid(scr[7])[1], fmtB(scr[7].bearing) + " — 250.00'",
    { "text-anchor": "middle", transform: "rotate(90 1374 " + r2(mid(scr[7])[1]) + ")" }),                          // Patricia
  lbl(1305, 644, "R=25.00' L=39.27'", { "text-anchor": "end" })                                                     // Patricia × Arnould return
];

/* ── base layer: streets, parcel boundary, notch labels, sidewalks ── */
const base = [];
// Marie Antoinette (west frontage → top band)
base.push(rect(0, 6, 1480, 72, { fill: "#DDE0D4" }));
base.push(line(0, 6, 1480, 6, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 78, 1480, 78, { stroke: "#AEB4A2", "stroke-width": 2 }));
base.push(line(0, 42, 1480, 42, { stroke: "#FCFCF9", "stroke-width": 2, "stroke-dasharray": "26 20" }));
base.push(text(700, 48, "M A R I E   A N T O I N E T T E   S T R E E T   ( 4 0 '  R / W   A S P H A L T )",
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

/* ── remote lot layer: Lot 7, Block M across Marie Antoinette ── */
const remoteLot = [];
remoteLot.push(rect(1078, -224, 276, 212, { fill: "none", stroke: "#1C2B26", "stroke-width": 1.2, "stroke-dasharray": "14 5 3 5", rx: 2 }));
remoteLot.push(rect(1088, -214, 256, 192, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1, rx: 3 }));
for (let r = 0; r < 2; r++) {
  const ry = -158 + r * 86;
  remoteLot.push(line(1106, ry, 1326, ry, { stroke: "#C2C8B5", "stroke-width": 1.2 }));
  for (let rx = 1106; rx <= 1326; rx += 20)
    remoteLot.push(line(rx, ry - 24, rx, ry + 24, { stroke: "#C9CEBE", "stroke-width": 1 }));
}
remoteLot.push(text(1216, -40, "LOT 7 — REMOTE PARKING · 110 MARIE ANTOINETTE ST",
  { class: "svg-lab", "font-size": "10", "text-anchor": "middle", "font-weight": "600" }));
remoteLot.push(text(1216, -26, "LOT 7, BLOCK M · ASSESSOR PARCEL 6009649 · ±14,375 SF · ±24 SPACES",
  { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }));
remoteLot.push(text(1216, -234, "OVERFLOW / CROSS-PARKING · FILL ORDER: MAIN FIELD → LOT 8 → LOT 7",
  { class: "svg-lab", "font-size": "9.5", "text-anchor": "middle" }));
remoteLot.push(line(1216, -12, 1216, 96, { stroke: "#8A937F", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));

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
parking.push(text(673, 630, "MAIN PARKING FIELD · FILLS FIRST · 324 STALLS SITE-WIDE PER VARIANCE ENTRY 99-11797 (344 REQUIRED)",
  { class: "svg-lab", "font-size": "10.5", "text-anchor": "middle" }));
// LOT 8 — pocket lot at Patricia × Marie Antoinette corner (added 3/26/98 per plat rev.)
parking.push(rect(1100, 102, 254, 98, { fill: "#E8EBE0", stroke: "#CDD2C2", "stroke-width": 1, rx: 3 }));
parking.push(line(1120, 150, 1334, 150, { stroke: "#C2C8B5", "stroke-width": 1.2 }));
for (let x = 1120; x <= 1334; x += 22)
  parking.push(line(x, 128, x, 172, { stroke: "#C9CEBE", "stroke-width": 1 }));
parking.push(text(1227, 192, "LOT 8 — ±15 SPACES (PATRICIA / M.A. CORNER)",
  { class: "svg-lab", "font-size": "8.5", "text-anchor": "middle" }));

/* ── building placements (plat-proportioned, identical math to baseline) ── */
const LONG = ["101","103","105","107","109","111","113","115","117","117.5","119","119.5","121","123","125","127","129","131","133"];
const RUN = ["137","139","141","143","145","149"];
const placed = {};
// Long building: hugs Marie Antoinette, 101 at Johnston end → 133 at Patricia end
const LB_X = 150, LB_Y = 100, LB_W = 916, LB_H = 178;
const longTotal = LONG.reduce((s, k) => s + SF[k], 0);
let x = LB_X;
LONG.forEach(k => {
  const w = Math.max(30, (SF[k] / longTotal) * LB_W);
  placed[k] = { x, y: LB_Y, w: w - 2, h: LB_H };
  x += w;
});
// Short building: vertical run 137→149 reaching Arnould corner; 135A/B wing on top
const SB_X = 1096, SB_W = 192, RUN_Y = 280, RUN_H = 362;
const runTotal = RUN.reduce((s, k) => s + SF[k], 0);
let y = RUN_Y;
RUN.forEach(k => {
  const h = Math.max(40, (SF[k] / runTotal) * RUN_H);
  placed[k] = { x: SB_X, y, w: SB_W, h: h - 2 };
  y += h;
});
placed["135A"] = { x: SB_X, y: 208, w: SB_W / 2 - 1, h: 68 };        // west half of wing
placed["135B"] = { x: SB_X + SB_W / 2 + 1, y: 208, w: SB_W / 2 - 1, h: 68 }; // east half (Patricia side)

// sidewalks (baseline appends these to the base layer)
base.push(rect(LB_X, LB_Y + LB_H + 2, LB_W - 2, 18, { fill: "#E2E5D9", stroke: "#CDD2C2", "stroke-width": 1 }));
base.push(rect(SB_X - 20, 208, 18, 434, { fill: "#E2E5D9", stroke: "#CDD2C2", "stroke-width": 1 }));

/* ── annotations ── */
const annotations = [
  text(150, 92, "LONG BLDG 101–133 — BACKS MARIE ANTOINETTE · 101 AT JOHNSTON END · STOREFRONTS FACE LOT 1",
    { class: "svg-lab", "font-size": "9.5" }),
  text(1306, 92, "SHORT BLDG 135–149 — 149 ANCHORS ARNOULD CORNER",
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
  text(1078, 890, "REV 5 — BOUNDARY PER RECORDED METES & BOUNDS (M&D PLAT)", { class: "svg-lab", "font-size": "9" }),
  path("M1296 936 L1322 930 L1315 936 L1322 942 Z", { fill: "#1C2B26" }),
  text(1332, 940, "N", { "dominant-baseline": "middle", "font-family": "'IBM Plex Mono',monospace", "font-size": "10", "font-weight": "600", fill: "#1C2B26" }),
  text(1212, 962, "PLAN ROTATED — TRUE NORTH AT RIGHT (PATRICIA ST)", { class: "svg-lab", "font-size": "7.5", "text-anchor": "middle" })
];

const geometry = {
  rev: "REV 5",
  source: "Recorded plat — Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019 (boundary per legal description; interior still schematic, rotated 90° CW)",
  viewBox: { main: "0 0 1480 990", full: "0 -258 1480 1248" },
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
