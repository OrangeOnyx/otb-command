import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMessages, digestState, buildMessages, mdToHtml, MAX_TURNS, MAX_MSG_CHARS } from "../src/lib/concierge.js";

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
