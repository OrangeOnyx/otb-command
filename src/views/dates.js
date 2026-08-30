/* T-1 Critical Dates — lease expirations + instrument deadlines on a timeline.
   Source data is static (lease ends + fixed instrument dates); the only store
   event that can change it is a full state import, so we subscribe to that.
   REMOTE enrichment (2026-08-29): matter deadlines (N-1) and upcoming rent
   escalation steps (AC lease abstracts, reference-only) are fetched once at
   init and merged into the same timeline via a module-level event array. */
import { UNITS, subscribe } from "../store.js";
import { fmt$0, pDate, monthsTo, esc, TODAY } from "../lib/format.js";
import { JD_BANK, factLines } from "../lib/facts.js";
import { REMOTE } from "../lib/remote.js";
import { getMatters, refreshMatters, matterDeadlines } from "../lib/matters.js";
import { refreshLeaseRef, getLeaseRef, escalationEvents } from "../lib/leaseref.js";
import { getGovernance, refreshGovernance, govDeadlines, GOV_KINDS } from "../lib/governance.js";

/* sync events — leases + instruments (unchanged baseline set) */
function baseEvents() {
  const ev = [];
  UNITS.filter(u => u.end).forEach(u => {
    const d = pDate(u.end);
    ev.push({
      d, c: d < TODAY ? "var(--brick)" : monthsTo(d) < 12 ? "#C99A33" : "var(--green)",
      t: "<b>" + u.unit + " · " + esc(u.dba) + "</b> lease " + (d < TODAY ? "expired — in holdover" : "expires"),
      sub: u.sf.toLocaleString() + " SF · " + (u.monthly ? fmt$0(u.monthly) + "/mo" : "")
    });
  });
  ev.push({
    d: pDate(JD_BANK.expires), c: "var(--navy)",
    t: "<b>" + esc(JD_BANK.name) + " expires</b> — " + esc(factLines.jdBankTimeline()),
    sub: esc(factLines.jdBankTimelineSub())
  });
  return ev;
}

/* remote events land here once fetched; renderDates merges them in */
let remoteEv = [];

export function renderDates() {
  const ev = baseEvents().concat(remoteEv);
  ev.sort((a, b) => a.d - b.d);
  let h = "", lastY = null;
  ev.forEach(e => {
    const y = e.d.getFullYear();
    if (y !== lastY) { h += '<div class="tl-group">' + y + '</div>'; lastY = y; }
    h += '<div class="tl-item"><span class="nd" style="background:' + e.c + '"></span>' +
      '<span class="dt">' + e.d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span>' +
      '<span class="tx">' + e.t + '<span class="sub">' + e.sub + '</span></span></div>';
  });
  document.getElementById("timeline").innerHTML = h;
}

/* one-shot REMOTE enrichment: N-1 matter deadlines + rent escalation steps
   + S-1 governance deadlines (register row #8) */
async function enrich() {
  if (!REMOTE) return;
  try {
    await Promise.all([refreshMatters(), refreshLeaseRef(), refreshGovernance()]);
    const el = document.getElementById("timeline");
    if (!el || !el.isConnected) return;
    const today = new Date().toISOString().slice(0, 10);
    const ev = [];
    matterDeadlines(getMatters().matters, today).forEach(m => {
      ev.push({
        d: pDate(m.date), c: m.overdue ? "var(--brick)" : "var(--brass)",
        t: "<b>MATTER: " + esc(m.title) + "</b>" + (m.note ? " — " + esc(m.note) : ""),
        sub: esc(m.kind),
      });
    });
    govDeadlines(getGovernance().items, today).forEach(g => {
      ev.push({
        d: pDate(g.date), c: g.overdue ? "var(--brick)" : "var(--brass)",
        t: "<b>GOVERNANCE: " + esc(g.title) + "</b>" + (g.entity ? " — " + esc(g.entity) : ""),
        sub: esc((GOV_KINDS[g.kind] || g.kind) + (g.ref ? " · " + g.ref : "")),
      });
    });
    escalationEvents(getLeaseRef().escalations, today).forEach(s => {
      ev.push({
        d: pDate(s.date), c: "var(--green)",
        t: "<b>Unit " + esc(s.unit) + " rent step</b> — " +
          (s.prevRent != null ? fmt$0(s.prevRent) : "?") + "→" + (s.newRent != null ? fmt$0(s.newRent) : "?"),
        sub: "per AC lease abstract · notice: " + esc(s.notice || "none stated"),
      });
    });
    remoteEv = ev;
    renderDates();
  } catch (e) { console.warn("T-1 remote feed:", e.message); }
}

export function initDates() {
  renderDates();
  enrich();
  subscribe(type => { if (type === "import") renderDates(); });
}
