/* A-3 voice brain — Vercel serverless, called once per caller utterance by the
   Fly ConversationRelay bridge (bridge = dumb transport; ALL intelligence,
   secrets, and writes live here, next to the concierge).
   POST { line:'tenant'|'leasing', callSid, caller, messages:[{role,content}…] }
     → { reply }   (plain speakable text — the bridge feeds it to Twilio TTS)
   Auth: Authorization: Bearer <VOICE_SECRET> (Fly + Vercel env copies of the
   app_secrets 'voice_agent' row — rotated via tools/rotate-voice-secret.mjs).
   Fails closed everywhere: bad secret 401, missing config 503, upstream error
   → a spoken apology + callback promise, never a dead line. */
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { rpcSecret } from "./_supa.mjs";
import {
  tenantPersona, leasingPersona, nextTourSlots, slotLabel, speechify,
  MAINT_TOOL, TOUR_TOOL, PACKAGE_TOOL, MAX_TURNS, DEFAULT_TOUR_WINDOWS, SLOT_MINUTES_DEFAULT,
  claimsBooking, BOOKING_GUARD_NOTE, BOOKING_FALLBACK,
} from "../src/lib/voiceagent.js";
import { leasingPackageEmail } from "../src/lib/leasing.js";
import { startRecording, finalizeCall } from "./_voicecall.mjs";
import { sendEmail, emailConfigured } from "./_email.mjs";
import sop from "../src/data/sop.json" with { type: "json" };
import UNITS from "../src/data/units.public.json" with { type: "json" };

export const maxDuration = 60;

const MODEL = process.env.VOICE_MODEL || "claude-haiku-4-5-20251001";
const SORRY = "I'm sorry, I'm having trouble on my end. Adam will see this call and follow up with you. Thank you for calling.";

function secretOk(req) {
  const secret = process.env.VOICE_SECRET || "";
  const got = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!secret || !got || got.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

/* wall-clock ms + spoken now-line in the property's timezone */
function chicagoNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", hour12: false,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", weekday: "long",
    }).formatToParts(new Date()).map(p => [p.type, p.value]));
  const ms = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
    +parts.hour % 24, +parts.minute);
  const h = +parts.hour % 24, h12 = ((h + 11) % 12) + 1;
  const nowLine = `${parts.weekday}, ${+parts.month}/${+parts.day}, ${h12}:${String(parts.minute).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return { ms, nowLine };
}

/* what the call produced, merged onto voice_calls.outcome (the finalized
   record + owner e-mail link to it) — best effort, never blocks the reply */
async function recordOutcome(callSid, key, value) {
  if (!callSid) return;
  try { await rpcSecret("voice_call_outcome", { p_secret: process.env.VOICE_SECRET, p_call_sid: callSid, p_key: key, p_value: value }); }
  catch (e) { console.error("voice outcome:", key, e.message); }
}

const SLOT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function runTool(name, input, callSid, caller) {
  const p_secret = process.env.VOICE_SECRET;
  try {
    if (name === "file_maintenance_request") {
      const id = await rpcSecret("voice_file_maintenance", {
        p_secret, p_unit: String(input.unit || ""), p_title: String(input.title || ""),
        p_detail: String(input.detail || ""), p_urgency: String(input.urgency || "routine"),
        p_caller: caller,
      });
      await recordOutcome(callSid, "work_order", id);
      return { ok: true, request_id: id, note: "Work order filed. The operator sees it immediately." };
    }
    if (name === "book_tour") {
      const r = await rpcSecret("voice_book_tour", {
        p_secret, p_slot_key: String(input.slot_key || ""), p_name: String(input.name || ""),
        p_phone: String(input.phone || ""), p_interest: String(input.interest || ""),
        p_call_sid: callSid,
      });
      if (r === "ok") {
        const key = String(input.slot_key || "");
        await recordOutcome(callSid, "tour", { slot_key: key, label: SLOT_RE.test(key) ? slotLabel(key) : key, name: String(input.name || "") });
      }
      return r === "ok"
        ? { ok: true, note: "Booked. The operator is notified and will confirm." }
        : { ok: false, note: "That slot was just taken — offer the next open slot." };
    }
    if (name === "send_leasing_package") {
      /* the lead is saved regardless; the package e-mails only when the caller
         gave an address AND mail is configured — the reply never overclaims */
      const email = String(input.email || "").trim().toLowerCase();
      const name_ = String(input.name || "").trim();
      const leadId = await rpcSecret("voice_leasing_lead", {
        p_secret, p_call_sid: callSid, p_name: name_, p_phone: String(input.phone || ""),
        p_email: email, p_interest: String(input.interest || ""), p_unit: String(input.unit || ""),
      });
      await recordOutcome(callSid, "lead", leadId);
      const okEmail = EMAIL_RE.test(email);
      let sent = false;
      if (okEmail && emailConfigured()) {
        const msg = leasingPackageEmail({ units: UNITS.units || UNITS, prospect: name_.split(" ")[0] });
        sent = (await sendEmail({ to: [email], subject: msg.subject, text: msg.text, html: msg.html })).sent;
      }
      await recordOutcome(callSid, "package", { sent, email: okEmail ? email : "" });
      return sent
        ? { ok: true, note: "Package e-mailed to " + email + ". Confirm the address aloud and let them know it is on its way." }
        : okEmail
          ? { ok: true, note: "Lead saved; the operator will e-mail the package to " + email + " shortly. Say Adam will send it today — do not say it has already been sent." }
          : { ok: true, note: "Lead saved with no e-mail address. Say Adam will follow up by phone with the package — do not claim anything was sent." };
    }
    return { ok: false, note: "unknown tool" };
  } catch (e) {
    console.error("voice tool:", name, e.message);
    return { ok: false, note: "The system couldn't record that just now. Take the details verbally and promise the operator's follow-up." };
  }
}

export default async function handler(req, res) {
  /* GET = bridge config pull (greetings from the voice_settings row) */
  if (req.method === "GET") {
    if (!process.env.VOICE_SECRET) return res.status(503).json({ error: "voice agent not configured" });
    if (!secretOk(req)) return res.status(401).json({ error: "unauthorized" });
    try {
      const st = await rpcSecret("voice_tour_state", { p_secret: process.env.VOICE_SECRET });
      const s = st?.settings || {};
      return res.status(200).json({ greeting_tenant: s.greeting_tenant, greeting_leasing: s.greeting_leasing });
    } catch { return res.status(502).json({ error: "settings unavailable" }); }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY || !process.env.VOICE_SECRET)
    return res.status(503).json({ error: "voice agent not configured" });
  if (!secretOk(req)) return res.status(401).json({ error: "unauthorized" });

  const line = req.body?.line === "leasing" ? "leasing" : req.body?.line === "tenant" ? "tenant" : null;
  if (!line) return res.status(400).json({ error: "line must be tenant|leasing" });
  const callSid = String(req.body?.callSid || "").slice(0, 64);
  const caller = String(req.body?.caller || "").slice(0, 20);
  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];

  /* call lifecycle events from the bridge (2026-09-18 call records):
     setup → the row exists + recording starts (when Twilio creds are set);
     end   → summary / classification / L-1 mirror / owner e-mail. Both are
     best effort: a failure here never touches a live call. */
  const event = req.body?.event === "setup" ? "setup" : req.body?.event === "end" ? "end" : "";
  if (event) {
    if (!callSid) return res.status(400).json({ error: "callSid required" });
    if (event === "setup") {
      try { await rpcSecret("voice_call_start", { p_secret: process.env.VOICE_SECRET, p_call_sid: callSid, p_line: line, p_caller: caller }); }
      catch (e) { console.error("voice call start:", e.message); }
      const rec = await startRecording(callSid, process.env.VOICE_SECRET);
      return res.status(200).json({ ok: true, recording: rec.ok });
    }
    const messages = raw
      .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    const durationS = Number(req.body?.durationS);
    try {
      await rpcSecret("voice_call_start", { p_secret: process.env.VOICE_SECRET, p_call_sid: callSid, p_line: line, p_caller: caller });
      const out = await finalizeCall({
        callSid, line, caller, messages, durationS: Number.isFinite(durationS) ? durationS : null,
        secret: process.env.VOICE_SECRET, cronSecret: process.env.CRON_SECRET,
      });
      return res.status(200).json({ ok: true, intent: out.summary.intent, urgency: out.summary.urgency, email: out.email.sent });
    } catch (e) {
      console.error("voice call end:", e.message);
      return res.status(200).json({ ok: false, error: e.message });
    }
  }
  const messages = raw
    .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-MAX_TURNS * 2)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user")
    return res.status(400).json({ error: "messages must end with a user turn" });

  const { ms, nowLine } = chicagoNow();

  /* leasing line: live slot inventory woven into the persona each turn */
  let slots = [];
  if (line === "leasing") {
    try {
      const st = await rpcSecret("voice_tour_state", { p_secret: process.env.VOICE_SECRET });
      const s = st?.settings || {};
      slots = nextTourSlots(s.tour_windows || DEFAULT_TOUR_WINDOWS, ms, 6,
        st?.booked || [], s.slot_minutes || SLOT_MINUTES_DEFAULT);
    } catch (e) {
      console.error("voice tour state:", e.message);
      slots = []; // persona falls back to callback-promise mode
    }
  }

  const system = line === "tenant"
    ? tenantPersona(sop, { nowLine })
    : leasingPersona(sop, { nowLine, slots });
  const tools = line === "tenant" ? [MAINT_TOOL] : [TOUR_TOOL, PACKAGE_TOOL];

  const anthropic = new Anthropic();
  let reply = "";
  let bookedThisTurn = false;
  const convo = messages.slice();
  async function modelRounds(max) {
    for (let round = 0; round < max; round++) {
      const r = await anthropic.messages.create({
        model: MODEL, max_tokens: 400, system, tools, messages: convo,
      });
      const toolUse = r.content.find(b => b.type === "tool_use");
      const text = r.content.filter(b => b.type === "text").map(b => b.text).join(" ");
      if (!toolUse) { reply = text; return; }
      const result = await runTool(toolUse.name, toolUse.input, callSid, caller);
      if (toolUse.name === "book_tour" && result.ok) bookedThisTurn = true;
      convo.push({ role: "assistant", content: r.content });
      convo.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }],
      });
      reply = text; // keep last text in case the loop caps out
    }
  }
  try {
    await modelRounds(3);

    /* truthful-booking guard (queue #1): a leasing reply may assert a booking
       ONLY if book_tour succeeded this turn or earlier in this same call
       (checked in tour_bookings by call_sid — the bridge's text-only history
       carries no tool evidence). One corrective round, then an honest
       fallback + a voice-lead manager thread so the lead can't drop. */
    if (line === "leasing" && claimsBooking(reply) && !bookedThisTurn) {
      let bookedEarlier = false;
      try {
        bookedEarlier = await rpcSecret("voice_call_has_booking",
          { p_secret: process.env.VOICE_SECRET, p_call_sid: callSid }) === true;
      } catch (e) { console.error("voice booking check:", e.message); }
      if (!bookedEarlier) {
        console.error("voice guard: unbacked booking claim", callSid);
        convo.push({ role: "assistant", content: reply || "(no reply)" });
        convo.push({ role: "user", content: BOOKING_GUARD_NOTE });
        await modelRounds(2);
        if (claimsBooking(reply) && !bookedThisTurn) {
          reply = BOOKING_FALLBACK;
          try {
            await rpcSecret("open_trigger_thread", {
              p_secret: process.env.CRON_SECRET, p_agent: "manager",
              p_title: "Voice lead needs booking follow-up",
              p_trigger: "voice-lead:" + callSid,
              p_content: "The leasing agent claimed a booking twice without a book_tour success on call " +
                callSid + " (caller " + (caller || "unknown") + "). The honest fallback was spoken. " +
                "Check the voice-leasing transcript in AI-1 and call the prospect back to set the tour.",
            });
          } catch (e) { console.error("voice guard thread:", e.message); }
        }
      }
    }
  } catch (e) {
    console.error("voice anthropic:", e.message);
    reply = "";
  }
  reply = speechify(reply) || SORRY;

  /* transcript — best effort, never blocks the spoken reply */
  try {
    await rpcSecret("voice_log_turn", {
      p_secret: process.env.VOICE_SECRET, p_call_sid: callSid, p_line: line,
      p_caller: caller, p_user: messages[messages.length - 1].content, p_assistant: reply,
    });
  } catch (e) { console.error("voice transcript:", e.message); }

  return res.status(200).json({ reply });
}
