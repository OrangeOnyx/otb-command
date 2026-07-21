/* Bucket-store factory primitives (lib/bucketstore.js). The three thin
   configs (docs/safe/vendors) are pinned by their own test files. */
import test from "node:test";
import assert from "node:assert/strict";
import { newId, sanitizeName, filePath, displayName, folderOf, MAX_FILE_BYTES } from "../src/lib/bucketstore.js";

test("newId carries the prefix and stays unique-ish", () => {
  assert.ok(newId("s").startsWith("s"));
  assert.ok(newId().startsWith("f"));
  assert.notEqual(newId("x"), newId("x"));
});

test("sanitizeName strips path-hostile characters and caps length", () => {
  assert.equal(sanitizeName("Lease (2026) — final?.pdf"), "Lease_2026_final_.pdf");
  assert.equal(sanitizeName(""), "file");
  assert.equal(sanitizeName("a".repeat(120)).length, 80);
});

test("filePath/displayName/folderOf round-trip the folder/id__name convention", () => {
  const p = filePath("leases", "s123", "My Lease.pdf");
  assert.equal(p, "leases/s123__My_Lease.pdf");
  assert.equal(displayName(p), "My_Lease.pdf");
  assert.equal(folderOf(p), "leases");
  assert.equal(displayName("bare-file.pdf"), "bare-file.pdf");
  assert.equal(displayName("a/b__c__d.pdf"), "c__d.pdf", "double-underscore names keep their tail");
});

test("shared 25 MB cap is what the buckets enforce server-side", () => {
  assert.equal(MAX_FILE_BYTES, 25 * 1024 * 1024);
});
