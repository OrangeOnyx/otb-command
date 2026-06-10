/* D-1 Operations Dashboard — KPIs, lease runway, action queue. */
import { UNITS } from "../store.js";
import { fmt$0, pDate, fDate, monthsTo, daysTo, esc, TODAY } from "../lib/format.js";

export function renderDashboard() {
  renderKPIs();
  renderRunway();
  renderAlerts();
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
    ["brass", "Parking", "324<small>/344</small>", "variance <b>99-11797</b> — protect"]
  ].map(([c, l, v, n]) => '<div class="card kpi ' + c + '"><div class="lbl">' + l + '</div><div class="val">' + v + '</div><div class="note">' + n + '</div></div>').join("");
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

function renderAlerts() {
  const items = [];
  items.push({ c: "var(--brick)", tag: "Holdover — priority", t: "<b>109 · JC Kate Boutique</b> expired 9/17/25 — 8+ months in holdover. Highest-priority renewal." });
  UNITS.filter(u => u.status === "expired" && u.unit !== "109").forEach(u =>
    items.push({ c: "var(--brick)", tag: "Holdover", t: "<b>" + u.unit + " · " + esc(u.dba) + "</b> expired " + fDate(pDate(u.end)) + ". Renew or recover possession." }));
  items.push({ c: "var(--brass)", tag: "Leasing", t: "<b>131</b> — LOI pending with furniture-store prospect (1,907 SF). <b>133</b> in active marketing (1,272 SF)." });
  items.push({ c: "#C99A33", tag: "Expiring Sep 2026", t: "<b>115/117 · Clothing Loft Exchange</b> expires 9/11/26 — open renewal discussion now (4,340 SF combined)." });
  items.push({ c: "var(--anchor)", tag: "Anchor obligation", t: "<b>149 · Jason's Deli</b> — §9.01 requires monthly HVAC PM contract with <b>Butcher Air Conditioning</b>. Confirm contract is current." });
  items.push({ c: "var(--navy)", tag: "Exclusive-use watch", t: "<b>129 · HotWorx</b> vs <b>135A · C. Wolf</b> — monitor exclusive-use boundaries before any new services lease." });
  items.push({ c: "var(--slate)", tag: "Instruments", t: "Church easement <b>$350/mo</b> — §3a liquor waiver survives termination. JD Bank easement <b>$250/mo</b> in, 13 spaces, expires 12/30/2034." });
  document.getElementById("alerts").innerHTML = items.map(a =>
    '<div class="alert"><div class="bar" style="background:' + a.c + '"></div><div class="t"><span class="tag">' + a.tag + '</span>' + a.t + '</div></div>').join("");
}
