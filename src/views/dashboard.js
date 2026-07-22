/* D-1 Operations Dashboard — KPIs, lease runway, action queue.
   The Action Queue derives from the SAME live cards as W-1 (single source) and
   re-renders on store changes; KPIs/runway are read-only from the rent roll. */
import { UNITS, subscribe } from "../store.js";
import { fmt$0, pDate, fDate, monthsTo, daysTo, esc, TODAY } from "../lib/format.js";
import { getActionCards, ACTION_KIND } from "./board.js";
import { REMOTE, getSession } from "../lib/remote.js";
import { unifiHealthLine } from "../lib/unifi.js";

let unifiSummary = null; // cached /api/unifi shape; renderKPIs reads it

export function renderDashboard() {
  renderKPIs();
  renderRunway();
  renderAlerts();
}

export function initDashboard() {
  renderDashboard();
  // alerts derive from compliance flags + action-board overrides — refresh on those
  subscribe(type => { if (type === "comp" || type === "actions" || type === "notes" || type === "import") renderDashboard(); });
  if (REMOTE) fetchUnifi();
}

/* UniFi Site Manager card — server proxy holds the key; owner/operator only.
   Best-effort: an infra-card outage never touches the rest of D-1. */
async function fetchUnifi() {
  try {
    const session = await getSession();
    if (!session) return;
    const r = await fetch("/api/unifi", {
      headers: { Authorization: "Bearer " + session.access_token },
    });
    if (!r.ok) return;
    unifiSummary = await r.json();
    renderKPIs();
  } catch { /* card simply doesn't render */ }
}

function renderKPIs() {
  const gla = UNITS.reduce((s, u) => s + u.sf, 0);
  const vacant = UNITS.filter(u => u.status === "vacant");
  const vacantSF = vacant.reduce((s, u) => s + u.sf, 0);
  const occ = (gla - vacantSF) / gla * 100;
  const rent = UNITS.reduce((s, u) => s + u.monthly, 0);
  const hold = UNITS.filter(u => u.status === "expired");
  const exp12 = UNITS.filter(u => u.end && u.status !== "expired" && monthsTo(pDate(u.end)) <= 12 && monthsTo(pDate(u.end)) > 0);
  const k = document.getElementById("kpis");
  k.innerHTML = [
    ["green", "Occupancy", occ.toFixed(1) + "<small>%</small>", (gla - vacantSF).toLocaleString() + " of " + gla.toLocaleString() + " SF"],
    ["ink", "Monthly Rent", fmt$0(rent), fmt$0(rent * 12) + " annualized"],
    ["brick", "In Holdover", hold.length, hold.map(u => u.unit).join(" · ")],
    ["brass", "Expiring ≤ 12 mo", exp12.length, exp12.map(u => u.unit).join(" · ") || "none"],
    ["ink", "Vacant Bays", vacant.length, vacant.map(u => u.unit + " (" + u.sf.toLocaleString() + " SF)").join(" · ")],
    ["brass", "Parking", "324<small>/344</small>", "legal (var. <b>99-11797</b>) · 314 drawn"]
  ].concat(unifiKpi()).map(([c, l, v, n]) => '<div class="card kpi ' + c + '"><div class="lbl">' + l + '</div><div class="val">' + v + '</div><div class="note">' + n + '</div></div>').join("");
}

function unifiKpi() {
  const s = unifiSummary;
  if (!s) return []; // local mode / not fetched yet / endpoint down
  const bad = s.counts.offline > 0 || s.counts.critical > 0 || s.console.state !== "connected";
  const note = esc(unifiHealthLine(s)) +
    " · " + (s.counts.wifiClients + s.counts.wiredClients) + " clients" +
    (s.unlisted > 0 ? " · " + s.unlisted + " down unit not in device list — identify in UniFi console" : "");
  return [[bad ? "brick" : "green", "Network (UniFi)",
    (s.counts.total - s.counts.offline) + "<small>/" + s.counts.total + " up</small>", note]];
}

function renderRunway() {
  const X0 = new Date(2025, 0, 1), X1 = new Date(2033, 0, 1);
  const span = X1 - X0;
  const pos = d => Math.max(0, Math.min(100, (d - X0) / span * 100));
  const rows = UNITS.filter(u => u.end).slice().sort((a, b) => pDate(a.end) - pDate(b.end));
  const el = document.getElementById("runway");
  el.innerHTML = rows.map(u => {
    const s = pDate(u.start) || X0, e = pDate(u.end);
    const expired = e < TODAY;
    const col = expired ? "var(--brick)" : monthsTo(e) < 12 ? "#C99A33" : "var(--green)";
    const dl = expired ? Math.abs(daysTo(e)) + "d over" : daysTo(e) + "d left";
    return '<div class="run-row"><div class="u"><b>' + u.unit + '</b> ' + esc(u.dba) + '</div>' +
      '<div class="run-track"><div class="run-bar" style="left:' + pos(s) + '%;width:' + (pos(e) - pos(s)) + '%;background:' + col + '"></div>' +
      '<div class="run-now" style="left:' + pos(TODAY) + '%"></div></div>' +
      '<div class="d" style="color:' + (expired ? "var(--brick)" : "var(--ink50)") + '">' + dl + '</div></div>';
  }).join("");
  document.getElementById("runAxis").innerHTML = ["2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"].map(y => "<span>" + y + "</span>").join("");
}

/* Action Queue — a prioritized read of the live W-1 cards (single source).
   Surfaces the urgent lanes (Action Needed + anything overdue), most-overdue
   first; click-through is on W-1, this is the home-page triage. */
function renderAlerts() {
  const urgent = getActionCards()
    .filter(c => c.lane === "action" || (c.due && pDate(c.due) < TODAY && c.lane !== "done"))
    .map(c => ({ ...c, over: c.due ? (TODAY - pDate(c.due)) : -Infinity }))
    .sort((a, b) => b.over - a.over);
  const el = document.getElementById("alerts");
  if (!urgent.length) { el.innerHTML = '<div class="alert"><div class="t"><span class="tag">All clear</span>No action-needed items — see W-1 for the full board.</div></div>'; return; }
  el.innerHTML = urgent.map(c => {
    const [label, color] = ACTION_KIND[c.kind] || ACTION_KIND.task;
    const overTxt = c.due && pDate(c.due) < TODAY ? ' <b style="color:var(--brick)">' + Math.abs(daysTo(pDate(c.due))) + 'd over</b>' : "";
    return '<div class="alert"><div class="bar" style="background:' + color + '"></div><div class="t">' +
      '<span class="tag">' + esc(label) + (c.unit ? " · " + esc(c.unit) : "") + '</span>' +
      '<b>' + esc(c.title) + '</b>' + overTxt + (c.detail ? '<br>' + esc(c.detail) : "") + '</div></div>';
  }).join("");
}
