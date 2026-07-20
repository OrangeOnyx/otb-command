/* C-1 Compliance Matrix — 11 fields × 27 units, click to cycle through the store.
   Event-sourced (otb-ops harvest #3): every cell flip also appends a row to
   Supabase compliance_events (append-only audit trail); ⏱ History replays it. */
import { UNITS, COMP_FIELDS, SEED_NOTE, getComp, cycleComp, subscribe } from "../store.js";
import { esc } from "../lib/format.js";
import { REMOTE, logCompEvent, listCompEvents } from "../lib/remote.js";
import { eventRow, describeEvent } from "../lib/compevents.js";

const FIELD_LABELS = Object.fromEntries(COMP_FIELDS.map(([k, label]) => [k, label]));
let showHist = false;

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
    (REMOTE ? '<button class="chip' + (showHist ? " on" : "") + '" id="mx-hist" style="margin-left:8px">⏱ History</button>' : '') +
    '<span style="margin-left:auto">' + SEED_NOTE + '</span></div>' +
    (showHist ? '<div id="mx-histpanel" class="mute" style="font-size:12px;padding:8px 2px 2px">Loading…</div>' : '');
  const el = document.getElementById("matrix");
  el.innerHTML = h;
  el.querySelectorAll(".mx-cell").forEach(c => c.onclick = () => {
    const from = getComp(c.dataset.u, c.dataset.k);
    cycleComp(c.dataset.u, c.dataset.k);
    logCompEvent(eventRow({ unit: c.dataset.u, field: c.dataset.k, from, to: getComp(c.dataset.u, c.dataset.k) }));
  });
  const hb = document.getElementById("mx-hist");
  if (hb) hb.onclick = () => { showHist = !showHist; renderMatrix(); };
  if (showHist) paintHistory();
}

async function paintHistory() {
  const panel = document.getElementById("mx-histpanel");
  if (!panel) return;
  try {
    const rows = await listCompEvents(80);
    panel.innerHTML = rows.length
      ? rows.map(r => {
        const d = describeEvent(r, FIELD_LABELS);
        return '<div style="display:flex;gap:10px;padding:2px 0;border-bottom:1px dashed var(--line,#dadcd0)">' +
          '<span style="font-family:var(--mono);min-width:52px">' + esc(d.when) + '</span>' +
          '<span style="flex:1">' + esc(d.line) + '</span>' +
          '<span style="opacity:.7">' + esc(d.who) + '</span></div>';
      }).join("")
      : "No compliance changes recorded yet — the trail starts with the next cell you flip.";
  } catch (e) {
    panel.textContent = "History unavailable: " + e.message;
  }
}

export function initMatrix() {
  subscribe(type => { if (type === "comp" || type === "import") renderMatrix(); });
  renderMatrix();
}
