/* R-2 Rent Worksheet (owner request 2026-09-29) — its own sheet so R-1 stays
   untouched. Per suite: scheduled TOTAL rent for the preceding month, the
   expected month, the reason for any difference, and a write-in column for the
   owner's own expectation. Typed figures live in THIS browser only (owners
   cannot write synced layers — RLS is operator-write); the printed / saved-PDF
   sheet is the hand-off. Engine: src/lib/rentworksheet.js (pure, tested). */
import { UNITS } from "../store.js";
import { fmt$, esc } from "../lib/format.js";
import { worksheet, shiftYm, ymOf, ymLabel, parseMoney } from "../lib/rentworksheet.js";
import { openDrawer } from "./drawer.js";

const WS_KEY = "otb-rent-worksheet:v1:";
let wsYm = ymOf(new Date());

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
const ownerFigures = ym => { try { return JSON.parse(lsGet(WS_KEY + ym) || "{}") || {}; } catch { return {}; } };

const KIND_META = {
  same: ["No change", "p-owner"], increase: ["Increase", "p-active"], decrease: ["Decrease", "p-expired"],
  abatement: ["Abatement", "p-anchor"], "abatement-ends": ["Abatement ends", "p-active"],
  "new-term": ["New term", "p-anchor"], vacant: ["Vacant", "p-vacant"], owner: ["Owner-occupied", "p-owner"],
  expired: ["Term expired", "p-expired"], unknown: ["—", "p-vacant"]
};

const money = v => v == null ? "—" : fmt$(v);
const signed = v => v == null || v === 0 ? "—" : (v > 0 ? "+" : "−") + fmt$(Math.abs(v));
const mismatch = (raw, expected) => {
  if (!raw) return false;
  const n = parseMoney(raw);
  return Number.isNaN(n) || (expected != null && n !== expected);
};
const ownTotal = (rows, figs) => {
  const vals = rows.map(r => parseMoney(figs[r.unit])).filter(Number.isFinite);
  return vals.length ? fmt$(Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100) : "";
};

export function renderWorksheet() {
  const w = worksheet(UNITS, wsYm), typed = ownerFigures(wsYm);
  const prevL = ymLabel(w.prevYm), curL = ymLabel(wsYm);
  let h = '<div class="ws-bar"><button type="button" class="ws-nav" data-d="-1" aria-label="Previous month">‹</button>' +
    '<span class="ws-month">' + esc(curL) + '</span>' +
    '<button type="button" class="ws-nav" data-d="1" aria-label="Next month">›</button>' +
    '<span class="ws-hint">Scheduled total rent (base + additional) from the lease record. Enter or hand-write your expected figure in the last column.</span></div>';
  h += '<table class="ws-table"><thead><tr><th>Unit</th><th>Tenant</th>' +
    '<th class="num">' + esc(prevL) + '<br><span class="ws-sub">preceding month</span></th>' +
    '<th class="num">' + esc(curL) + '<br><span class="ws-sub">expected</span></th>' +
    '<th class="num">Difference</th><th>Change / note</th>' +
    '<th class="ws-own">Owner expected<br><span class="ws-sub">' + esc(curL) + '</span></th></tr></thead><tbody>';
  w.rows.forEach(r => {
    const [lbl, pill] = KIND_META[r.kind];
    const own = typed[r.unit] ?? "";
    h += '<tr data-u="' + esc(r.unit) + '">' +
      '<td class="unitcell">' + esc(r.unit) + '</td>' +
      '<td class="ws-dba">' + esc(r.dba) + '</td>' +
      '<td class="num">' + (r.prior.basis === "prior-term" ? '<span class="ws-nof">not on file</span>' : money(r.prior.amount)) + '</td>' +
      '<td class="num"><b>' + money(r.cur.amount) + '</b></td>' +
      '<td class="num' + (r.diff > 0 ? ' ws-up' : r.diff < 0 ? ' ws-dn' : '') + '">' + signed(r.diff) + '</td>' +
      '<td><span class="pill ' + pill + '"><span class="dot"></span>' + lbl + '</span>' +
        (r.notes.length ? '<div class="ws-note">' + r.notes.map(esc).join(" · ") + '</div>' : "") + '</td>' +
      '<td class="ws-own"><input class="ws-in' + (mismatch(own, r.cur.amount) ? " ws-flag" : "") + '" inputmode="decimal" autocomplete="off" ' +
        'aria-label="Owner expected rent, unit ' + esc(r.unit) + '" value="' + esc(own) + '"></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">TOTAL — ' + w.rows.length + ' UNITS</td>' +
    '<td class="num">' + money(w.priorTotal) + (w.priorUnknown ? '<div class="ws-note">+ ' + w.priorUnknown + ' not on file</div>' : "") + '</td>' +
    '<td class="num">' + money(w.curTotal) + '</td><td class="num">' + signed(w.diffTotal) + '</td><td></td>' +
    '<td class="ws-own num" id="wsOwnTot">' + ownTotal(w.rows, typed) + '</td></tr></tfoot></table>' +
    '<div class="ws-sign"><span>Reviewed by ______________________________</span><span>Date ______________</span>' +
    '<button type="button" class="ws-clear">Clear my figures</button></div>';
  const el = document.getElementById("rentWorksheet");
  el.innerHTML = h;
  el.querySelectorAll(".ws-nav").forEach(b => b.onclick = () => { wsYm = shiftYm(wsYm, +b.dataset.d); renderWorksheet(); });
  el.querySelectorAll(".ws-in").forEach(inp => inp.oninput = () => {
    const figs = ownerFigures(wsYm), u = inp.closest("tr").dataset.u, v = inp.value.trim();
    if (v) figs[u] = v; else delete figs[u];
    lsSet(WS_KEY + wsYm, JSON.stringify(figs));
    inp.classList.toggle("ws-flag", mismatch(v, w.rows.find(r => r.unit === u).cur.amount));
    document.getElementById("wsOwnTot").textContent = ownTotal(w.rows, figs);
  });
  el.querySelector(".ws-clear").onclick = () => {
    if (!confirm("Clear the figures you entered for " + curL + "?")) return;
    try { localStorage.removeItem(WS_KEY + wsYm); } catch { /* storage blocked */ }
    renderWorksheet();
  };
  el.querySelectorAll("td.unitcell, td.ws-dba").forEach(td => td.onclick = () => openDrawer(td.closest("tr").dataset.u));
  document.getElementById("wsStamp").textContent = w.curTotal == null
    ? "Private rent figures require an authenticated owner/operator session."
    : curL + " vs " + prevL + " · figures you enter stay on this device; print or save as PDF to send";
}
