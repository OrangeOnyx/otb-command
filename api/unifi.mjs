/* /api/unifi — D-1 infrastructure summary. Proxies UniFi Site Manager
   (api.ui.com) server-side: the key lives ONLY in the Vercel env
   (UNIFI_API_KEY), same discipline as the Anthropic/ElevenLabs keys. Gated to
   owner/operator sessions like concierge/voice. Response is the pure-seam
   shape (src/lib/unifi.js) — no raw vendor payloads to the client. */
import { requireOwnerOrOperator } from "./_auth.mjs";
import { shapeUnifi } from "../src/lib/unifi.js";

const UI = "https://api.ui.com";

async function ui(path, key) {
  const r = await fetch(UI + path, { headers: { "X-API-Key": key, Accept: "application/json" } });
  if (!r.ok) throw new Error(path + ": HTTP " + r.status);
  return r.json();
}

export default async function handler(req, res) {
  const key = process.env.UNIFI_API_KEY;
  if (!key) return res.status(500).json({ error: "UNIFI_API_KEY not configured" });

  const auth = await requireOwnerOrOperator(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const [hosts, sites, devices] = await Promise.all([
      ui("/v1/hosts", key), ui("/v1/sites", key), ui("/v1/devices", key),
    ]);
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(shapeUnifi(hosts, sites, devices));
  } catch (e) {
    return res.status(502).json({ error: "UniFi API: " + e.message });
  }
}
