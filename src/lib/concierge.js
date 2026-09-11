/* AI Concierge (P4) — pure helpers shared by the Vercel function (api/concierge.js)
   and the AI-1 view. No DOM, no network: message hygiene, live-state digest,
   and a minimal markdown renderer for assistant replies. Unit-tested. */

import { esc } from "./format.js";

export const MAX_TURNS = 20;        // messages kept (10 exchanges)
export const MAX_MSG_CHARS = 4000;  // per-message cap
export const MAX_DIGEST_CHARS = 3500;
export const MAX_TYPED_CHARS = 1800; // typed-table digest block cap

/* Validate + clamp a chat history coming over the wire.
   Keeps only {role:'user'|'assistant', content:string} pairs, truncates long
   messages, drops empties, keeps the most recent MAX_TURNS, and guarantees the
   result starts with 'user' and ends with 'user' (the API alternation rules
   tolerate consecutive same-role turns, but first must be user). Throws if no
   user question survives. */
export function sanitizeMessages(input) {
  if (!Array.isArray(input)) throw new Error("messages must be an array");
  let msgs = input
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MSG_CHARS) }))
    .filter(m => m.content.length > 0)
    .slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  while (msgs.length && msgs[msgs.length - 1].role !== "user") msgs.pop();
  if (!msgs.length) throw new Error("no user question in messages");
  return msgs;
}

/* Compact text digest of the live shared-state layers (Supabase property_state).
   These are operator OVERRIDES over the seeded data — the seeded facts are in
   the static dossier, so only the deltas matter here. Volatile by design: it is
   appended to the FINAL user turn (after the cache breakpoint), never to the
   cached system prompt. */
export function digestState(layers) {
  const L = layers || {};
  const out = [];

  // compliance: only flagged cells are worth the model's attention
  const flags = [];
  for (const [unit, fields] of Object.entries(L.comp || {})) {
    for (const [k, v] of Object.entries(fields || {})) if (v === "flag") flags.push(unit + ":" + k);
  }
  if (flags.length) out.push("Compliance flags (operator-marked ⚑): " + flags.join(", "));

  // unit note overrides
  const notes = Object.entries(L.notes || {}).filter(([, v]) => typeof v === "string" && v.trim());
  if (notes.length) {
    out.push("Operator unit notes (override the SOT notes):");
    notes.forEach(([unit, v]) => out.push("  - " + unit + ": " + v.trim().slice(0, 240)));
  }

  // action board: custom cards + lane moves; seeded cards derive client-side
  const a = L.actions || {};
  const custom = Array.isArray(a.custom) ? a.custom : [];
  if (custom.length) {
    out.push("Action board — operator-added cards:");
    custom.forEach(c => out.push("  - [" + (a.lane?.[c.id] || c.lane || "watch") + "] " + String(c.title || "").slice(0, 120) + (c.due ? " (due " + c.due + ")" : "")));
  }
  const moved = Object.entries(a.lane || {}).filter(([id]) => !custom.some(c => c.id === id));
  if (moved.length) out.push("Action board — seeded cards moved: " + moved.map(([id, l]) => id + "→" + l).join(", "));
  const dismissed = Object.keys(a.dismissed || {}).length;
  if (dismissed) out.push("Action board — " + dismissed + " card(s) dismissed/archived.");

  // directory overrides (custom contacts / documents)
  for (const coll of ["contacts", "documents"]) {
    const c = L[coll] || {};
    const items = Array.isArray(c.custom) ? c.custom : [];
    if (items.length) out.push("Custom " + coll + " added: " + items.map(x => String(x.name || x.company || x.title || "?").slice(0, 60)).join("; "));
  }

  // financial worksheet overrides
  const f = L.financials || {};
  const opex = Object.entries(f.opex || {}).filter(([, v]) => Number.isFinite(+v) && +v !== 0);
  if (opex.length) out.push("Owner OpEx worksheet (P-1, operator-entered $/yr): " + opex.map(([k, v]) => k + " $" + Math.round(+v).toLocaleString("en-US")).join(", ") + (Number.isFinite(+f.capRatePct) ? " · cap rate " + f.capRatePct + "%" : ""));

  if (!out.length) return "";
  return ("LIVE APP STATE (operator edits since the dossier was generated — these supersede the dossier where they conflict):\n" + out.join("\n")).slice(0, MAX_DIGEST_CHARS);
}

/* Typed-record digest (F-5, register row #15 — "add read-only NL query over
   typed tables if the digest proves insufficient"): the concierge previously
   saw only the 7 LAYER_DEFS override tables; this block adds read-only
   COUNTS + top-5 rows from the typed organs the server folds in api/concierge.js
   liveDigest (ledger aging, open maintenance, matter deadlines, governance
   due, deal stages, SOP overdue). Pure: takes the already-folded summary,
   every organ optional (absent → listed as "not loaded"), emits only
   whitelisted fields, scrubs emails/phones from titles, never notes, names,
   assignees, or raw rows. */
const TYPED_ORGANS = ["ledger", "maintenance", "matters", "governance", "deals", "sop"];
const usd2 = n => {
  const v = Math.round((+n || 0) * 100) / 100;
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
};
const scrub = (s, max = 80) => String(s ?? "")
  .replace(/[^\s<>()@]+@[^\s<>()@]+\.[^\s<>()@]+/g, "[email]")
  .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
  .replace(/\s+/g, " ").trim().slice(0, max);
const ymd = s => (/^\d{4}-\d{2}-\d{2}/.test(String(s || "")) ? String(s).slice(0, 10) : "no date");
const top5 = rows => (Array.isArray(rows) ? rows.slice(0, 5) : []);
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

export function digestTyped(summary) {
  if (!isObj(summary)) return "";
  const present = TYPED_ORGANS.filter(k => isObj(summary[k]));
  if (!present.length) return "";
  const out = [];
  const S = summary;

  if (isObj(S.ledger)) {
    const l = S.ledger;
    let line = "- Ledger (P-1): open balance " + usd2(l.openBalance) + " across " + (+l.unitsOwing || 0) + " unit(s) owing";
    if (isObj(l.aging)) {
      const a = l.aging;
      line += " · aging current " + usd2(a.current) + " · 31–60 " + usd2(a.d31_60) + " · 61–90 " + usd2(a.d61_90) + " · 90+ " + usd2(a.d90);
    }
    const top = top5(l.top).filter(isObj);
    if (top.length) line += " · top: " + top.map(r => scrub(r.unit, 12) + " " + usd2(r.balance)).join(", ");
    out.push(line);
  }
  if (isObj(S.maintenance)) {
    const m = S.maintenance;
    let line = "- Maintenance (M-1): " + (+m.open || 0) + " open (" + (+m.urgent || 0) + " urgent)";
    const top = top5(m.top).filter(isObj);
    if (top.length) line += " · " + top.map(r => scrub(r.unit, 16) + " — " + scrub(r.title) + " [" + scrub(r.status, 12) + (r.urgency && r.urgency !== "routine" ? ", " + scrub(r.urgency, 12) : "") + "]").join("; ");
    out.push(line);
  }
  if (isObj(S.matters)) {
    const rows = top5(S.matters.openDeadlines).filter(isObj);
    const n = Number.isFinite(+S.matters.count) ? +S.matters.count : rows.length;
    let line = "- Matters (N-1): " + n + " open deadline(s)";
    if (rows.length) line += " — " + rows.map(r => scrub(r.title) + " (" + ymd(r.date) + (r.overdue ? ", OVERDUE" : "") + ")").join("; ");
    out.push(line);
  }
  if (isObj(S.governance)) {
    const rows = top5(S.governance.due).filter(isObj);
    const n = Number.isFinite(+S.governance.count) ? +S.governance.count : rows.length;
    let line = "- Governance (S-1): " + n + " due";
    if (rows.length) line += " — " + rows.map(r => scrub(r.title) + " (" + ymd(r.date) + (r.overdue ? ", OVERDUE" : "") + ")").join("; ");
    out.push(line);
  }
  if (isObj(S.deals)) {
    const d = S.deals;
    const stages = isObj(d.stages) ? Object.entries(d.stages).filter(([, v]) => +v > 0) : [];
    let line = "- Deals (W-1): " + (+d.count || 0) + " in pipeline";
    if (stages.length) line += " — " + stages.map(([k, v]) => scrub(k, 16) + " " + (+v)).join(", ");
    out.push(line);
  }
  if (isObj(S.sop)) out.push("- SOP (O-1): " + (+S.sop.overdue || 0) + " overdue occurrence(s)");

  const missing = TYPED_ORGANS.filter(k => !present.includes(k));
  if (missing.length) out.push("- not loaded: " + missing.join(", "));
  return ("TYPED RECORD DIGEST (read-only counts from the typed tables at request time; point to the named sheet for detail — never a substitute for run_calc):\n" +
    out.join("\n")).slice(0, MAX_TYPED_CHARS);
}

/* Build the final Messages-API array: history + the live digest woven into the
   last user turn so the cached system prefix stays byte-stable. */
export function buildMessages(history, digest) {
  const msgs = sanitizeMessages(history);
  if (!digest) return msgs;
  const last = msgs[msgs.length - 1];
  return [
    ...msgs.slice(0, -1),
    { role: "user", content: "<live_state>\n" + digest + "\n</live_state>\n\n" + last.content },
  ];
}

/* Markdown → speakable plain text for the P5 voice layer: strips headings,
   bold/code markers, list bullets, and table pipes so TTS reads prose, not
   punctuation. Numbered lists keep their numbers (they read naturally). */
export function mdToSpeech(md) {
  return String(md || "")
    .split(/\r?\n/)
    .map(line => line
      .replace(/^#{1,6}\s+/, "")               // headings
      .replace(/^\s*[-*•]\s+/, "")             // bullets
      .replace(/\*\*([^*]+)\*\*/g, "$1")       // bold
      .replace(/`([^`]+)`/g, "$1")             // code
      .replace(/\|/g, ", ")                    // table pipes
      .trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.\s*\./g, ".")                  // collapse doubled periods
    .replace(/\s{2,}/g, " ");
}

/* Minimal markdown → HTML for assistant replies (headings, bold, code,
   bullet/numbered lists, tables collapse to plain lines). Escapes HTML first —
   model output is untrusted. */
export function mdToHtml(md) {
  const inline = s => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = String(md || "").split(/\r?\n/);
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (li) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + inline(li[1]) + "</li>");
      continue;
    }
    closeList();
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out.push("<h4>" + inline(h[2]) + "</h4>"); continue; }
    out.push("<p>" + inline(line) + "</p>");
  }
  closeList();
  return out.join("");
}
