/* R-1 Rent Roll — sortable table, row click opens drawer.
   PSF breakdown (Base/CAM/Tax/Ins/Total) comes from the SOT rent composition
   (recoveries.json); SF, Monthly, term, status from units.json. */
import { UNITS } from "../store.js";
import { fmt$, fmt$0, pDate, fDate, esc } from "../lib/format.js";
import { STATUS_META } from "../lib/colors.js";
import recoveries from "../data/recoveries.json";
import { openDrawer } from "./drawer.js";

let sortKey = "unit", sortDir = 1;
const PSF_KEYS = new Set(["base", "cam", "tax", "ins", "total"]);
const rec = u => recoveries.units[u.unit] || {};

// value accessor — PSF columns read from the composition, everything else from the unit
function val(u, key) {
  if (PSF_KEYS.has(key)) return rec(u)[key] || 0;
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
      '<td><div class="dba">' + esc(u.dba) + '</div><div class="legal">' + esc(u.legal || "") + '</div></td>' +
      '<td class="num">' + u.sf.toLocaleString() + '</td>' +
      '<td class="num">' + psf(r.base) + '</td>' +
      '<td class="num">' + psf(r.cam) + '</td>' +
      '<td class="num">' + psf(r.tax) + '</td>' +
      '<td class="num">' + psf(r.ins) + '</td>' +
      '<td class="num">' + psf(r.total) + '</td>' +
      '<td class="num">' + (u.monthly ? fmt$(u.monthly) : "—") + '</td>' +
      '<td>' + (u.end ? fDate(pDate(u.end)) : "—") + '</td>' +
      '<td><span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">TOTALS — 27 UNITS</td><td class="num">' + totSF.toLocaleString() + '</td>' +
    '<td class="num" colspan="5">blended ' + (tot * 12 / totSF).toFixed(2) + ' PSF</td>' +
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
