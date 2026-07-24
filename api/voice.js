/* P5 voice — ElevenLabs TTS proxy for the AI-1 concierge.
   POST /api/voice { text } → audio/mpeg stream. The xi key lives ONLY in the
   Vercel env (ELEVENLABS_API_KEY); callers need an owner/operator session,
   same gate as /api/concierge. Text is capped to protect the character quota.
   Voice: ELEVENLABS_VOICE_ID env override, else "Jack John" (natural customer
   support agent — the account's professional conversational voice). */
import { requireOwnerOrOperator, underDailyCap, capReply } from "./_auth.mjs";

export const maxDuration = 60;

const VOICE = process.env.ELEVENLABS_VOICE_ID || "7EzWGsX10sAS4c9m9cPf"; // Jack John
const MAX_TTS_CHARS = 2400;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ELEVENLABS_API_KEY) return res.status(500).json({ error: "voice not configured (missing ELEVENLABS_API_KEY)" });

  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  const cap = capReply(await underDailyCap("voice", 150, gate.token), "voice");
  if (cap) return res.status(cap.status).json({ error: cap.error });

  const text = String(req.body?.text || "").trim().slice(0, MAX_TTS_CHARS);
  if (!text) return res.status(400).json({ error: "no text" });

  const r = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE + "/stream?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    console.error("elevenlabs:", r.status, detail.slice(0, 200));
    return res.status(502).json({ error: "voice upstream error (" + r.status + ")" });
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
