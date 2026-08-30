/* L-1 Comm Log — build wave stub (2026-08-29): the harvest build agent
   replaces this file with the full cross-channel correspondence view over
   lib/comms.js. Keeping a graceful placeholder so the sheet routes cleanly. */
import { REMOTE } from "../lib/remote.js";

export function initComms(account) {
  const host = document.getElementById("commsBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">Comm log requires the hosted backend — local-only mode.</div>';
    return;
  }
  host.innerHTML = '<div class="ai-note mute">L-1 Comm Log — loading…</div>';
}
