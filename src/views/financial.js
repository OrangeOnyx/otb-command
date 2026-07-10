/* P-1 Financial Summary — income rollup derived from the rent roll, plus an
   operator-entered operating-expense worksheet that yields NOI and an indicated
   value. Income is read-only from units.json (SOT); OpEx + cap rate persist
   through the store. No new data sources. */
import { UNITS, OPEX_LINES, getFinancials, setOpex, setCapRate, subscribe } from "../store.js";
import { CAT_META } from "../lib/colors.js";
import { fmt$0, pDate, monthsTo, esc, TODAY } from "../lib/format.js";
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

  root.querySelector(".fin-body").innerHTML =
    '<div class="kpis fin-kpis">' + kpis + '</div>' +
    '<div class="fin-grid">' +
      '<div class="card"><div class="panel-h"><h2>Income composition</h2><div class="sub">BASE RENT vs NNN RECOVERIES · PER SOT</div></div><div class="fbars">' + compBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Income by use</h2><div class="sub">ANNUAL IN-PLACE RENT · SHARE</div></div><div class="fbars">' + catBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Lease rollover schedule</h2><div class="sub">ANNUAL RENT EXPIRING BY YEAR</div></div><div class="fbars">' + rollBars + '</div></div>' +
      '<div class="card"><div class="panel-h"><h2>Tenant concentration</h2><div class="sub">TOP 5 BY IN-PLACE RENT</div></div><div class="fbars">' + topBars + '</div></div>' +
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
}

export function initFinancial() {
  renderFinancial();
  subscribe(type => { if (type === "financials" || type === "import") renderFinancial(); });
}
