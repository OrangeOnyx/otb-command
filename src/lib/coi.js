/* COI tracking (P3 deferred item, shipped 2026-07-20) — pure status math for
   vendor certificates of insurance. The date itself lives on public.vendors
   (coi_expires/coi_note, operator-set after filing the cert in the vendor's
   folder); this module only classifies. Tested in test/coi.test.mjs. */

export const COI_CRITICAL_DAYS = 30;
export const COI_EXPIRING_DAYS = 60;

const utc = iso => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/* → { state: none|expired|critical|expiring|ok, days } (days = calendar days
   until expiry; negative when past). Malformed dates classify as none. */
export function coiStatus(expiresISO, todayISO) {
  if (!expiresISO || !/^\d{4}-\d{2}-\d{2}$/.test(expiresISO)) return { state: "none", days: null };
  const days = Math.round((utc(expiresISO) - utc(todayISO)) / 86400000);
  if (days < 0) return { state: "expired", days };
  if (days <= COI_CRITICAL_DAYS) return { state: "critical", days };
  if (days <= COI_EXPIRING_DAYS) return { state: "expiring", days };
  return { state: "ok", days };
}

/* Roster badge (plan-room palette). `none` is only worth flagging on service
   vendors — payees/people don't carry COIs. */
export function coiBadge(status) {
  switch (status.state) {
    case "expired": return { label: "COI EXPIRED", color: "#C25E33" };
    case "critical": return { label: "COI " + status.days + "d", color: "#C25E33" };
    case "expiring": return { label: "COI " + status.days + "d", color: "#C99A33" };
    case "ok": return { label: "COI ✓", color: "#2F6B4F" };
    default: return { label: "COI —", color: "#5F6E64" };
  }
}
