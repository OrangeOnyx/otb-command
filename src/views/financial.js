/* P-1 Financial Summary — income rollup derived from the rent roll, plus an
   operator-entered operating-expense worksheet that yields NOI and an indicated
   value. Income is read-only from units.json (SOT); OpEx + cap rate persist
   through the store. No new data sources. */
import { UNITS, OPEX_LINES, getFinancials, setOpex, setCapRate, subscribe } from "../store.js";
import { CAT_META } from "../lib/colors.js";
import { fmt$0, pDate, monthsTo, esc, TODAY } from "../lib/format.js";
import { REMOTE, listLedgerEntries } from "../lib/remote.js";
import { aging, effectiveEntries, CREDIT_TYPES } from "../lib/ledger.js";
import { getPayHistory, payHistoryLoaded, refreshPayHistory, payHistoryStats, portfolioPayTotals } from "../lib/payhistory.js";
import { tenantHealth, healthColor, periodTotals } from "../lib/tenanthealth.js";
import { reconModel, reconCaveats } from "../lib/camrecon.js";
import recoveries from "../data/recoveries.json";

const annual = u => (u.monthly || 0) * 12;

/* annual income by component (PSF × SF). Base is single-sourced from units.json
   (SOT rent roll); CAM/Tax/Ins come from the recoveries composition. */
function composition() {
  const c = { base: 0, cam: 0, tax: 0, ins: 0 };
  UNITS.forEach(u => {
    c.base += (u.base || 0) * u.sf;
    const r = recoveries.units[u.unit];
    if (!r) return;
    c.cam += r.cam * u.sf; c.tax += r.tax * u.sf; c.ins += r.ins * u.sf;
  });
  c.total = c.base + c.cam + c.tax + c.ins;
  c.recoveries = c.cam + c.tax + c.ins;
  return c;
}

function income() {
  const gla = UNITS.reduce((s, u) => s + u.sf, 0);
  const leased = UNITS.filter(u => u.monthly > 0);
  const occSF = UNITS.filter(u => u.status !== "vacant").reduce((s, u) => s + u.sf, 0);
  const leasedSF = leased.reduce((s, u) => s + u.sf, 0);
  const annualRent = UNITS.reduce((s, u) => s + annual(u), 0);
  const effPSF = leasedSF ? annualRent / leasedSF : 0;
  // rent-weighted average lease term remaining (years); expired → 0
  const wNum = leased.reduce((s, u) => s + annual(u) * (u.end ? Math.max(0, monthsTo(pDate(u.end)) / 12) : 0), 0);
  const walt = annualRent ? wNum / annualRent : 0;
  return { gla, occSF, leasedSF, annualRent, effPSF, walt, leasedCount: leased.length };
}

function atRisk() {
  const holdover = UNITS.filter(u => u.status === "expired");
  const exp12 = UNITS.filter(u => u.status !== "expired" && u.end && monthsTo(pDate(u.end)) > 0 && monthsTo(pDate(u.end)) <= 12);
  const sum = arr => arr.reduce((s, u) => s + annual(u), 0);
  return { holdover, exp12, holdoverRent: sum(holdover), exp12Rent: sum(exp12) };
}

function byCategory() {
  const m = {};
  UNITS.forEach(u => { (m[u.cat] ||= { rent: 0, sf: 0, n: 0 }); m[u.cat].rent += annual(u); m[u.cat].sf += u.sf; m[u.cat].n++; });
  return Object.entries(m).map(([cat, v]) => ({ cat, label: (CAT_META[cat] || [cat])[0], color: (CAT_META[cat] || [, "#5F6E64"])[1], ...v }))
    .sort((a, b) => b.rent - a.rent);
}

function rollover() {
  const buckets = {};
  UNITS.filter(u => u.monthly > 0 && u.end).forEach(u => {
    const d = pDate(u.end);
    const key = d < TODAY ? "Holdover" : String(d.getFullYear());
    (buckets[key] ||= { rent: 0, n: 0 }); buckets[key].rent += annual(u); buckets[key].n++;
  });
  const years = Object.keys(buckets).filter(k => k !== "Holdover").sort();
  const order = (buckets.Holdover ? ["Holdover"] : []).concat(years);
  return order.map(k => ({ k, ...buckets[k] }));
}

/* CAM-recon what-if gross-up (%) — session-local draft input, deliberately
   not persisted (register row #6 is a DRAFT surface, not a billing engine). */
let camGrossUpPct = 0;

const bar = (label, val, max, color, right) =>
  '<div class="fbar-row"><span class="fbar-l">' + esc(label) + '</span>' +
  '<span class="fbar-track"><span class="fbar-fill" style="width:' + (max ? Math.max(1.5, val / max * 100) : 0) + '%;background:' + color + '"></span></span>' +
  '<span class="fbar-v">' + right + '</span></div>';

export function renderFinancial() {
  const root = document.getElementById("pg-fin");
  if (!root) return;
  const inc = income();
  const risk = atRisk();
  const fin = getFinancials();
  const opexTotal = OPEX_LINES.reduce((s, [k]) => s + (fin.opex[k] || 0), 0);
  const noi = inc.annualRent - opexTotal;
  const value = fin.capRatePct ? noi / (fin.capRatePct / 100) : null;
  const anchor = UNITS.find(u => u.unit === "149"); // L7: guard — don't kill P-1 if 149 ever leaves the roll
  const anchorPct = (anchor && inc.annualRent) ? annual(anchor) / inc.annualRent * 100 : 0;

  const kpis = [
    ["green", "In-place rent", fmt$0(inc.annualRent), fmt$0(inc.annualRent / 12) + "/mo · " + inc.leasedCount + " tenancies"],
    ["ink", "Effective rent", "$" + inc.effPSF.toFixed(2) + "<small> PSF</small>", "on " + inc.leasedSF.toLocaleString() + " leased SF"],
    ["green", "Occupancy", (inc.occSF / inc.gla * 100).toFixed(1) + "<small>%</small>", inc.occSF.toLocaleString() + " of " + inc.gla.toLocaleString() + " SF"],
    ["brass", "WALT", inc.walt.toFixed(1) + "<small> yr</small>", "rent-weighted remaining term"],
    ["brick", "Revenue at risk", fmt$0(risk.holdoverRent + risk.exp12Rent), risk.holdover.length + " holdover · " + risk.exp12.length + " expiring ≤12mo"],
    ["brass", "Anchor concentration", anchorPct.toFixed(1) + "<small>%</small>", "Jason's Deli of in-place rent"]
  ].map(([c, l, v, n]) => '<div class="card kpi ' + c + '"><div class="lbl">' + l + '</div><div class="val">' + v + '</div><div class="note">' + n + '</div></div>').join("");

  const cats = byCategory();
  const catMax = Math.max(...cats.map(c => c.rent));
  const catBars = cats.map(c => bar(c.label, c.rent, catMax, c.color,
    fmt$0(c.rent) + " · " + (c.rent / inc.annualRent * 100).toFixed(0) + "%")).join("");

  const roll = rollover();
  const rollMax = Math.max(...roll.map(r => r.rent));
  const rollBars = roll.map(r => bar(r.k + " (" + r.n + ")", r.rent, rollMax,
    r.k === "Holdover" ? "var(--brick)" : "var(--green)", fmt$0(r.rent))).join("");

  // top-5 tenant concentration (group combined leases by legal entity)
  const byTenant = {};
  UNITS.filter(u => u.monthly > 0).forEach(u => { const key = u.legal || u.dba; (byTenant[key] ||= { rent: 0, dba: u.dba }); byTenant[key].rent += annual(u); });
  const top = Object.values(byTenant).sort((a, b) => b.rent - a.rent).slice(0, 5);
  const topMax = top[0]?.rent || 1;
  const topBars = top.map(t => bar(t.dba, t.rent, topMax, "var(--slate)",
    (t.rent / inc.annualRent * 100).toFixed(0) + "%")).join("");

  // income composition (from SOT rent breakdown) — base vs NNN recoveries
  const comp = composition();
  const compRows = [
    ["Base rent", comp.base, "var(--green)"],
    ["CAM recovery", comp.cam, "var(--slate)"],
    ["Tax recovery", comp.tax, "var(--navy)"],
    ["Insurance recovery", comp.ins, "var(--plum)"]
  ];
  const compMax = Math.max(...compRows.map(r => r[1]));
  const compBars = compRows.map(([l, v, c]) => bar(l, v, compMax, c,
    fmt$0(v) + " · " + (v / comp.total * 100).toFixed(0) + "%")).join("") +
    '<div class="comp-foot">NNN recoveries (CAM+Tax+Ins): <b>' + fmt$0(comp.recoveries) + '/yr</b> — tenant reimbursements, offset against actual expenses below.</div>';

  // recovery income per recoverable OpEx category, for the worksheet hints
  const RECOVER = { cam: comp.cam, taxes: comp.tax, insurance: comp.ins };
  const opexRows = OPEX_LINES.map(([k, label]) => {
    const rec = RECOVER[k];
    const exp = fin.opex[k] || 0;
    let hint = "";
    if (rec != null) {
      const net = rec - exp;
      hint = '<div class="opex-hint">recovers ' + fmt$0(rec) + "/yr" +
        (exp ? ' · net <b class="' + (net >= 0 ? "pos" : "neg") + '">' + (net >= 0 ? "+" : "−") + fmt$0(Math.abs(net)) + "</b>" : "") + "</div>";
    }
    return '<div class="opex-row"><div class="opex-top"><label>' + esc(label) +
      (rec != null ? ' <span class="nnn">NNN</span>' : "") + '</label>' +
      '<input type="number" min="0" step="1000" data-opex="' + k + '" value="' + (fin.opex[k] || "") + '" placeholder="0"></div>' +
      hint + "</div>";
  }).join("");

  // CAM/NNN reconciliation draft (register row #6) — pure model in lib/camrecon.js;
  // all inputs local (UNITS + recoveries + worksheet actuals), painted synchronously.
  const recon = reconModel(UNITS, recoveries,
    { cam: fin.opex.cam || 0, taxes: fin.opex.taxes || 0, insurance: fin.opex.insurance || 0 },
    { grossUpPct: camGrossUpPct });
  let reconHtml;
  if (!recon) {
    reconHtml = '<div class="led-note">Enter CAM / Taxes / Insurance actuals in the NOI worksheet to draft a reconciliation.</div>';
  } else {
    const rDelta = d => '<b style="color:' + (d >= 0 ? "var(--green)" : "var(--brick)") + '">' +
      (d >= 0 ? "+" : "−") + fmt$0(Math.abs(d)) + '</b>';
    const RC = [["cam", "CAM", "var(--slate)"], ["tax", "Taxes", "var(--navy)"], ["ins", "Insurance", "var(--plum)"]];
    const rMax = Math.max(...RC.map(([k]) => Math.max(recon.components[k].billed, recon.components[k].grossed)));
    const reconBars = RC.map(([k, label, color]) => {
      const c = recon.components[k];
      return bar(label, c.billed, rMax, color, fmt$0(c.billed) + " vs " + fmt$0(c.grossed) + " · " + rDelta(c.delta));
    }).join("");
    const worst = recon.units.slice(0, 8).map(r =>
      '<div style="display:flex;align-items:baseline;gap:8px;font-family:var(--mono)">' +
        '<span class="uchip">' + esc(r.unit) + '</span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          fmt$0(r.billed) + ' billed · ' + (r.share * 100).toFixed(1) + '% share</span>' +
        '<span class="fbar-v">' + rDelta(r.delta) + '</span>' +
      '</div>').join("");
    reconHtml =
      '<div class="led-month"><input id="camGrossUp" type="number" min="0" step="5" value="' + camGrossUpPct + '" style="width:56px"> % gross-up · billed vs grossed actuals · Δ + = over-collected</div>' +
      reconBars +
      '<div class="led-note">Vacancy shortfall ' + fmt$0(recon.vacancyShortfall) + ' — grossed actuals on ' +
        recon.vacantSf.toLocaleString() + ' vacant SF no tenant reimburses (landlord absorbs).</div>' +
      worst +
      reconCaveats().map(c => '<div class="led-note">' + esc(c) + '</div>').join("");
  }

  root.querySelector(".fin-body").innerHTML =
    '<div class="kpis fin-kpis">' + kpis + '</div>' +
    '<div class="fin-grid">' +
      '<div class="card"><div class="panel-h"><h2>Income composition</h2><div class="sub">BASE RENT vs NNN RECOVERIES · PER SOT</div></div><div class="fbars">' + compBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Income by use</h2><div class="sub">ANNUAL IN-PLACE RENT · SHARE</div></div><div class="fbars">' + catBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Lease rollover schedule</h2><div class="sub">ANNUAL RENT EXPIRING BY YEAR</div></div><div class="fbars">' + rollBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Tenant concentration</h2><div class="sub">TOP 5 BY IN-PLACE RENT</div></div><div class="fbars">' + topBars + '</div></div>' +
      (REMOTE ? '<div class="card"><div class="panel-h"><h2>Collections &amp; aging</h2><div class="sub">LEDGER-LITE · OPEN BALANCES BY AGE</div></div><div class="fbars" id="finLedger">Loading…</div></div>' : '') +
      (REMOTE ? '<div class="card"><div class="panel-h"><h2>Payment history</h2><div class="sub">PREDECESSOR RECORD · JUL 2025 – JUL 2026</div></div><div class="fbars" id="finPayHist">Loading…</div></div>' : '') +
      (REMOTE ? '<div class="card"><div class="panel-h"><h2>Tenant health</h2><div class="sub">SCORED 0–100 · PAYMENT RECORD + TERM</div></div><div class="fbars" id="finHealth">Loading…</div></div>' : '') +
      '<div class="card"><div class="panel-h"><h2>CAM / NNN reconciliation — draft</h2><div class="sub">WORKSHEET ACTUALS vs BILLED RECOVERIES · ANNUAL</div></div><div class="fbars" id="finCamRecon">' + reconHtml + '</div></div>' +
      '<div class="card noi-card"><div class="panel-h"><h2>NOI worksheet</h2><div class="sub">ENTER ANNUAL OPERATING EXPENSES</div></div>' +
        '<div class="noi-line"><span>In-place rent (income)</span><b>' + fmt$0(inc.annualRent) + '</b></div>' +
        '<div class="opex">' + opexRows + '</div>' +
        '<div class="noi-line sub2"><span>Total operating expenses</span><b>(' + fmt$0(opexTotal) + ')</b></div>' +
        '<div class="noi-line total"><span>Net operating income</span><b>' + fmt$0(noi) + '</b></div>' +
        '<div class="noi-line cap"><span>Market cap rate</span><span class="cap-in"><input type="number" min="0" step="0.05" id="capRate" value="' + (fin.capRatePct ?? "") + '" placeholder="—">%</span></div>' +
        '<div class="noi-line value"><span>Indicated value</span><b>' + (value ? fmt$0(value) : '<span class="muted">enter cap rate</span>') + '</b></div>' +
        (opexTotal === 0 ? '<div class="noi-note">NOI equals gross income until operating expenses are entered — figures above are not in the SOT.</div>' : '') +
      '</div>' +
    '</div>';

  root.querySelectorAll("input[data-opex]").forEach(i =>
    i.onchange = () => setOpex(i.dataset.opex, i.value));
  const cap = root.querySelector("#capRate");
  if (cap) cap.onchange = () => setCapRate(cap.value);
  const gu = root.querySelector("#camGrossUp");
  if (gu) gu.onchange = () => { camGrossUpPct = Math.max(0, +gu.value || 0); renderFinancial(); };
  if (REMOTE) { paintCollections(); paintPayHistory(); paintTenantHealth(); }
}

/* Ledger-lite rollup: async fill after the sync render (C-1 history pattern).
   All math is the pure seam; this only fetches and formats. */
async function paintCollections() {
  const el = document.getElementById("finLedger");
  if (!el) return;
  try {
    const rows = await listLedgerEntries();
    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    const eff = effectiveEntries(rows);
    const charged = eff.filter(e => e.code === "rent" && String(e.date).startsWith(ym))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const collected = eff.filter(e => CREDIT_TYPES.includes(e.type) && String(e.date).startsWith(ym))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const a = aging(rows, today);
    const units = Object.keys(a).sort();
    const tot = { current: 0, d31_60: 0, d61_90: 0, d90: 0 };
    units.forEach(u => { for (const k of Object.keys(tot)) tot[k] += a[u][k]; });
    const cell = v => '<span class="led-c' + (v > 0 ? " owe" : "") + '">' + (v ? fmt$0(v) : "—") + '</span>';
    el.innerHTML =
      '<div class="led-month">' + ym + ": " + fmt$0(collected) + " collected of " + fmt$0(charged) + " charged" +
        (charged ? " · " + Math.round(collected / charged * 100) + "%" : "") + '</div>' +
      (units.length
        ? '<div class="led-age-h"><span>Unit</span><span>≤30</span><span>31–60</span><span>61–90</span><span>90+</span><span>Total</span></div>' +
          units.map(u => '<div class="led-age"><span>' + esc(u) + '</span>' + cell(a[u].current) +
            cell(a[u].d31_60) + cell(a[u].d61_90) + cell(a[u].d90) + cell(a[u].total) + '</div>').join("") +
          '<div class="led-age tot"><span>All</span>' + cell(tot.current) + cell(tot.d31_60) +
            cell(tot.d61_90) + cell(tot.d90) + cell(tot.current + tot.d31_60 + tot.d61_90 + tot.d90) + '</div>'
        : '<div class="led-note">No open balances — rent charges auto-post monthly starting Aug 2026; payments log in each unit\'s drawer.</div>');
  } catch (e) {
    el.innerHTML = '<div class="led-note">Ledger unavailable: ' + esc(e.message) + '</div>';
  }
}

/* Predecessor payment record (payment_history, read-only): portfolio headline
   + one bar per period. All math is the pure seams (portfolioPayTotals,
   periodTotals); this only fetches and formats. */
async function paintPayHistory() {
  const el = document.getElementById("finPayHist");
  if (!el) return;
  try {
    if (!payHistoryLoaded()) await refreshPayHistory();
    if (!el.isConnected) return;
    const rows = getPayHistory();
    if (!rows.length) {
      el.innerHTML = '<div class="led-note">No predecessor payment record on file.</div>';
      return;
    }
    const tot = portfolioPayTotals(rows);
    const periods = periodTotals(rows);
    const max = Math.max(...periods.map(p => p.paid));
    el.innerHTML =
      '<div class="led-month">' + tot.months + " months · " + fmt$0(tot.totalPaid) + " collected · " +
        Math.round((tot.onTimeRate || 0) * 100) + "% clean · " + fmt$0(tot.lateFees) + " late fees</div>" +
      periods.map(p => bar(p.period, p.paid, max, "var(--green)",
        fmt$0(p.paid) + (p.cleanShare < 1 ? " · " + Math.round(p.cleanShare * 100) + "% clean" : ""))).join("") +
      '<div class="led-note">Predecessor record imported from Asset Command · read-only · ledger is the live record from 2026-08.</div>';
  } catch (e) {
    el.innerHTML = '<div class="led-note">Payment history unavailable: ' + esc(e.message) + '</div>';
  }
}

/* Tenant-health register (worst 10): pure scoring in lib/tenanthealth.js over
   the rent roll + payment_history stats; this only fetches and formats. */
async function paintTenantHealth() {
  const el = document.getElementById("finHealth");
  if (!el) return;
  try {
    if (!payHistoryLoaded()) await refreshPayHistory();
    if (!el.isConnected) return;
    const today = new Date().toISOString().slice(0, 10);
    const health = tenantHealth(UNITS, payHistoryStats(getPayHistory()), today);
    if (!health.length) {
      el.innerHTML = '<div class="led-note">No occupied units to score.</div>';
      return;
    }
    const allGood = health.every(h => h.grade === "A" || h.grade === "B");
    el.innerHTML =
      (allGood ? '<div class="led-note">All tenants currently grade A/B.</div>' : '') +
      health.slice(0, 10).map(h =>
        '<div style="display:flex;align-items:baseline;gap:8px">' +
          '<span class="uchip">' + esc(h.unit) + '</span>' +
          '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(h.dba) + '</span>' +
          '<b style="font-family:var(--mono);color:' + healthColor(h.grade) + '">' + esc(h.grade) + '</b>' +
          '<span class="fbar-v">' + h.score + '</span>' +
        '</div>' +
        (h.factors.length ? '<div class="led-note" style="padding:0">' + esc(h.factors.join(" · ")) + '</div>' : '')
      ).join("") +
      '<div class="led-note">Score = 13-mo payment record (60) + term runway (25) + late-fee drag (15) — descriptive, not a credit decision.</div>';
  } catch (e) {
    el.innerHTML = '<div class="led-note">Tenant health unavailable: ' + esc(e.message) + '</div>';
  }
}

export function initFinancial() {
  renderFinancial();
  subscribe(type => { if (type === "financials" || type === "import") renderFinancial(); });
}
