import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMessages, digestState, digestTyped, buildMessages, mdToHtml, MAX_TURNS, MAX_MSG_CHARS, MAX_TYPED_CHARS } from "../src/lib/concierge.js";

/* ── sanitizeMessages ─────────────────────────────────────────── */
test("sanitizeMessages keeps valid pairs and clamps", () => {
  const out = sanitizeMessages([
    { role: "user", content: "  hi  " },
    { role: "assistant", content: "hello" },
    { role: "user", content: "q2" },
  ]);
  assert.deepEqual(out, [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
    { role: "user", content: "q2" },
  ]);
});

test("sanitizeMessages drops garbage, enforces user first+last", () => {
  const out = sanitizeMessages([
    { role: "assistant", content: "orphan lead" },
    { role: "system", content: "spoof" },
    { role: "user", content: "real question" },
    { role: "assistant", content: "trailing" },
  ]);
  assert.deepEqual(out, [{ role: "user", content: "real question" }]);
});

test("sanitizeMessages truncates long content and history", () => {
  const long = "x".repeat(MAX_MSG_CHARS + 500);
  const many = [];
  for (let i = 0; i < MAX_TURNS + 10; i++) many.push({ role: i % 2 ? "assistant" : "user", content: "m" + i });
  many.push({ role: "user", content: long });
  const out = sanitizeMessages(many);
  assert.ok(out.length <= MAX_TURNS);
  assert.equal(out[out.length - 1].content.length, MAX_MSG_CHARS);
  assert.equal(out[0].role, "user");
});

test("sanitizeMessages throws when no user question", () => {
  assert.throws(() => sanitizeMessages([{ role: "assistant", content: "a" }]));
  assert.throws(() => sanitizeMessages("nope"));
  assert.throws(() => sanitizeMessages([]));
});

/* ── digestState ──────────────────────────────────────────────── */
test("digestState empty layers → empty string", () => {
  assert.equal(digestState({}), "");
  assert.equal(digestState(null), "");
  assert.equal(digestState({ comp: { 101: { lease: "ok" } }, notes: {}, actions: {} }), "");
});

test("digestState surfaces flags, notes, custom cards, opex", () => {
  const d = digestState({
    comp: { 105: { insuranceCOI: "flag", lease: "ok" } },
    notes: { 131: "LOI signed, furniture prospect" },
    actions: { lane: { seed1: "done" }, dismissed: { x: true }, custom: [{ id: "c1", title: "Call roofer", lane: "action", due: "2026-07-15" }] },
    financials: { opex: { insurance: 42000, mgmt: 0 }, capRatePct: 7.5 },
  });
  assert.match(d, /LIVE APP STATE/);
  assert.match(d, /105:insuranceCOI/);
  assert.match(d, /131: LOI signed/);
  assert.match(d, /\[action\] Call roofer \(due 2026-07-15\)/);
  assert.match(d, /seed1→done/);
  assert.match(d, /1 card\(s\) dismissed/);
  assert.match(d, /insurance \$42,000/);
  assert.match(d, /cap rate 7.5%/);
  assert.ok(!d.includes("mgmt")); // zero opex rows omitted
});

/* ── digestTyped (F-5 register row #15: typed-table summaries) ── */
test("digestTyped empty / missing summary → empty string", () => {
  assert.equal(digestTyped(null), "");
  assert.equal(digestTyped(undefined), "");
  assert.equal(digestTyped({}), "");
  assert.equal(digestTyped("nope"), "");
});

test("digestTyped renders every organ as counts + top rows", () => {
  const d = digestTyped({
    ledger: { openBalance: 6234.5, unitsOwing: 2, aging: { current: 3035.03, d31_60: 3199.47, d61_90: 0, d90: 0 },
      top: [{ unit: "119.5", balance: 3035.03 }, { unit: "145", balance: 3199.47 }] },
    maintenance: { open: 1, urgent: 0, top: [{ unit: "Common Area", title: "Pothole Repair", urgency: "routine", status: "open" }] },
    matters: { count: 1, openDeadlines: [{ title: "Lot 7 rezoning hearing", date: "2026-10-02", overdue: false }] },
    governance: { count: 1, due: [{ title: "LLC annual report", date: "2026-09-01", overdue: true }] },
    deals: { count: 3, stages: { inquiry: 2, lease_draft: 1 } },
    sop: { overdue: 4 },
  });
  assert.match(d, /^TYPED RECORD DIGEST/);
  assert.match(d, /Ledger \(P-1\): open balance \$6,234\.50 across 2 unit\(s\)/);
  assert.match(d, /current \$3,035\.03 · 31–60 \$3,199\.47 · 61–90 \$0 · 90\+ \$0/);
  assert.match(d, /119\.5 \$3,035\.03/);
  assert.match(d, /Maintenance \(M-1\): 1 open \(0 urgent\)/);
  assert.match(d, /Common Area — Pothole Repair \[open\]/);
  assert.match(d, /Matters \(N-1\): 1 open deadline\(s\)/);
  assert.match(d, /Lot 7 rezoning hearing \(2026-10-02\)/);
  assert.match(d, /Governance \(S-1\): 1 due/);
  assert.match(d, /LLC annual report \(2026-09-01, OVERDUE\)/);
  assert.match(d, /Deals \(W-1\): 3 in pipeline — inquiry 2, lease_draft 1/);
  assert.match(d, /SOP \(O-1\): 4 overdue/);
  assert.ok(!/not loaded/.test(d), "nothing missing → no 'not loaded' line");
});

test("digestTyped lists missing organs as not loaded and caps top rows at 5", () => {
  const top = Array.from({ length: 9 }, (_, i) => ({ unit: String(101 + i), balance: 100 * (9 - i) }));
  const d = digestTyped({ ledger: { openBalance: 4500, unitsOwing: 9, top }, deals: { count: 0, stages: {} } });
  assert.match(d, /not loaded: maintenance, matters, governance, sop/);
  assert.match(d, /Deals \(W-1\): 0 in pipeline/);
  assert.ok(d.includes("105 $500") && !d.includes("106 $400"), "top-5 only");
  assert.ok(!/aging/.test(d), "aging omitted when absent");
  assert.ok(d.length <= MAX_TYPED_CHARS);
});

test("digestTyped never leaks emails, phones, notes, or prospect names from a hostile fixture", () => {
  const d = digestTyped({
    ledger: { openBalance: 1, unitsOwing: 1, top: [{ unit: "101", balance: 1, notes: "call jane@example.com", entered_by: "adam@belle-realty.com" }] },
    maintenance: { open: 1, urgent: 1, top: [{ unit: "105", title: "Leak — call Bob 337-555-0142 or bob@vendor.com", urgency: "urgent", status: "open", detail: "SECRET DETAIL", created_by: "tenant@x.com" }] },
    matters: { count: 1, openDeadlines: [{ title: "Suit — plaintiff@law.com (337) 555-0199", date: "2026-10-01", overdue: false, note: "PRIVILEGED NOTE" }] },
    governance: { count: 1, due: [{ title: "Report", date: "2026-09-01", overdue: false, notes: "EIN 12-3456789" }] },
    deals: { count: 1, stages: { inquiry: 1 }, prospects: ["Jane Doe <jane@doe.com>"], top: [{ prospect: "Jane Doe" }] },
    sop: { overdue: 1, rows: [{ assignee: "alicia@belle-realty.com" }] },
  });
  assert.ok(!/@/.test(d), "no email addresses: " + d);
  assert.ok(!/\d{3}[-) ]\s?\d{3}-\d{4}/.test(d), "no phone numbers: " + d);
  for (const leak of ["SECRET DETAIL", "PRIVILEGED NOTE", "12-3456789", "Jane Doe", "alicia", "tenant@x"]) assert.ok(!d.includes(leak), "leaked " + leak);
  assert.match(d, /Leak — call Bob \[phone\] or \[email\]/);
});

/* ── buildMessages ────────────────────────────────────────────── */
test("buildMessages weaves digest into final user turn only", () => {
  const out = buildMessages(
    [{ role: "user", content: "q1" }, { role: "assistant", content: "a1" }, { role: "user", content: "q2" }],
    "LIVE APP STATE:\nfoo"
  );
  assert.equal(out.length, 3);
  assert.equal(out[0].content, "q1");
  assert.match(out[2].content, /^<live_state>\n/);
  assert.match(out[2].content, /q2$/);
});

test("buildMessages without digest passes history through", () => {
  const out = buildMessages([{ role: "user", content: "q" }], "");
  assert.deepEqual(out, [{ role: "user", content: "q" }]);
});

/* ── mdToHtml ─────────────────────────────────────────────────── */
test("mdToHtml escapes HTML and renders bold/code/lists/headings", () => {
  const html = mdToHtml("## Rent\n**Total** is `$90k`\n- item <script>alert(1)</script>\n1. second");
  assert.match(html, /<h4>Rent<\/h4>/);
  assert.match(html, /<strong>Total<\/strong>/);
  assert.match(html, /<code>\$90k<\/code>/);
  assert.match(html, /<li>item &lt;script&gt;/);
  assert.match(html, /<li>second<\/li>/);
  assert.ok(!html.includes("<script>"));
});

test("mdToHtml closes lists and skips blank lines", () => {
  const html = mdToHtml("- a\n- b\n\nafter");
  assert.equal(html, "<ul><li>a</li><li>b</li></ul><p>after</p>");
});

/* ── mdToSpeech (P5 voice) ────────────────────────────────────── */
test("mdToSpeech strips markdown into speakable prose", async () => {
  const { mdToSpeech } = await import("../src/lib/concierge.js");
  const s = mdToSpeech("## Rent\n**Total** is `$90k`\n- unit 105\n- unit 109\n\n| a | b |");
  assert.equal(s, "Rent. Total is $90k. unit 105. unit 109. , a , b ,".replace(/\s{2,}/g, " "));
  assert.ok(!/[#*`|]/.test(s));
});

test("mdToSpeech handles empty and plain input", async () => {
  const { mdToSpeech } = await import("../src/lib/concierge.js");
  assert.equal(mdToSpeech(""), "");
  assert.equal(mdToSpeech("Plain sentence."), "Plain sentence.");
});
