/* Cypress Command Platform — push-only service worker (2026-10-06).
   No fetch handler, no caching: it exists to show call alerts. Payload =
   { title, body, url, tag, urgent } from api/_push.mjs (callPush). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { p = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(p.title || "New call — On The Boulevard", {
    body: p.body || "Open L-1 Comm Log to listen and read.",
    tag: p.tag || "call",
    renotify: true,
    requireInteraction: !!p.urgent,
    icon: "/brand/cypress/app-icon-180.png",
    badge: "/brand/cypress/app-icon-180.png",
    data: { url: p.url || "/#comms" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/#comms";
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        return w.navigate ? w.navigate(url) : undefined;
      }
    }
    return self.clients.openWindow(url);
  })());
});
