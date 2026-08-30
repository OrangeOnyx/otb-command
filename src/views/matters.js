/* N-1 Matters & Planning — build wave stub (2026-08-29): the harvest build
   agent replaces this file with the full matters view over lib/matters.js. */
import { REMOTE } from "../lib/remote.js";

export function initMatters(account) {
  const host = document.getElementById("mattersBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">Matters require the hosted backend — local-only mode.</div>';
    return;
  }
  host.innerHTML = '<div class="ai-note mute">N-1 Matters — loading…</div>';
}
