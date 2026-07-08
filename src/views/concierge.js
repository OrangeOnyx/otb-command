/* AI-1 Concierge — grounded property Q&A chat (P4).
   The Anthropic call happens server-side (/api/concierge, key never ships to
   the client); this view holds a session-only transcript, streams the reply
   into the last bubble, and renders assistant markdown via lib/concierge. */
import { REMOTE, sb } from "../lib/remote.js";
import { mdToHtml, mdToSpeech } from "../lib/concierge.js";
import { esc } from "../lib/format.js";

/* ── P5 voice: server-side ElevenLabs proxy (/api/voice) ───────── */
let currentAudio = null;
function stopSpeech() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  document.querySelectorAll(".ai-speak.playing").forEach(b => b.classList.remove("playing"));
}
async function speak(md, btn) {
  if (btn && btn.classList.contains("playing")) { stopSpeech(); return; }
  stopSpeech();
  if (btn) btn.classList.add("playing");
  try {
    const session = (await sb.auth.getSession()).data.session;
    if (!session) throw new Error("session expired");
    const r = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ text: mdToSpeech(md) }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const url = URL.createObjectURL(await r.blob());
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = audio.onerror = () => { URL.revokeObjectURL(url); if (btn) btn.classList.remove("playing"); if (currentAudio === audio) currentAudio = null; };
    await audio.play();
  } catch (e) {
    if (btn) btn.classList.remove("playing");
    console.warn("voice:", e.message);
  }
}
const autoSpeak = () => localStorage.getItem("otb-voice-auto") === "1";

const SUGGESTIONS = [
  "Which leases expire in the next 12 months, and what rent is at risk?",
  "Summarize the parking situation — variance vs plat.",
  "What can I lease to a restaurant, given the liquor line?",
  "Who do I call about HVAC at Jason's Deli, and what does the lease require?",
];

const history = []; // {role, content} — session-only, resets on reload

export function initConcierge() {
  const host = document.getElementById("aiBody");
  if (!host) return;

  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">The concierge runs on the hosted backend (otb-command.vercel.app) — it is unavailable in local-only mode.</div>';
    return;
  }

  host.innerHTML =
    '<div class="ai-thread" id="aiThread">' +
    '<div class="ai-hello"><div class="ai-hello-t">Property concierge</div>' +
    '<div class="ai-hello-s mute">Grounded in the recorded plat, the rent-roll SOT, easements, and your live edits. It will not invent numbers.</div>' +
    '<div class="ai-sugs">' + SUGGESTIONS.map(s => '<button class="chip ai-sug">' + esc(s) + '</button>').join("") + '</div></div>' +
    '</div>' +
    '<form class="ai-ask" id="aiAsk">' +
    '<button type="button" class="ai-tool" id="aiMic" title="Speak your question" hidden>🎙</button>' +
    '<input id="aiInput" type="text" placeholder="Ask about leases, parking, compliance, financials…" autocomplete="off">' +
    '<button type="button" class="ai-tool" id="aiAuto" title="Speak answers aloud automatically">🔊</button>' +
    '<button id="aiSend" type="submit">Ask</button></form>';

  const thread = host.querySelector("#aiThread");
  const form = host.querySelector("#aiAsk");
  const input = host.querySelector("#aiInput");
  const send = host.querySelector("#aiSend");

  host.querySelectorAll(".ai-sug").forEach(b => {
    b.onclick = e => { e.preventDefault(); input.value = b.textContent; form.requestSubmit(); };
  });

  /* auto-speak toggle (persisted) */
  const autoBtn = host.querySelector("#aiAuto");
  const paintAuto = () => autoBtn.classList.toggle("on", autoSpeak());
  paintAuto();
  autoBtn.onclick = () => {
    localStorage.setItem("otb-voice-auto", autoSpeak() ? "0" : "1");
    if (!autoSpeak()) stopSpeech();
    paintAuto();
  };

  /* mic input (Web Speech API where the browser has it — Chrome/Edge) */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = host.querySelector("#aiMic");
  if (SR) {
    mic.hidden = false;
    let rec = null;
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      mic.classList.add("on");
      rec.onresult = e => { input.value = e.results[0][0].transcript; form.requestSubmit(); };
      rec.onend = () => { mic.classList.remove("on"); rec = null; };
      rec.onerror = () => { mic.classList.remove("on"); rec = null; };
      rec.start();
    };
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || send.disabled) return;
    input.value = "";
    await ask(q, thread, send);
  };
}

function bubble(thread, cls, html) {
  const d = document.createElement("div");
  d.className = "ai-msg " + cls;
  d.innerHTML = html;
  thread.appendChild(d);
  thread.scrollTop = thread.scrollHeight;
  return d;
}

async function ask(q, thread, send) {
  const hello = thread.querySelector(".ai-hello");
  if (hello) hello.remove();
  history.push({ role: "user", content: q });
  bubble(thread, "ai-user", esc(q));
  const out = bubble(thread, "ai-assist", '<span class="ai-cursor">▋</span>');
  send.disabled = true;

  try {
    const session = (await sb.auth.getSession()).data.session;
    if (!session) throw new Error("session expired — reload and sign in again");
    const r = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ messages: history }),
    });
    if (!r.ok) {
      let msg = "HTTP " + r.status;
      try { msg = (await r.json()).error || msg; } catch { /* non-JSON error body */ }
      throw new Error(msg);
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      out.innerHTML = mdToHtml(text) + '<span class="ai-cursor">▋</span>';
      thread.scrollTop = thread.scrollHeight;
    }
    out.innerHTML = mdToHtml(text) +
      '<button class="ai-speak" title="Read aloud">🔊</button>';
    const sp = out.querySelector(".ai-speak");
    sp.onclick = () => speak(text, sp);
    history.push({ role: "assistant", content: text });
    if (autoSpeak()) speak(text, sp);
  } catch (err) {
    out.innerHTML = '<span class="ai-err">Could not answer: ' + esc(err.message) + '</span>';
    history.pop(); // drop the failed question so a retry resends cleanly
  } finally {
    send.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  }
}
