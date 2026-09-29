/* R-1 monthly rent worksheet — pure seam (owner request 2026-09-29).
   Per suite: scheduled TOTAL rent for the preceding month, the expected
   TOTAL rent for the worksheet month, and a classified reason for any
   difference. The owner's own expected figure is a view-layer input.

   Sources, in order (same Tier-1 chain as R-1):
     leaseEvidence.rentPhases (dated schedule) → units.json monthly / start / end.
   Month-by-month history is NOT stored anywhere, so a month before the
   current term began is "not on file" (null) — never a guessed number.
   A bare amount is TOTAL rent (rent-presentation rule, 2026-07-17). */

export const round2 = n => Math.round(n * 100) / 100;

const YM = /^\d{4}-\d{2}$/;

export function ymOf(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

export function shiftYm(ym, delta) {
  if (!YM.test(ym)) throw new Error("ym must be YYYY-MM");
  const [y, m] = ym.split("-").map(Number);
  return ymOf(new Date(y, m - 1 + delta, 1));
}

export function monthBounds(ym) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { first: ym + "-01", last: ym + "-" + String(last).padStart(2, "0") };
}

export function ymLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const phaseOf = (phases, day) =>
  phases.find(p => p.start && p.start <= day && (!p.end || p.end >= day)) || null;

/* Expired-term policy — the one judgment call in this module.
   Called when the worksheet month begins after the recorded term end.
   Default: carry the last scheduled rent forward as the expectation and flag
   it, because a blank end-of-term usually means "renewal paperwork pending",
   not "tenant gone" (No holdovers on the books — operator 2026-09). Returning
   { amount: 0 } instead would budget the suite as dark. */
export function expiredTermExpectation(u) {
  return { amount: +u.monthly, basis: "expired" };
}

/* Scheduled TOTAL rent for one suite in one month.
   → { amount: number|null, basis, phase? }
   basis: vacant · owner · private · phase · lease · prior-term · expired */
export function scheduledRent(u, ym) {
  if (u.status === "vacant") return { amount: 0, basis: "vacant" };
  if (u.status === "owner") return { amount: 0, basis: "owner" };
  if (!Number.isFinite(u.monthly)) return { amount: null, basis: "private" };
  const { first, last } = monthBounds(ym);
  const phases = Array.isArray(u.leaseEvidence?.rentPhases) ? u.leaseEvidence.rentPhases : [];
  if (phases.length) {
    const p = phaseOf(phases, first);
    if (p) return { amount: round2(+p.monthly), basis: "phase", phase: p };
    const earliest = phases.map(x => x.start).filter(Boolean).sort()[0];
    if (earliest && first < earliest) return { amount: null, basis: "prior-term" };
  }
  if (u.start && u.start > last) return { amount: null, basis: "prior-term" };
  if (u.end && u.end < first) return expiredTermExpectation(u);
  return { amount: round2(+u.monthly), basis: "lease" };
}

const isAbatement = p => /abat/i.test(p?.label || "");
const fmtDay = ymd => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* One worksheet row: prior vs current + classified change.
   kind: same · increase · decrease · abatement · abatement-ends · new-term ·
         vacant · owner · expired · unknown */
export function worksheetRow(u, ym) {
  const prior = scheduledRent(u, shiftYm(ym, -1));
  const cur = scheduledRent(u, ym);
  const diff = prior.amount != null && cur.amount != null ? round2(cur.amount - prior.amount) : null;
  const notes = [];
  let kind;

  if (cur.basis === "vacant") kind = "vacant";
  else if (cur.basis === "owner") kind = "owner";
  else if (cur.basis === "private") kind = "unknown";
  else if (cur.basis === "expired") {
    kind = "expired";
    notes.push("Term ended " + fmtDay(u.end) + " — confirm renewal or move-out");
  } else if (prior.amount == null) {
    kind = "new-term";
    const began = cur.phase?.start || u.start;
    notes.push((began ? "Term began " + fmtDay(began) : "New term") + " — prior-term rent not on file");
  } else if (isAbatement(prior.phase) && !isAbatement(cur.phase)) {
    kind = "abatement-ends";
    notes.push("Abatement ended " + fmtDay(prior.phase.end));
  } else if (isAbatement(cur.phase)) {
    kind = "abatement";
    notes.push("Abatement through " + (cur.phase.end ? fmtDay(cur.phase.end) : "open"));
  } else if (diff > 0) kind = "increase";
  else if (diff < 0) kind = "decrease";
  else kind = "same";

  if ((kind === "increase" || kind === "decrease") && cur.phase?.label) notes.push(cur.phase.label);
  if (u.status !== "vacant" && u.status !== "owner" && !u.end) notes.push("Term dates unresolved");
  return { unit: u.unit, dba: u.dba, status: u.status, prior, cur, diff, kind, notes };
}

export function worksheet(units, ym) {
  if (!YM.test(ym)) throw new Error("ym must be YYYY-MM");
  const rows = units.map(u => worksheetRow(u, ym));
  // No private financial access → no totals. Otherwise sum what is on file;
  // a not-on-file prior month is counted (priorUnknown), never zero-filled.
  const locked = rows.some(r => r.cur.basis === "private");
  const sum = pick => locked ? null : round2(rows.reduce((s, r) => s + (pick(r) ?? 0), 0));
  const priorTotal = sum(r => r.prior.amount), curTotal = sum(r => r.cur.amount);
  return {
    ym, prevYm: shiftYm(ym, -1), rows, priorTotal, curTotal,
    diffTotal: locked ? null : sum(r => r.diff),
    priorUnknown: rows.filter(r => r.prior.amount == null && r.cur.basis !== "private").length
  };
}

/* Owner's typed figure: "" → null; "$3,035.25" → 3035.25; junk → NaN. */
export function parseMoney(s) {
  const t = String(s ?? "").replace(/[$,\s]/g, "");
  if (!t) return null;
  return /^-?\d+(\.\d{0,2})?$/.test(t) ? +t : NaN;
}
