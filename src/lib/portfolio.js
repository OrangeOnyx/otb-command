/* D-0 Portfolio — pure folds + card render (Phase B-3, docs/phase-b/10).
   Cross-property aggregates from DB-native rows only (ledger heads,
   maintenance heads+events, the RLS property roster) — never the bundled
   OTB data package, which belongs to the active property's sheets.
   No DOM/network in here; the view fetches and mounts. Tested in
   test/portfolio.test.mjs. */
import { effectiveEntries, DEBIT_TYPES, round2 } from "./ledger.js";
import { deriveRequest, MR_OPEN_STATES } from "./maintenance.js";
import { esc } from "./format.js";

/* group any property-stamped rows → { property_id: rows[] } */
export function byProperty(rows) {
  const out = {};
  for (const r of rows || []) (out[r.property_id] ||= []).push(r);
  return out;
}

/* A/R fold: final unit balance is order-independent (Σ debits − Σ credits of
   effective entries), so no dates are fetched. Positive balance = tenant owes.
   Credit balances don't offset other units' arrears. */
export function arSummary(entries) {
  const perUnit = {};
  for (const e of effectiveEntries(entries || [])) {
    const amt = round2(+e.amount || 0);
    perUnit[e.unit] = round2((perUnit[e.unit] || 0) + (DEBIT_TYPES.includes(e.type) ? amt : -amt));
  }
  const owing = Object.values(perUnit).filter(b => b > 0);
  return {
    outstanding: round2(owing.reduce((s, b) => s + b, 0)),
    unitsInArrears: owing.length,
  };
}

/* Work-order fold over event-sourced heads: open = raw status in
   MR_OPEN_STATES ('open' includes derived-assigned; done/closed drop out). */
export function woSummary(rows, events) {
  const derived = (rows || []).map(r => deriveRequest(r, events || []));
  const open = derived.filter(r => MR_OPEN_STATES.includes(r.status));
  return { open: open.length, unassigned: open.filter(r => !r.vendorId).length };
}

/* roster + per-property folds → ordered card models (active first, then
   roster order, which is created_at from the query) */
export function portfolioModel({ properties, ledgerByProp, maintByProp, activeSlug }) {
  const models = (properties || []).map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    address: p.address || "",
    active: p.slug === activeSlug,
    ar: arSummary(ledgerByProp?.[p.id] || []),
    wo: woSummary(maintByProp?.[p.id]?.rows || [], maintByProp?.[p.id]?.events || []),
  }));
  return models.sort((a, b) => (b.active - a.active));
}

const money0 = n => "$" + Math.round(+n || 0).toLocaleString("en-US");

export function cardHTML(m) {
  const arNote = m.ar.unitsInArrears
    ? m.ar.unitsInArrears + " unit" + (m.ar.unitsInArrears === 1 ? "" : "s") + " in arrears"
    : "no balances owing";
  const woNote = m.wo.open
    ? (m.wo.unassigned ? m.wo.unassigned + " unassigned" : "all assigned")
    : "queue clear";
  return '<div class="card pf-card' + (m.active ? " pf-active" : "") + '" data-slug="' + esc(m.slug) + '">' +
    '<div class="pf-head"><b>' + esc(m.name) + '</b>' +
    (m.active ? '<span class="pf-tag mono">ACTIVE</span>'
              : '<button class="pf-open" data-slug="' + esc(m.slug) + '">Open →</button>') +
    '</div>' +
    (m.address ? '<div class="pf-addr mute">' + esc(m.address) + '</div>' : "") +
    '<div class="pf-kpis">' +
    '<div class="pf-kpi"><div class="lbl">A/R outstanding</div><div class="val">' + money0(m.ar.outstanding) + '</div><div class="note">' + esc(arNote) + '</div></div>' +
    '<div class="pf-kpi"><div class="lbl">Open work orders</div><div class="val">' + m.wo.open + '</div><div class="note">' + esc(woNote) + '</div></div>' +
    '</div></div>';
}
