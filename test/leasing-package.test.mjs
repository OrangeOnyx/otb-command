/* Leasing package e-mail (src/lib/leasing.js leasingPackageEmail) — the
   voice line's send_leasing_package tool composes this. Guards: vacant
   suites only, anchor named from the roll, rates never quoted, the hosted
   package URL present, HTML escaped, sensible empty state. */
import test from "node:test";
import assert from "node:assert/strict";
import { leasingPackageEmail, LEASING_URL } from "../src/lib/leasing.js";

const UNITS = [
  { unit: "131", dba: "VACANT", status: "vacant", sf: 1907, use: "Inline small-shop retail / service" },
  { unit: "133", dba: "VACANT", status: "vacant", sf: 1600, use: "" },
  { unit: "149", dba: "Jason's Deli", status: "anchor", sf: 6000 },
  { unit: "101", dba: "Pink <Paisley>", status: "occupied", sf: 6877 },
];

test("leasing package: lists vacants, names the anchor, links the package", () => {
  const m = leasingPackageEmail({ units: UNITS, prospect: "Dana" });
  assert.equal(m.subject, "On The Boulevard — leasing package (2 suites available)");
  assert.match(m.text, /^Hi Dana,/);
  assert.match(m.text, /Suite 131 — 1,907 SF · Inline small-shop retail \/ service/);
  assert.match(m.text, /Suite 133 — 1,600 SF\n/);
  assert.match(m.text, /anchored by Jason's Deli\./);
  assert.match(m.text, /upon request|on request/);
  assert.doesNotMatch(m.text, /\$\d/); // rates are never quoted
  assert.ok(m.text.includes(LEASING_URL));
  assert.match(m.html, /Jason&#39;s Deli|Jason's Deli/);
  assert.doesNotMatch(m.html, /<Paisley>/);
  assert.equal(m.vacants.length, 2);
});

test("leasing package: empty state + custom url/contact", () => {
  const m = leasingPackageEmail({ units: UNITS.filter(u => u.status !== "vacant"), url: "https://x/y", contactPhone: "(337) 555-0100" });
  assert.equal(m.subject, "On The Boulevard — leasing package");
  assert.match(m.text, /^Hello,/);
  assert.match(m.text, /No suites are open today/);
  assert.match(m.text, /https:\/\/x\/y/);
  assert.match(m.text, /\(337\) 555-0100/);
  assert.deepEqual(leasingPackageEmail().vacants, []);
});
