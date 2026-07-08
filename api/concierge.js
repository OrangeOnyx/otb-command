/* P4 AI Concierge — Vercel serverless function.
   POST /api/concierge  { messages:[{role,content}...] }  →  text/plain stream.

   The Anthropic key lives ONLY in the Vercel env (ANTHROPIC_API_KEY) — never in
   the client bundle. Callers must present a valid Supabase session token
   (Authorization: Bearer <jwt>) belonging to an owner or operator; the future
   P3 vendor role is sealed out here just like the S-1 Safe.

   Grounding = static dossier (api/_context.mjs, prompt-cached — regenerate with
   `npm run concierge-context`) + a volatile digest of the live property_state
   layers woven into the final user turn so the cached prefix stays byte-stable. */
import Anthropic from "@anthropic-ai/sdk";
import { CONTEXT } from "./_context.mjs";
import { requireOwnerOrOperator, supaJson } from "./_auth.mjs";
import { buildMessages, digestState } from "../src/lib/concierge.js";

export const maxDuration = 60;

const PREAMBLE = `You are the AI concierge inside "OTB Property Command", the private management tool for On The Boulevard Shopping Center (101–149 Arnould Blvd, Lafayette, LA). Your users are the operator (Adam, Managing Member of Orange Ocean, LLC) and the property's owners.

Rules:
- Ground every answer in the property dossier below and the <live_state> block (when present). Live state supersedes the dossier where they conflict.
- Audit-grade facts are immutable: GLA 62,883 SF, 27 units, parking variance 99-11797 (324 provided / 344 required), street "Arnould Blvd", recorded subdivision "Arnold Heights Subd. Ext. No. 1" (deliberately "Arnold" — never "correct" it).
- Never invent numbers. If a figure is not in your context, say so and point to the sheet that holds it (R-1 rent roll, P-1 financial, C-1 compliance, T-1 dates, W-1 actions, K-1 directory, S-1 owner safe, A-1/A-2 plans).
- Known anomalies are surfaced-not-fixed; if asked about them, explain the conflict rather than resolving it.
- Executive register: answer first, brief support after. No filler. Use the actual unit numbers, dollar figures, and dates from context.

The dossier:

`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "concierge not configured (missing ANTHROPIC_API_KEY)" });

  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });

  let msgs;
  try {
    msgs = buildMessages(req.body?.messages, await liveDigest(gate.token));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: PREAMBLE + CONTEXT, cache_control: { type: "ephemeral" } }],
      messages: msgs,
    });
    stream.on("text", t => res.write(t));
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal" || !final.content.some(b => b.type === "text" && b.text)) {
      res.write("I can't help with that request. Ask me about the property — leases, tenants, parking, compliance, financials.");
    }
    res.end();
  } catch (err) {
    console.error("concierge:", err?.status, err?.message);
    if (res.writableEnded) return;
    if (res.headersSent) { res.write("\n\n[Concierge error — try again.]"); res.end(); }
    else res.status(502).json({ error: "upstream error: " + (err?.message || "unknown") });
  }
}

/* Best-effort live-state digest; never blocks an answer. */
async function liveDigest(token) {
  try {
    const rows = await supaJson("/rest/v1/property_state?property_id=eq.otb&select=layer,data", token);
    if (!Array.isArray(rows)) return "";
    const layers = {};
    rows.forEach(r => { layers[r.layer] = r.data; });
    return digestState(layers);
  } catch { return ""; }
}
