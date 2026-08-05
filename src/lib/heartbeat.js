/* Automation heartbeat — pure seam (Phase B-4, docs/phase-b/11).
   Every proactive detector rides the ONE daily auto-trigger cron; if that
   cron dies, all alerting goes quiet at once — silently. The heartbeat row
   (cron_heartbeats, written by the cron itself) turns that silence into a
   brick D-1 card. Tested in test/heartbeat.test.mjs. */

/* Daily cron at 11:00 UTC → normal gap ≤24h; +2h grace for runtime jitter.
   Past this, the cron has missed a scheduled run. */
export const HEARTBEAT_STALE_HOURS = 26;

export function hoursSince(iso, nowMs) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (nowMs - t) / 3600e3);
}

/* row {ran_at, summary} → D-1 KPI tuple [color, label, valueHTML, note],
   or null (no row / unparsable → card simply doesn't render, matching the
   UniFi/C3 best-effort posture). Direction words precomputed here — the
   view never infers state (kpi.js philosophy). */
export function heartbeatKpi(row, nowMs) {
  if (!row || !row.ran_at) return null;
  const h = hoursSince(row.ran_at, nowMs);
  if (h === null) return null;
  const stale = h >= HEARTBEAT_STALE_HOURS;
  const age = h < 1 ? Math.round(h * 60) + "m ago" : Math.round(h) + "h ago";
  const s = row.summary || {};
  const scan = Number.isFinite(+s.scanned)
    ? "last scan: " + (+s.scanned) + " candidate" + (+s.scanned === 1 ? "" : "s") +
      " · " + (+s.opened || 0) + " opened"
    : "";
  const note = stale
    ? "cron silent — every detector (maint/voice/C3/UniFi/rent/brief) is dark; check Vercel cron"
    : scan || "daily scan healthy";
  return [stale ? "brick" : "green", "Automation (cron)",
    stale ? "STALE" : "OK", age + (note ? " · " + note : "")];
}
