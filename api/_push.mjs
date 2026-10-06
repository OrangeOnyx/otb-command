/* Web Push fan-out (2026-10-06, operator pick 1 — "let me know when there's
   a new message"). Every finalized call pushes one notification to each
   device an owner/operator opted in on (push_subscriptions, migration
   20261006120000). No carrier registration, no per-message cost.

   Env: VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (generate once:
   `npx web-push generate-vapid-keys`) and optional VAPID_SUBJECT
   (mailto:…). The browser half reads the public key from
   VITE_VAPID_PUBLIC_KEY — same value. No-op until both are set.
   Never throws. */
import webpush from "web-push";
import { rpcSecret } from "./_supa.mjs";

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:adam@belle-realty.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  ready = true;
}

/* payload = { title, body, url, tag, urgent } — shape the service worker reads */
export async function pushAll(payload, secret) {
  if (!pushConfigured()) return { sent: 0, reason: "not configured" };
  let targets = [];
  try { targets = (await rpcSecret("push_targets", { p_secret: secret })) || []; }
  catch (e) { console.error("push targets:", e.message); return { sent: 0, reason: e.message }; }
  if (!targets.length) return { sent: 0, reason: "no devices" };
  init();
  const body = JSON.stringify(payload);
  const ok = [], gone = [];
  await Promise.all(targets.map(async t => {
    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        body, { TTL: 24 * 3600, urgency: payload.urgent ? "high" : "normal" });
      ok.push(t.endpoint);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) gone.push(t.endpoint);
      else console.error("push send:", e.statusCode || "", String(e.body || e.message).slice(0, 160));
    }
  }));
  try { await rpcSecret("push_mark", { p_secret: secret, p_ok: ok, p_gone: gone }); }
  catch (e) { console.error("push mark:", e.message); }
  return { sent: ok.length, gone: gone.length };
}
