/* COI AI-parse — Vercel serverless function (Phase A-1, 2026-07-23).
   POST /api/coi-parse { filename, pdf } (pdf = base64, no data: prefix)
     → { ok: true, extraction: { expires, note, fields, warnings } }

   The V-1 operator panel files the cert PDF in the vendor's folder client-side
   (existing RLS path), then posts the bytes here; Haiku reads the ACORD form
   through a FORCED tool call and the seam (src/lib/coiparse.js) normalizes the
   result — the operator confirms before anything is written to public.vendors.
   OPERATOR-only (owners are read-only on V-1; vendors never reach this).
   The Anthropic key lives ONLY in the Vercel env. */
import Anthropic from "@anthropic-ai/sdk";
import { requireOwnerOrOperator, underDailyCap, capReply } from "./_auth.mjs";
import { COI_EXTRACT_TOOL, COI_PARSE_MAX_PDF_BYTES, normalizeCoiExtraction } from "../src/lib/coiparse.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "not configured (missing ANTHROPIC_API_KEY)" });

  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  if (gate.role !== "operator") return res.status(403).json({ error: "operator only" });
  const cap = capReply(await underDailyCap("coiparse", 60, gate.token), "COI-parse");
  if (cap) return res.status(cap.status).json({ error: cap.error });

  const pdf = req.body?.pdf;
  if (typeof pdf !== "string" || !pdf) return res.status(400).json({ error: "pdf (base64) required" });
  if (pdf.length * 0.75 > COI_PARSE_MAX_PDF_BYTES)
    return res.status(413).json({ error: "PDF too large (max 3 MB)" });

  const filename = String(req.body?.filename || "certificate.pdf").slice(0, 120);

  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      tools: [COI_EXTRACT_TOOL],
      tool_choice: { type: "tool", name: COI_EXTRACT_TOOL.name },
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
          {
            type: "text",
            text: `This file ("${filename}") is a vendor's certificate of insurance filed with a shopping-center property manager (likely an ACORD 25 form). Extract the GENERAL LIABILITY line's fields with record_coi. Dates as YYYY-MM-DD. Use null for anything not actually on the certificate — never guess.`,
          },
        ],
      }],
    });
    const tool = msg.content.find(b => b.type === "tool_use");
    if (!tool) return res.status(502).json({ error: "model returned no extraction" });
    return res.status(200).json({ ok: true, extraction: normalizeCoiExtraction(tool.input, new Date().toISOString().slice(0, 10)) });
  } catch (e) {
    console.error("coi-parse:", e);
    return res.status(502).json({ error: "COI parse failed (" + (e.status || e.message || "unknown") + ")" });
  }
}
