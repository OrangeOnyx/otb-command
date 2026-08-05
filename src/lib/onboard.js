/* C-1 onboarding intake validation — pure seam (docs/phase-c/01).
   The tool refuses to touch the DB unless validateIntake() returns ok; the
   RPC re-checks the hard constraints server-side (slug regexes match the
   phase_b_foundation CHECKs), so a stale tool can't push junk shapes.
   Tested in test/onboard.test.mjs. */

export const SLUG_RE = /^[a-z0-9-]{2,40}$/;          // matches the DB CHECK
export const YM_RE = /^\d{4}-\d{2}$/;                 // ledger_start_ym CHECK
export const ROLES = ["operator", "owner", "vendor", "tenant"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const str = v => typeof v === "string" && v.trim().length > 0;

export function validateIntake(intake) {
  const errors = [];
  const bad = m => errors.push(m);
  if (!isObj(intake)) return { ok: false, errors: ["intake is not an object"] };

  const o = intake.org;
  if (!isObj(o)) bad("org: missing");
  else {
    if (!str(o.slug) || !SLUG_RE.test(o.slug)) bad("org.slug: lowercase a-z/0-9/dash, 2-40 chars");
    if (!str(o.name)) bad("org.name: required");
    if (o.brand !== undefined && !isObj(o.brand)) bad("org.brand: object when present");
  }

  const p = intake.property;
  if (!isObj(p)) bad("property: missing");
  else {
    if (!str(p.slug) || !SLUG_RE.test(p.slug)) bad("property.slug: lowercase a-z/0-9/dash, 2-40 chars");
    if (!str(p.name)) bad("property.name: required");
    if (p.tz !== undefined && !str(p.tz)) bad("property.tz: string when present");
    if (p.facts !== undefined) {
      if (!Array.isArray(p.facts)) bad("property.facts: array when present");
      else p.facts.forEach((f, i) => {
        if (!isObj(f) || !str(f.label) || !str(String(f.value ?? ""))) bad(`property.facts[${i}]: needs label + value`);
      });
    }
  }

  const s = intake.settings;
  if (s !== undefined) {
    if (!isObj(s)) bad("settings: object when present");
    else {
      if (s.ledger_start_ym !== undefined && !(str(s.ledger_start_ym) && YM_RE.test(s.ledger_start_ym)))
        bad("settings.ledger_start_ym: YYYY-MM");
      for (const k of ["renewal_horizon_days", "late_grace_days"])
        if (s[k] !== undefined && !(Number.isInteger(s[k]) && s[k] >= 0)) bad(`settings.${k}: non-negative integer`);
      for (const k of ["occupancy_floor", "late_flat", "late_per_day"])
        if (s[k] !== undefined && !(Number.isFinite(s[k]) && s[k] >= 0)) bad(`settings.${k}: non-negative number`);
      if (s.settings !== undefined && !isObj(s.settings)) bad("settings.settings: object when present");
    }
  }

  const a = intake.authorized;
  if (a !== undefined) {
    if (!Array.isArray(a)) bad("authorized: array when present");
    else a.forEach((r, i) => {
      if (!isObj(r)) { bad(`authorized[${i}]: object`); return; }
      if (!str(r.email) || !EMAIL_RE.test(r.email.trim().toLowerCase())) bad(`authorized[${i}].email: invalid`);
      if (!ROLES.includes(r.role)) bad(`authorized[${i}].role: one of ${ROLES.join("/")}`);
    });
  }

  return { ok: errors.length === 0, errors };
}

/* Human-readable dry-run plan — what the RPC will create. Pure. */
export function intakePlan(intake) {
  const lines = [];
  lines.push(`org        ${intake.org.slug} ("${intake.org.name}") — created or reused by slug`);
  lines.push(`property   ${intake.property.slug} ("${intake.property.name}") — RAISES if it already exists`);
  const s = intake.settings || {};
  lines.push(`settings   ledger_start_ym=${s.ledger_start_ym ?? "—"} renewal=${s.renewal_horizon_days ?? 180}d`);
  for (const r of intake.authorized || []) lines.push(`authorize  ${r.email} → ${r.role}`);
  return lines;
}
