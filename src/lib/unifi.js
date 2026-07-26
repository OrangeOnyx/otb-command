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

const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* Offline auto-trigger candidate (deferred item from the D-1 card ship).
   Keyed by the OUTAGE SET, not the date: the same devices down = the same
   trigger_source = one manager thread ever (chat_threads unique index); a
   different device dropping — or one recovering while another stays down —
   changes the key and opens a fresh thread. The known long-offline unlisted
   unit therefore alerts exactly once, not daily. Null when healthy. */
export function unifiTriggerCandidate(s) {
  if (!s) return null;
  const down = s.devices.filter(d => d.status !== "online").map(d => d.name).sort();
  const consoleBad = s.console.state !== "connected";
  if (!down.length && !s.unlisted && !consoleBad) return null;
  const key = [
    consoleBad ? "console" : "",
    ...down.map(slug),
    s.unlisted ? s.unlisted + "-unlisted" : "",
  ].filter(Boolean).join("+") || "unknown";
  const parts = [];
  if (consoleBad) parts.push("the UDM console reports \"" + s.console.state + "\"");
  if (down.length) parts.push("offline: " + down.join(", "));
  if (s.unlisted) parts.push(s.unlisted + " unit" + (s.unlisted === 1 ? " is" : "s are") +
    " down so long Site Manager dropped " + (s.unlisted === 1 ? "it" : "them") +
    " from the device list (unnamed via API — identify in the UniFi console)");
  return {
    kind: "unifi",
    agent: "manager",
    triggerSource: "unifi:" + key,
    title: "Network gear offline — " + (down.length + s.unlisted) + " of " + s.counts.total + " devices",
    detail: "UniFi Site Manager health check: " + parts.join(" · ") + ". " +
      "Tenant WiFi and the camera uplinks ride this gear — check PoE at the USW Pro Max and " +
      "power at the suite AP if a single unit, or the UDM/WAN if the console itself is dark. " +
      "The D-1 Network card shows live status.",
  };
}
