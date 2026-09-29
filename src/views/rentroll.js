/* R-1 Rent Roll — sortable table, row click opens drawer.
   PSF breakdown (Base/CAM/Tax/Ins/Total) comes from the SOT rent composition
   (recoveries.json); SF, Monthly, term, status from units.json. */
import { UNITS, getRecoveries } from "../store.js";
import { fmt$, fmt$0, pDate, fDate, monthsTo, esc, sumKnownAmounts } from "../lib/format.js";
import { expiryBucket, expiryMark, expiryLegend } from "../lib/roll.js";
import { STATUS_META } from "../lib/colors.js";
import { logoUrl } from "../lib/logos.js";
import { openDrawer } from "./drawer.js";
import { worksheet, shiftYm, ymOf, ymLabel, parseMoney } from "../lib/rentworksheet.js";

let sortKey = "unit", sortDir = 1;
// Base & Total PSF are single-sourced from units.json (the SOT rent roll);
// recoveries.json supplies only the CAM/Tax/Ins decomposition.
const REC_KEYS = new Set(["cam", "tax", "ins"]);
const rec = u => getRecoveries()?.units[u.unit] || {};

// value accessor — base/total from the unit, CAM/Tax/Ins from the composition
function val(u, key) {
  if (REC_KEYS.has(key)) return rec(u)[key] || 0;
  if (key === "base" || key === "total") return u[key] || 0;
  if (key === "unit") return parseFloat(u.unit);
  if (key === "end") return u.end || "9999";
  return u[key];
}

export function renderRoll() {
  initMode();
  const cols = [
    ["unit", "Unit"], ["dba", "Tenant"], ["sf", "SF", "num"],
    ["base", "Base", "num"], ["cam", "CAM", "num"], ["tax", "Tax", "num"], ["ins", "Ins", "num"], ["total", "Total", "num"],
    ["monthly", "Monthly", "num"], ["end", "Term End"], ["status", "Status"]
  ];
  const rows = UNITS.slice().sort((a, b) => {
    const A = val(a, sortKey), B = val(b, sortKey);
    return (A < B ? -1 : A > B ? 1 : 0) * sortDir;
  });
  const tot = sumKnownAmounts(UNITS.map(u => u.monthly)), totSF = UNITS.reduce((s, u) => s + u.sf, 0);
  const psf = (v) => (Number.isFinite(v) ? v.toFixed(2) : "—");

  let h = '<table><thead><tr>' + cols.map(c => '<th class="' + (c[2] || "") + '" data-k="' + c[0] + '">' + c[1] + (sortKey === c[0] ? (sortDir > 0 ? " ▲" : " ▼") : "") + '</th>').join("") + '</tr></thead><tbody>';
  let n6 = 0, n12 = 0;
  rows.forEach(u => {
    const sm = STATUS_META[u.status], r = rec(u);
    const bucket = u.status !== "vacant" && u.end ? expiryBucket(monthsTo(pDate(u.end))) : null;
    if (bucket === "exp6") n6++; else if (bucket === "exp12") n12++;
    h += '<tr data-u="' + u.unit + '"' + (bucket ? ' class="' + bucket + '"' : "") + '><td class="unitcell">' + u.unit + '</td>' +
      '<td><div class="dba">' + (u.status !== "vacant" && logoUrl(u.unit)
        ? '<img class="dba-logo" src="' + logoUrl(u.unit) + '" alt="" loading="lazy">' : "") +
        esc(u.dba) + '</div><div class="legal">' + esc(u.legal || "") + '</div></td>' +
      '<td class="num">' + u.sf.toLocaleString() + '</td>' +
      '<td class="num">' + psf(u.base) + '</td>' +
      '<td class="num">' + psf(r.cam) + '</td>' +
      '<td class="num">' + psf(r.tax) + '</td>' +
      '<td class="num">' + psf(r.ins) + '</td>' +
      '<td class="num">' + psf(u.total) + '</td>' +
      '<td class="num">' + (Number.isFinite(u.monthly) ? fmt$(u.monthly) : "—") + '</td>' +
      '<td class="endcell">' + (bucket ? '<span class="expmark">' + expiryMark(bucket) + '</span> ' : "") + (u.end ? fDate(pDate(u.end)) : "—") + '</td>' +
      '<td><span class="pill ' + sm.pill + '"><span class="dot"></span>' + sm.label + '</span></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">TOTALS — ' + UNITS.length + ' UNITS</td><td class="num">' + totSF.toLocaleString() + '</td>' +
    '<td class="num" colspan="5">gross ' + (tot == null ? '—' : (tot * 12 / totSF).toFixed(2)) + ' PSF <span class="mono" style="opacity:.6">(all SF incl. vacant; P-1 effective = leased SF)</span></td>' +
    '<td class="num">' + (tot == null ? '—' : fmt$(tot)) + '</td><td colspan="2">' + (tot == null ? 'Private financial data unavailable' : fmt$0(tot * 12) + ' / YR') + '</td></tr></tfoot></table>';
  const el = document.getElementById("rollTable");
  el.innerHTML = h;
  el.querySelectorAll("thead th").forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
    renderRoll();
  });
  el.querySelectorAll("tbody tr").forEach(tr => tr.onclick = () => openDrawer(tr.dataset.u));
  const legend = expiryLegend(n6, n12);
  document.getElementById("rollStamp").textContent =
    (legend ? legend + " · " : "") + (getRecoveries() ? "Base/CAM/Tax/Ins/Total = $/SF · July roster + September 10 lease review. Open a suite for evidence and pending terms; — means unverified." : "Private rent and recovery figures require an authenticated owner/operator session.");
  if (mode === "ws") renderWorksheet(); // keeps the worksheet stamp + fresh figures after a data reload
}

/* ── Monthly worksheet (owner request 2026-09-29) ─────────────────────────
   Prior month vs expected month, the reason for any difference, and a
   write-in column for the owner's own expectation. Typed figures live in
   THIS browser only (owners cannot write synced layers — RLS is operator-
   write); the printed / saved-PDF sheet is the hand-off. */
const WS_KEY = "otb-rent-worksheet:v1:";
const MODE_KEY = "otb-rent-roll-mode";
let mode = "roll", wsYm = ymOf(new Date()), modeWired = false;

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
const ownerFigures = ym => { try { return JSON.parse(lsGet(WS_KEY + ym) || "{}") || {}; } catch { return {}; } };

const KIND_META = {
  same: ["No change", "p-owner"], increase: ["Increase", "p-active"], decrease: ["Decrease", "p-expired"],
  abatement: ["Abatement", "p-anchor"], "abatement-ends": ["Abatement ends", "p-active"],
  "new-term": ["New term", "p-anchor"], vacant: ["Vacant", "p-vacant"], owner: ["Owner-occupied", "p-owner"],
  expired: ["Term expired", "p-expired"], unknown: ["—", "p-vacant"]
};

function initMode() {
  if (modeWired) return;
  modeWired = true;
  mode = lsGet(MODE_KEY) === "ws" ? "ws" : "roll";
  document.querySelectorAll("#rollMode button").forEach(b => b.onclick = () => {
    mode = b.dataset.m; lsSet(MODE_KEY, mode); applyMode();
    if (mode === "roll") renderRoll();
  });
  applyMode();
}

function applyMode() {
  const ws = mode === "ws";
  document.getElementById("pg-roll").classList.toggle("ws-mode", ws);
  document.getElementById("rollTable").hidden = ws;
  document.getElementById("rollWorksheet").hidden = !ws;
  document.querySelectorAll("#rollMode button").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
  if (ws) renderWorksheet();
}

const money = v => v == null ? "—" : fmt$(v);
const signed = v => v == null ? "—" : v === 0 ? "—" : (v > 0 ? "+" : "−") + fmt$(Math.abs(v));
const mismatch = (raw, expected) => {
  if (!raw) return false;
  const n = parseMoney(raw);
  return Number.isNaN(n) || (expected != null && n !== expected);
};
const ownTotal = (rows, figs) => {
  const vals = rows.map(r => parseMoney(figs[r.unit])).filter(Number.isFinite);
  return vals.length ? fmt$(Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100) : "";
};

function renderWorksheet() {
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
  const el = document.getElementById("rollWorksheet");
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
  document.getElementById("rollStamp").textContent = w.curTotal == null
    ? "Private rent figures require an authenticated owner/operator session."
    : "Worksheet · " + curL + " vs " + prevL + " · figures you enter stay on this device; print or save as PDF to send";
}
