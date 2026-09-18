/* Voice call records — server half (2026-09-18). Shared by the brain
   (/api/voice-agent: call start / end events), the recording callback
   + audio proxy (/api/voice-call: POST callback, GET stream) and the daily
   sweeper in auto-trigger.mjs. Pure derivations live in src/lib/voicecall.js.

   Twilio is OPTIONAL: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN turn on call
   recording (started via the REST Recordings resource once the caller is
   connected; the file stays at Twilio and is streamed through the
   authenticated proxy — no service-role key, no new bucket). Without them
   every call still gets a summary, transcript, outcome and e-mail. */
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { rpcSecret } from "./_supa.mjs";
import { sendEmail, emailConfigured } from "./_email.mjs";
import {
  SUMMARY_TOOL, summaryPrompt, normalizeSummary, transcriptText, callEmail,
} from "../src/lib/voicecall.js";

export const PUBLIC_ORIGIN = (process.env.VOICE_PUBLIC_ORIGIN || "https://otb-command.vercel.app").replace(/\/$/, "");
/* Twilio posts recording status here (one function serves callback + audio —
   the Hobby plan's 12-function cap; see api/voice-call.js) */
export const RECORDING_CALLBACK = PUBLIC_ORIGIN + "/api/voice-call";
export const APP_URL = (process.env.APP_PUBLIC_URL || "https://otb.cypresscommand.com").replace(/\/$/, "");
const MODEL = process.env.VOICE_SUMMARY_MODEL || process.env.VOICE_MODEL || "claude-haiku-4-5-20251001";

/* ---- Twilio ---- */
export const twilioConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
const twilioBase = () => "https://api.twilio.com/2010-04-01/Accounts/" + process.env.TWILIO_ACCOUNT_SID;
const twilioAuth = () => "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");

/* Start recording the in-progress call (dual channel, silence trimmed);
   Twilio POSTs completion to /api/voice-recording. Best effort. */
export async function startRecording(callSid, secret) {
  if (!twilioConfigured() || !/^CA[0-9a-f]{32}$/i.test(callSid)) return { ok: false, reason: "not configured" };
  const form = new URLSearchParams({
    RecordingStatusCallback: RECORDING_CALLBACK,
    RecordingStatusCallbackEvent: "completed absent",
    RecordingChannels: "dual",
    Trim: "trim-silence",
  });
  try {
    const r = await fetch(twilioBase() + "/Calls/" + callSid + "/Recordings.json", {
      method: "POST",
      headers: { authorization: twilioAuth(), "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("twilio record:", r.status, String(j.message || "").slice(0, 160));
      return { ok: false, reason: "HTTP " + r.status };
    }
    try { await rpcSecret("voice_call_recording", { p_secret: secret, p_call_sid: callSid, p_recording_sid: j.sid || "", p_status: "in-progress" }); }
    catch (e) { console.error("voice recording rpc:", e.message); }
    return { ok: true, sid: j.sid };
  } catch (e) {
    console.error("twilio record:", e.message);
    return { ok: false, reason: e.message };
  }
}

/* X-Twilio-Signature = base64(HMAC-SHA1(authToken, url + Σ sorted(key+value))) */
export function twilioSignatureValid(url, params, signature, token = process.env.TWILIO_AUTH_TOKEN) {
  if (!token || !signature) return false;
  const keys = Object.keys(params || {}).sort();
  const data = url + keys.map(k => k + String(params[k] ?? "")).join("");
  const expected = crypto.createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* The recording media, streamed from Twilio (mp3). Returns the fetch Response. */
export function fetchRecordingAudio(recordingSid) {
  return fetch(twilioBase() + "/Recordings/" + recordingSid + ".mp3", {
    headers: { authorization: twilioAuth() },
    signal: AbortSignal.timeout(30000),
  });
}

/* ---- summary + classification (forced tool call; never throws) ---- */
export async function summarizeCall({ line, messages }) {
  const transcript = transcriptText(messages);
  const fallbackIntent = line === "leasing" ? "leasing" : "general";
  if (!transcript) {
    return normalizeSummary({ summary: "The caller hung up before anything was said.", intent: fallbackIntent, urgency: "routine" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return normalizeSummary({ summary: transcript.slice(0, 300), intent: fallbackIntent, urgency: "routine" });
  }
  try {
    const anthropic = new Anthropic();
    const r = await anthropic.messages.create({
      model: MODEL, max_tokens: 500,
      system: summaryPrompt(line),
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
      messages: [{ role: "user", content: "Transcript:\n\n" + transcript.slice(0, 12000) }],
    });
    const use = r.content.find(b => b.type === "tool_use");
    if (use) return normalizeSummary(use.input);
  } catch (e) { console.error("voice summary:", e.message); }
  return normalizeSummary({ summary: transcript.slice(0, 300), intent: fallbackIntent, urgency: "routine" });
}

/* ---- finalize: record → L-1 mirror → e-mail → emergency thread ---- */
export async function finalizeCall({ callSid, line, caller, messages, durationS, secret, cronSecret }) {
  const s = await summarizeCall({ line, messages });
  const transcript = transcriptText(messages);
  const r = await rpcSecret("voice_call_finalize", {
    p_secret: secret, p_call_sid: callSid, p_summary: s.summary, p_intent: s.intent,
    p_urgency: s.urgency, p_unit: s.unit, p_caller_name: s.caller_name, p_callback: s.callback,
    p_duration: Number.isFinite(durationS) ? Math.round(durationS) : null,
    p_transcript: transcript || null,
  });
  const call = { ...s, line, caller, started_at: r && r.started_at, duration_s: durationS, outcome: (r && r.outcome) || {} };
  const fullTranscript = (r && r.transcript) || transcript;

  let email = { sent: false, reason: "not configured" };
  if (emailConfigured()) {
    try {
      const to = await rpcSecret("voice_notify_recipients", { p_secret: secret });
      email = await sendEmail({ to, ...callEmail({ call, transcript: fullTranscript, appUrl: APP_URL }) });
      if (email.sent) await rpcSecret("voice_call_mark_notified", { p_secret: secret, p_call_sid: callSid });
    } catch (e) { email = { sent: false, reason: e.message }; }
  }

  if (s.urgency === "emergency" && cronSecret) {
    try {
      await rpcSecret("open_trigger_thread", {
        p_secret: cronSecret, p_agent: "manager",
        p_title: "EMERGENCY call" + (s.unit ? " — unit " + s.unit : ""),
        p_trigger: "voice-emergency:" + callSid,
        p_content: s.summary + (s.follow_up ? "\n\nNext step: " + s.follow_up : "") +
          (s.callback ? "\n\nCallback: " + s.callback : "") +
          "\n\nListen / read the call in L-1 Comm Log.",
      });
    } catch (e) { console.error("voice emergency thread:", e.message); }
  }
  return { summary: s, email, commId: r && r.comm_id };
}
