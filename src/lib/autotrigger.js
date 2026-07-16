/* autotrigger.js — proactive detector seam (belle-realty-pwa harvest #2,
   AutoTriggerService @ 19f7c06, ported 2026-07-16).

   Pure functions: units in, trigger candidates out. No LLM, no I/O, no Date.now
   (caller passes today as "YYYY-MM-DD"). api/auto-trigger.mjs (Vercel cron,
   daily) runs collectCandidates() and idempotently opens AI-1 threads via the
   open_trigger_thread RPC — one thread per triggerSource EVER (unique index on
   chat_threads.trigger_source enforces; re-running is safe).

   Detectors (donor mapping):
     delinquency:30d    → holdover:<unit>:<end>   (expired lease, still active)
     occupancy:below80  → occupancy:<YYYY-MM>     (SF-weighted, floor 85%)
     hvac:open          → (not ported — no maintenance-request surface yet)
     NEW                → renewal:<unit>:<end>    (expiry within 180 days)
     NEW                → brief:<YYYY-MM>         (monthly owner brief digest)

   Thread routing: leasing = holdover/renewal · manager = occupancy ·
   concierge = owner brief. */

export const EXPIRY_HORIZON_DAYS = 180;
export const OCCUPANCY_FLOOR = 0.85;

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

export function monthKey(todayISO) { return todayISO.slice(0, 7); }

export function monthLabel(todayISO) {
  return `${MONTHS[+todayISO.slice(5, 7) - 1]} ${todayISO.slice(0, 4)}`;
}

function addDays(todayISO, n) {
  const [y, m, d] = todayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const occupied = (u) => u.status === "active" || u.status === "anchor" || u.status === "owner";
const leased = (u) => u.status === "active" || u.status === "anchor";
const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Expired lease with the tenant still in place — the donor's delinquency-class
   urgent trigger. Key carries the end date so a future term that lapses again
   opens a fresh thread. */
export function detectHoldovers(units, todayISO) {
  return units.filter(u => leased(u) && u.end && u.end < todayISO).map(u => ({
    kind: "holdover",
    agent: "leasing",
    triggerSource: `holdover:${u.unit}:${u.end}`,
    title: `Holdover — Unit ${u.unit} (${u.dba})`,
    detail: `Unit ${u.unit} (${u.dba}) lease expired ${u.end} and the tenant is still shown in occupancy — holdover as of ${todayISO}. ` +
      `Confirm status on R-1, then decide: renewal terms or CCP 4701 notice track. I can run the eviction sequencer or a retain-vs-replace comparison (run_calc) from this thread.`,
  }));
}

/* Lease ending inside the horizon — opens the renewal conversation early. */
export function detectRenewalHorizon(units, todayISO, horizonDays = EXPIRY_HORIZON_DAYS) {
  const edge = addDays(todayISO, horizonDays);
  return units.filter(u => leased(u) && u.end && u.end >= todayISO && u.end <= edge).map(u => ({
    kind: "renewal",
    agent: "leasing",
    triggerSource: `renewal:${u.unit}:${u.end}`,
    title: `Renewal window — Unit ${u.unit} (${u.dba}) expires ${u.end}`,
    detail: `Unit ${u.unit} (${u.dba}, ${Number(u.sf).toLocaleString()} SF) expires ${u.end} — inside the ${horizonDays}-day renewal window as of ${todayISO}. ` +
      `Start the renewal conversation: I can run retain-vs-replace or blend-and-extend numbers (run_calc) and assemble a proposal package from this thread.`,
  }));
}

/* SF-weighted occupancy below the floor — month-keyed so a persistent problem
   re-alerts monthly rather than once ever. */
export function detectOccupancy(units, todayISO, floor = OCCUPANCY_FLOOR) {
  const total = units.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const occ = units.filter(occupied).reduce((s, u) => s + (Number(u.sf) || 0), 0);
  if (!total || occ / total >= floor) return [];
  const vacant = units.filter(u => !occupied(u)).map(u => u.unit).join(", ");
  return [{
    kind: "occupancy",
    agent: "manager",
    triggerSource: `occupancy:${monthKey(todayISO)}`,
    title: `Occupancy below ${Math.round(floor * 100)}% — ${(occ / total * 100).toFixed(1)}% of GLA`,
    detail: `SF-weighted occupancy is ${(occ / total * 100).toFixed(1)}% (${occ.toLocaleString()} of ${total.toLocaleString()} SF), ` +
      `below the ${Math.round(floor * 100)}% early-warning floor. Vacant: ${vacant}.`,
  }];
}

/* Monthly owner brief — the A2 "Owner Intelligence Brief" seed. Deterministic
   digest from the rent roll; month-keyed source = exactly one per month. */
export function buildOwnerBrief(units, priv, todayISO) {
  const total = units.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const occUnits = units.filter(occupied);
  const occSf = occUnits.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const income = units.filter(leased)
    .reduce((s, u) => s + (Number(priv?.[u.unit]?.monthly) || 0), 0);
  const vacants = units.filter(u => !occupied(u));
  const holdovers = units.filter(u => leased(u) && u.end && u.end < todayISO);
  const upcoming = units
    .filter(u => leased(u) && u.end && u.end >= todayISO)
    .sort((a, b) => a.end < b.end ? -1 : 1).slice(0, 3);

  const lines = [
    `**Owner brief — ${monthLabel(todayISO)}** (auto-generated ${todayISO}; figures from the reconciled rent roll)`,
    ``,
    `- **Occupancy:** ${occUnits.length} of ${units.length} units · ${(occSf / total * 100).toFixed(1)}% of GLA (${occSf.toLocaleString()} / ${total.toLocaleString()} SF)`,
    `- **Scheduled monthly rent (leased units):** ${money(income)} (${money(income * 12)}/yr)`,
    `- **Vacant:** ${vacants.length ? vacants.map(u => `${u.unit} (${Number(u.sf).toLocaleString()} SF)`).join(" · ") : "none"}`,
    `- **Holdovers:** ${holdovers.length ? holdovers.map(u => u.unit).join(", ") : "none"}`,
    `- **Next expirations:** ${upcoming.length ? upcoming.map(u => `${u.unit} (${u.dba}) ${u.end}`).join(" · ") : "none on the horizon"}`,
    ``,
    `Ask me to expand any line — deal math runs through run_calc, so figures stay deterministic.`,
  ];

  return {
    kind: "brief",
    agent: "concierge",
    triggerSource: `brief:${monthKey(todayISO)}`,
    title: `Owner brief — ${monthLabel(todayISO)}`,
    detail: lines.join("\n"),
  };
}

export function collectCandidates(units, priv, todayISO) {
  return [
    ...detectHoldovers(units, todayISO),
    ...detectRenewalHorizon(units, todayISO),
    ...detectOccupancy(units, todayISO),
    buildOwnerBrief(units, priv, todayISO),
  ];
}
