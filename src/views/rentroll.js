/* R-1 Rent Roll — sortable table, row click opens drawer. */
import { UNITS } from "../store.js";
import { fmt$, fmt$0, pDate, fDate, esc } from "../lib/format.js";
import { STATUS_META } from "../lib/colors.js";
import { openDrawer } from "./drawer.js";

let sortKey = "unit", sortDir = 1;

export function renderRoll() {
  const cols = [["unit", "Unit"], ["dba", "Tenant"], ["sf", "SF", "num"], ["base", "Base PSF", "num"], ["total", "Total PSF", "num"],
    ["monthly", "Monthly", "num"], ["end", "Term End"], ["status", "Status"]];
  const rows = UNITS.slice().sort((a, b) => {
    let A = a[sortKey], B = b[sortKey];
    if (sortKey === "unit") { A = parseFloat(a.unit); B = parseFloat(b.unit); }
    if (sortKey === "end") { A = a.end || "9999"; B = b.end || "9999"; }
    return (A < B ? -1 : A > B ? 1 : 0) * sortDir;
  });
  const tot = UNITS.reduce((s, u) => s + u.monthly, 0), totSF = UNITS.reduce((s, u) => s + u.sf, 0);
  let h = '<table><thead><tr>' + cols.map(c => '<th class="' + (c[2] || "") + '" data-k="' + c[0] + '">' + c[1] + (sortKey === c[0] ? (sortDir > 0 ? " ▲" : " ▼") : "") + '</th>').join("") + '</tr></thead><tbody>';
  rows.forEach(u => {
    const sm = STATUS_META[u.status];
    h += '<tr data-u="' + u.unit + '"><td class="unitcell">' + u.unit + '</td>' +
      '<td><div class="dba">' + esc(u.dba) + '</div><div class="legal">' + esc(u.legal || "") + '</div></td>' +
      '<td class="num">' + u.sf.toLocaleString() + '</td>' +
      '<td class="num">' + (u.base ? u.base.toFixed(2) : "—") + '</td>' +
      '<td class="num">' + (u.total ? u.total.toFixed(2) : "—") + '</td>' +
      '<td class="num">' + (u.monthly ? fmt$(u.monthly) : "—") + '</td>' +
      '<td>' + (u.end ? fDate(pDate(u.end)) : "—") + '</td>' +
      '<td><span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">TOTALS — 27 UNITS</td><td class="num">' + totSF.toLocaleString() + '</td><td></td><td></td><td class="num">' + fmt$(tot) + '</td><td colspan="2">' + fmt$0(tot * 12) + ' / YR</td></tr></tfoot></table>';
  const el = document.getElementById("rollTable");
  el.innerHTML = h;
  el.querySelectorAll("thead th").forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
    renderRoll();
  });
  el.querySelectorAll("tbody tr").forEach(tr => tr.onclick = () => openDrawer(tr.dataset.u));
  document.getElementById("rollStamp").textContent = "Source: structured rent roll workbook (SOT)";
}
