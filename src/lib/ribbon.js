/* Masthead KPI ribbon — pure model (2026-09-19, operator pick 3 from the
   Asset Command review). The five numbers AC kept in its masthead on every
   screen, computed from the SAME sources D-1 already uses (rent roll + the
   live W-1 action cards), rendered as a title-block strip in Plex Mono.
   Each item names the sheet it drills into. No DOM — tested in
   test/ribbon.test.mjs; main.js paints it and re-paints on store events. */
import { sumKnownAmounts } from "./format.js";
import { daysBetween } from "./leasegantt.js";

const fmt$0 = n => "$" + Math.round(n).toLocaleString("en-US");

/* → [{ k, label, val, note, tone, page }]
   units = rent roll rows · cards = live action cards (W-1 seed + overrides) */
export function ribbonModel(units, cards, todayYmd) {
  const gla = units.reduce((s, u) => s + (u.sf || 0), 0);
  const vacant = units.filter(u => u.status === "vacant");
  const vacantSF = vacant.reduce((s, u) => s + (u.sf || 0), 0);
  const occ = gla ? (gla - vacantSF) / gla * 100 : 0;
  const rent = sumKnownAmounts(units.map(u => u.monthly));
  const exp12 = units.filter(u => {
    if (u.status === "vacant" || u.status === "owner" || !u.end) return false;
    const d = daysBetween(todayYmd, u.end);
    return d != null && d >= 0 && d <= 365;
  });
  const action = (cards || []).filter(c => c.lane === "action");
  const overdue = action.filter(c => c.due && daysBetween(todayYmd, c.due) < 0);
  return [
    { k: "occ", label: "Occupancy", val: occ.toFixed(1) + "%", note: (gla - vacantSF).toLocaleString() + " of " + gla.toLocaleString() + " SF leased", tone: occ >= 90 ? "green" : "brass", page: "roll" },
    { k: "rent", label: "Rent / mo", val: rent == null ? "—" : fmt$0(rent), note: rent == null ? "financial source not loaded" : "scheduled monthly total · " + fmt$0(rent * 12) + " annualized", tone: "", page: "fin" },
    { k: "vacant", label: "Vacant", val: String(vacant.length), note: vacant.length ? vacant.map(u => u.unit).join(" · ") + " · " + vacantSF.toLocaleString() + " SF" : "fully leased", tone: vacant.length ? "brass" : "green", page: "plan" },
    { k: "exp12", label: "Expiring ≤ 12 mo", val: String(exp12.length), note: exp12.length ? exp12.map(u => u.unit).join(" · ") : "none on the schedule", tone: exp12.length ? "brass" : "", page: "dates" },
    { k: "attn", label: "Needs attention", val: String(action.length), note: action.length ? action.length + " action cards" + (overdue.length ? " · " + overdue.length + " past due" : "") : "nothing in the action lane", tone: overdue.length ? "brick" : action.length ? "brass" : "green", page: "board" },
  ];
}

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

/* markup for the strip — buttons so the numbers drill into their sheet */
export function ribbonHTML(items) {
  return items.map(i =>
    '<button type="button" class="rb-item' + (i.tone ? " rb-" + i.tone : "") + '" data-page="' + esc(i.page) + '" title="' + esc(i.note) + '">' +
    '<b>' + esc(i.val) + '</b><i>' + esc(i.label) + '</i></button>').join("");
}
