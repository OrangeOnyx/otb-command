import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeName, vendorPath, displayName, vendorOf, portalCapable, rosterOrder, findVendorByEmail, portalFace } from "../src/lib/vendors.js";
import VENDORS from "../src/data/vendors.json" with { type: "json" };

test("vendorPath sanitizes names and prefixes the vendor folder", () => {
  const p = vendorPath("butcher-air-conditioning", "v1", "COI 2026 (final).pdf");
  assert.match(p, /^butcher-air-conditioning\/v1__COI_2026_final_\.pdf$/);
  assert.equal(vendorOf(p), "butcher-air-conditioning");
});

test("displayName round-trips the original-ish name", () => {
  assert.equal(displayName("acme/v9__W-9_2026.pdf"), "W-9_2026.pdf");
  assert.equal(displayName("no-marker.pdf"), "no-marker.pdf");
});

test("sanitizeName strips path-hostile characters and caps length", () => {
  assert.equal(sanitizeName("../..\\evil name?.pdf"), ".._.._evil_name_.pdf");
  assert.equal(sanitizeName("x".repeat(200)).length, 80);
  assert.equal(sanitizeName(""), "file");
});

test("portalCapable requires an email", () => {
  assert.ok(portalCapable({ email: "a@b.com" }));
  assert.ok(!portalCapable({ email: "" }));
  assert.ok(!portalCapable(null));
});

test("rosterOrder ranks service > payee > person, alpha within", () => {
  const out = rosterOrder([
    { company: "Zeta Bank", kind: "payee" },
    { company: "Bob", kind: "person" },
    { company: "acme plumbing", kind: "service" },
    { company: "Byte Electric", kind: "service" },
  ]);
  assert.deepEqual(out.map(v => v.company), ["acme plumbing", "Byte Electric", "Zeta Bank", "Bob"]);
});

test("findVendorByEmail is case/space-insensitive and null-safe", () => {
  const list = [{ id: "x", email: "info@acme.com" }];
  assert.equal(findVendorByEmail(list, "  INFO@ACME.COM "), list[0]);
  assert.equal(findVendorByEmail(list, "nope@x.com"), null);
  assert.equal(findVendorByEmail(list, ""), null);
});

test("seeded roster: Butcher Air is portal-capable service vendor", () => {
  const butcher = VENDORS.find(v => v.id === "butcher-air-conditioning");
  assert.ok(butcher && butcher.kind === "service" && portalCapable(butcher));
  assert.ok(VENDORS.length >= 60);
  // slugs are folder names — must be path-safe
  VENDORS.forEach(v => assert.match(v.id, /^[a-z0-9-]+$/));
});

/* V-1 face selection: owners were made owner-visible on V-1 but RLS grants
   them roster read ONLY (no vendor-docs, no vendor_log) — they must get the
   read-only face, never the operator console with failing upload/empty files. */
test("portalFace maps role to the correct V-1 face", () => {
  assert.equal(portalFace("operator"), "operator");
  assert.equal(portalFace("vendor"), "vendor");
  assert.equal(portalFace("owner"), "owner");
});

test("portalFace defaults unknown/absent roles to the least-privileged owner face", () => {
  assert.equal(portalFace("pending"), "owner");
  assert.equal(portalFace(null), "owner");
  assert.equal(portalFace(undefined), "owner");
});
