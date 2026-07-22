/* UniFi Site Manager probe — inventory what api.ui.com exposes for the center.
   Reads UNIFI_API_KEY from ~/.otb-unifi.env (never committed, never printed).
   Usage: node tools/unifi-probe.mjs [--raw]   (--raw dumps full JSON to
   export/unifi-probe.json for integration design; summary prints either way) */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(homedir(), ".otb-unifi.env"), "utf8");
const KEY = (envText.match(/^UNIFI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error("UNIFI_API_KEY not found in ~/.otb-unifi.env");

const api = async (path) => {
  const r = await fetch("https://api.ui.com" + path, {
    headers: { "X-API-Key": KEY, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

const out = {};
for (const path of ["/v1/hosts", "/v1/sites", "/v1/devices"]) {
  try { out[path] = await api(path); }
  catch (e) { out[path] = { error: String(e.message).slice(0, 200) }; }
}

// summary (no keys/secrets/ids beyond what's needed to design the integration)
const hosts = out["/v1/hosts"]?.data || [];
console.log(`hosts: ${hosts.length}`);
for (const h of hosts) {
  console.log(`  ${h.reportedState?.hostname || h.type || "?"} · ${h.type || ""} · ip ${h.reportedState?.ip || "?"} · state ${h.reportedState?.state ?? "?"}`);
}
const sites = out["/v1/sites"]?.data || [];
console.log(`sites: ${sites.length}`);
for (const s of sites) {
  const st = s.statistics?.counts || {};
  console.log(`  ${s.meta?.name || s.siteId} · devices ${st.totalDevice ?? "?"} (offline ${st.offlineDevice ?? "?"}) · clients wifi ${st.wifiClient ?? "?"} wired ${st.wiredClient ?? "?"} · gateway ${s.meta?.gatewayMac || ""}`);
}
const devGroups = out["/v1/devices"]?.data || [];
for (const g of devGroups) {
  console.log(`devices @ ${g.hostName || g.hostId}: ${g.devices?.length ?? 0}`);
  for (const d of g.devices || []) {
    console.log(`  ${d.name || d.model} · ${d.model} · ${d.status} · ip ${d.ip || "-"} · fw ${d.version || "-"}`);
  }
}

if (process.argv.includes("--raw")) {
  mkdirSync(join(ROOT, "export"), { recursive: true });
  writeFileSync(join(ROOT, "export", "unifi-probe.json"), JSON.stringify(out, null, 1));
  console.log("raw -> export/unifi-probe.json");
}
