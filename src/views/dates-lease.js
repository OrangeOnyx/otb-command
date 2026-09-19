/* T-1 lease blocks (2026-09-19, Asset Command review picks 1 + 2): the lease
   expiry Gantt and the renewal pipeline, DOM only — every number comes from
   lib/leasegantt.js and lib/renewals.js (tested). Both read the Tier-1 rent
   roll (units.json) and re-render on a state import; the option terms are
   the reference-only data/renewal-options.json. "Open suite" hands off to
   the unit drawer, where the lease evidence block and the renewal notes
   live — no new persistence here. */
import { UNITS } from "../store.js";
import { esc, TODAY } from "../lib/format.js";
import { isoDate } from "../lib/docexpiry.js";
import { ganttModel, ganttSummary, daysChip, GANTT_BUCKETS } from "../lib/leasegantt.js";
import { renewalPipeline, noticeLine, termLine } from "../lib/renewals.js";
import { openDrawer } from "./drawer.js";
import renewalOptions from "../data/renewal-options.json";

const ROW_H = 22, LABEL_W = 168, RIGHT_W = 56, TOP = 26, BOTTOM = 8;

export function renderGantt() {
  const host = document.getElementById("gantt");
  if (!host) return;
  const m = ganttModel(UNITS, isoDate(TODAY), { years: 4 });
  document.getElementById("ganttSub").textContent = ganttSummary(m.counts).toUpperCase() + " · " + m.years + "-YEAR HORIZON";
  document.getElementById("ganttBuckets").innerHTML = GANTT_BUCKETS.map(([id, label, color]) =>
    '<div class="gb gb-' + id + '" style="--gc:' + color + '"><b>' + m.counts[id] + '</b><span>' + esc(label) + '</span></div>').join("");

  const width = Math.max(720, host.clientWidth || 900);
  const plotW = width - LABEL_W - RIGHT_W;
  const height = TOP + m.rows.length * ROW_H + BOTTOM;
  const x = f => LABEL_W + f * plotW;
  let svg = '<svg class="gantt-svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="Lease expiry timeline">';
  // grid + ticks
  m.ticks.forEach(t => {
    svg += '<line class="gt-grid' + (t.major ? " major" : "") + '" x1="' + x(t.f) + '" y1="' + (TOP - 6) + '" x2="' + x(t.f) + '" y2="' + (height - BOTTOM) + '"/>' +
      '<text class="gt-tick" x="' + x(t.f) + '" y="' + (TOP - 10) + '" text-anchor="middle">' + esc(t.label) + '</text>';
  });
  // today line
  svg += '<line class="gt-today" x1="' + x(0) + '" y1="' + (TOP - 14) + '" x2="' + x(0) + '" y2="' + (height - BOTTOM) + '"/>' +
    '<text class="gt-today-l" x="' + (x(0) + 4) + '" y="' + (TOP - 10) + '">TODAY</text>';
  m.rows.forEach((r, i) => {
    const y = TOP + i * ROW_H;
    svg += '<g class="gt-row" data-unit="' + esc(r.unit) + '" tabindex="0" role="button" aria-label="' + esc(r.unit + " " + r.dba + " — " + r.label) + '">' +
      '<rect class="gt-hit" x="0" y="' + y + '" width="' + width + '" height="' + ROW_H + '"/>' +
      '<text class="gt-unit" x="0" y="' + (y + 15) + '"><tspan class="u">' + esc(r.unit) + '</tspan> ' + esc(r.dba.length > 20 ? r.dba.slice(0, 19) + "…" : r.dba) + '</text>';
    if (r.f == null) {
      svg += '<text class="gt-unres" x="' + (x(0) + 6) + '" y="' + (y + 15) + '">' + esc(r.evidence ? "term unresolved · " + r.evidence : "term unresolved") + '</text>';
    } else if (r.bucket === "expired") {
      svg += '<rect class="gt-bar" x="' + (x(0) - 6) + '" y="' + (y + 5) + '" width="6" height="' + (ROW_H - 10) + '" fill="' + r.color + '"/>';
    } else {
      const w = Math.max(3, x(r.f) - x(0));
      svg += '<rect class="gt-bar" x="' + x(0) + '" y="' + (y + 5) + '" width="' + w + '" height="' + (ROW_H - 10) + '" rx="2" fill="' + r.color + '"/>' +
        (r.clipped ? '<text class="gt-clip" x="' + (x(1) + 3) + '" y="' + (y + 15) + '">›</text>' : '');
    }
    svg += '<text class="gt-days" x="' + (width - 2) + '" y="' + (y + 15) + '" text-anchor="end" fill="' + r.color + '">' + esc(daysChip(r.days)) + '</text></g>';
  });
  svg += '</svg>';
  host.innerHTML = svg;
  host.querySelectorAll(".gt-row").forEach(g => {
    const go = () => openDrawer(g.dataset.unit);
    g.onclick = go;
    g.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
}

export function renderRenewals() {
  const host = document.getElementById("renew");
  if (!host) return;
  const p = renewalPipeline(UNITS, renewalOptions.units, isoDate(TODAY));
  const c = p.counts;
  document.getElementById("renewKpis").innerHTML = [
    ["total", "Leases", c.total, ""],
    ["window", "Notice window", c.window, c.window ? "brick" : ""],
    ["passed", "Deadline passed", c.passed, c.passed ? "brass" : ""],
    ["available", "Option available", c.available, "green"],
    ["expired", "Past recorded end", c.expired, c.expired ? "brick" : ""],
    ["unresolved", "Term unresolved", c.unresolved, c.unresolved ? "slate" : ""],
  ].map(([k, l, v, tone]) => '<div class="rk rk-' + k + (tone ? " rk-" + tone : "") + '"><b>' + v + '</b><span>' + l + '</span></div>').join("");
  document.getElementById("renewSub").textContent = "OPTION NOTICE DEADLINES · TIER-1 DATES × ABSTRACTED OPTION TERMS (REFERENCE — VERIFY THE CLAUSE) · " + c.total + " LEASES";
  host.innerHTML = p.groups.filter(g => g.rows.length || ["window", "passed", "available"].includes(g.id)).map(g =>
    '<section class="rg rg-' + g.id + '"><div class="rg-h"><h3>' + esc(g.label) + '</h3><span class="rg-n">' + g.rows.length + '</span><span class="rg-sub">' + esc(g.sub) + '</span></div>' +
    (g.rows.length ? g.rows.map(r =>
      '<div class="rg-row"><span class="rg-unit"><i>Unit</i><b>' + esc(r.unit) + '</b></span>' +
      '<span class="rg-main"><b>' + esc(r.dba) + '</b><span class="rg-term">' + esc(termLine(r)) + (r.rentBasis ? ' · ' + esc(r.rentBasis.length > 60 ? r.rentBasis.slice(0, 59) + "…" : r.rentBasis) : "") + '</span></span>' +
      '<span class="rg-when rg-when-' + g.id + '">' + esc(noticeLine(r)) + '</span>' +
      '<button type="button" class="chip rg-open" data-unit="' + esc(r.unit) + '">Open suite</button></div>').join("")
      : '<div class="led-note">None.</div>') + '</section>').join("");
  host.querySelectorAll(".rg-open").forEach(b => b.onclick = () => openDrawer(b.dataset.unit));
}

export function renderLeaseBlocks() { renderGantt(); renderRenewals(); }
