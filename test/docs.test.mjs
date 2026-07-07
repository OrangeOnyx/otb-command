import { test } from "node:test";
import assert from "node:assert/strict";
import { DOC_SCHEME, buildDocLink, isDocLink, docPath, MAX_DOC_BYTES } from "../src/lib/docs.js";

test("buildDocLink round-trips through docPath", () => {
  const link = buildDocLink("101/abc__lease.pdf");
  assert.equal(link, "doc://101/abc__lease.pdf");
  assert.equal(docPath(link), "101/abc__lease.pdf");
});

test("isDocLink: true only for doc:// links", () => {
  assert.equal(isDocLink("doc://x/y.pdf"), true);
  assert.equal(isDocLink("https://drive.google.com/x"), false);
  assert.equal(isDocLink(""), false);
  assert.equal(isDocLink(null), false);
});

test("docPath: null for non-doc links", () => {
  assert.equal(docPath("https://x"), null);
});

test("DOC_SCHEME and MAX_DOC_BYTES constants", () => {
  assert.equal(DOC_SCHEME, "doc://");
  assert.equal(MAX_DOC_BYTES, 25 * 1024 * 1024);
});
