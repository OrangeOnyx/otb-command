/* Drawer "Lease abstract · AC" panel (operator-only) — build wave stub
   (2026-08-29): the harvest build agent replaces this with the abstract +
   escalation reference block over lib/leaseref.js. Must tolerate a null
   element (the drawer omits the section for non-operators). */
export function mountLeaseRef(el) {
  if (!el) return;
  el.innerHTML = '<div class="led-note">Loading…</div>';
}
