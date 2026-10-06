/* Call alerts (2026-10-06, operator ask: "something on the main site that
   says I have a new voice line / new message", plus a phone alert).
   Three pieces, all owner/operator only:
     1. masthead bell — count of phone calls still marked "needs attention",
        drills into L-1; mirrored as a badge on the L-1 sheet button.
     2. toast — a call that lands while the app is open (or since this
        device last opened L-1) pops a card; emergencies stay until dismissed.
     3. device push — Web Push opt-in for THIS browser/phone (service worker
        /sw.js; the server fans out in api/_push.mjs on every finalized call).
   L-1's cache is re-pulled every 60 s and on tab focus (comm_log is not on the
   realtime publication; polling avoids a migration). Pure half above the
   REMOTE banner is unit-tested in test/callalerts.test.mjs. */
import { isVoiceCall, callDisplay, CALL_INTENTS } from "./voicecall.js";

export const SEEN_KEY = "otb-calls-seen-at";
export const POLL_MS = 60000;

/* rows = L-1 cache; seenAt = ISO of the last time this device looked at L-1.
   unhandled = every voice call not marked handled (no age cut — a call that
   needs a human doesn't stop needing one after a week). fresh = voice calls
   newer than seenAt, newest first. */
export function alertModel(rows, seenAt) {
  const seen = Date.parse(seenAt || "");
  const calls = (rows || []).filter(isVoiceCall);
  const unhandled = calls.filter(r => r.status !== "handled");
  const fresh = calls
    .filter(r => { const t = Date.parse(r.at || ""); return Number.isFinite(t) && (!Number.isFinite(seen) || t > seen); })
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return {
    unhandled: unhandled.length,
    emergency: unhandled.some(r => r.urgency === "emergency"),
    fresh,
  };
}

/* one toast line for a call row */
export function toastLine(row) {
  const d = callDisplay(row);
  return {
    id: row.id,
    title: (d.urgency === "emergency" ? "EMERGENCY · " : d.urgency === "urgent" ? "Urgent · " : "") +
      "New " + CALL_INTENTS[d.intent][0].toLowerCase() + " call" + (d.unit ? " · Unit " + d.unit : ""),
    who: d.who,
    summary: String(row.summary || ""),
    color: d.urgency === "routine" ? d.intentColor : d.urgencyColor,
    sticky: d.urgency === "emergency",
  };
}

/* VAPID public key (base64url) → Uint8Array for pushManager.subscribe */
export function urlBase64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/* iOS only delivers Web Push to a site installed on the Home Screen */
export function pushSupport(nav = globalThis.navigator, win = globalThis.window) {
  if (!nav || !win) return "none";
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent || "");
  const standalone = nav.standalone === true || (win.matchMedia && win.matchMedia("(display-mode: standalone)").matches);
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in nav) || !("PushManager" in win) || !("Notification" in win)) return "none";
  return "ok";
}

/* ======================= REMOTE (browser) ======================= */
import { sb } from "./remote.js";
import { getComms, onCommsChange, refreshComms } from "./comms.js";

const VAPID = import.meta.env?.VITE_VAPID_PUBLIC_KEY || "";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } };
const writeSeen = iso => { try { localStorage.setItem(SEEN_KEY, iso); } catch { /* private mode */ } };

let toasted = new Set();
let bootSeen = "";

function paintBell(model, navBtn) {
  const bell = document.getElementById("callBell");
  if (bell) {
    bell.hidden = !model.unhandled;
    bell.classList.toggle("hot", model.emergency);
    bell.querySelector("b").textContent = model.unhandled;
    bell.title = model.unhandled + " call" + (model.unhandled === 1 ? "" : "s") + " need attention — open L-1 Comm Log";
  }
  const nb = navBtn && navBtn.comms;
  if (nb) {
    let badge = nb.querySelector(".nav-badge");
    if (!badge) { badge = document.createElement("span"); badge.className = "nav-badge"; nb.appendChild(badge); }
    badge.textContent = model.unhandled || "";
    badge.hidden = !model.unhandled;
  }
}

function showToasts(rows) {
  let host = document.getElementById("callToasts");
  if (!host) {
    host = document.createElement("div");
    host.id = "callToasts"; host.className = "call-toasts";
    host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const lines = rows.filter(r => !toasted.has(r.id)).slice(0, 3).map(toastLine);
  for (const t of lines) {
    toasted.add(t.id);
    const el = document.createElement("div");
    el.className = "call-toast" + (t.sticky ? " sticky" : "");
    el.style.setProperty("--tc", t.color);
    el.innerHTML = '<div class="ct-t">📞 ' + esc(t.title) + '</div><div class="ct-w">' + esc(t.who) + '</div>' +
      (t.summary ? '<div class="ct-s">' + esc(t.summary.length > 160 ? t.summary.slice(0, 157) + "…" : t.summary) + '</div>' : "") +
      '<div class="ct-a"><button data-act="open">Open in L-1</button><button data-act="x" aria-label="Dismiss">✕</button></div>';
    el.querySelector('[data-act="open"]').onclick = () => { location.hash = "#comms"; el.remove(); };
    el.querySelector('[data-act="x"]').onclick = () => el.remove();
    host.prepend(el);
    if (!t.sticky) setTimeout(() => el.remove(), 15000);
  }
}

/* ---- device push opt-in (rendered into L-1 by views/comms.js) ---- */
export async function pushState() {
  const sup = pushSupport();
  if (sup !== "ok") return sup;
  if (!VAPID) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg && await reg.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export async function enablePush() {
  if (pushSupport() !== "ok" || !VAPID) throw new Error("Push isn't available on this device.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications were not allowed — enable them for this site in the browser settings.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(VAPID) });
  const j = sub.toJSON();
  const device = (/iPhone|iPad/.test(navigator.userAgent) ? "iPhone/iPad" : /Android/.test(navigator.userAgent) ? "Android" : "Desktop") +
    " · " + new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("push_subscriptions")
    .upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device }, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) return;
  await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/* L-1 opened = everything up to now has been seen on this device */
export function markCallsSeen() {
  const newest = (getComms() || []).filter(isVoiceCall).map(r => r.at).sort().pop();
  writeSeen(newest || new Date().toISOString());
}

export function initCallAlerts({ navBtn }) {
  bootSeen = readSeen();
  let first = true;
  const paint = () => {
    const m = alertModel(getComms(), bootSeen);
    paintBell(m, navBtn);
    const onL1 = document.getElementById("pg-comms")?.classList.contains("on");
    if (onL1) { markCallsSeen(); bootSeen = readSeen(); return; }
    if (first && !readSeen()) { markCallsSeen(); bootSeen = readSeen(); first = false; return; } // first run: no backlog storm
    first = false;
    if (m.fresh.length) showToasts(m.fresh);
  };
  onCommsChange(paint);
  window.addEventListener("sheetchange", e => { if (e.detail.id === "comms") { markCallsSeen(); bootSeen = readSeen(); } });
  const bell = document.getElementById("callBell");
  if (bell) bell.onclick = () => { location.hash = "#comms"; };
  refreshComms();
  setInterval(() => { if (document.visibilityState === "visible") refreshComms(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshComms(); });
  /* keep an existing subscription's service worker current */
  if (pushSupport() === "ok") navigator.serviceWorker.getRegistration("/sw.js").then(r => r && r.update()).catch(() => {});
}
