/* AI-1 agent desk — three agents on one chat surface (P4/P5 + agent desk).
   Concierge (Q&A) · Leasing (prospects + lease-package assembly) · Property
   Manager (ops). Server side: /api/concierge (key never ships to client).
   Transcripts persist server-side (chat_threads/chat_messages) — the 🗂
   History panel reloads any past thread. [[package:url|label]] lines in the
   stream render as package cards (Open 🔒 / ✉ Email). Voice: per-reply 🔊 via
   /api/voice + auto-speak + 🎙 mic (P5). */
import { REMOTE, sb } from "../lib/remote.js";
import { mdToHtml, mdToSpeech } from "../lib/concierge.js";
import { extractPackages } from "../lib/lease.js";
import { esc } from "../lib/format.js";

const AGENTS = {
  concierge: {
    chip: "🏛 Concierge", hello: "Property concierge",
    sub: "Grounded in the recorded plat, the rent-roll SOT, easements, and your live edits. It will not invent numbers.",
    sugs: [
      "Which leases expire in the next 12 months, and what rent is at risk?",
      "Summarize the parking situation — variance vs plat.",
      "Who do I call about HVAC at Jason's Deli, and what does the lease require?",
    ],
  },
  leasing: {
    chip: "🤝 Leasing", hello: "Leasing agent",
    sub: "Inventory, prospect screening (exclusives · liquor line · parking), and lease-package assembly. Drafts only — legal review before anything binds.",
    sugs: [
      "What's available right now, and what should we quote?",
      "A furniture retailer wants ~2,000 SF — screen it and suggest a unit.",
      "Assemble a lease proposal for unit 131.",
    ],
  },
  manager: {
    chip: "🔧 Property Mgmt", hello: "Property manager's desk",
    sub: "Operations, maintenance, compliance, vendors, tenant notices.",
    sugs: [
      "What's open on the action board and what should I do first?",
      "Draft a notice to all tenants about upcoming roof work.",
      "Which vendors do we use for plumbing and electrical?",
    ],
  },
};

/* per-agent session state: in-memory transcript + server thread id */
const state = {};
Object.keys(AGENTS).forEach(a => { state[a] = { history: [], threadId: null }; });
let current = "concierge";

/* ── P5 voice (unchanged) ──────────────────────────────────────── */
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
      body: JSON.stringify({ text: mdToSpeech(extractPackages(md).clean) }),
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

/* ── rendering ─────────────────────────────────────────────────── */
function packageCards(packages) {
  return packages.map(p => {
    const mail = "mailto:?subject=" + encodeURIComponent("On The Boulevard — " + p.label) +
      "&body=" + encodeURIComponent("Please find the lease package here (link valid 7 days):\n\n" + p.url + "\n\n" +
        "Adam Anthony Abdalla, Property Manager\nOn The Boulevard · 337-769-1554 · info@ontheblvd.com\n" +
        "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC.");
    return '<div class="ai-pkg"><span class="ai-pkg-name">📄 ' + esc(p.label) + '</span>' +
      '<a class="chip" href="' + esc(p.url) + '" target="_blank" rel="noopener">Open 🔒</a>' +
      '<a class="chip" href="' + mail + '">✉ Email</a></div>';
  }).join("");
}
function assistantHTML(md) {
  const { clean, packages } = extractPackages(md);
  return mdToHtml(clean) + packageCards(packages) + '<button class="ai-speak" title="Read aloud">🔊</button>';
}
function bubble(thread, cls, html) {
  const d = document.createElement("div");
  d.className = "ai-msg " + cls;
  d.innerHTML = html;
  thread.appendChild(d);
  thread.scrollTop = thread.scrollHeight;
  return d;
}
function wireSpeak(el, md) {
  const sp = el.querySelector(".ai-speak");
  if (sp) sp.onclick = () => speak(md, sp);
  return sp;
}

function paintThread(host) {
  const thread = host.querySelector("#aiThread");
  const a = AGENTS[current], s = state[current];
  if (!s.history.length) {
    thread.innerHTML =
      '<div class="ai-hello"><div class="ai-hello-t">' + esc(a.hello) + '</div>' +
      '<div class="ai-hello-s mute">' + esc(a.sub) + '</div>' +
      '<div class="ai-sugs">' + a.sugs.map(x => '<button class="chip ai-sug">' + esc(x) + '</button>').join("") + '</div></div>';
    thread.querySelectorAll(".ai-sug").forEach(b => {
      b.onclick = e => { e.preventDefault(); host.querySelector("#aiInput").value = b.textContent; host.querySelector("#aiAsk").requestSubmit(); };
    });
    return;
  }
  thread.innerHTML = "";
  s.history.forEach(m => {
    if (m.role === "user") bubble(thread, "ai-user", esc(m.content));
    else wireSpeak(bubble(thread, "ai-assist", assistantHTML(m.content)), m.content);
  });
}

/* ── history panel (persisted transcripts) ─────────────────────── */
async function paintHistory(host) {
  const panel = host.querySelector("#aiHistory");
  panel.innerHTML = '<div class="mute" style="padding:10px">loading…</div>';
  const { data, error } = await sb.from("chat_threads").select("id,agent,title,created_at").order("created_at", { ascending: false }).limit(40);
  if (error) { panel.innerHTML = '<div class="ai-err" style="padding:10px">' + esc(error.message) + '</div>'; return; }
  panel.innerHTML = (data || []).map(t =>
    '<button class="ai-thr" data-id="' + t.id + '" data-agent="' + esc(t.agent) + '">' +
    '<span class="ai-thr-t">' + esc(t.title || "(untitled)") + '</span>' +
    '<span class="ai-thr-m mono">' + esc(AGENTS[t.agent]?.chip || t.agent) + " · " + new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span></button>'
  ).join("") || '<div class="mute" style="padding:10px">no transcripts yet</div>';
  panel.querySelectorAll(".ai-thr").forEach(b => {
    b.onclick = async () => {
      const { data: rows } = await sb.from("chat_messages").select("role,content").eq("thread_id", b.dataset.id).order("at");
      const agent = AGENTS[b.dataset.agent] ? b.dataset.agent : "concierge";
      state[agent].history = (rows || []).map(r => ({ role: r.role, content: r.content }));
      state[agent].threadId = b.dataset.id;
      setAgent(host, agent);
      panel.hidden = true;
    };
  });
}

/* ── agent switching ───────────────────────────────────────────── */
function setAgent(host, agent) {
  current = agent;
  host.querySelectorAll(".ai-agent").forEach(b => b.classList.toggle("on", b.dataset.agent === agent));
  paintThread(host);
}

export function initConcierge() {
  const host = document.getElementById("aiBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">The agent desk runs on the hosted backend (otb-command.vercel.app) — unavailable in local-only mode.</div>';
    return;
  }

  host.innerHTML =
    '<div class="ai-agents">' +
    Object.entries(AGENTS).map(([k, a]) => '<button class="chip ai-agent' + (k === current ? " on" : "") + '" data-agent="' + k + '">' + a.chip + '</button>').join("") +
    '<span style="flex:1"></span>' +
    '<button class="chip" id="aiNew" title="Start a fresh conversation">+ New</button>' +
    '<button class="chip" id="aiHist" title="Past conversations">🗂 History</button></div>' +
    '<div class="ai-history" id="aiHistory" hidden></div>' +
    '<div class="ai-thread" id="aiThread"></div>' +
    '<form class="ai-ask" id="aiAsk">' +
    '<button type="button" class="ai-tool" id="aiMic" title="Speak your question" hidden>🎙</button>' +
    '<input id="aiInput" type="text" placeholder="Ask about leases, parking, compliance, financials…" autocomplete="off">' +
    '<button type="button" class="ai-tool" id="aiAuto" title="Speak answers aloud automatically">🔊</button>' +
    '<button id="aiSend" type="submit">Ask</button></form>';

  const form = host.querySelector("#aiAsk");
  const input = host.querySelector("#aiInput");
  const send = host.querySelector("#aiSend");

  host.querySelectorAll(".ai-agent").forEach(b => { b.onclick = () => setAgent(host, b.dataset.agent); });
  host.querySelector("#aiNew").onclick = () => { state[current] = { history: [], threadId: null }; paintThread(host); };
  host.querySelector("#aiHist").onclick = () => {
    const p = host.querySelector("#aiHistory");
    p.hidden = !p.hidden;
    if (!p.hidden) paintHistory(host);
  };

  const autoBtn = host.querySelector("#aiAuto");
  const paintAuto = () => autoBtn.classList.toggle("on", autoSpeak());
  paintAuto();
  autoBtn.onclick = () => {
    localStorage.setItem("otb-voice-auto", autoSpeak() ? "0" : "1");
    if (!autoSpeak()) stopSpeech();
    paintAuto();
  };
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
      rec.onend = rec.onerror = () => { mic.classList.remove("on"); rec = null; };
      rec.start();
    };
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || send.disabled) return;
    input.value = "";
    await ask(host, q, send);
  };
  paintThread(host);
}

async function ask(host, q, send) {
  const thread = host.querySelector("#aiThread");
  const s = state[current];
  const hello = thread.querySelector(".ai-hello");
  if (hello) hello.remove();
  s.history.push({ role: "user", content: q });
  bubble(thread, "ai-user", esc(q));
  const out = bubble(thread, "ai-assist", '<span class="ai-cursor">▋</span>');
  send.disabled = true;
  try {
    const session = (await sb.auth.getSession()).data.session;
    if (!session) throw new Error("session expired — reload and sign in again");
    const r = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ agent: current, threadId: s.threadId, messages: s.history }),
    });
    if (!r.ok) {
      let msg = "HTTP " + r.status;
      try { msg = (await r.json()).error || msg; } catch { /* non-JSON */ }
      throw new Error(msg);
    }
    s.threadId = r.headers.get("X-Thread-Id") || s.threadId;
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      out.innerHTML = mdToHtml(extractPackages(text).clean) + '<span class="ai-cursor">▋</span>';
      thread.scrollTop = thread.scrollHeight;
    }
    out.innerHTML = assistantHTML(text);
    const sp = wireSpeak(out, text);
    s.history.push({ role: "assistant", content: text });
    if (autoSpeak()) speak(text, sp);
  } catch (err) {
    out.innerHTML = '<span class="ai-err">Could not answer: ' + esc(err.message) + '</span>';
    s.history.pop();
  } finally {
    send.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  }
}
