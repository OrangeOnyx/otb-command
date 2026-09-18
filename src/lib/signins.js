/* Sign-in audit — pure seam over signin_log rows (ruling D-24b option 1,
   2026-09-17): one row per session start, stamped server-side by the
   log_signin RPC (email from the JWT, role from the profile — never
   client-supplied). No page-view firehose: AC logged 2,622 events of which
   2,525 were page views; this keeps the 93-sign-in signal only. The D-1 KPI
   is derived here so the view never infers state. Tested in
   test/signins.test.mjs. */

export const SIGNIN_WINDOW_DAYS = 7;

export function hoursAgoLabel(iso, nowMs) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const h = Math.max(0, (nowMs - t) / 3600e3);
  if (h < 1) return Math.round(h * 60) + "m ago";
  if (h < 48) return Math.round(h) + "h ago";
  return Math.round(h / 24) + "d ago";
}

/* rows [{email, role, at}] (newest first or not — sorted here) →
   D-1 KPI tuple [color, label, valueHTML, note] or null when there is
   nothing to show (pre-migration, non-operator read, or an empty window —
   the card simply doesn't render, matching the heartbeat posture). */
export function signinKpi(rows, nowMs, windowDays = SIGNIN_WINDOW_DAYS) {
  const since = nowMs - windowDays * 86400e3;
  const list = (Array.isArray(rows) ? rows : [])
    .filter(r => r && Number.isFinite(Date.parse(r.at)) && Date.parse(r.at) >= since)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  if (!list.length) return null;
  const accounts = new Set(list.map(r => String(r.email || "").toLowerCase()).filter(Boolean));
  const roles = {};
  list.forEach(r => { const k = r.role || "unknown"; roles[k] = (roles[k] || 0) + 1; });
  const roleTxt = Object.entries(roles).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => n + " " + k).join(" · ");
  const last = list[0];
  const note = "last: " + (last.email || "?") + " · " + hoursAgoLabel(last.at, nowMs) +
    " · " + accounts.size + " account" + (accounts.size === 1 ? "" : "s") +
    (roleTxt ? " · " + roleTxt : "");
  return ["ink", "Sign-ins (" + windowDays + "d)", list.length, note];
}
