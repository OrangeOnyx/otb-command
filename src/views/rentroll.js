/* R-1 Rent Roll — sortable table, row click opens drawer.
   PSF breakdown (Base/CAM/Tax/Ins/Total) comes from the SOT rent composition
   (recoveries.json); SF, Monthly, term, status from units.json. */
import { UNITS } from "../store.js";
import { fmt$, fmt$0, pDate, fDate, esc } from "../lib/format.js";
import { STATUS_META } from "../lib/colors.js";
import recoveries from "../data/recoveries.json";
import { logoUrl } from "../lib/logos.js";
import { openDrawer } from "./drawer.js";

let sortKey = "unit", sortDir = 1;
// Base & Total PSF are single-sourced from units.json (the SOT rent roll);
// recoveries.json supplies only the CAM/Tax/Ins decomposition.
const REC_KEYS = new Set(["cam", "tax", "ins"]);
const rec = u => recoveries.units[u.unit] || {};

// value accessor — base/total from the unit, CAM/Tax/Ins from the composition
function val(u, key) {
  if (REC_KEYS.has(key)) return rec(u)[key] || 0;
  if (key === "base" || key === "total") return u[key] || 0;
  if (key === "unit") return parseFloat(u.unit);
  if (key === "end") return u.end || "9999";
  return u[key];
}

export function renderRoll() {
  const cols = [
    ["unit", "Unit"], ["dba", "Tenant"], ["sf", "SF", "num"],
    ["base", "Base", "num"], ["cam", "CAM", "num"], ["tax", "Tax", "num"], ["ins", "Ins", "num"], ["total", "Total", "num"],
    ["monthly", "Monthly", "num"], ["end", "Term End"], ["status", "Status"]
  ];
  const rows = UNITS.slice().sort((a, b) => {
    const A = val(a, sortKey), B = val(b, sortKey);
    return (A < B ? -1 : A > B ? 1 : 0) * sortDir;
  });
  const tot = UNITS.reduce((s, u) => s + u.monthly, 0), totSF = UNITS.reduce((s, u) => s + u.sf, 0);
  const psf = (v) => (v ? v.toFixed(2) : "—");

  let h = '<table><thead><tr>' + cols.map(c => '<th class="' + (c[2] || "") + '" data-k="' + c[0] + '">' + c[1] + (sortKey === c[0] ? (sortDir > 0 ? " ▲" : " ▼") : "") + '</th>').join("") + '</tr></thead><tbody>';
  rows.forEach(u => {
    const sm = STATUS_META[u.status], r = rec(u);
    h += '<tr data-u="' + u.unit + '"><td class="unitcell">' + u.unit + '</td>' +
      '<td><div class="dba">' + (u.status !== "vacant" && logoUrl(u.unit)
        ? '<img class="dba-logo" src="' + logoUrl(u.unit) + '" alt="" loading="lazy">' : "") +
        esc(u.dba) + '</div><div class="legal">' + esc(u.legal || "") + '</div></td>' +
      '<td class="num">' + u.sf.toLocaleString() + '</td>' +
      '<td class="num">' + psf(u.base) + '</td>' +
      '<td class="num">' + psf(r.cam) + '</td>' +
      '<td class="num">' + psf(r.tax) + '</td>' +
      '<td class="num">' + psf(r.ins) + '</td>' +
      '<td class="num">' + psf(u.total) + '</td>' +
      '<td class="num">' + (u.monthly ? fmt$(u.monthly) : "—") + '</td>' +
      '<td>' + (u.end ? fDate(pDate(u.end)) : "—") + '</td>' +
      '<td><span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">TOTALS — ' + UNITS.length + ' UNITS</td><td class="num">' + totSF.toLocaleString() + '</td>' +
    '<td class="num" colspan="5">gross ' + (tot * 12 / totSF).toFixed(2) + ' PSF <span class="mono" style="opacity:.6">(all SF incl. vacant; P-1 effective = leased SF)</span></td>' +
    '<td class="num">' + fmt$(tot) + '</td><td colspan="2">' + fmt$0(tot * 12) + ' / YR</td></tr></tfoot></table>';
  const el = document.getElementById("rollTable");
  el.innerHTML = h;
  el.querySelectorAll("thead th").forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
    renderRoll();
  });
  el.querySelectorAll("tbody tr").forEach(tr => tr.onclick = () => openDrawer(tr.dataset.u));
  document.getElementById("rollStamp").textContent = "Base/CAM/Tax/Ins/Total = $/SF · Source: SOT workbook";
}
