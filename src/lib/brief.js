/* Owner Intelligence Brief (A2) — pure builders, no DOM/network/LLM.
   Deterministic monthly owner report: model from the reconciled rent roll
   (public units + private economics) + live property_state layers, rendered
   as an Orange Ocean-branded HTML document (owner-facing → OO B2B brand per
   brand-orange-ocean.md, NOT the OTB tenant palette).

   Flow (api/auto-trigger.mjs, daily cron): first run of a month builds the
   model, computes MoM deltas against the PRIOR month's stored model
   (owner_briefs table, written via secret-gated RPC — no service role), and
   stores html+model. Delivery: 📊 Briefs panel in AI-1 (RLS read) + a
   [[brief:YYYY-MM|label]] card line in the monthly seeded thread.
   Direction words are precomputed here so no model ever infers sign
   (kpi.js philosophy). Tested in test/brief.test.mjs. */

import { monthKey, monthLabel } from "./autotrigger.js";
import { esc } from "./format.js";

export const EXPIRATION_HORIZON_DAYS = 365;

export function prevMonthKey(month) {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const round2 = n => Math.round(n * 100) / 100;
const round4 = n => Math.round(n * 10000) / 10000;
const money0 = n => "$" + Math.round(+n || 0).toLocaleString("en-US");
const money2 = n => "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = f => (f * 100).toFixed(1) + "%";

const occupied = u => u.status === "active" || u.status === "anchor" || u.status === "owner";
const leased = u => u.status === "active" || u.status === "anchor";

function addDays(todayISO, n) {
  const [y, m, d] = todayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/* ── model ─────────────────────────────────────────────────────── */

export function buildBriefModel(units, priv, state, todayISO, recoveries) {
  const totalSf = units.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const occUnits = units.filter(occupied);
  const occupiedSf = occUnits.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const monthly = u => Number(priv?.[u.unit]?.monthly) || 0;
  const scheduledMonthly = round2(units.filter(leased).reduce((s, u) => s + monthly(u), 0));

  const edge = addDays(todayISO, EXPIRATION_HORIZON_DAYS);
  /* Operator convention: a bare monthly figure is always TOTAL rent (base +
     additional); component economics appear only as an explicit PSF breakdown
     (base / CAM / tax / ins → total PSF), single-source: base+total from the
     rent roll, CAM/tax/ins from recoveries. */
  const psfRow = u => {
    const p = priv?.[u.unit] || {};
    const r = recoveries?.units?.[u.unit] || {};
    const n = v => (Number.isFinite(+v) ? round2(+v) : null);
    return { basePsf: n(p.base), camPsf: n(r.cam), taxPsf: n(r.tax), insPsf: n(r.ins), totalPsf: n(p.total) };
  };
  const expirations = units
    .filter(u => leased(u) && u.end && u.end >= todayISO && u.end <= edge)
    .sort((a, b) => (a.end < b.end ? -1 : 1))
    .map(u => ({ unit: u.unit, dba: u.dba, end: u.end, sf: Number(u.sf) || 0, ...psfRow(u), monthly: round2(monthly(u)) }));

  const fin = state?.financials || {};
  const opexItems = Object.entries(fin.opex || {})
    .filter(([, v]) => Number.isFinite(+v) && +v !== 0)
    .map(([k, v]) => [k, round2(+v)]);
  const opexTotal = opexItems.length ? round2(opexItems.reduce((s, [, v]) => s + v, 0)) : null;
  const capRatePct = Number.isFinite(+fin.capRatePct) && +fin.capRatePct > 0 ? +fin.capRatePct : null;
  const noi = opexTotal !== null ? round2(scheduledMonthly * 12 - opexTotal) : null;

  const a = state?.actions || {};
  const custom = Array.isArray(a.custom) ? a.custom : [];
  const actions = custom
    .map(c => ({ lane: a.lane?.[c.id] || c.lane || "watch", title: String(c.title || "").slice(0, 120), due: c.due || "" }))
    .filter(c => c.lane !== "done");

  return {
    month: monthKey(todayISO),
    monthLabel: monthLabel(todayISO),
    generated: todayISO,
    unitCount: units.length,
    totalSf,
    occupiedUnits: occUnits.length,
    occupiedSf,
    occupancyPct: totalSf ? round4(occupiedSf / totalSf) : 0,
    scheduledMonthly,
    scheduledAnnual: round2(scheduledMonthly * 12),
    vacants: units.filter(u => !occupied(u)).map(u => ({ unit: u.unit, sf: Number(u.sf) || 0 })),
    holdovers: units.filter(u => leased(u) && u.end && u.end < todayISO).map(u => u.unit),
    expirations,
    expiringMonthly: round2(expirations.reduce((s, e) => s + e.monthly, 0)),
    opex: opexItems.length ? Object.fromEntries(opexItems) : null,
    opexTotal,
    capRatePct,
    noi,
    capValue: noi !== null && capRatePct ? round2(noi / (capRatePct / 100)) : null,
    actions,
  };
}

/* MoM deltas vs the prior stored model — direction word precomputed, sub-
   epsilon moves read as flat (mirrors calc/kpi.js DIRECTION_EPSILON). */
export const OCC_EPSILON = 0.0005; // 0.05% of GLA
export const MONEY_EPSILON = 1;    // $1/mo

const dir = (delta, eps) => (Math.abs(delta) < eps ? "flat" : delta > 0 ? "up" : "down");

export function momDeltas(model, prior) {
  if (!prior) return null;
  const occDelta = round4(model.occupancyPct - prior.occupancyPct);
  const incDelta = round2(model.scheduledMonthly - prior.scheduledMonthly);
  return {
    priorMonth: prior.month,
    occDelta,
    occDirection: dir(occDelta, OCC_EPSILON),
    incDelta,
    incDirection: dir(incDelta, MONEY_EPSILON),
    incDeltaPct: prior.scheduledMonthly ? round4(incDelta / Math.abs(prior.scheduledMonthly)) : 0,
  };
}

/* ── document ──────────────────────────────────────────────────── */

/* Orange Ocean B2B brand (brand-orange-ocean.md): Ocean Navy #1C2D4F,
   Sunset Orange #E8820C accent, Light #F0F4F8, Helvetica. Wordmark colorway
   on the navy bar = dark-background rule: ORANGE in orange, OCEAN in white. */
const OO = `
  body{font-family:Helvetica,Arial,sans-serif;color:#1C2D4F;margin:0;background:#F0F4F8}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.7in .8in}
  .bar{background:#1C2D4F;padding:20px 28px;display:flex;justify-content:space-between;align-items:baseline}
  .bar .wm{font-size:19px;font-weight:bold;letter-spacing:.14em}
  .bar .wm .o{color:#E8820C}.bar .wm .c{color:#fff}
  .bar .tag{font-size:10.5px;letter-spacing:.18em;color:#F0F4F8}
  h1{font-size:23px;margin:0 0 2px;letter-spacing:.02em}
  .sub{font-size:12px;color:#4A6FA5;letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px}
  h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#1C2D4F;border-bottom:2px solid #E8820C;padding-bottom:4px;margin:26px 0 10px}
  .kpis{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0 4px}
  .kpi{flex:1 1 150px;background:#F0F4F8;border-left:3px solid #E8820C;padding:12px 14px}
  .kpi .v{font-size:21px;font-weight:bold}
  .kpi .l{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#4A6FA5;margin-top:2px}
  .kpi .d{font-size:11px;margin-top:4px;color:#1C2D4F}
  .kpi .d.up{color:#2F6B4F}.kpi .d.down{color:#A33B1F}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  td,th{border:1px solid #C7D0DE;padding:5px 7px;text-align:left}
  th{background:#F0F4F8;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#1C2D4F}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  p,li{font-size:13px;line-height:1.55}
  .note{font-size:11.5px;color:#4A6FA5}
  .foot{font-size:10.5px;color:#4A6FA5;margin-top:32px;border-top:1px solid #C7D0DE;padding-top:10px;line-height:1.6}
  @media print{body{background:#fff}.page{padding:.35in .5in}.bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const arrow = { up: "▲", down: "▼", flat: "—" };

function kpiTile(value, label, deltaHtml) {
  return `<div class="kpi"><div class="v">${value}</div><div class="l">${label}</div>${deltaHtml || ""}</div>`;
}

function momChip(direction, text) {
  return `<div class="d ${direction}">${arrow[direction]} ${esc(text)}</div>`;
}

export function briefHTML(model, mom) {
  const m = model;
  const occChip = mom ? momChip(mom.occDirection, mom.occDirection === "flat" ? "flat vs " + mom.priorMonth : pct1(Math.abs(mom.occDelta)) + " of GLA " + mom.occDirection + " MoM") : `<div class="d">baseline month</div>`;
  const incChip = mom ? momChip(mom.incDirection, mom.incDirection === "flat" ? "flat vs " + mom.priorMonth : money0(Math.abs(mom.incDelta)) + "/mo " + mom.incDirection + " (" + pct1(Math.abs(mom.incDeltaPct)) + ") MoM") : `<div class="d">baseline month</div>`;

  const vacantLine = m.vacants.length
    ? m.vacants.map(v => `Suite ${esc(v.unit)} (${v.sf.toLocaleString()} SF)`).join(" · ")
    : "None — the center is fully occupied.";

  const psf = v => (v === null || v === undefined ? "—" : "$" + (+v).toFixed(2));
  const expRows = m.expirations.map(e =>
    `<tr><td>${esc(e.unit)}</td><td>${esc(e.dba)}</td><td>${esc(e.end)}</td><td class="num">${e.sf.toLocaleString()}</td>` +
    `<td class="num">${psf(e.basePsf)}</td><td class="num">${psf(e.camPsf)}</td><td class="num">${psf(e.taxPsf)}</td><td class="num">${psf(e.insPsf)}</td>` +
    `<td class="num"><b>${psf(e.totalPsf)}</b></td><td class="num"><b>${money2(e.monthly)}</b></td></tr>`).join("");

  const finBlock = m.noi !== null ? `
<h2>Financial Position (Owner Worksheet)</h2>
<div class="kpis">
${kpiTile(money0(m.scheduledAnnual), "Scheduled billings /yr")}
${kpiTile(money0(m.opexTotal), "Operating expenses /yr")}
${kpiTile(money0(m.noi), "Indicative NOI /yr")}
${m.capValue ? kpiTile(money0(m.capValue), `Value @ ${m.capRatePct}% cap`) : ""}
</div>
<p class="note">Expenses are the operator-entered P-1 worksheet; NOI is scheduled billings less that worksheet — indicative, not audited.</p>` : `
<p class="note">No operating-expense worksheet on file this month — NOI omitted. Scheduled billings run ${money0(m.scheduledAnnual)}/yr.</p>`;

  const actionsBlock = m.actions.length ? `
<h2>Open Management Items</h2>
<ul>${m.actions.map(c => `<li><b>[${esc(c.lane)}]</b> ${esc(c.title)}${c.due ? ` <span class="note">(due ${esc(c.due)})</span>` : ""}</li>`).join("")}</ul>` : "";

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Owner Intelligence Brief — ${esc(m.monthLabel)} — On The Boulevard</title><style>${OO}</style></head><body>
<div class="bar"><span class="wm"><span class="o">ORANGE</span> <span class="c">OCEAN</span></span><span class="tag">OWNER INTELLIGENCE BRIEF</span></div>
<div class="page">
<h1>On The Boulevard — ${esc(m.monthLabel)}</h1>
<div class="sub">101–149 Arnould Blvd., Lafayette, LA 70506 · prepared ${esc(m.generated)} · confidential — for the owners of Belle Realty of Lafayette, LLC</div>

<div class="kpis">
${kpiTile(pct1(m.occupancyPct), `Occupancy (${m.occupiedUnits}/${m.unitCount} units)`, occChip)}
${kpiTile(money0(m.scheduledMonthly), "Total scheduled rent /mo", incChip)}
${kpiTile(m.occupiedSf.toLocaleString() + " SF", `of ${m.totalSf.toLocaleString()} SF demised occupied`)}
</div>

<h2>Leasing</h2>
<p><b>Vacant:</b> ${vacantLine}</p>
${m.holdovers.length ? `<p><b>Holdovers:</b> Suite ${m.holdovers.map(esc).join(", Suite ")} — lease expired, tenant in place. Renewal or notice track in motion.</p>` : `<p><b>Holdovers:</b> none.</p>`}

<h2>Lease Expirations — Next 12 Months</h2>
${m.expirations.length ? `<table>
<tr><th>Suite</th><th>Tenant</th><th>Expires</th><th class="num">SF</th><th class="num">Base</th><th class="num">CAM</th><th class="num">Tax</th><th class="num">Ins</th><th class="num">Total PSF</th><th class="num">Total /mo</th></tr>
${expRows}
</table>
<p class="note">PSF columns are $/SF/yr; Total /mo is total rent (base + additional). ${m.expirations.length} lease(s), ${money0(m.expiringMonthly)}/mo of total scheduled rent in the window — each is a renewal conversation to open early.</p>` : `<p>No expirations inside 12 months.</p>`}
${finBlock}
${actionsBlock}
<div class="foot">Orange Ocean, LLC · Property Manager for Belle Realty of Lafayette, LLC<br>
Adam Anthony Abdalla · 101-149 Arnould Blvd., Lafayette, LA 70506 · P 337-288-5411 · E adam@orangeocean.com · W orangeocean.com<br>
Figures from the reconciled rent-roll source of truth as of ${esc(m.generated)}; scheduled billings include recoveries. Occupancy is SF-weighted on demised area (${esc(m.totalSf.toLocaleString())} SF; audited headline GLA 62,883 SF). Generated by Orange Ocean Atlas — deterministic, no estimated figures.</div>
</div></body></html>`;
}

/* ── client-side card parsing ──────────────────────────────────── */

/* [[brief:YYYY-MM|label]] lines ride cron-seeded thread messages. Parsing
   (incl. the strict YYYY-MM gate — the html itself is fetched via RLS, never
   from this line) lives in the shared card registry (lib/cards.js). */
import { extractCardsOf } from "./cards.js";
export function extractBriefs(text) {
  const { clean, cards } = extractCardsOf(text, "brief");
  return { clean, briefs: cards.map(c => ({ month: c.token, label: c.label })) };
}
