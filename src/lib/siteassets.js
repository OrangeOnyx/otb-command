/* A-1 site register — pure. Turns geometry.assetGeom (plan-px shapes written by
   tools/extract-geometry.mjs), units, cameras, the digitized site-register data
   (src/data/site-register.json), the meter workbook (src/data/meters.json) and
   the operator's 📍 pins into one flat, stably-IDed asset list: the 2D
   counterpart of the Sep 23 column twin's register (plan:
   docs/superpowers/plans/2026-09-24-a1-site-register.md).
   IDs are positional/source-keyed and stay stable while the generator's row
   order and the source sheets hold. They are NOT physical field tags.
   Shapes: { point:[x,y] } | { polys:[quad…] } | { line:[[x,y]…] } | { d, bbox }. */

// [id, label, group, placeholder?] — group order = panel order
export const CATEGORIES = [
  ["parcel", "Parcels", "Site"], ["building", "Buildings", "Site"], ["unit", "Units", "Site"],
  ["walk", "Walks & canopy", "Site"], ["island", "Islands & strips", "Site"], ["tree", "Trees", "Site"],
  ["easement", "Easements & liquor line", "Site"],
  ["zone", "Parking zones", "Parking"], ["stall", "Stalls", "Parking"], ["ada", "ADA stalls & pads", "Parking"],
  ["drive", "Curb cuts", "Parking"], ["aisle", "Aisles", "Parking"],
  ["column", "Columns", "Walkway"], ["bench", "Benches", "Walkway"], ["can", "Trash cans", "Walkway"],
  ["wmeter", "Water meters", "Utilities"], ["emeter", "Electric meters", "Utilities"],
  ["meter-cluster", "City meter clusters", "Utilities"], ["shutoff", "Tenant water shut-offs", "Utilities"],
  ["transformer", "Transformers", "Utilities"], ["pole", "Poles & primary", "Utilities"],
  ["lus-main", "LUS water & sewer mains", "Utilities"], ["lus-point", "LUS hydrants, manholes & valves", "Utilities"],
  ["rtu", "Rooftop units / heat pumps", "Systems"], ["ground-hp", "Ground heat pumps", "Systems"],
  ["bollard", "Bollards", "Systems"], ["panel", "Electrical panels", "Systems"], ["timeclock", "Lighting time clocks", "Systems"],
  ["lighting", "Site lighting", "Systems"], ["sign", "Signs & pylon", "Systems"], ["fence", "Fences & freezer", "Systems"],
  ["firewall", "Fire / demising walls", "Systems"], ["camera", "Cameras", "Systems"],
  ["storm-drain", "Storm drains / catch basins", "No source yet", true], ["backflow", "Backflow preventers", "No source yet", true],
  ["fdc-riser", "FDC / sprinkler risers", "No source yet", true], ["grease-trap", "Grease traps", "No source yet", true],
  ["dumpster", "Dumpster pads", "No source yet", true], ["roof-drain", "Roof drains", "No source yet", true],
  ["irrigation", "Irrigation controller", "No source yet", true],
  ["pin", "Other 📍 pins", "Pins"],
];
export const CAT = Object.fromEntries(CATEGORIES.map(([id, label, group, placeholder]) => [id, { label, group, placeholder: !!placeholder }]));

// 📍 pin type (store FEATURE_TYPES) → register category; unmapped types land in "pin"
export const PIN_CAT = {
  shutoff: "shutoff", meter: "wmeter", hydrant: "lus-point", column: "column", bench: "bench", can: "can",
  light: "lighting", sign: "sign", dumpster: "dumpster", "storm-drain": "storm-drain", backflow: "backflow",
  "fdc-riser": "fdc-riser", "grease-trap": "grease-trap", "roof-drain": "roof-drain", irrigation: "irrigation",
};

const r2 = n => Math.round(n * 100) / 100;
const lerp = (p, q, t) => [r2(p[0] + (q[0] - p[0]) * t), r2(p[1] + (q[1] - p[1]) * t)];
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");

export function subdivideRow(quad, n) {
  const [p0, p1, p2, p3] = quad, out = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    out.push([lerp(p0, p1, t0), lerp(p0, p1, t1), lerp(p3, p2, t1), lerp(p3, p2, t0)]);
  }
  return out;
}

export function bboxOf(a) {
  if (a.bbox) return a.bbox;
  if (a.point) return { x: a.point[0] - 30, y: a.point[1] - 30, w: 60, h: 60 };
  const pts = a.polys ? a.polys.flat() : a.line;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x: r2(x), y: r2(y), w: r2(Math.max(...xs) - x), h: r2(Math.max(...ys) - y) };
}
export const centerOf = a => { const b = bboxOf(a); return [r2(b.x + b.w / 2), r2(b.y + b.h / 2)]; };

/* Verification label for a zone's derived stalls. */
export function stallStatus(zone) {
  if (zone.pending) return "cad-pending";               // CAD-striped, no plat label: the 324 − 314 candidate
  if (zone.id === "storefront") return "est-geometric"; // row56 ↔ C3 stall-map, ±1 until the stall walk
  return "plat-derived";                                // plat count, even subdivision of the drawn row
}

const rectPoly = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
const hull = rects => {
  const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y));
  const x1 = Math.max(...rects.map(r => r.x + r.w)), y1 = Math.max(...rects.map(r => r.y + r.h));
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
};
const LONG = ["101", "103", "105", "107", "109", "111", "113", "115", "117", "117.5", "119", "119.5", "121", "123", "125", "127", "129", "131", "133"];

export function buildRegister(geometry, { cameras = [], unitName = () => "", items = [], meters = [], pins = [] } = {}) {
  const ag = geometry.assetGeom, U = geometry.units, out = [];
  const unitCenter = id => { const r = U[id]; return r ? [r2(r.x + r.w / 2), r2(r.y + r.h / 2)] : null; };

  for (const p of ag.parcels) out.push({ id: "parcel-" + p.id, cat: "parcel", label: p.name, d: p.d, bbox: p.bbox,
    scope: p.scope || "main", status: "plat", source: "recorded plat metes & bounds (geometry.boundary)" });
  const longR = LONG.filter(id => U[id]).map(id => U[id]), shortR = Object.keys(U).filter(id => !LONG.includes(id)).map(id => U[id]);
  out.push({ id: "bldg-long", cat: "building", label: "Long building (101–133)", sub: "522.31' × 85.45' per demising", polys: [hull(longR)],
    scope: "main", status: "plat", source: "geometry.demising + unit rects" });
  out.push({ id: "bldg-short", cat: "building", label: "Short building (135A–149)", sub: "208.65' × 84.49' per demising", polys: [hull(shortR)],
    scope: "main", status: "plat", source: "geometry.demising + unit rects" });
  for (const [id, r] of Object.entries(U)) out.push({
    id: "unit-" + slug(id), cat: "unit", label: "Suite " + id, sub: unitName(id), unit: id, polys: [rectPoly(r)],
    scope: "main", status: "presentation", source: "geometry.units — presentation rect (unequal x/y scale), not measured",
  });
  for (const e of ag.easements) out.push({ id: "esmt-" + e.id, cat: "easement", label: e.name,
    ...(e.d ? { d: e.d, bbox: e.bbox } : e.line ? { line: e.line } : { polys: [e.quad] }),
    scope: "main", status: "plat", source: "recorded plat (geometry easements layer)" });
  for (const s of ag.islands) out.push({ id: "island-" + s.id, cat: "island", label: s.name, polys: [s.quad],
    scope: "main", status: "cad", source: "architect CAD LINCONC curbs / plat islands (REV 14)" });

  for (const z of ag.zones) {
    const stalls = [];
    for (const row of z.rows) for (const q of subdivideRow(row.quad, row.n)) {
      const k = stalls.length + 1;
      stalls.push({ id: `stall-${z.id}-${String(k).padStart(3, "0")}`, cat: "stall", label: `${z.code}-${k}`,
        sub: z.name + " · row " + row.id, parent: "zone-" + z.id, polys: [q], scope: z.scope,
        status: stallStatus(z), source: "plat count subdivided over the generator's drawn row" });
    }
    out.push({ id: "zone-" + z.id, cat: "zone", label: z.name, sub: z.count + " stalls" + (z.pending ? " · pending ground confirmation" : ""),
      count: z.count, children: stalls.map(s => s.id), polys: z.rows.map(r => r.quad), scope: z.scope,
      status: z.pending ? "cad-pending" : "plat", source: z.pending ? "architect CAD PARKING layer (no plat label)" : "recorded plat 'N SPACES' label" });
    out.push(...stalls);
  }
  for (const d of ag.drives) out.push({ id: "drive-" + slug(d.id), cat: "drive", label: d.name, sub: d.street + " · " + d.movement,
    polys: [d.quad], scope: "main", status: "cad", source: "architect CAD curb returns (geometry.access, REV 13)" });
  for (const s of ag.aisles) out.push({ id: "aisle-" + slug(s.id), cat: "aisle", label: s.name, sub: s.flow,
    polys: [s.quad], scope: "main", status: "plat", source: "plat TF arrows (geometry.access.aisles)" });
  for (const c of cameras) out.push({ id: "cam-" + slug(c.id), cat: "camera", label: c.name, sub: c.zone || "",
    point: [c.pos.x, c.pos.y], scope: "main", status: c.posConfidence || "registry", source: "src/data/cameras.json (+ operator overrides)" });

  // digitized / recorded items (site-register.json). A unit-keyed item with no shape sits at its unit centroid.
  for (const it of items) {
    const has = it.point || it.polys || it.line || it.d;
    const uc = !has && it.unit ? unitCenter(it.unit) : null;
    out.push({ scope: "main", ...it, ...(uc ? { point: uc, located: "unit-centroid" } : {}), ...(!has && !uc ? { unlocated: true } : {}) });
  }
  // meter workbook rows: located at their digitized cluster when mapped, else their unit centroid
  for (const m of meters) {
    const cl = m.cluster && out.find(a => a.id === m.cluster);
    const pt = cl?.point || unitCenter(m.unit);
    out.push({ id: m.id, cat: m.kind, label: m.number, sub: `Suite ${m.unit} · ${m.account}` + (m.size ? " · " + m.size : "") + (m.location ? " · " + m.location : ""),
      unit: m.unit, ...(cl ? { parent: cl.id } : {}), ...(pt ? { point: pt, located: cl ? "cluster" : "unit-centroid" } : { unlocated: true }),
      scope: "main", status: "records", source: "Rev Belle Realty Arnould Blvd Property.xlsx (meter workbook)" });
  }
  for (const p of pins) {
    const cat = PIN_CAT[p.type] || "pin";
    out.push({ id: "pin-" + slug(p.id), cat, label: p.label || (p.type + " pin"), sub: p.note || "", point: [p.x, p.y],
      scope: "main", status: "pin", source: "operator 📍 pin (features layer)" });
  }
  return out;
}

/* Per-category tallies for the panel; placeholders report 0 with their "no source" note. */
export function categoryCounts(assets) {
  const n = Object.fromEntries(CATEGORIES.map(([id]) => [id, 0]));
  for (const a of assets) if (a.cat in n) n[a.cat] += 1;
  return n;
}

const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
export function registerCSV(assets) {
  const head = ["label", "asset_id", "category", "group", "parent", "unit", "status", "center_x_px", "center_y_px", "count", "source"];
  const rows = assets.map(a => { const c = a.unlocated ? ["", ""] : centerOf(a);
    return [a.label, a.id, a.cat, CAT[a.cat]?.group, a.parent, a.unit, a.status, c[0], c[1], a.count, a.source]; });
  return [head, ...rows].map(r => r.map(q).join(",")).join("\n") + "\n";
}
