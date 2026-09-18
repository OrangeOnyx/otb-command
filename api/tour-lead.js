/* Website tour request (2026-09-18; the 13th function — Vercel Pro lifted the
   Hobby cap the same day). POST { name, phone, email?, unit?, note?, company? }
   from the public /tour page → deals row + L-1 note (secret-gated
   web_tour_lead RPC) → AI-1 manager thread → owner e-mail (when configured).
   No auth (it is the public site); guards: honeypot field `company`, length
   caps, a 10-digit US phone or an e-mail, same-origin only, the RPC's
   40-per-day cap. Never leaks internals — the visitor sees ok / try calling. */
import { rpcSecret } from "./_supa.mjs";
import { sendEmail, emailConfigured } from "./_email.mjs";
import { APP_URL } from "./_voicecall.mjs";

export const maxDuration = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.VOICE_SECRET) return res.status(503).json({ ok: false, error: "not configured" });
  const b = req.body && typeof req.body === "object" ? req.body : {};
  if (String(b.company || "").trim()) return res.status(200).json({ ok: true }); // honeypot: pretend
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (origin && !origin.endsWith("//" + host)) return res.status(403).json({ ok: false, error: "same-origin only" });

  const name = String(b.name || "").trim().slice(0, 120);
  const digits = String(b.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const phone = digits.length === 10 ? digits : "";
  const email = EMAIL_RE.test(String(b.email || "").trim()) ? String(b.email).trim().toLowerCase().slice(0, 120) : "";
  const unit = String(b.unit || "").trim().slice(0, 20);
  const note = String(b.note || "").trim().slice(0, 1000);
  if (!name || (!phone && !email)) return res.status(400).json({ ok: false, error: "name and a phone or e-mail" });

  let lead;
  try {
    lead = await rpcSecret("web_tour_lead", {
      p_secret: process.env.VOICE_SECRET, p_name: name, p_phone: phone, p_email: email, p_unit: unit, p_note: note,
    });
  } catch (e) {
    console.error("tour-lead rpc:", e.message);
    return res.status(503).json({ ok: false, error: "could not save — please call or text (337) 270-7044" });
  }
  const id = (lead && lead.lead) || "";
  const who = name + (phone ? " · " + phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") : "") + (email ? " · " + email : "");
  const line = "Website tour request" + (unit ? " — Suite " + unit : "") + " from " + who + (note ? "\n\n" + note : "");
  try {
    if (process.env.CRON_SECRET) await rpcSecret("open_trigger_thread", {
      p_secret: process.env.CRON_SECRET, p_agent: "manager",
      p_title: "Tour request" + (unit ? " — Suite " + unit : "") + " · " + name,
      p_trigger: "web-lead:" + id,
      p_content: line + "\n\nSaved to the W-1 pipeline (" + id + "); the note is in L-1. Call them back within the day.",
    });
  } catch (e) { console.error("tour-lead thread:", e.message); }
  if (emailConfigured()) {
    try {
      const to = await rpcSecret("voice_notify_recipients", { p_secret: process.env.VOICE_SECRET });
      await sendEmail({ to, subject: "Tour request" + (unit ? " — Suite " + unit : "") + " · " + name,
        text: line + "\n\nW-1 pipeline: " + APP_URL + "/#board",
        html: '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;color:#1C2B26"><h2 style="margin:0 0 8px">Tour request' + (unit ? " — Suite " + esc(unit) : "") + '</h2><p>' + esc(who).replace(/\n/g, "<br>") + '</p>' + (note ? '<p style="white-space:pre-wrap;border-left:3px solid #A87E2F;padding-left:10px">' + esc(note) + '</p>' : "") + '<p><a href="' + esc(APP_URL) + '/#board" style="color:#A87E2F;font-weight:600">Open the W-1 pipeline →</a></p></div>' });
    } catch (e) { console.error("tour-lead email:", e.message); }
  }
  return res.status(200).json({ ok: true });
}
