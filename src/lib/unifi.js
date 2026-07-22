/* UniFi Site Manager seam — pure shaping of api.ui.com responses into the
   D-1 infrastructure summary. The key lives ONLY in the Vercel env
   (UNIFI_API_KEY); api/unifi.mjs fetches and shapes server-side, the client
   never talks to api.ui.com. Tested in test/unifi.test.mjs. */

/* hosts/sites/devices are the parsed JSON bodies of /v1/hosts, /v1/sites,
   /v1/devices. Missing/partial inputs degrade to zeros — the card renders
   whatever is known rather than failing. */
export function shapeUnifi(hosts, sites, devices) {
  const host = (hosts?.data || [])[0] || {};
  const site = (sites?.data || [])[0] || {};
  const counts = site.statistics?.counts || {};
  const listed = (devices?.data || []).flatMap(g => g.devices || []).map(d => ({
    name: d.name || d.model || "device",
    model: d.model || "",
    status: d.status || "unknown",
    ip: d.ip || "",
  }));
  const total = counts.totalDevice ?? listed.length;
  const offline = counts.offlineDevice ?? listed.filter(d => d.status !== "online").length;
  return {
    console: {
      name: host.reportedState?.hostname || "console",
      state: host.reportedState?.state || "unknown",
    },
    counts: {
      total,
      offline,
      pendingUpdate: counts.pendingUpdateDevice ?? 0,
      critical: counts.criticalNotification ?? 0,
      wifiClients: counts.wifiClient ?? 0,
      wiredClients: counts.wiredClient ?? 0,
    },
    devices: listed,
    /* Site Manager drops long-offline units from /v1/devices — when the site
       count exceeds the listed devices, that many units are down AND unnamed
       here (identify them in the UniFi console). */
    unlisted: Math.max(0, total - listed.length),
  };
}

/* One-line health verdict for the KPI card. */
export function unifiHealthLine(s) {
  if (!s) return "";
  const bad = [];
  if (s.console.state !== "connected") bad.push("console " + s.console.state);
  if (s.counts.offline > 0) bad.push(s.counts.offline + " device" + (s.counts.offline === 1 ? "" : "s") + " offline");
  if (s.counts.critical > 0) bad.push(s.counts.critical + " critical");
  return bad.length ? bad.join(" · ") : "all systems online";
}
