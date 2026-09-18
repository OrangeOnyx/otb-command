/* Voice call records — pure seam (2026-09-18). Everything a finalized phone
   call needs that isn't I/O: the intent / urgency vocabulary the L-1 chips
   and the D-1 KPI paint from, the summarizer's tool schema + prompt, the
   transcript text ↔ turns conversion, the owner e-mail (text + HTML), the
   outcome lines (work order / tour / lead / package) and the display model
   for a comm_log voice row. Consumed by api/_voicecall.mjs (server) and
   views/comms.js + views/dashboard.js (browser); tested standalone in
   test/voicecall.test.mjs. No fact literals beyond phrasing. */

/* ---- vocabulary (plan-room palette, same hues M-1 uses) ---- */
export const CALL_INTENTS = {
  maintenance: ["Maintenance", "#C25E33"],
  leasing: ["Leasing", "#2F6B4F"],
  billing: ["Billing", "#A87E2F"],
  general: ["General", "#5F6E64"],
};
export const CALL_URGENCY = {
  emergency: ["EMERGENCY", "#C25E33"],
  urgent: ["Urgent", "#C99A33"],
  routine: ["Routine", "#5F6E64"],
};
export const CALL_STATUS = { new: "Needs attention", handled: "Handled" };

export const validIntent = i => (CALL_INTENTS[i] ? i : "general");
export const validUrgency = u => (CALL_URGENCY[u] ? u : "routine");

/* ---- summarizer contract (Anthropic tool_use, forced) ---- */
export const SUMMARY_TOOL = {
  name: "record_call_summary",
  description: "Record the outcome of a finished phone call for the property operator and owners.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2–3 plain sentences: who called, what they needed, what was done or promised. Written for an owner skimming e-mail." },
      intent: { type: "string", enum: Object.keys(CALL_INTENTS), description: "maintenance = repair/service at the center; leasing = space inquiry, tour, package; billing = rent, fees, payments, statements; general = anything else" },
      urgency: { type: "string", enum: Object.keys(CALL_URGENCY), description: "emergency only for active water, fire, electrical hazard, security/break-in, life safety; urgent = business-disrupting; otherwise routine" },
      unit: { type: "string", description: "Suite number the call concerns (e.g. 105, 117.5, 135A) or empty" },
      caller_name: { type: "string", description: "Caller's name as confirmed on the call, or empty" },
      callback_phone: { type: "string", description: "Callback number the caller gave, digits only, or empty" },
      follow_up: { type: "string", description: "The one thing the operator must do next, or empty if nothing" },
    },
    required: ["summary", "intent", "urgency", "unit", "caller_name", "callback_phone", "follow_up"],
  },
};

export function summaryPrompt(line) {
  const who = line === "leasing" ? "the LEASING line (prospects asking about space)" : "the TENANT line (tenants and their staff)";
  return `You summarize finished phone calls to On The Boulevard Shopping Center, Lafayette, Louisiana, for the property operator (Adam) and the owners. This call came in on ${who}. The transcript is Caller / Agent turns; the Agent is an automated assistant, not a person.
Rules: state only what the transcript supports — never invent a name, unit, or promise. If the caller hung up or nothing was captured, say so in one sentence. Do not include the agent's greeting. Use the record_call_summary tool exactly once.`;
}

/* tool input → clean record (enum fallbacks, length caps, digits-only phone) */
export function normalizeSummary(input) {
  const s = input && typeof input === "object" ? input : {};
  const digits = String(s.callback_phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return {
    summary: String(s.summary || "").trim().slice(0, 600),
    intent: validIntent(String(s.intent || "").toLowerCase()),
    urgency: validUrgency(String(s.urgency || "").toLowerCase()),
    unit: String(s.unit || "").trim().slice(0, 20),
    caller_name: String(s.caller_name || "").trim().slice(0, 120),
    callback: digits.length === 10 ? digits : "",
    follow_up: String(s.follow_up || "").trim().slice(0, 300),
  };
}

/* ---- transcript ---- */
export function transcriptText(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => (m.role === "user" ? "Caller: " : "Agent: ") + m.content.trim())
    .join("\n");
}

/* "Caller: …\nAgent: …" → [{role:'caller'|'agent', text}] (multi-line turns
   stay attached to the last speaker; stray text before any label = caller) */
export function parseTranscript(text) {
  const turns = [];
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const m = /^(Caller|Agent):\s?(.*)$/.exec(line);
    if (m) turns.push({ role: m[1] === "Caller" ? "caller" : "agent", text: m[2] });
    else if (turns.length) turns[turns.length - 1].text += "\n" + line;
    else turns.push({ role: "caller", text: line });
  }
  return turns;
}

export function fmtDuration(s) {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "";
  const m = Math.floor(n / 60), r = Math.round(n % 60);
  return m + ":" + String(r).padStart(2, "0");
}

export function fmtPhone(s) {
  const d = String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : String(s || "");
}

/* ---- outcome lines: what the call produced ---- */
export function outcomeLines(outcome) {
  const o = outcome && typeof outcome === "object" ? outcome : {};
  const out = [];
  if (o.work_order) out.push({ kind: "work_order", id: String(o.work_order), label: "Work order " + o.work_order, sheet: "maint" });
  if (o.tour) out.push({ kind: "tour", id: String(o.tour.slot_key || ""), label: "Tour booked · " + (o.tour.label || o.tour.slot_key || ""), sheet: "board" });
  if (o.lead) out.push({ kind: "lead", id: String(o.lead), label: "Lead saved to W-1 pipeline", sheet: "board" });
  if (o.package) {
    const p = o.package;
    const legs = [p.sent ? "e-mailed to " + (p.email || "caller") : "", p.sms ? "texted to " + (fmtPhone(p.phone) || "the callback number") : ""].filter(Boolean);
    out.push({ kind: "package", id: "", sheet: "",
      label: legs.length ? "Leasing package " + legs.join(" and ")
        : p.email ? "Leasing package requested · " + p.email + " — send pending (e-mail not configured)"
        : "Leasing package requested — no e-mail given, operator to send" });
  }
  return out;
}

/* ---- comm_log voice row → display model ---- */
export const isVoiceCall = row => !!(row && row.source === "voice" && row.payload && row.payload.call_sid);

export function callDisplay(row) {
  const p = (row && row.payload) || {};
  const intent = validIntent(p.intent);
  const urgency = validUrgency(row && row.urgency);
  return {
    callSid: String(p.call_sid || ""),
    line: p.line === "leasing" ? "Leasing line" : "Tenant line",
    intent, intentLabel: CALL_INTENTS[intent][0], intentColor: CALL_INTENTS[intent][1],
    urgency, urgencyLabel: CALL_URGENCY[urgency][0], urgencyColor: CALL_URGENCY[urgency][1],
    unit: String((row && row.unit) || ""),
    who: (row && row.contact_name) || fmtPhone(row && row.contact_phone) || "unknown caller",
    phone: fmtPhone(row && row.contact_phone),
    duration: fmtDuration(p.duration_s),
    recordingSid: p.recording_status === "completed" && p.recording_sid ? String(p.recording_sid) : "",
    outcome: outcomeLines(p.outcome),
    turns: parseTranscript(row && row.body),
    handled: (row && row.status) === "handled",
  };
}

/* D-1 / L-1 strip: calls in the trailing window, by intent + still-new */
export function callStats(rows, nowIso, days = 7) {
  const now = Date.parse(nowIso || "");
  const since = Number.isFinite(now) ? now - days * 86400000 : -Infinity;
  const out = { total: 0, needsAttention: 0, emergencies: 0, byIntent: {} };
  for (const r of rows || []) {
    if (!isVoiceCall(r)) continue;
    const at = Date.parse(r.at || "");
    if (!Number.isFinite(at) || at < since) continue;
    out.total++;
    if (r.status !== "handled") out.needsAttention++;
    if (r.urgency === "emergency") out.emergencies++;
    const i = validIntent(r.payload.intent);
    out.byIntent[i] = (out.byIntent[i] || 0) + 1;
  }
  return out;
}

/* ---- owner e-mail ---- */
const escHtml = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

export function callEmail({ call, transcript, appUrl = "https://otb.cypresscommand.com", productName = "Cypress Command" } = {}) {
  const c = call || {};
  const intent = validIntent(c.intent), urgency = validUrgency(c.urgency);
  const unitBit = c.unit ? " · Unit " + c.unit : "";
  const prefix = urgency === "emergency" ? "EMERGENCY — " : urgency === "urgent" ? "Urgent — " : "";
  const subject = prefix + CALL_INTENTS[intent][0] + " call" + unitBit +
    (c.caller_name ? " — " + c.caller_name : c.callback ? " — " + fmtPhone(c.callback) : "");
  const lines = outcomeLines(c.outcome).map(o => o.label);
  const when = c.started_at ? new Date(c.started_at).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " CT" : "";
  const facts = [
    ["Line", c.line === "leasing" ? "Leasing" : "Tenant"],
    ["When", when],
    ["Caller", (c.caller_name || "") + (c.callback ? " · " + fmtPhone(c.callback) : c.caller ? " · " + fmtPhone(c.caller) : "")],
    ["Unit", c.unit || "—"],
    ["Urgency", CALL_URGENCY[urgency][0]],
    ["Length", fmtDuration(c.duration_s) || "—"],
  ];
  const text = [
    subject, "",
    c.summary || "(no summary)", "",
    ...facts.map(([k, v]) => k + ": " + v),
    ...(c.follow_up ? ["", "Next step: " + c.follow_up] : []),
    ...(lines.length ? ["", "Outcome:", ...lines.map(l => "  - " + l)] : []),
    "", "Listen / read the full call in " + productName + " → L-1 Comm Log: " + appUrl + "/#comms",
    "", "Transcript", "----------", transcript || "(none captured)",
  ].join("\n");
  const turns = parseTranscript(transcript);
  const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;color:#1C2B26">' +
    '<div style="border-bottom:3px solid ' + CALL_INTENTS[intent][1] + ';padding-bottom:10px;margin-bottom:16px">' +
    '<div style="font:600 11px/1.4 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#A87E2F">' + escHtml(productName) + ' · Voice · ' + escHtml(c.line === "leasing" ? "Leasing line" : "Tenant line") + '</div>' +
    '<h2 style="margin:4px 0 0;font-size:20px">' + escHtml(subject) + '</h2></div>' +
    '<p style="font-size:15px;line-height:1.5">' + escHtml(c.summary || "(no summary)") + '</p>' +
    (c.follow_up ? '<p style="background:#FBF3DF;border:1px solid #E0CDA0;padding:8px 12px;border-radius:5px"><b>Next step:</b> ' + escHtml(c.follow_up) + '</p>' : "") +
    '<table style="border-collapse:collapse;font-size:13px;margin:8px 0 14px">' +
    facts.map(([k, v]) => '<tr><td style="padding:4px 14px 4px 0;color:#5F6E64;font-family:ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.08em">' + escHtml(k) + '</td><td style="padding:4px 0">' + escHtml(v) + '</td></tr>').join("") +
    '</table>' +
    (lines.length ? '<div style="font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#5F6E64">Outcome</div><ul style="margin:4px 0 14px;padding-left:18px;font-size:13px">' + lines.map(l => "<li>" + escHtml(l) + "</li>").join("") + "</ul>" : "") +
    '<p style="font-size:13px"><a href="' + escHtml(appUrl) + '/#comms" style="color:#A87E2F;font-weight:600">Listen / read the full call in ' + escHtml(productName) + ' →</a></p>' +
    '<div style="font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#5F6E64;margin-top:16px">Transcript</div>' +
    (turns.length
      ? '<div style="border:1px solid #C7CDC1;border-radius:5px;padding:6px 10px;font-size:13px;line-height:1.5">' +
        turns.map(t => '<p style="margin:6px 0"><b style="color:' + (t.role === "caller" ? "#1E4F3C" : "#5F6E64") + '">' + (t.role === "caller" ? "Caller" : "Agent") + ':</b> ' + escHtml(t.text).replace(/\n/g, "<br>") + '</p>').join("") + '</div>'
      : '<p style="color:#5F6E64;font-size:13px">(none captured)</p>') +
    '<p style="color:#5F6E64;font-size:11px;margin-top:18px">Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC.</p></div>';
  return { subject, text, html };
}
