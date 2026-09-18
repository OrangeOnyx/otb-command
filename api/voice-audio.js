/* Call recording proxy (2026-09-18). GET /api/voice-audio?sid=RE… streams the
   Twilio recording (mp3) to a signed-in OWNER or OPERATOR — the same gate as
   the concierge. The sid must belong to a voice_calls row the caller can
   read (voice_recording_for is security-invoker: RLS decides), so a guessed
   sid returns 404. Twilio credentials never leave the server; the browser
   gets audio bytes only (Cache-Control: no-store). */
import { requireOwnerOrOperator } from "./_auth.mjs";
import { rpcUser } from "./_supa.mjs";
import { twilioConfigured, fetchRecordingAudio } from "./_voicecall.mjs";

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  if (!twilioConfigured()) return res.status(503).json({ error: "recordings not configured" });
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
    console.error("voice-audio twilio:", r.status);
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
