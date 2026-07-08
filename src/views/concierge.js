/* AI-1 Concierge — grounded property Q&A chat (P4).
   The Anthropic call happens server-side (/api/concierge, key never ships to
   the client); this view holds a session-only transcript, streams the reply
   into the last bubble, and renders assistant markdown via lib/concierge. */
import { REMOTE, sb } from "../lib/remote.js";
import { mdToHtml } from "../lib/concierge.js";
import { esc } from "../lib/format.js";

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
    '<input id="aiInput" type="text" placeholder="Ask about leases, parking, compliance, financials…" autocomplete="off">' +
    '<button id="aiSend" type="submit">Ask</button></form>';

  const thread = host.querySelector("#aiThread");
  const form = host.querySelector("#aiAsk");
  const input = host.querySelector("#aiInput");
  const send = host.querySelector("#aiSend");

  host.querySelectorAll(".ai-sug").forEach(b => {
    b.onclick = e => { e.preventDefault(); input.value = b.textContent; form.requestSubmit(); };
  });

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
    out.innerHTML = mdToHtml(text);
    history.push({ role: "assistant", content: text });
  } catch (err) {
    out.innerHTML = '<span class="ai-err">Could not answer: ' + esc(err.message) + '</span>';
    history.pop(); // drop the failed question so a retry resends cleanly
  } finally {
    send.disabled = false;
    thread.scrollTop = thread.scrollHeight;
  }
}
