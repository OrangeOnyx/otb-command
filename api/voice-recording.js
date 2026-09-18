/* Twilio RecordingStatusCallback (2026-09-18). Twilio POSTs here when a call
   recording completes (or is absent). Auth = the X-Twilio-Signature HMAC
   over the exact callback URL + form params (auth token as the key) —
   nothing else can mark a recording. Writes go through the secret-gated
   voice_call_recording RPC; the file itself stays at Twilio and is served
   by /api/voice-audio to signed-in owners / operators. Fails closed. */
import { rpcSecret } from "./_supa.mjs";
import { twilioConfigured, twilioSignatureValid, PUBLIC_ORIGIN } from "./_voicecall.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  if (!twilioConfigured() || !process.env.VOICE_SECRET) return res.status(503).send("recording not configured");
  const params = req.body && typeof req.body === "object" ? req.body : {};
  const url = PUBLIC_ORIGIN + "/api/voice-recording";
  if (!twilioSignatureValid(url, params, req.headers["x-twilio-signature"])) {
    console.error("voice-recording: bad signature");
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
    console.error("voice-recording rpc:", e.message);
    return res.status(502).send("store failed");
  }
  return res.status(204).end();
}
