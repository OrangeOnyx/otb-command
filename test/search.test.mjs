import { test } from "node:test";
import assert from "node:assert/strict";
import { search, scoreEntry, normalize } from "../src/lib/search.js";

const ENTRIES = [
  { type: "unit", key: "129", title: "129 · HotWorx", haystack: ["129", "HotWorx", "Fitness studio"] },
  { type: "unit", key: "149", title: "149 · Jason's Deli", haystack: ["149", "Jason's Deli", "Restaurant anchor"] },
  { type: "doc", key: "pd:plat", title: "Recorded plat of survey", haystack: ["Recorded plat of survey", "Montagnet & Domingue"] },
  { type: "contact", key: "pc:surveyor", title: "Montagnet & Domingue, Inc.", haystack: ["Montagnet & Domingue, Inc.", "Surveyor"] },
];

test("exact unit number ranks first", () => {
  const r = search(ENTRIES, "129");
  assert.equal(r[0].key, "129");
});

test("name prefix beats substring", () => {
  const r = search(ENTRIES, "jason");
  assert.equal(r[0].key, "149");
});

test("word-start match finds mid-title words", () => {
  const r = search(ENTRIES, "deli");
  assert.equal(r[0].key, "149");
});

test("shared term returns both doc and contact", () => {
  const keys = search(ENTRIES, "montagnet").map(e => e.key);
  assert.ok(keys.includes("pd:plat") && keys.includes("pc:surveyor"));
});

test("no match / empty query -> empty", () => {
  assert.deepEqual(search(ENTRIES, "zzz"), []);
  assert.deepEqual(search(ENTRIES, "  "), []);
});

test("scoreEntry is 0 for miss, positive for hit; normalize lowercases", () => {
  assert.equal(scoreEntry(ENTRIES[0], "nope"), 0);
  assert.ok(scoreEntry(ENTRIES[0], "hot") > 0);
  assert.equal(normalize("  HotWorx "), "hotworx");
});
