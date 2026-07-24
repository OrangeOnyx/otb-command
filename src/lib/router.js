/* URL hash routing — pure seam (carry-forward problem #5: no deep links, no
   back button). The hash is the sheet id from lib/pages.js ("#roll" → R-1);
   main.js owns the DOM wiring (nav clicks push a hash entry, hashchange
   navigates, sealed sheets snap back). Role security is unchanged: routing
   only ever *asks* the nav — RLS + applyRole still decide what renders. */
import { PAGE_IDS } from "./pages.js";

/* "#roll" | "#/roll" | "roll" → "roll"; anything unknown → null. */
export function pageFromHash(hash) {
  const id = String(hash || "").replace(/^#\/?/, "").trim().toLowerCase();
  return PAGE_IDS.includes(id) ? id : null;
}

export function hashFor(id) {
  return PAGE_IDS.includes(id) ? "#" + id : "";
}

/* Pick the sheet a navigation request should land on given what this role can
   see. requested may be null (bad/empty hash); visible is the ordered id list
   currently displayed; returns a member of visible, or null if none. */
export function resolveRoute(requested, visible) {
  if (requested && visible.includes(requested)) return requested;
  return visible.length ? visible[0] : null;
}
