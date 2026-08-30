/* K-1 document expiry (register row #16) — generalizes the COI-expiry pattern
   (lib/coi.js: 30d critical / 60d expiring, same math, not duplicated) to every
   dated document record, property-level or per-unit. Pure — no DOM, no network.
   Consumed by views/directory.js (the "Expiring documents" strip) and
   lib/recordsUI.js (per-row badges). Tested in test/docexpiry.test.mjs. */
import { coiStatus, coiBadge } from "./coi.js";

/* Local-calendar YYYY-MM-DD for a Date — feed format.js TODAY through this
   once per consumer (coiStatus wants ISO strings, not Date objects). */
export const isoDate = d =>
  d.getFullYear() + "-" +
  String(d.getMonth() + 1).padStart(2, "0") + "-" +
  String(d.getDate()).padStart(2, "0");

/* records = merged document records (each may carry .expires; .unit is absent
   on property-level docs) → the ones whose status is expired|critical|expiring
   and due within horizonDays, sorted expired-first then soonest (days asc),
   mapped to display rows {id, name, unit, expires, state, days, color, label}.
   Labels reuse the COI badge minus its vendor prefix; colors come straight
   from the plan-room palette in coiBadge. Malformed/absent dates drop out. */
export function expiringDocs(records, todayISO, { horizonDays = 90 } = {}) {
  const out = [];
  for (const r of records || []) {
    const st = coiStatus(r.expires, todayISO);
    if (st.state === "none" || st.state === "ok") continue;
    if (st.days > horizonDays) continue; // expired rows are negative → always kept
    const b = coiBadge(st);
    out.push({
      id: r.id, name: r.name, unit: r.unit, expires: r.expires,
      state: st.state, days: st.days,
      color: b.color, label: b.label.replace(/^COI\s*/, "")
    });
  }
  return out.sort((a, b) => a.days - b.days);
}

/* One strip line: "Executed lease — Unit 131 · expires 2026-09-15 (17d)";
   expired reads "· expired 2026-08-20 (9d ago)". Property docs skip the
   unit segment. Plain string — caller escapes for HTML. */
export function expiryLine(d) {
  const where = d.unit ? " — Unit " + d.unit : "";
  const when = d.state === "expired"
    ? "expired " + d.expires + " (" + (-d.days) + "d ago)"
    : "expires " + d.expires + " (" + d.days + "d)";
  return (d.name || "Document") + where + " · " + when;
}
