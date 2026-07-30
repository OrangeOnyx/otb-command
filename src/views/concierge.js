/* AI-1 agent desk — three agents on one chat surface (P4/P5 + agent desk).
   Concierge (Q&A) · Leasing (prospects + lease-package assembly) · Property
   Manager (ops). Server side: /api/concierge (key never ships to client).
   Transcripts persist server-side (chat_threads/chat_messages) — the 🗂
   History panel reloads any past thread. [[package:url|label]] lines in the
   stream render as package cards (Open 🔒 / ✉ Email). Voice: per-reply 🔊 via
   /api/voice + auto-speak + 🎙 mic (P5). */
import { REMOTE, sb } from "../lib/remote.js";
import { mdToHtml, mdToSpeech } from "../lib/concierge.js";
import { extractCards, stripCards } from "../lib/cards.js";
import { esc } from "../lib/format.js";
import { smsText, LEASING_URL } from "../lib/leasing.js";
import { UNITS } from "../store.js";

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

/* per-agent session state: transcript + server thread id. Persisted to
   localStorage (thread-persistence polish, 2026-07-20) so a reload lands
   back in the SAME conversation — server threads already persisted via
   chat_threads; this keeps the client pointing at them. */
const LS_AI = "otb-ai-state-v1";
const state = {};
Object.keys(AGENTS).forEach(a => { state[a] = { history: [], threadId: null }; });
let current = "concierge";
try {
  const saved = JSON.parse(localStorage.getItem(LS_AI) || "null");
  if (saved && typeof saved === "object") {
    for (const a of Object.keys(AGENTS)) {
      const s = saved.agents && saved.agents[a];
      if (s && Array.isArray(s.history)) state[a] = {
        history: s.history
          .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-40),
        threadId: typeof s.threadId === "string" ? s.threadId : null,
      };
    }
    if (AGENTS[saved.current]) current = saved.current;
  }
} catch { /* corrupt cache — start fresh */ }
function persistAI() {
  try { localStorage.setItem(LS_AI, JSON.stringify({ current, agents: state })); }
  catch { /* quota / private mode — session-only, as before */ }
}

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
      body: JSON.stringify({ text: mdToSpeech(stripCards(md)) }),
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
/* Owner Intelligence Brief cards ([[brief:month|label]] in cron-seeded
   threads). The html is fetched via RLS (owner_briefs), never from the line. */
function briefCards(briefs) {
  return briefs.map(b =>
    '<div class="ai-pkg"><span class="ai-pkg-name">📊 ' + esc(b.label) + '</span>' +
    '<button class="chip ai-brief" data-month="' + esc(b.month) + '">Open 🔒</button></div>').join("");
}
async function openBrief(month) {
  const { data, error } = await sb.from("owner_briefs").select("html").eq("month", month).single();
  if (error || !data?.html) { alert("Couldn't open the brief: " + (error?.message || "not found")); return; }
  const url = URL.createObjectURL(new Blob([data.html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function wireBriefs(el) {
  el.querySelectorAll(".ai-brief").forEach(b => { b.onclick = () => openBrief(b.dataset.month); });
}
function assistantHTML(md) {
  const { clean, cards } = extractCards(md); // ONE pass over every registered card type
  const packages = cards.filter(c => c.type === "package").map(c => ({ url: c.token, label: c.label }));
  const briefs = cards.filter(c => c.type === "brief").map(c => ({ month: c.token, label: c.label }));
  return mdToHtml(clean) + packageCards(packages) + briefCards(briefs) + '<button class="ai-speak" title="Read aloud">🔊</button>';
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
    else {
      const el = bubble(thread, "ai-assist", assistantHTML(m.content));
      wireSpeak(el, m.content);
      wireBriefs(el);
    }
  });
}

/* ── 📊 Briefs panel (monthly Owner Intelligence Brief archive) ── */
async function paintBriefs(host) {
  const panel = host.querySelector("#aiBriefsPanel");
  panel.innerHTML = '<div class="mute" style="padding:10px">loading…</div>';
  const { data, error } = await sb.from("owner_briefs").select("month,model,created_at").order("month", { ascending: false }).limit(24);
  if (error) { panel.innerHTML = '<div class="ai-err" style="padding:10px">' + esc(error.message) + '</div>'; return; }
  panel.innerHTML = (data || []).map(b =>
    '<button class="ai-thr ai-brief" data-month="' + esc(b.month) + '">' +
    '<span class="ai-thr-t">📊 ' + esc(b.model?.monthLabel || b.month) + '</span>' +
    '<span class="ai-thr-m mono">occupancy ' + esc(b.model?.occupancyPct != null ? (b.model.occupancyPct * 100).toFixed(1) + "%" : "—") +
    ' · generated ' + esc(b.model?.generated || b.created_at?.slice(0, 10) || "") + '</span></button>'
  ).join("") || '<div class="mute" style="padding:10px">no briefs yet — the first generates on the next monthly cycle</div>';
  wireBriefs(panel);
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
      const { data: rows, error: loadErr } = await sb.from("chat_messages").select("role,content").eq("thread_id", b.dataset.id).order("at");
      if (loadErr) { alert("Couldn't load that conversation: " + loadErr.message); return; }
      const agent = AGENTS[b.dataset.agent] ? b.dataset.agent : "concierge";
      state[agent].history = (rows || []).map(r => ({ role: r.role, content: r.content }));
      state[agent].threadId = b.dataset.id;
      persistAI();
      setAgent(host, agent);
      panel.hidden = true;
    };
  });
}

/* ── agent switching ───────────────────────────────────────────── */
function setAgent(host, agent) {
  current = agent;
  persistAI();
  host.querySelectorAll(".ai-agent").forEach(b => b.classList.toggle("on", b.dataset.agent === agent));
  const sms = host.querySelector("#aiLeadSms");
  if (sms) sms.hidden = agent !== "leasing";
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
    '<button class="chip" id="aiLeadSms" title="Copy the ready-to-send lead SMS (leasing one-pager link + tour line) — send from your own phone"' + (current === "leasing" ? "" : " hidden") + '>📦 Lead SMS</button>' +
    '<button class="chip" id="aiNew" title="Start a fresh conversation">+ New</button>' +
    '<button class="chip" id="aiBriefs" title="Monthly owner intelligence briefs">📊 Briefs</button>' +
    '<button class="chip" id="aiHist" title="Past conversations">🗂 History</button></div>' +
    '<div class="ai-history" id="aiHistory" hidden></div>' +
    '<div class="ai-history" id="aiBriefsPanel" hidden></div>' +
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
  host.querySelector("#aiNew").onclick = () => { state[current] = { history: [], threadId: null }; persistAI(); paintThread(host); };
  const leadSms = host.querySelector("#aiLeadSms");
  leadSms.onclick = async () => {
    const vacants = UNITS.filter(u => u.status === "vacant").map(u => ({ unit: u.unit, sf: u.sf }));
    try {
      await navigator.clipboard.writeText(smsText(vacants, LEASING_URL));
      leadSms.textContent = "✓ Copied — paste into your SMS";
    } catch {
      leadSms.textContent = "✗ Copy blocked";
    }
    setTimeout(() => { leadSms.textContent = "📦 Lead SMS"; }, 2200);
  };
  host.querySelector("#aiHist").onclick = () => {
    const p = host.querySelector("#aiHistory");
    p.hidden = !p.hidden;
    host.querySelector("#aiBriefsPanel").hidden = true;
    if (!p.hidden) paintHistory(host);
  };
  host.querySelector("#aiBriefs").onclick = () => {
    const p = host.querySelector("#aiBriefsPanel");
    p.hidden = !p.hidden;
    host.querySelector("#aiHistory").hidden = true;
    if (!p.hidden) paintBriefs(host);
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
  let text = ""; // hoisted so the catch can tell early-failure from mid-stream (M6)
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
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      out.innerHTML = mdToHtml(stripCards(text)) + '<span class="ai-cursor">▋</span>';
      thread.scrollTop = thread.scrollHeight;
    }
    out.innerHTML = assistantHTML(text);
    const sp = wireSpeak(out, text);
    wireBriefs(out);
    s.history.push({ role: "assistant", content: text });
    persistAI();
    if (autoSpeak()) speak(text, sp);
  } catch (err) {
    // M6: if the stream had started, the server may already have persisted this
    // exchange — keep the user turn (and the partial reply, marked) so the client
    // history stays consistent with the thread. Only drop the turn on an early
    // failure (nothing streamed → nothing persisted), so a retry is clean.
    if (text) {
      out.innerHTML = assistantHTML(text) + '<div class="ai-err">⚠ interrupted — reply may be incomplete</div>';
      wireBriefs(out);
      s.history.push({ role: "assistant", content: text });
    } else {
      out.innerHTML = '<span class="ai-err">Could not answer: ' + esc(err.message) + '</span>';
      s.history.pop();
    }
    persistAI();
  } finally {
    send.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  }
}
