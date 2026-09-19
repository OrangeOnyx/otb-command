/* Guard for the masthead KPI ribbon (src/lib/ribbon.js): same math as D-1,
   the attention count from the live action lane, tones, and drill targets. */
import test from "node:test";
import assert from "node:assert/strict";
import { ribbonModel, ribbonHTML } from "../src/lib/ribbon.js";

const T = "2026-09-19";
const units = [
  { unit: "101", sf: 6000, monthly: 6000, status: "active", end: "2027-02-28" },
  { unit: "115", sf: 2000, monthly: 2000, status: "active", end: "2026-09-30" },
  { unit: "131", sf: 2000, monthly: 0, status: "vacant", end: "" },
  { unit: "135B", sf: 1000, monthly: 0, status: "owner", end: "" },
  { unit: "139", sf: 1000, monthly: 1000, status: "active", end: "" },
];

test("five items in order with the D-1 numbers", () => {
  const m = ribbonModel(units, [], T);
  assert.deepEqual(m.map(i => i.k), ["occ", "rent", "vacant", "exp12", "attn"]);
  assert.equal(m[0].val, "83.3%");            // 10,000 of 12,000 SF
  assert.equal(m[1].val, "$9,000");
  assert.equal(m[2].val, "1");
  assert.match(m[2].note, /131/);
  assert.equal(m[3].val, "2", "101 + 115 inside 365d; blank-end 139 never counts");
  assert.equal(m[4].val, "0");
  assert.equal(m[4].tone, "green");
});

test("rent goes blank when any amount is missing", () => {
  const m = ribbonModel(units.map(u => u.unit === "101" ? { ...u, monthly: undefined } : u), [], T);
  assert.equal(m[1].val, "—");
});

test("attention = action-lane cards; past-due turns brick", () => {
  const cards = [
    { id: "a", lane: "action", due: "2026-08-01" },
    { id: "b", lane: "action", due: null },
    { id: "c", lane: "watch", due: "2026-08-01" },
    { id: "d", lane: "done" },
  ];
  const m = ribbonModel(units, cards, T);
  assert.equal(m[4].val, "2");
  assert.equal(m[4].tone, "brick");
  assert.match(m[4].note, /1 past due/);
  assert.equal(ribbonModel(units, cards.slice(1, 2), T)[4].tone, "brass");
});

test("drill targets and markup", () => {
  const m = ribbonModel(units, [], T);
  assert.deepEqual(m.map(i => i.page), ["roll", "fin", "plan", "dates", "board"]);
  const html = ribbonHTML(m);
  assert.equal((html.match(/<button/g) || []).length, 5);
  assert.match(html, /data-page="board"/);
  assert.match(html, /rb-green/);
  assert.doesNotMatch(html, /<script/);
});
