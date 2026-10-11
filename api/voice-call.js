/* Call recording endpoint (2026-09-18) — ONE function for both halves, because
   the Vercel Hobby plan caps a deployment at 12 serverless functions (this
   was #13 as two files and the first deploy of the call-records PR failed):

   POST /api/voice-call        Twilio RecordingStatusCallback. Auth = the
                               X-Twilio-Signature HMAC over the exact callback
                               URL + form params (auth token as the key) —
                               nothing else can mark a recording. Writes go
                               through the secret-gated voice_call_recording
                               RPC; the file stays at Twilio.
   GET  /api/voice-call?sid=RE… streams that recording (mp3) to a signed-in
                               OWNER or OPERATOR — same gate as the concierge.
                               The sid must belong to a voice_calls row the
                               caller can read (voice_recording_for is
                               security-invoker: RLS decides), so a guessed
                               sid returns 404. Twilio credentials never leave
                               the server; the browser gets audio bytes only. */
import { requireOwnerOrOperator, underDailyCap, capReply } from "./_auth.mjs";
import { rpcSecret, rpcUser } from "./_supa.mjs";
import { twilioConfigured, twilioSignatureValid, fetchRecordingAudio, RECORDING_CALLBACK, deliverPackage } from "./_voicecall.mjs";
import UNITS from "../src/data/units.public.json" with { type: "json" };

export const maxDuration = 60;

async function twilioCallback(req, res) {
  if (!process.env.VOICE_SECRET) return res.status(503).send("recording not configured");
  const params = req.body && typeof req.body === "object" ? req.body : {};
  if (!twilioSignatureValid(RECORDING_CALLBACK, params, req.headers["x-twilio-signature"])) {
    console.error("voice-call: bad Twilio signature");
    return res.status(403).send("bad signature");
  }
  const callSid = String(params.CallSid || "");
  const recSid = String(params.RecordingSid || "");
  const status = String(params.RecordingStatus || "");
  const duration = Number.parseInt(params.RecordingDuration, 10);
  if (!/^CA[0-9a-f]{32}$/i.test(callSid) || !/^RE[0-9a-f]{32}$/i.test(recSid)) return res.status(400).send("bad sid");
  try {
    await rpcSecret("voice_call_recording", {
      p_secret: process.env.VOICE_SECRET, p_call_sid: callSid, p_recording_sid: recSid,
      p_status: status, p_duration: Number.isFinite(duration) ? duration : null,
    });
  } catch (e) {
    console.error("voice-call rpc:", e.message);
    return res.status(502).send("store failed");
  }
  return res.status(204).end();
}

async function streamAudio(req, res) {
  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  const sid = String(req.query?.sid || "");
  if (!/^RE[0-9a-f]{32}$/i.test(sid)) return res.status(400).json({ error: "bad recording sid" });

  let row = null;
  try { row = await rpcUser("voice_recording_for", gate.token, { p_recording_sid: sid }); }
  catch (e) { return res.status(502).json({ error: "lookup failed: " + e.message }); }
  if (!row || !row.recording_sid) return res.status(404).json({ error: "no such recording" });

  const r = await fetchRecordingAudio(sid);
  if (!r.ok) {
    console.error("voice-call twilio:", r.status);
    return res.status(r.status === 404 ? 404 : 502).json({ error: "recording unavailable (" + r.status + ")" });
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  const len = r.headers.get("content-length");
  if (len) res.setHeader("Content-Length", len);
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

/* POST /api/voice-call?action=package (2026-10-06) — the operator's "Send
   leasing package" button on an L-1 call card or a W-1 lead. Same sender as
   the phone agent (deliverPackage), so it is always the same final package.
   OPERATOR only (it e-mails / texts a prospect on Belle's behalf); capped at
   40 sends a day per user. Body { email, phone, name }. Folded in here, not a
   new file, to keep the function count flat. */
async function sendPackage(req, res) {
  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  if (gate.role !== "operator") return res.status(403).json({ error: "operator only" });
  const b = req.body && typeof req.body === "object" ? req.body : {};
  const email = String(b.email || "").trim().slice(0, 120);
  const phone = String(b.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
  if (!email && !phone) return res.status(400).json({ error: "give an e-mail address or a phone number" });
  const cap = capReply(await underDailyCap("leasing_package", 40, gate.token), "package");
  if (cap) return res.status(cap.status).json({ error: cap.error });
  const out = await deliverPackage({ email, phone, name: String(b.name || "").slice(0, 120), units: UNITS.units || UNITS });
  return res.status(200).json(out);
}

export default async function handler(req, res) {
  if (req.method === "POST" && req.query?.action === "package") return sendPackage(req, res);
  if (!twilioConfigured()) return res.status(503).json({ error: "recordings not configured" });
  if (req.method === "POST") return twilioCallback(req, res);
  if (req.method === "GET") return streamAudio(req, res);
  return res.status(405).json({ error: "GET or POST only" });
}
