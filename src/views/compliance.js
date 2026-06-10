/* C-1 Compliance Matrix — 11 fields × 27 units, click to cycle through the store. */
import { UNITS, COMP_FIELDS, SEED_NOTE, getComp, cycleComp, subscribe } from "../store.js";
import { esc } from "../lib/format.js";

export function renderMatrix() {
  let h = '<table><thead><tr><th style="cursor:default">Unit / Tenant</th>' +
    COMP_FIELDS.map(f => '<th>' + f[1] + '</th>').join("") + '</tr></thead><tbody>';
  UNITS.forEach(u => {
    h += '<tr><td style="white-space:nowrap"><b style="font-family:var(--mono)">' + u.unit + '</b>&nbsp; ' + esc(u.dba) + '</td>' +
      COMP_FIELDS.map(([k]) => {
        const st = getComp(u.unit, k);
        return '<td class="mx-cell" data-u="' + u.unit + '" data-k="' + k + '"><span class="mx-dot ' + (st === "u" ? "" : st) + '"></span></td>';
      }).join("") + '</tr>';
  });
  h += '</tbody></table><div class="mx-key"><span><span class="mx-dot ok" style="vertical-align:-2px"></span> On file</span>' +
    '<span><span class="mx-dot flag" style="vertical-align:-2px"></span> Flagged</span>' +
    '<span><span class="mx-dot" style="vertical-align:-2px"></span> Unverified</span>' +
    '<span><span class="mx-dot na" style="vertical-align:-2px"></span> N/A</span>' +
    '<span style="margin-left:auto">' + SEED_NOTE + '</span></div>';
  const el = document.getElementById("matrix");
  el.innerHTML = h;
  el.querySelectorAll(".mx-cell").forEach(c => c.onclick = () => cycleComp(c.dataset.u, c.dataset.k));
}

export function initMatrix() {
  subscribe(type => { if (type === "comp" || type === "import") renderMatrix(); });
  renderMatrix();
}
