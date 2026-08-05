/* Client error beacon — B-4 no-vendor error tracking (docs/phase-b/11,
   option 3). Uncaught errors + unhandled rejections from authed sessions go
   to the capped log_client_error RPC; the operator sees a 24h count on D-1.
   Pure gate logic here (dedupe + session cap) so an error loop can never
   flood the wire from the client side either — the RPC's hourly cap is the
   server-side backstop. Tested in test/errlog.test.mjs. */

export const SESSION_CAP = 5; // distinct errors per tab session

export function makeReporterState() {
  return { seen: new Set(), sent: 0 };
}

/* One report per distinct message, hard session cap, blank-safe. */
export function shouldReport(state, message) {
  const key = String(message || "").trim().slice(0, 200);
  if (!key || state.sent >= SESSION_CAP || state.seen.has(key)) return false;
  state.seen.add(key);
  state.sent++;
  return true;
}

/* Wire the global handlers. report() is best-effort fire-and-forget — the
   beacon must never throw into the page it is watching. */
export function initErrorLog(report) {
  const state = makeReporterState();
  const send = (message, stack) => {
    if (!shouldReport(state, message)) return;
    try {
      report({
        page: (location.hash || location.pathname || "").slice(0, 200),
        message: String(message || "").slice(0, 500),
        stack: String(stack || "").slice(0, 2000),
        ua: navigator.userAgent.slice(0, 300),
      });
    } catch { /* never re-enter */ }
  };
  window.addEventListener("error", e => send(e.message, e.error && e.error.stack));
  window.addEventListener("unhandledrejection", e =>
    send((e.reason && e.reason.message) || String(e.reason), e.reason && e.reason.stack));
  return state;
}
