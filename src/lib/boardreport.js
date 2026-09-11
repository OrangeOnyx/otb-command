/* Quarterly Board Report (register row #12 v1) + audience variants (F-3,
   2026-09-11) — composes the stored monthly Owner Intelligence Brief models
   (owner_briefs.model jsonb, RLS read owner+operator) into one OO-branded
   quarterly document. No recomputation: every figure is lifted from the
   source months' stored models, so it carries their as-of dates.

   Audiences (same engine, same stored briefs; variants change section
   selection, headings and disclosures — never the numbers):
     board       — the original document, unchanged.
     lender      — occupancy trend, rent-roll totals, NOI, expirations
                   (24-month heading, 12-month stored horizon disclosed),
                   Collections from optional live `extras` (payment_history
                   stats + ledger aging), Debt Service = explicit "not on
                   file" (no loan data exists in the app — never a number).
     stakeholder — NOI, indicative value, occupancy, leasing position, top
                   actions, Distributions = explicit "not on file".
   Pure half (quarterOf / lastCompleteQuarter / assertAudience /
   boardReportModel / boardReportHTML) is unit-tested in
   test/boardreport.test.mjs; openBoardReport is the only impure entry.
   Owner/entity document → Orange Ocean B2B brand via lib/docbrand.js. */

import { esc } from "./format.js";
import { REMOTE, sb, listLedgerEntries } from "./remote.js";
import { OO_CSS, OO_FOOT_LINES, ooBar, arrow, kpiTile } from "./docbrand.js";
import { refreshPayHistory, payHistoryStats } from "./payhistory.js";
import { aging as ledgerAging } from "./ledger.js";

/* ── pure: audiences ───────────────────────────────────────────── */

export const AUDIENCES = ["board", "lender", "stakeholder"];
export const AUDIENCE_LABELS = { board: "Board Report", lender: "Lender Report", stakeholder: "Stakeholder Report" };
const AUDIENCE_TAGS = { board: "QUARTERLY BOARD REPORT", lender: "QUARTERLY LENDER REPORT", stakeholder: "QUARTERLY STAKEHOLDER REPORT" };

export function assertAudience(audience) {
  if (!AUDIENCES.includes(audience)) throw new Error("unknown report audience: " + audience);
  return audience;
}

/* ── pure: quarter math ────────────────────────────────────────── */

function quarterYQ(y, q) {
  const first = (q - 1) * 3 + 1;
  return {
    label: `Q${q} ${y}`,
    year: y,
    q,
    months: [0, 1, 2].map(i => `${y}-${String(first + i).padStart(2, "0")}`),
  };
}

/* 'YYYY-MM' → its calendar quarter. */
export function quarterOf(ym) {
  const [y, m] = ym.split("-").map(Number);
  return quarterYQ(y, Math.floor((m - 1) / 3) + 1);
}

/* Most recent quarter whose months are ALL strictly before todayYm's month —
   i.e. the quarter preceding todayYm's own (2026-08 → Q2 2026; 2026-01 →
   Q4 2025). The current quarter is never "complete" while we sit inside it. */
export function lastCompleteQuarter(todayYm) {
  const { year, q } = quarterOf(todayYm);
  return q === 1 ? quarterYQ(year - 1, 4) : quarterYQ(year, q - 1);
}

/* ── pure: model ───────────────────────────────────────────────── */

const round2 = n => Math.round(n * 100) / 100;
const finiteOrNull = v => (Number.isFinite(v) ? v : null);

/* payHistoryStats output ({unit: {months,paid,late,…}}) → portfolio fold.
   Aggregates only — unit keys never reach the document. */
function foldPay(stats) {
  const rows = stats && typeof stats === "object" ? Object.values(stats) : [];
  if (!rows.length) return null;
  const s = { units: rows.length, months: 0, paid: 0, late: 0, partial: 0, unpaid: 0, totalPaid: 0, lateFees: 0 };
  for (const r of rows) {
    s.months += +r.months || 0; s.paid += +r.paid || 0; s.late += +r.late || 0;
    s.partial += +r.partial || 0; s.unpaid += +r.unpaid || 0;
    s.totalPaid += +r.totalPaid || 0; s.lateFees += +r.lateFees || 0;
  }
  s.totalPaid = round2(s.totalPaid); s.lateFees = round2(s.lateFees);
  s.cleanRate = s.months ? s.paid / s.months : null;
  return s;
}

/* ledger aging output ({unit: {current,d31_60,d61_90,d90,credit,total}}) →
   portfolio buckets. An empty map is a legitimate "nothing open" (units 0);
   only an absent map is "not on file". */
function foldAging(ag) {
  if (!ag || typeof ag !== "object") return null;
  const rows = Object.values(ag);
  const s = { units: rows.length, current: 0, d31_60: 0, d61_90: 0, d90: 0, credit: 0, total: 0 };
  for (const r of rows) for (const k of ["current", "d31_60", "d61_90", "d90", "credit", "total"]) s[k] = round2(s[k] + (+r[k] || 0));
  return s;
}

/* briefModels: { 'YYYY-MM': storedBriefModel } — absent months stay null and
   are reported in `missing`, never silently papered over.
   opts.audience ∈ AUDIENCES (default board); opts.extras = optional live
   reads for the lender variant ({ payStats, aging }) — absent → null blocks. */
export function boardReportModel(quarter, briefModels, { audience = "board", extras = {} } = {}) {
  assertAudience(audience);
  const months = quarter.months.map(ym => ({ ym, model: briefModels?.[ym] || null }));
  const present = months.filter(m => m.model);
  const latest = present.length ? present[present.length - 1].model : null;
  // Number.isFinite on the RAW value: +null coerces to 0 and would silently
  // count a "no worksheet" month as $0 NOI — exactly the pretend we refuse.
  const nois = present.map(m => m.model.noi).filter(v => Number.isFinite(v));
  return {
    audience,
    label: quarter.label,
    months,
    present: present.length,
    occupancyTrend: present.map(m => Number(m.model.occupancyPct) || 0),
    noiTotal: nois.length ? round2(nois.reduce((s, v) => s + v, 0)) : null,
    scheduledMonthlyLatest: latest ? Number(latest.scheduledMonthly) || 0 : null,
    vacantsLatest: latest ? latest.vacants || [] : [],
    holdoversLatest: latest ? latest.holdovers || [] : [],
    expirationsAhead: latest ? latest.expirations || [] : [],
    missing: months.filter(m => !m.model).map(m => m.ym),
    /* F-3 additions — all lifted from the latest stored month, null when
       that month never stored them (never 0). */
    capValueLatest: latest ? finiteOrNull(latest.capValue) : null,
    capRatePctLatest: latest ? finiteOrNull(latest.capRatePct) : null,
    actionsLatest: latest ? latest.actions || [] : [],
    rentRollLatest: latest ? {
      unitCount: finiteOrNull(latest.unitCount),
      occupiedUnits: finiteOrNull(latest.occupiedUnits),
      totalSf: finiteOrNull(latest.totalSf),
      occupiedSf: finiteOrNull(latest.occupiedSf),
      scheduledMonthly: Number(latest.scheduledMonthly) || 0,
      scheduledAnnual: finiteOrNull(latest.scheduledAnnual),
    } : null,
    collections: audience === "lender"
      ? { pay: foldPay(extras?.payStats), aging: foldAging(extras?.aging) }
      : null,
  };
}

/* ── pure: document ────────────────────────────────────────────── */

const money0 = n => "$" + Math.round(+n || 0).toLocaleString("en-US");
const money2 = n => "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = f => ((+f || 0) * 100).toFixed(1) + "%";
const int0 = n => (n === null || n === undefined ? "—" : (Number(n) || 0).toLocaleString("en-US"));
const OCC_EPSILON = 0.0005; // 0.05% of GLA — mirrors lib/brief.js

/* Direction word is precomputed here so no reader (or model) ever infers
   sign from the numbers — kpi.js philosophy, same as the monthly brief. */
function occDirection(trend) {
  if (trend.length < 2) return null;
  const d = trend[trend.length - 1] - trend[0];
  return Math.abs(d) < OCC_EPSILON ? "flat" : d > 0 ? "up" : "down";
}

const monthName = ym => {
  const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${M[+ym.slice(5, 7) - 1] || ym} ${ym.slice(0, 4)}`;
};

const actionList = acts => acts.length
  ? `<ul>${acts.map(a => `<li><b>[${esc(a.lane)}]</b> ${esc(a.title)}${a.due ? ` <span class="note">(due ${esc(a.due)})</span>` : ""}</li>`).join("")}</ul>`
  : `<p class="note">No open management items recorded.</p>`;

/* Sub-line audience clause — who the confidential copy is for. */
const SUB_FOR = {
  board: "confidential — for the owners of Belle Realty of Lafayette, LLC",
  lender: "confidential — prepared for lender review on behalf of Belle Realty of Lafayette, LLC",
  stakeholder: "confidential — for the members of Belle Realty of Lafayette, LLC",
};

export function boardReportHTML(model, { generatedISO } = {}) {
  const m = model;
  const audience = assertAudience(m.audience || "board");
  const gen = generatedISO || "";
  const title = `${AUDIENCE_LABELS[audience]} — ${m.label}`;

  /* KPI — occupancy, last vs first month of the quarter */
  const trend = m.occupancyTrend;
  const dirWord = occDirection(trend);
  const occChip = dirWord
    ? `<div class="d ${dirWord}">${arrow[dirWord]} ${esc(dirWord === "flat"
      ? "flat across the quarter"
      : dirWord + " from " + pct1(trend[0]) + " at the start of the quarter")}</div>`
    : `<div class="d">${trend.length === 1 ? "single month on file" : "no months on file"}</div>`;
  const occTile = kpiTile(trend.length ? pct1(trend[trend.length - 1]) : "—", "Occupancy — quarter end", occChip);
  const noiTile = kpiTile(m.noiTotal !== null ? money0(m.noiTotal) : "—", "Indicative NOI — quarter total");
  const rentTile = kpiTile(m.scheduledMonthlyLatest !== null ? money0(m.scheduledMonthlyLatest) : "—", "Scheduled rent /mo — latest");
  const valueTile = m.capValueLatest !== null
    ? kpiTile(money0(m.capValueLatest), `Indicative value @ ${esc(String(m.capRatePctLatest))}% cap`)
    : kpiTile("—", "Indicative value", `<div class="d">no cap-rate worksheet on file</div>`);

  /* explicit gap disclosure — never silently pretend a month existed */
  const missingLine = m.missing.length
    ? `<p class="warn">Months without a stored brief: ${m.missing.map(esc).join(", ")} — this report covers only the months on file.</p>`
    : "";
  const provenance = `<p class="note">Composed from ${m.present} of ${m.months.length} monthly Owner Intelligence Briefs on file for ${esc(m.label)}.</p>`;

  const monthBlocks = m.months.map(({ ym, model: bm }) => {
    if (!bm) return `<h3>${esc(monthName(ym))}</h3><p class="note">No stored brief for ${esc(ym)}.</p>`;
    return `<h3>${esc(bm.monthLabel || monthName(ym))}</h3>
<p>Occupancy ${esc(pct1(bm.occupancyPct))} · scheduled rent ${esc(money0(bm.scheduledMonthly))}/mo · indicative NOI ${bm.noi !== null && bm.noi !== undefined ? esc(money0(bm.noi)) + "/yr" : "not computed (no expense worksheet)"}</p>` +
      actionList((bm.actions || []).slice(0, 5));
  }).join("");

  const vacantLine = m.vacantsLatest.length
    ? m.vacantsLatest.map(v => `Suite ${esc(v.unit)} (${(Number(v.sf) || 0).toLocaleString()} SF)`).join(" · ")
    : "None — the center is fully occupied.";
  const holdoverLine = m.holdoversLatest.length
    ? "Suite " + m.holdoversLatest.map(esc).join(", Suite ")
    : "none";
  const leasingBlock = `<h2>Leasing Position (Latest Month on File)</h2>
<p><b>Vacant:</b> ${vacantLine}</p>
<p><b>Holdovers:</b> ${holdoverLine}</p>`;

  const expRows = m.expirationsAhead.map(e =>
    `<tr><td>${esc(e.unit)}</td><td>${esc(e.dba)}</td><td>${esc(e.end)}</td>` +
    `<td class="num">${(Number(e.sf) || 0).toLocaleString()}</td>` +
    `<td class="num"><b>${money2(e.monthly)}</b></td></tr>`).join("");
  const expTable = `<table><tr><th>Suite</th><th>Tenant</th><th>Expires</th><th class="num">SF</th><th class="num">Total /mo</th></tr>${expRows}</table>`;

  const foot = `<div class="foot">${OO_FOOT_LINES}
Generated from stored monthly Owner Intelligence Briefs — figures carry their source months' as-of dates.${audience === "lender" ? " Collections figures, where present, are live reads at generation time." : ""}</div>`;

  let body;
  if (audience === "lender") {
    /* Occupancy trend — one row per quarter month, gaps explicit */
    const trendRows = m.months.map(({ ym, model: bm }) => bm
      ? `<tr><td>${esc(bm.monthLabel || monthName(ym))}</td><td class="num">${pct1(bm.occupancyPct)}</td><td class="num">${money0(bm.scheduledMonthly)}</td><td class="num">${bm.noi !== null && bm.noi !== undefined ? money0(bm.noi) : "—"}</td></tr>`
      : `<tr><td>${esc(monthName(ym))}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="note">not on file</td></tr>`).join("");
    const trendBlock = `<h2>Occupancy Trend</h2>
<table><tr><th>Month</th><th class="num">Occupancy</th><th class="num">Scheduled rent /mo</th><th class="num">Indicative NOI /yr</th></tr>${trendRows}</table>
<p class="note">Occupancy is SF-weighted on demised area; NOI is scheduled billings less the operator-entered expense worksheet — indicative, not audited.</p>`;

    const rr = m.rentRollLatest;
    const rentRollBlock = `<h2>Rent Roll Totals (Latest Month on File)</h2>` + (rr
      ? `<table><tr><th>Units occupied</th><th>SF occupied</th><th class="num">Scheduled rent /mo</th><th class="num">Scheduled rent /yr</th></tr>
<tr><td>${int0(rr.occupiedUnits)} of ${int0(rr.unitCount)}</td><td>${int0(rr.occupiedSf)} of ${int0(rr.totalSf)} SF</td><td class="num"><b>${money0(rr.scheduledMonthly)}</b></td><td class="num">${rr.scheduledAnnual !== null ? money0(rr.scheduledAnnual) : "—"}</td></tr></table>
<p class="note">Scheduled rent is total rent (base + additional) on leased suites; a "—" means the stored brief did not carry that figure.</p>`
      : `<p>No month on file for ${esc(m.label)}.</p>`);

    const expBlock = `<h2>Lease Expirations — Next 24 Months</h2>` + (m.expirationsAhead.length
      ? `${expTable}
<p class="note">Total /mo is total rent (base + additional). The stored briefs carry a 12-month horizon — expirations in months 13–24 are not on file in this report.</p>`
      : `<p>No expirations inside the latest brief's 12-month horizon; expirations in months 13–24 are not on file in this report.</p>`);

    const c = m.collections || { pay: null, aging: null };
    let collectionsBody;
    if (!c.pay && !c.aging) {
      collectionsBody = `<p>Collections history: not on file for this quarter.</p>`;
    } else {
      const payPart = c.pay
        ? `<h3>Payment Record</h3>
<div class="kpis">
${kpiTile(money0(c.pay.totalPaid), "Collected — predecessor record")}
${kpiTile(c.pay.cleanRate !== null ? pct1(c.pay.cleanRate) : "—", `Clean-pay rate (${int0(c.pay.paid)} of ${int0(c.pay.months)} unit-months)`)}
${kpiTile(money0(c.pay.lateFees), "Late fees assessed")}
</div>
<p class="note">${int0(c.pay.units)} units · late ${int0(c.pay.late)} · partial ${int0(c.pay.partial)} · unpaid ${int0(c.pay.unpaid)} unit-months. Predecessor payment record imported from Asset Command (read-only); lateness from the recorded status.</p>`
        : `<p>Payment record: not on file.</p>`;
      const agingPart = c.aging
        ? `<h3>Receivables Aging</h3>` + (c.aging.units
          ? `<table><tr><th class="num">Current (≤30)</th><th class="num">31–60</th><th class="num">61–90</th><th class="num">90+</th><th class="num">Unapplied credit</th><th class="num">Net open</th></tr>
<tr><td class="num">${money0(c.aging.current)}</td><td class="num">${money0(c.aging.d31_60)}</td><td class="num">${money0(c.aging.d61_90)}</td><td class="num">${money0(c.aging.d90)}</td><td class="num">${money0(Math.abs(c.aging.credit))}</td><td class="num"><b>${money0(c.aging.total)}</b></td></tr></table>
<p class="note">${int0(c.aging.units)} units with open balances or credits · open ledger debits FIFO-applied, aged as of ${esc(gen)}.</p>`
          : `<p>No open receivables on the ledger as of ${esc(gen)}.</p>`)
        : `<p>Receivables aging: not on file.</p>`;
      collectionsBody = payPart + agingPart;
    }
    const collectionsBlock = `<h2>Collections</h2>
${collectionsBody}`;

    const debtBlock = `<h2>Debt Service</h2>
<p>Debt service and covenant data are not on file in Cypress Command.</p>`;

    body = `${missingLine}
<div class="kpis">
${occTile}
${noiTile}
${rentTile}
</div>
${provenance}

${trendBlock}

${rentRollBlock}

${expBlock}

${collectionsBlock}

${debtBlock}`;
  } else if (audience === "stakeholder") {
    const actionsBlock = `<h2>Top Actions</h2>
${actionList((m.actionsLatest || []).slice(0, 5))}`;
    const distBlock = `<h2>Distributions</h2>
<p>Member distributions and capital accounts are not on file.</p>`;
    body = `${missingLine}
<div class="kpis">
${noiTile}
${valueTile}
${occTile}
</div>
${provenance}

${leasingBlock}

${actionsBlock}

${distBlock}`;
  } else {
    const expBlock = m.expirationsAhead.length
      ? `${expTable}
<p class="note">Total /mo is total rent (base + additional). Window is the latest stored brief's 12-month horizon.</p>`
      : `<p>No expirations inside the latest brief's 12-month window.</p>`;
    body = `${missingLine}
<div class="kpis">
${occTile}
${noiTile}
${rentTile}
</div>
${provenance}

<h2>Month by Month</h2>
${monthBlocks}

${leasingBlock}

<h2>Lease Expirations Ahead</h2>
${expBlock}`;
  }

  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(title)}</title><style>${OO_CSS}</style></head><body>
${ooBar(AUDIENCE_TAGS[audience])}
<div class="page">
<h1>${esc(title)}</h1>
<div class="sub">Orange Ocean, LLC · Property Manager for Belle Realty of Lafayette, LLC<br>
On The Boulevard · 101–149 Arnould Blvd., Lafayette, LA 70506 · prepared ${esc(gen)} · ${SUB_FOR[audience]}</div>
${body}

${foot}
</div></body></html>`;
}

/* ── impure: fetch + open ──────────────────────────────────────── */

/* Lender-only live reads, best-effort: a failed or empty read simply leaves
   the key out, and the document prints its "not on file" line. Never throws.
   Aging uses the property-scoped ledger read (listLedgerEntries carries
   date/due; the portfolio read strips them and cannot be aged). */
async function lenderExtras(asOfISO) {
  const extras = {};
  try {
    const rows = await refreshPayHistory();
    if (rows && rows.length) extras.payStats = payHistoryStats(rows);
  } catch (e) { console.warn("lender report: payment_history read skipped:", e?.message || e); }
  try {
    const entries = await listLedgerEntries();
    if (entries && entries.length) extras.aging = ledgerAging(entries, asOfISO);
  } catch (e) { console.warn("lender report: ledger read skipped:", e?.message || e); }
  return extras;
}

/* Both operator AND owner may call this — RLS on owner_briefs (and on
   payment_history / ledger_entries for the lender extras) already scopes
   reads; no client-side role gate (it would only lie about the boundary). */
export async function openBoardReport(todayYm, audience = "board") {
  assertAudience(audience);
  if (!REMOTE) throw new Error("hosted backend required");
  const quarter = lastCompleteQuarter(todayYm);
  const { data, error } = await sb.from("owner_briefs")
    .select("month,model").in("month", quarter.months);
  if (error) throw error;
  const byMonth = Object.fromEntries((data || []).map(r => [r.month, r.model]));
  const generatedISO = new Date().toISOString().slice(0, 10);
  const extras = audience === "lender" ? await lenderExtras(generatedISO) : {};
  const model = boardReportModel(quarter, byMonth, { audience, extras });
  if (!model.present) throw new Error("no stored briefs yet for " + quarter.label);
  const html = boardReportHTML(model, { generatedISO });
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return quarter.label;
}
