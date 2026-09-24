/* Site-twin category spec — one row per A-1 register category (src/lib/siteassets.js
   CATEGORIES). mesh = geometry kind; ft dims are converted in the build; color =
   presentation look (marketing-render palette from the Sep 2026 drone set),
   record = plan-room palette; visible = default viewer visibility.
   mesh "data" = listed in the viewer only (never drawn); "none" = placeholder. */

// Operator decisions 2026-09-24 ("go" on the Stage 2 defaults)
export const DECISIONS = {
  D1: { canopyEaveFt: 10.0, canopyTopFt: 14.0, status: "presentation — no measured canopy height on file" },
  D2: { rtuProxies: true, status: "presentation-proxy — one per suite; per-suite RTU count not verified" },
  D3: { historicTrees: "modeled, hidden by default" },
  D4: { orientation: "plat axes (Marie Antoinette = -Z, Arnould = +Z); true-north rotation recorded in twin-data.json" },
};

export const SPEC = {
  parcel:        { mesh: "flat", color: "#3E4143", record: "#E8EBE0", visible: true },
  building:      { mesh: "data" },
  unit:          { mesh: "prism", color: "#E6DCC6", roof: "#F2F2EE", record: "#2F6B4F", visible: true },
  walk:          { mesh: "walk", color: "#CFCBC2", shingle: "#3A3D40", soffit: "#E3D6B8", record: "#DCD3BF", visible: true },
  island:        { mesh: "prism", heightFt: 0.5, color: "#5E8C4A", record: "#DDE0D4", visible: true },
  tree:          { mesh: "tree", heightFt: 24, crownFt: 10, color: "#4E7A3A", record: "#8FA67F", visible: false },
  easement:      { mesh: "ribbon", widthM: 0.3, y: 0.03, color: "#A87E2F", record: "#A87E2F", visible: false },
  zone:          { mesh: "data" },
  stall:         { mesh: "stall", stripeM: 0.1, color: "#F4F4F0", pending: "#D97706", record: "#C9CEBE", visible: true },
  ada:           { mesh: "disc", rM: 1.2, y: 0.02, color: "#2F6FB0", record: "#2F6FB0", visible: true },
  drive:         { mesh: "flat", y: 0.01, color: "#4A4D50", record: "#E2E5D9", visible: false },
  aisle:         { mesh: "flat", y: 0.01, color: "#4A4D50", record: "#E2E5D9", visible: false },
  column:        { mesh: "box", wFt: 2.5, dFt: 2.5, hFt: "eave", color: "#EDE6D3", record: "#A87E2F", visible: true },
  bench:         { mesh: "box", wFt: 5, dFt: 1.8, hFt: 1.5, color: "#4A4F52", record: "#5F6E64", visible: true },
  can:           { mesh: "box", wFt: 2, dFt: 2, hFt: 3.2, color: "#2F4F3F", record: "#5F6E64", visible: true },
  wmeter:        { mesh: "data" },
  emeter:        { mesh: "data" },
  "meter-cluster": { mesh: "box", wFt: 2, dFt: 1, hFt: 3, color: "#9AA0A3", record: "#3A73C9", visible: true },
  shutoff:       { mesh: "disc", rM: 0.3, y: 0.04, color: "#C25E33", record: "#C25E33", visible: true },
  transformer:   { mesh: "box", wFt: 6, dFt: 6, hFt: 5, color: "#4F6B4E", record: "#4F6B4E", visible: true },
  pole:          { mesh: "box", wFt: 1, dFt: 1, hFt: 35, color: "#6B5A45", record: "#6B5A45", visible: true },
  "lus-main":    { mesh: "pipe", sizeM: 0.25, y: -1.2, color: "#3A73C9", sewer: "#4F9A3A", record: "#3A73C9", visible: false },
  "lus-point":   { mesh: "disc", rM: 0.45, y: 0.05, color: "#5F6E64", record: "#5F6E64", visible: false },
  rtu:           { mesh: "rtu", wFt: 5, dFt: 4, hFt: 3, color: "#B7BCBF", record: "#B7BCBF", visible: true },
  "ground-hp":   { mesh: "box", wFt: 3, dFt: 3, hFt: 3.5, color: "#C9CDD0", record: "#5F6E64", visible: true },
  bollard:       { mesh: "bollards", wFt: 0.5, hFt: 3.5, gapFt: 2, color: "#E5B53A", record: "#E5B53A", visible: true },
  panel:         { mesh: "data" },
  timeclock:     { mesh: "data" },
  lighting:      { mesh: "box", wFt: 1, dFt: 1, hFt: 25, color: "#6B6F72", record: "#6B6F72", visible: true },
  sign:          { mesh: "box", wFt: 10, dFt: 2, hFt: 20, color: "#1C2B26", record: "#1C2B26", visible: true },
  fence:         { mesh: "fence", hFt: 6, thickM: 0.1, color: "#8A6A4A", freezer: "#E9E9E4", freezerHFt: 9, record: "#8A6A4A", visible: true },
  firewall:      { mesh: "wall", thickM: 0.3, color: "#C25E33", record: "#C25E33", visible: false },
  camera:        { mesh: "box", wFt: 2, dFt: 2, hFt: 2, y0Ft: 12, color: "#1C2B26", record: "#1C2B26", visible: false },
  "storm-drain": { mesh: "none" }, backflow: { mesh: "none" }, "fdc-riser": { mesh: "none" }, "grease-trap": { mesh: "none" },
  dumpster: { mesh: "none" }, "roof-drain": { mesh: "none" }, irrigation: { mesh: "none" },
  pin:           { mesh: "none" },
};

/* sRGB hex -> linear RGB (glTF baseColorFactor is linear) */
export function hexToLinear(hex) {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return v.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
