/* Drawer "Prior payments · AC" panel — build wave stub (2026-08-29): the
   harvest build agent replaces this with the read-only 13-month history list
   over lib/payhistory.js. Must tolerate a null element. */
export function mountPayHistory(el) {
  if (!el) return;
  el.innerHTML = '<div class="led-note">Loading…</div>';
}
