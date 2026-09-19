/* Monument / pylon sign — schematic SVG + roster, pure builders (2026-09-19,
   operator pick 5 from the Asset Command review). AC showed the sign photo
   with clickable panel outlines and a panel roster; Cypress draws the sign
   natively from data/pylon.json (D-19b register) in the plan-room language:
   scaled front elevation, panel schedule P1 2×8 · P2 4×8 (anchor) · P3–P14
   2×4 pairs, tenant of record on each face, vacant = hatch, a panel whose
   installed face differs from the tenant = brick dashed "reprint". Rendered
   on B-1 (the panel is a marketing + renewal lever) and K-1 (the register).
   No DOM — tested in test/pylonsvg.test.mjs. */

const FT = 22;                 // px per foot
const W = 8 * FT;              // sign face width (8 ft)
const GAP = 4;                 // px between panels
const X0 = 60, Y0 = 92;        // face origin inside the viewBox
const COL = (W - GAP) / 2;

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

/* panel geometry from the schedule: P1 full-width 2 ft, P2 full-width 4 ft,
   P3..P14 six rows of 2×4 pairs (odd = left, even = right) */
export function pylonLayout(pylon) {
  const byId = Object.fromEntries((pylon.panels || []).map(p => [p.panel, p]));
  const out = [];
  let y = Y0;
  const push = (id, x, w, h) => { const p = byId[id]; if (p) out.push({ ...p, x, y, w, h }); };
  push("P1", X0, W, 2 * FT); y += 2 * FT + GAP;
  push("P2", X0, W, 4 * FT); y += 4 * FT + GAP;
  for (let r = 0; r < 6; r++) {
    push("P" + (3 + r * 2), X0, COL, 2 * FT);
    push("P" + (4 + r * 2), X0 + COL + GAP, COL, 2 * FT);
    y += 2 * FT + GAP;
  }
  return { panels: out, faceBottom: y - GAP, width: X0 * 2 + W, height: y + 120 };
}

/* panel → display state: occupied · vacant · reprint (installed face ≠ tenant) */
export function panelState(p, tenant) {
  if (p.physicalReads && p.physicalReads !== tenant) return "reprint";
  return p.status === "occupied" && p.unit ? "occupied" : "vacant";
}

/* roster rows + counts, in panel order */
export function pylonRoster(pylon, unitsByUnit) {
  const rows = (pylon.panels || []).map(p => {
    const u = unitsByUnit[p.unit];
    const tenant = u ? u.dba : "";
    const state = panelState(p, tenant);
    return { panel: p.panel, size: p.size, unit: p.unit || "", tenant, state, note: p.note || "", physicalReads: p.physicalReads || "" };
  });
  const counts = { occupied: 0, vacant: 0, reprint: 0 };
  rows.forEach(r => { counts[r.state]++; });
  return { rows, counts };
}

const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;

/* the sign as an inline SVG string; each face is <g class="py-panel" data-panel data-unit> */
export function pylonSVG(pylon, unitsByUnit, { selected = "" } = {}) {
  const L = pylonLayout(pylon);
  const cabH = 64, capH = 10;
  const parts = [];
  parts.push('<svg class="pylon" viewBox="0 0 ' + L.width + ' ' + L.height + '" role="img" aria-label="' + esc(pylon.name || "Monument sign") + ' — ' + (pylon.panels || []).length + ' panels">');
  parts.push('<defs><pattern id="pyHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9AA3A0" stroke-width="1"/></pattern></defs>');
  // posts
  const postW = 14;
  parts.push('<rect class="py-post" x="' + (X0 + 10) + '" y="' + (L.faceBottom - 4) + '" width="' + postW + '" height="' + (L.height - L.faceBottom - 10) + '"/>');
  parts.push('<rect class="py-post" x="' + (X0 + W - 10 - postW) + '" y="' + (L.faceBottom - 4) + '" width="' + postW + '" height="' + (L.height - L.faceBottom - 10) + '"/>');
  parts.push('<line class="py-grade" x1="10" y1="' + (L.height - 8) + '" x2="' + (L.width - 10) + '" y2="' + (L.height - 8) + '"/>');
  // cabinet header
  parts.push('<rect class="py-cap" x="' + (X0 - 12) + '" y="' + (Y0 - cabH - capH) + '" width="' + (W + 24) + '" height="' + capH + '"/>');
  parts.push('<rect class="py-cab" x="' + (X0 - 6) + '" y="' + (Y0 - cabH) + '" width="' + (W + 12) + '" height="' + (cabH - 6) + '"/>');
  parts.push('<text class="py-brand" x="' + (X0 + W / 2) + '" y="' + (Y0 - cabH / 2 - 4) + '" text-anchor="middle">ON THE</text>');
  parts.push('<text class="py-brand py-brand2" x="' + (X0 + W / 2) + '" y="' + (Y0 - cabH / 2 + 16) + '" text-anchor="middle">BOULEVARD</text>');
  // face backing
  parts.push('<rect class="py-face" x="' + (X0 - 6) + '" y="' + (Y0 - 6) + '" width="' + (W + 12) + '" height="' + (L.faceBottom - Y0 + 12) + '"/>');
  for (const p of L.panels) {
    const u = unitsByUnit[p.unit];
    const tenant = u ? u.dba : "";
    const state = panelState(p, tenant);
    const sel = selected && (selected === p.panel || selected === p.unit) ? " py-sel" : "";
    const tall = p.h >= 4 * FT;
    parts.push('<g class="py-panel py-' + state + sel + '" data-panel="' + esc(p.panel) + '" data-unit="' + esc(p.unit || "") + '" tabindex="0" role="button" aria-label="' + esc(p.panel + " · " + (tenant || "vacant") + (state === "reprint" ? " · reprint needed" : "")) + '">');
    parts.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="2"' + (state === "vacant" ? ' fill="url(#pyHatch)"' : "") + '/>');
    parts.push('<text class="py-id" x="' + (p.x + 5) + '" y="' + (p.y + 11) + '">' + esc(p.panel) + '</text>');
    const face = state === "reprint" ? p.physicalReads : (tenant || (p.unit ? "Unit " + p.unit : ""));
    if (face) {
      const max = p.w >= W ? 30 : 15;
      parts.push('<text class="py-name' + (tall ? " py-anchor" : "") + '" x="' + (p.x + p.w / 2) + '" y="' + (p.y + p.h / 2 + (tall ? 6 : 5)) + '" text-anchor="middle">' + esc(clip(face, max)) + '</text>');
    } else {
      parts.push('<text class="py-name py-vac" x="' + (p.x + p.w / 2) + '" y="' + (p.y + p.h / 2 + 4) + '" text-anchor="middle">AVAILABLE</text>');
    }
    if (p.unit) parts.push('<text class="py-unit" x="' + (p.x + p.w - 5) + '" y="' + (p.y + 11) + '" text-anchor="end">' + esc(p.unit) + '</text>');
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join("");
}

/* "14 panels · 13 occupied · 0 available · 1 reprint needed" */
export function pylonSummary(counts, total) {
  const parts = [total + " panels", counts.occupied + " occupied", counts.vacant + " available"];
  if (counts.reprint) parts.push(counts.reprint + " reprint needed");
  return parts.join(" · ");
}
