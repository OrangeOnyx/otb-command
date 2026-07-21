/* [[type:token|label]] card registry (lib/cards.js). */
import test from "node:test";
import assert from "node:assert/strict";
import { registerCard, extractCards, extractCardsOf, stripCards, cardTypes } from "../src/lib/cards.js";
import { extractPackages } from "../src/lib/lease.js";
import { extractBriefs } from "../src/lib/brief.js";

test("built-in types are registered", () => {
  assert.ok(cardTypes().includes("package"));
  assert.ok(cardTypes().includes("brief"));
});

test("package cards: https only — javascript:/data: are stripped, not rendered", () => {
  const md = "Done. [[package:https://x.supabase.co/sign/a|Unit 131 proposal]] " +
    "[[package:javascript:alert(1)|evil]]";
  const { clean, packages } = extractPackages(md);
  assert.equal(packages.length, 1);
  assert.equal(packages[0].url, "https://x.supabase.co/sign/a");
  assert.ok(!clean.includes("[["), "both markers stripped");
});

test("brief cards keep the strict YYYY-MM gate", () => {
  const { briefs } = extractBriefs("[[brief:2026-07|July]] [[brief:2026-13|bad]] [[brief:x|bad]]");
  assert.deepEqual(briefs, [{ month: "2026-07", label: "July" }]);
});

test("extractCards handles mixed types in one pass; stripCards cleans all", () => {
  const md = "A [[package:https://a/b|P]] B [[brief:2026-07|B]] C";
  const { clean, cards } = extractCards(md);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(c => c.type).sort(), ["brief", "package"]);
  assert.equal(clean, "A  B  C");
  assert.equal(stripCards(md), "A  B  C");
});

test("new types are one registration away (the COI/thread path)", () => {
  registerCard("coi", t => /^v\d+$/.test(t));
  const { cards } = extractCardsOf("[[coi:v12|Butcher Air COI]] [[coi:nope|bad]]", "coi");
  assert.deepEqual(cards, [{ type: "coi", token: "v12", label: "Butcher Air COI" }]);
});

test("unregistered type throws; bad type names rejected", () => {
  assert.throws(() => extractCardsOf("x", "nope-not-registered"));
  assert.throws(() => registerCard("Bad Type", () => true));
});
