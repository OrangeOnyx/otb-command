/* A-3 ConversationRelay bridge — the ONLY always-on process in the system.
   Runs on Fly.io (fly.toml alongside); Vercel can't hold a WebSocket open.
   Deliberately dumb: no LLM, no Supabase, no property facts. It speaks the
   Twilio ConversationRelay wire protocol on one side and POSTs each caller
   utterance to the Vercel brain (/api/voice-agent) on the other.

   HTTP:
     GET  /healthz            → ok (Fly checks)
     POST /twiml?line=tenant|leasing → TwiML pointing Twilio at wss://…/ws
   WS:
     /ws?line=…&from=…        → ConversationRelay session (one per call)

   Env: BRAIN_URL (https://otb-command.vercel.app) · VOICE_SECRET (shared with
   the brain; app_secrets 'voice_agent') · TTS_PROVIDER (default ElevenLabs) ·
   TTS_VOICE (default Jack John id) · PORT (default 8080). Greetings come from
   the brain's config endpoint (voice_settings row), cached 10 min, with
   hardcoded fallbacks so a brain outage still answers the phone. */
import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const BRAIN = (process.env.BRAIN_URL || "https://otb-command.vercel.app").replace(/\/$/, "");
const SECRET = process.env.VOICE_SECRET || "";
const TTS_PROVIDER = process.env.TTS_PROVIDER || "ElevenLabs";
const TTS_VOICE = process.env.TTS_VOICE || "7EzWGsX10sAS4c9m9cPf"; // Jack John — same voice as in-app AI-1
const SORRY = "I'm sorry, I'm having trouble on my end. Adam will see this call and follow up with you. Thank you for calling.";

const FALLBACK_GREETING = {
  tenant: "Thanks for calling On The Boulevard tenant services. How can I help?",
  leasing: "Thanks for calling On The Boulevard leasing. How can I help?",
};

let greetingCache = { at: 0, tenant: null, leasing: null };
async function greeting(line) {
  if (Date.now() - greetingCache.at > 10 * 60 * 1000) {
    try {
      const r = await fetch(BRAIN + "/api/voice-agent", {
        headers: { authorization: "Bearer " + SECRET },
        signal: AbortSignal.timeout(2500),
      });
      if (r.ok) {
        const j = await r.json();
        greetingCache = { at: Date.now(), tenant: j.greeting_tenant, leasing: j.greeting_leasing };
      }
    } catch { /* keep stale/fallback */ }
  }
  return greetingCache[line] || FALLBACK_GREETING[line];
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200); return res.end("ok"); }
  if (url.pathname === "/twiml") {
    const line = url.searchParams.get("line") === "leasing" ? "leasing" : "tenant";
    let body = "";
    for await (const c of req) body += c;
    const from = (body.match(/(?:^|&)From=([^&]*)/) || [])[1] || "";
    const host = req.headers["fly-app-name"] ? `${req.headers["fly-app-name"]}.fly.dev` : req.headers.host;
    const ws = `wss://${host}/ws?line=${line}&from=${from}`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Connect><ConversationRelay url="${esc(ws)}" welcomeGreeting="${esc(await greeting(line))}" ttsProvider="${esc(TTS_PROVIDER)}" voice="${esc(TTS_VOICE)}" transcriptionProvider="Deepgram" speechModel="nova-2-phonecall" /></Connect></Response>`;
    res.writeHead(200, { "content-type": "text/xml" });
    return res.end(xml);
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const line = url.searchParams.get("line") === "leasing" ? "leasing" : "tenant";
  let caller = decodeURIComponent(url.searchParams.get("from") || "");
  let callSid = "";
  const messages = [];
  let busy = false;

  const speak = (text, last = true) => ws.send(JSON.stringify({ type: "text", token: text, last }));

  ws.on("message", async (data) => {
    let event;
    try { event = JSON.parse(data); } catch { return; }

    if (event.type === "setup" || event.type === "connected") {
      callSid = event.callSid || callSid;
      caller = event.from || caller;
      return;
    }
    if (event.type === "error") { console.error("relay error:", event.description); return; }
    if (event.type !== "prompt" || !event.voicePrompt) return;
    if (busy) return; // one utterance in flight; Twilio buffers barge-in
    busy = true;

    messages.push({ role: "user", content: event.voicePrompt });
    try {
      const r = await fetch(BRAIN + "/api/voice-agent", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + SECRET },
        body: JSON.stringify({ line, callSid, caller, messages }),
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) throw new Error("brain HTTP " + r.status);
      const { reply } = await r.json();
      messages.push({ role: "assistant", content: reply });
      speak(reply);
    } catch (e) {
      console.error("brain call failed:", e.message);
      speak(SORRY);
    } finally {
      busy = false;
    }
  });

  ws.on("error", (e) => console.error("ws:", e.message));
});

server.listen(PORT, () => console.log("voice bridge on :" + PORT + " → " + BRAIN));
