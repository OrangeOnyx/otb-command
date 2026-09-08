import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBriefingHTML } from "../src/lib/command-briefing.js";

const issue = {
  id: "record-1", title: "Pothole Repair", asOf: "2026-08-29", archivedStatus: "open",
  location: { label: "In front of the associated storefronts", precision: "Exact location unverified" },
  unknowns: ["Repair scope and cost", "Current repair condition"],
  sourceIds: ["work-order", "roster"],
};
const sources = [
  { id: "work-order", title: "Original request", path: "docs/original.json", asOf: "2026-08-29", kind: "Archive", excerpt: "status: open\ncost: null" },
  { id: "roster", title: "Adopted roster", path: "src/data/units.public.json", asOf: "2026-07-16", kind: "Dated extract", excerpt: "101 / 103" },
  { id: "private-ledger", title: "Do not include", path: "private/payment.json", asOf: "2026-09-08", excerpt: "CONFIDENTIAL_UNSELECTED_AMOUNT" },
];
const options = { issue, sources, text: "My edited update. [work-order]\nCheck [roster]. [unknown]", generatedAt: "2026-09-08T00:15:00Z", preparedAt: "2026-09-06" };

test("briefing keeps edited prose distinct, dates the archive and selects only record references", () => {
  const html = buildBriefingHTML(options);
  assert.match(html, /DRAFT · FOR REVIEW/);
  assert.match(html, /may include operator edits/);
  assert.match(html, /Draft prepared 2026-09-06/);
  assert.match(html, /Packet exported 2026-09-07/);
  assert.match(html, /archive as of 2026-08-29/);
  assert.match(html, /Repair scope and cost/);
  assert.match(html, /absence of evidence does not mean unpaid/);
  assert.match(html, /href="#source-1">\[work-order\]<\/a>/);
  assert.match(html, /href="#source-2">\[roster\]<\/a>/);
  assert.match(html, /\[unknown\]/);
  assert.ok(!html.includes("CONFIDENTIAL_UNSELECTED_AMOUNT"));
  assert.ok(!html.includes("private/payment.json"));
  assert.match(html, /docs\/original\.json/);
  assert.match(html, /2026-07-16/);
  assert.match(html, /@media print/);
  assert.match(html, /break-before:page/);
});

test("untrusted prose, source metadata, excerpts and unknown citations remain inert", () => {
  const hostile = '<script>alert(1)</script><img src=x onerror="alert(2)">';
  const html = buildBriefingHTML({
    ...options,
    issue: { ...issue, title: hostile, unknowns: [hostile], location: { label: hostile } },
    text: hostile + ' [<img src=x>] [private-ledger] [work-order]',
    sources: [{ ...sources[0], title: hostile, path: 'javascript:alert(3)', asOf: hostile, excerpt: hostile, imageUrl: 'https://attacker.example/pixel' }],
    logoDataUrl: '" onerror="alert(4)',
  });
  assert.ok(!/<script\b|<img\b/.test(html));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes("attacker.example"));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /\[&lt;img src=x&gt;\]/);
  assert.match(html, /\[private-ledger\]/);
  assert.match(html, /Selected references unavailable/);
  assert.ok(!html.includes("CONFIDENTIAL_UNSELECTED_AMOUNT"));
  assert.match(html, /default-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.equal((html.match(/href="/g) || []).length, 1);
});

test("logo accepts image data only and never introduces remote or executable content", () => {
  const logo = "data:image/svg+xml;base64,PHN2Zy8+";
  assert.ok(buildBriefingHTML({ ...options, logoDataUrl: logo }).includes(`src="${logo}"`));
  for (const invalid of ["https://attacker.example/logo.svg", "javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "data:image/svg+xml,<svg onload='alert(1)'/>"]) {
    const html = buildBriefingHTML({ ...options, logoDataUrl: invalid });
    assert.ok(!/<img\b/.test(html));
    assert.ok(!html.includes("attacker.example"));
  }
});

test("approved fonts embed offline with fixed family names and verified weight ranges", () => {
  const data = "data:font/woff2;base64,d09GMg==";
  const html = buildBriefingHTML({ ...options, fontDataUrls: { Fraunces: data, Inter: data, "JetBrains Mono": data, Unapproved: data } });
  assert.equal((html.match(/@font-face\{/g) || []).length, 3);
  assert.match(html, /font-family:"Fraunces";src:url\("data:font\/woff2;base64,d09GMg=="\) format\("woff2"\);font-weight:100 900/);
  assert.match(html, /font-family:"Inter";src:url\("data:font\/woff2;base64,d09GMg=="\) format\("woff2"\);font-weight:100 900/);
  assert.match(html, /font-family:"JetBrains Mono";src:url\("data:font\/woff2;base64,d09GMg=="\) format\("woff2"\);font-weight:400 800/);
  assert.match(html, /font-src data:/);
  assert.ok(!html.includes("Unapproved"));
  assert.ok(!/@import/.test(html));
});

test("hostile font URLs and CSS injection cannot enter the document", () => {
  for (const invalid of [
    "https://attacker.example/font.woff2", "javascript:alert(1)",
    "data:text/css;base64,Ym9keXt9", "data:font/woff2;base64,AAAA\");}body{background:url(https://attacker.example)}",
    "data:font/woff2;base64,AAAA</style><script>alert(1)</script>", "data:font/woff2,rawbytes", null,
  ]) {
    const html = buildBriefingHTML({ ...options, fontDataUrls: { Fraunces: invalid, Inter: invalid, "JetBrains Mono": invalid } });
    assert.ok(!html.includes("@font-face{"));
    assert.ok(!html.includes("attacker.example"));
    assert.ok(!/<script\b/.test(html));
  }
});

test("font license notices travel with the document as inert escaped text", () => {
  const html = buildBriefingHTML({ ...options, fontLicenseText: 'Copyright Font Authors\nSIL OPEN FONT LICENSE\n</template><script>unsafe()</script>' });
  assert.match(html, /<template id="embedded-font-licenses">Copyright Font Authors\nSIL OPEN FONT LICENSE/);
  assert.match(html, /&lt;\/template&gt;&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.ok(!/<script\b/.test(html));
});

test("missing references stay visible and cannot be supplied by user-written citation tokens", () => {
  const html = buildBriefingHTML({ ...options, issue: { ...issue, sourceIds: ["missing", "work-order", "work-order"] }, text: "[missing] [private-ledger] [work-order]" });
  assert.match(html, /Selected references unavailable in this packet:<\/strong> \[missing\]/);
  assert.ok(!html.includes("CONFIDENTIAL_UNSELECTED_AMOUNT"));
  assert.equal((html.match(/id="source-1"/g) || []).length, 1);
  assert.equal((html.match(/class="source-card"/g) || []).length, 1);
  assert.throws(() => buildBriefingHTML({ generatedAt: "2026-09-08" }), /dated maintenance record/);
  assert.throws(() => buildBriefingHTML({ ...options, generatedAt: "invalid" }), RangeError);
});
