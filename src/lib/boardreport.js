/* Quarterly Board Report (register row #12 v1) — composes the stored monthly
   Owner Intelligence Brief models (owner_briefs.model jsonb, RLS read
   owner+operator) into one OO-branded quarterly document. No recomputation:
   every figure is lifted from the source months' stored models, so it carries
   their as-of dates. Pure half (quarterOf / lastCompleteQuarter /
   boardReportModel / boardReportHTML) is unit-tested in
   test/boardreport.test.mjs; openBoardReport is the only impure entry.
   Owner/entity document → Orange Ocean B2B brand (brand-orange-ocean.md),
   NOT the OTB tenant palette — CSS modeled on lib/brief.js's (not exported
   there, so defined locally). */

import { esc } from "./format.js";
import { REMOTE, sb } from "./remote.js";

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

/* briefModels: { 'YYYY-MM': storedBriefModel } — absent months stay null and
   are reported in `missing`, never silently papered over. */
export function boardReportModel(quarter, briefModels) {
  const months = quarter.months.map(ym => ({ ym, model: briefModels?.[ym] || null }));
  const present = months.filter(m => m.model);
  const latest = present.length ? present[present.length - 1].model : null;
  // Number.isFinite on the RAW value: +null coerces to 0 and would silently
  // count a "no worksheet" month as $0 NOI — exactly the pretend we refuse.
  const nois = present.map(m => m.model.noi).filter(v => Number.isFinite(v));
  return {
    label: quarter.label,
    months,
    present: present.length,
    occupancyTrend: present.map(m => Number(m.model.occupancyPct) || 0),
    noiTotal: nois.length ? Math.round(nois.reduce((s, v) => s + v, 0) * 100) / 100 : null,
    scheduledMonthlyLatest: latest ? Number(latest.scheduledMonthly) || 0 : null,
    vacantsLatest: latest ? latest.vacants || [] : [],
    holdoversLatest: latest ? latest.holdovers || [] : [],
    expirationsAhead: latest ? latest.expirations || [] : [],
    missing: months.filter(m => !m.model).map(m => m.ym),
  };
}

/* ── pure: document ────────────────────────────────────────────── */

/* Orange Ocean B2B brand: Ocean Navy #1C2D4F, Sunset Orange #E8820C accent,
   Light #F0F4F8, Helvetica. Wordmark on the navy bar = dark-background rule:
   ORANGE in orange, OCEAN in white. (Modeled on lib/brief.js's OO block.) */
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
  h3{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:#1C2D4F;margin:18px 0 6px}
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
  .warn{font-size:12.5px;color:#A33B1F;font-weight:bold}
  .foot{font-size:10.5px;color:#4A6FA5;margin-top:32px;border-top:1px solid #C7D0DE;padding-top:10px;line-height:1.6}
  @media print{body{background:#fff}.page{padding:.35in .5in}.bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const money0 = n => "$" + Math.round(+n || 0).toLocaleString("en-US");
const money2 = n => "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = f => ((+f || 0) * 100).toFixed(1) + "%";
const arrow = { up: "▲", down: "▼", flat: "—" };
const OCC_EPSILON = 0.0005; // 0.05% of GLA — mirrors lib/brief.js

/* Direction word is precomputed here so no reader (or model) ever infers
   sign from the numbers — kpi.js philosophy, same as the monthly brief. */
function occDirection(trend) {
  if (trend.length < 2) return null;
  const d = trend[trend.length - 1] - trend[0];
  return Math.abs(d) < OCC_EPSILON ? "flat" : d > 0 ? "up" : "down";
}

function kpiTile(value, label, deltaHtml) {
  return `<div class="kpi"><div class="v">${value}</div><div class="l">${label}</div>${deltaHtml || ""}</div>`;
}

const monthName = ym => {
  const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${M[+ym.slice(5, 7) - 1] || ym} ${ym.slice(0, 4)}`;
};

export function boardReportHTML(model, { generatedISO } = {}) {
  const m = model;
  const gen = generatedISO || "";

  /* KPI 1 — occupancy, last vs first month of the quarter */
  const trend = m.occupancyTrend;
  const dirWord = occDirection(trend);
  const occChip = dirWord
    ? `<div class="d ${dirWord}">${arrow[dirWord]} ${esc(dirWord === "flat"
      ? "flat across the quarter"
      : dirWord + " from " + pct1(trend[0]) + " at the start of the quarter")}</div>`
    : `<div class="d">${trend.length === 1 ? "single month on file" : "no months on file"}</div>`;

  const kpis = `<div class="kpis">
${kpiTile(trend.length ? pct1(trend[trend.length - 1]) : "—", "Occupancy — quarter end", occChip)}
${kpiTile(m.noiTotal !== null ? money0(m.noiTotal) : "—", "Indicative NOI — quarter total")}
${kpiTile(m.scheduledMonthlyLatest !== null ? money0(m.scheduledMonthlyLatest) : "—", "Scheduled rent /mo — latest")}
</div>`;

  /* explicit gap disclosure — never silently pretend a month existed */
  const missingLine = m.missing.length
    ? `<p class="warn">Months without a stored brief: ${m.missing.map(esc).join(", ")} — this report covers only the months on file.</p>`
    : "";

  const monthBlocks = m.months.map(({ ym, model: bm }) => {
    if (!bm) return `<h3>${esc(monthName(ym))}</h3><p class="note">No stored brief for ${esc(ym)}.</p>`;
    const acts = (bm.actions || []).slice(0, 5);
    return `<h3>${esc(bm.monthLabel || monthName(ym))}</h3>
<p>Occupancy ${esc(pct1(bm.occupancyPct))} · scheduled rent ${esc(money0(bm.scheduledMonthly))}/mo · indicative NOI ${bm.noi !== null && bm.noi !== undefined ? esc(money0(bm.noi)) + "/yr" : "not computed (no expense worksheet)"}</p>` +
      (acts.length
        ? `<ul>${acts.map(a => `<li><b>[${esc(a.lane)}]</b> ${esc(a.title)}${a.due ? ` <span class="note">(due ${esc(a.due)})</span>` : ""}</li>`).join("")}</ul>`
        : `<p class="note">No open management items recorded.</p>`);
  }).join("");

  const vacantLine = m.vacantsLatest.length
    ? m.vacantsLatest.map(v => `Suite ${esc(v.unit)} (${(Number(v.sf) || 0).toLocaleString()} SF)`).join(" · ")
    : "None — the center is fully occupied.";
  const holdoverLine = m.holdoversLatest.length
    ? "Suite " + m.holdoversLatest.map(esc).join(", Suite ")
    : "none";

  const expRows = m.expirationsAhead.map(e =>
    `<tr><td>${esc(e.unit)}</td><td>${esc(e.dba)}</td><td>${esc(e.end)}</td>` +
    `<td class="num">${(Number(e.sf) || 0).toLocaleString()}</td>` +
    `<td class="num"><b>${money2(e.monthly)}</b></td></tr>`).join("");
  const expBlock = m.expirationsAhead.length
    ? `<table><tr><th>Suite</th><th>Tenant</th><th>Expires</th><th class="num">SF</th><th class="num">Total /mo</th></tr>${expRows}</table>
<p class="note">Total /mo is total rent (base + additional). Window is the latest stored brief's 12-month horizon.</p>`
    : `<p>No expirations inside the latest brief's 12-month window.</p>`;

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Board Report — ${esc(m.label)}</title><style>${OO}</style></head><body>
<div class="bar"><span class="wm"><span class="o">ORANGE</span> <span class="c">OCEAN</span></span><span class="tag">QUARTERLY BOARD REPORT</span></div>
<div class="page">
<h1>Board Report — ${esc(m.label)}</h1>
<div class="sub">Orange Ocean, LLC · Property Manager for Belle Realty of Lafayette, LLC<br>
On The Boulevard · 101–149 Arnould Blvd., Lafayette, LA 70506 · prepared ${esc(gen)} · confidential — for the owners of Belle Realty of Lafayette, LLC</div>
${missingLine}
${kpis}
<p class="note">Composed from ${m.present} of ${m.months.length} monthly Owner Intelligence Briefs on file for ${esc(m.label)}.</p>

<h2>Month by Month</h2>
${monthBlocks}

<h2>Leasing Position (Latest Month on File)</h2>
<p><b>Vacant:</b> ${vacantLine}</p>
<p><b>Holdovers:</b> ${holdoverLine}</p>

<h2>Lease Expirations Ahead</h2>
${expBlock}

<div class="foot">Orange Ocean, LLC · Property Manager for Belle Realty of Lafayette, LLC<br>
Adam Anthony Abdalla · 101-149 Arnould Blvd., Lafayette, LA 70506 · P 337-288-5411 · E adam@orangeocean.com · W orangeocean.com<br>
Generated from stored monthly Owner Intelligence Briefs — figures carry their source months' as-of dates.</div>
</div></body></html>`;
}

/* ── impure: fetch + open ──────────────────────────────────────── */

/* Both operator AND owner may call this — RLS on owner_briefs already scopes
   reads; no client-side role gate (it would only lie about the boundary). */
export async function openBoardReport(todayYm) {
  if (!REMOTE) throw new Error("hosted backend required");
  const quarter = lastCompleteQuarter(todayYm);
  const { data, error } = await sb.from("owner_briefs")
    .select("month,model").in("month", quarter.months);
  if (error) throw error;
  const byMonth = Object.fromEntries((data || []).map(r => [r.month, r.model]));
  const model = boardReportModel(quarter, byMonth);
  if (!model.present) throw new Error("no stored briefs yet for " + quarter.label);
  const html = boardReportHTML(model, { generatedISO: new Date().toISOString().slice(0, 10) });
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return quarter.label;
}
