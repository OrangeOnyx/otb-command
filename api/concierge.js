/* AI-1 agent desk — Vercel serverless function.
   POST /api/concierge { agent?, threadId?, messages:[{role,content}...] }
     → text/plain stream (+ X-Thread-Id header; [[package:url|label]] lines
       mark assembled lease packages for the client to render as cards).

   Agents: 'concierge' (default, property Q&A) · 'leasing' (prospect handling +
   the assemble_lease_package tool) · 'manager' (operations). All share the
   prompt-cached dossier grounding + live-state digest. Transcripts persist to
   chat_threads/chat_messages (owner+operator RLS). The Anthropic key lives
   ONLY in the Vercel env; callers need an owner/operator session (vendors and
   pending 403). Lease assembly itself is OPERATOR-only. */
import Anthropic from "@anthropic-ai/sdk";
import { CONTEXT } from "./_context.mjs";
import { requireOwnerOrOperator, supaJson, underDailyCap, capReply } from "./_auth.mjs";
import { buildMessages, digestState } from "../src/lib/concierge.js";
import { LEASE_TOOL, buildProposalHTML, buildOwnerSummaryHTML, packageFileName } from "../src/lib/lease.js";
import { CALC_TOOL, runCalc, calcFallback } from "../src/lib/calc/index.js";
import { collectKnownNumbers, validateNumbers } from "../src/lib/calc/guardrail.js";
import units from "../src/data/units.json" with { type: "json" };
import recoveries from "../src/data/recoveries.json" with { type: "json" };
import hvac from "../src/data/hvac.json" with { type: "json" };

import { supaPost, storageUpload, storageSignedUrl } from "./_supa.mjs";

export const maxDuration = 60;

const CORE = `You work inside "Orange Ocean Atlas" (this deployment: On The Boulevard), the private management tool for On The Boulevard Shopping Center (101–149 Arnould Blvd, Lafayette, LA). Your users are the operator (Adam, Managing Member of Orange Ocean, LLC) and the property's owners.

Rules:
- Ground every answer in the property dossier below and the <live_state> block (when present). Live state supersedes the dossier where they conflict.
- Audit-grade facts are immutable: GLA 62,883 SF, 27 units, parking variance 99-11797 (324 provided / 344 required), street "Arnould Blvd", recorded subdivision "Arnold Heights Subd. Ext. No. 1" (deliberately "Arnold" — never "correct" it).
- Never invent numbers. If a figure is not in your context, say so and point to the sheet that holds it (R-1 rent roll, P-1 financial, C-1 compliance, T-1 dates, W-1 actions, K-1 directory, S-1 owner safe, V-1 vendors, A-1/A-2 plans).
- Never do arithmetic yourself. For deal comparisons (NER), CAM gross-up, Louisiana eviction sequencing, KPI math, capex reserve-gating, insurance claim timelines, or occupancy-cost-ratio checks, call the run_calc tool and narrate ONLY the numbers it returns — your reply is validated against the calculator output and withheld if figures don't trace.
- Known anomalies are surfaced-not-fixed; if asked about them, explain the conflict rather than resolving it.
- Executive register: answer first, brief support after. No filler.`;

const AGENTS = {
  concierge: {
    persona: `You are the property CONCIERGE — grounded Q&A across the whole record.`,
    tools: [CALC_TOOL],
  },
  leasing: {
    persona: `You are the LEASING AGENT for On The Boulevard.
- Availability today: the vacancies and holdovers in the dossier's rent roll are your inventory; quote asking terms from comparable in-place rents (say they are comparables, not list prices, unless the operator sets a number).
- Screen every prospect against: the exclusive-use watch (HotWorx 129 vs C. Wolf 135A), the liquor line (restaurant/alcohol uses — say which side the unit is on), and parking variance 99-11797 (floor space limited to available parking).
- When the operator asks you to assemble/prepare/send a lease package, collect the required terms conversationally, confirm them in one summary line, then call assemble_lease_package. 'proposal' is the tenant-facing package; 'owner_summary' is the internal review form. Never call the tool with terms the operator has not confirmed. After the tool returns, tell the operator the package is ready and that the buttons below the message open or email it.
- Every generated document is a DRAFT subject to legal review — say so.`,
    tools: [LEASE_TOOL, CALC_TOOL],
  },
  manager: {
    tools: [CALC_TOOL],
    persona: `You are the PROPERTY MANAGER'S desk — operations, maintenance, compliance, tenants, vendors.
- HVAC: per-unit tenant splits are in the dossier's HVAC table; Jason's Deli §9.01 requires monthly PM with Butcher Air Conditioning. The V-1 vendor roster holds service vendors (roofer: Grizzly Roofing / Shingle Solutions; exterminator: J&J; landscaping: Rotolo; plumbing, electrical, security are all on file).
- Open items you should know: roof membrane failure on the long-building RTU row (~101–109, roofer walk pending). NO holdovers as of Jul 2026 — all five renewed per the owner-corrected rent roll; nearest expiration is Clothing Loft (115-117) on 9/30/26.
- Draft tenant notices/letters in a welcoming, local, professional voice (Helvetica-plain business style; sign as Adam Anthony Abdalla, Property Manager; include "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."). Deliver drafts in the chat; they are drafts for the operator to send.`,
  },
};

/* NNN fallback for vacant units (their recovery row is zeros): center-typical
   figures derived from occupied rows at cold start. */
function recFor(unit) {
  const r = recoveries.units?.[unit];
  if (r && (r.cam || r.tax || r.ins)) return r;
  const rows = Object.values(recoveries.units || {}).filter(x => x.cam || x.tax || x.ins);
  const med = k => {
    const v = rows.map(x => +x[k] || 0).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  };
  return { cam: recoveries.camFlatPsf || med("cam"), tax: med("tax"), ins: med("ins") };
}

async function runLeaseTool(input, token) {
  const unit = units.find(u => u.unit === input.unit);
  if (!unit) return { ok: false, error: `Unknown unit "${input.unit}" — use a rent-roll unit number.` };
  const hv = hvac.units?.[input.unit]
    ? { ...hvac.units[input.unit], provider: hvac.provider }
    : { provider: hvac.provider };
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const html = input.package_type === "proposal"
    ? buildProposalHTML(input, unit, recFor(input.unit), hv, today)
    : buildOwnerSummaryHTML(input, unit, recFor(input.unit), hv, today);
  const file = "lease-packages/" + packageFileName(input, new Date().toISOString().slice(0, 10));
  const up = await storageUpload("documents", file, token, html, "text/html; charset=utf-8");
  if (!up.ok) return { ok: false, error: "package upload failed (" + up.status + ")" };
  // 48h — emailed bearer link; the package persists in the documents bucket, re-open from K-1 to reissue
  const url = await storageSignedUrl("documents", file, token, 172800);
  if (!url) return { ok: false, error: "package signing failed" };
  const label = `Unit ${input.unit} ${input.package_type === "proposal" ? "lease proposal" : "owner lease summary"} — ${input.tenant_company}`;
  return { ok: true, url, label, file };
}

/* transcripts (best effort — never block the answer) */
async function ensureThread(threadId, agent, firstLine, email, token) {
  if (threadId) return threadId;
  try {
    const r = await supaPost("/rest/v1/chat_threads", token,
      { agent, title: String(firstLine || "").slice(0, 80), created_by: email || "" },
      { prefer: "return=representation" });
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.id || null;
  } catch { return null; }
}
async function saveMessages(threadId, rows, token) {
  if (!threadId || !rows.length) return;
  try {
    await supaPost("/rest/v1/chat_messages", token,
      rows.map(r => ({ thread_id: threadId, role: r.role, content: r.content })));
  } catch { /* transcript loss is non-fatal */ }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "not configured (missing ANTHROPIC_API_KEY)" });

  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  const cap = capReply(await underDailyCap("concierge", 200, gate.token), "message");
  if (cap) return res.status(cap.status).json({ error: cap.error });

  const agentKey = AGENTS[req.body?.agent] ? req.body.agent : "concierge";
  const agent = AGENTS[agentKey];

  let msgs;
  try {
    msgs = buildMessages(req.body?.messages, await liveDigest(gate.token));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  // transcript stores the RAW question (buildMessages wraps the last turn in <live_state>)
  const rawMsgs = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const lastUser = String(rawMsgs[rawMsgs.length - 1]?.content || "");
  const threadId = await ensureThread(req.body?.threadId || null, agentKey, lastUser, gate.user.email, gate.token);

  const client = new Anthropic();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Thread-Id", threadId || "");

  const system = [{ type: "text", text: agent.persona + "\n\n" + CORE + "\n\nThe dossier:\n\n" + CONTEXT, cache_control: { type: "ephemeral" } }];
  const packages = [];
  let full = "";
  // Numeric guardrail (split by stakes): chat streams live, but once run_calc
  // has produced figures, every later round is BUFFERED and validated against
  // the calculator output before the operator sees it — fail closed, never
  // fabricated numbers (donor: belle-realty-pwa synth-validator, spec §385).
  let calcKnown = null;
  const calcFallbacks = [];
  try {
    let loop = [...msgs];
    for (let round = 0; round < 4; round++) {
      let roundText = "";
      const buffered = calcKnown !== null;
      const stream = client.messages.stream({
        model: "claude-opus-4-8",
        max_tokens: 2500,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system,
        tools: agent.tools,
        messages: loop,
      });
      stream.on("text", t => {
        if (buffered) roundText += t;
        else { full += t; res.write(t); }
      });
      const final = await stream.finalMessage();
      if (buffered && roundText) {
        const v = validateNumbers(roundText, calcKnown);
        let outText = roundText;
        if (!v.passed) {
          console.warn("guardrail failed closed:", agentKey, "unverified:", v.hallucinated.join(", "));
          outText = "⚠ I withheld my draft answer — it contained figures that don't trace to the calculator." +
            (calcFallbacks.length ? "\n\n" + calcFallbacks.join("\n") : "") +
            "\n\nAsk again and I'll re-run the numbers.";
        }
        full += outText; res.write(outText);
      }
      if (final.stop_reason !== "tool_use") {
        if (final.stop_reason === "refusal" || (!full && !packages.length)) {
          const msg = "I can't help with that request — ask me about the property.";
          full += msg; res.write(msg);
        }
        break;
      }
      const results = [];
      for (const block of final.content.filter(b => b.type === "tool_use")) {
        let out;
        if (block.name === "run_calc") {
          out = runCalc(block.input);
          if (out.ok) {
            // Ground later narration in the calc output AND the model's own
            // inputs (which echo dossier/operator figures legitimately).
            const add = collectKnownNumbers(out, block.input);
            calcKnown = calcKnown ? new Set([...calcKnown, ...add]) : add;
            const fb = calcFallback(out);
            if (fb) calcFallbacks.push(fb);
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
          continue;
        }
        if (block.name !== "assemble_lease_package") out = { ok: false, error: "unknown tool" };
        else if (gate.role !== "operator") out = { ok: false, error: "Lease assembly is operator-only." };
        else out = await runLeaseTool(block.input, gate.token);
        if (out.ok) packages.push(out);
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.ok ? { ok: true, label: out.label } : out) });
      }
      loop = [...loop, { role: "assistant", content: final.content }, { role: "user", content: results }];
    }
    for (const p of packages) {
      const line = `\n\n[[package:${p.url}|${p.label}]]`;
      full += line; res.write(line);
    }
    res.end();
    await saveMessages(threadId, [{ role: "user", content: lastUser }, { role: "assistant", content: full }], gate.token);
  } catch (err) {
    console.error("agent-desk:", agentKey, err?.status, err?.message);
    if (res.writableEnded) return;
    if (res.headersSent) { res.write("\n\n[Agent error — try again.]"); res.end(); }
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
