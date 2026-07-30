import test from "node:test";
import assert from "node:assert/strict";
import { normTokens, matchTenants, driveLine, smsText, GOOGLE_NAME_ALIASES } from "../src/lib/leasing.js";

const UNITS = [
  { unit: "101", dba: "The Pink Paisley", status: "occupied" },
  { unit: "113", dba: "Graze Acadiana", status: "occupied" },
  { unit: "115", dba: "The Clothing Loft Exchange", status: "occupied" },
  { unit: "119.5", dba: "Cat Clinic of Lafayette", status: "occupied" },
  { unit: "123", dba: "The Tux Shoppe", status: "occupied" },
  { unit: "131", dba: "VACANT", status: "vacant" },
  { unit: "149", dba: "Jason's Deli", status: "occupied" },
];

test("normTokens strips stopwords/punctuation and folds shoppe", () => {
  assert.deepEqual(normTokens("The Tux Shoppe"), ["tux", "shop"]);
  assert.deepEqual(normTokens("Graze Acadiana- Graze Oil"), ["graze", "acadiana", "graze", "oil"]);
  assert.deepEqual(normTokens(""), []);
  assert.deepEqual(normTokens(null), []);
});

test("matchTenants: subset both directions, SOT name wins", () => {
  const places = [
    { name: "Clothing Loft", rating: 4.1, ratings: 55 },            // place ⊂ dba
    { name: "Graze Acadiana- Graze Oil", rating: 4.8, ratings: 20 }, // dba ⊂ place
    { name: "Cat Clinic of Lafayette", rating: 4.8, ratings: 137 },  // exact
    { name: "Hand Up Thrift", rating: 4.5, ratings: 100 },           // neighbor
  ];
  const { tenants, neighbors } = matchTenants(places, UNITS);
  assert.deepEqual(tenants.map(t => t.unit), ["119.5", "113", "115"]); // rating desc
  assert.equal(tenants.find(t => t.unit === "115").dba, "The Clothing Loft Exchange");
  assert.deepEqual(neighbors.map(n => n.name), ["Hand Up Thrift"]);
});

test("matchTenants: alias bridges disjoint names, vacants never match", () => {
  const places = [
    { name: "Mary Ellen's Tux Shop", rating: 4.8, ratings: 127 },
    { name: "Vacant Storefront", rating: 5, ratings: 1 },
  ];
  const { tenants } = matchTenants(places, UNITS, GOOGLE_NAME_ALIASES);
  assert.deepEqual(tenants, [{ unit: "123", dba: "The Tux Shoppe", rating: 4.8, ratings: 127 }]);
});

test("matchTenants: no double-claim of one unit, single-token names need full overlap", () => {
  const places = [
    { name: "Jason's Deli", rating: 4.5, ratings: 788 },
    { name: "Jason's Deli Catering", rating: 4.0, ratings: 5 }, // same unit — second hit dropped entirely
    { name: "Deli", rating: 3, ratings: 2 },                    // 1 shared of 1 place-token ⊂ dba → matches nothing (unit taken)
  ];
  const { tenants, neighbors } = matchTenants(places, UNITS);
  assert.equal(tenants.length, 1);
  assert.equal(tenants[0].ratings, 788);
  assert.equal(neighbors.length, 0); // near-misses on a claimed unit are dropped, not shown as neighbors
});

test("driveLine formats the strip", () => {
  assert.equal(
    driveLine([{ name: "Downtown Lafayette", minutes: 9 }, { name: "UL Lafayette campus", minutes: 7 }]),
    "9 min to Downtown Lafayette · 7 min to UL Lafayette campus"
  );
  assert.equal(driveLine([]), "");
});

test("smsText carries suites, url, and the leasing line", () => {
  const t = smsText([{ unit: "131", sf: 1907 }, { unit: "133", sf: 1272 }], "https://x.test/leasing.html");
  assert.ok(t.includes("Suite 131 (1,907 SF) and Suite 133 (1,272 SF)"));
  assert.ok(t.includes("https://x.test/leasing.html"));
  assert.ok(t.includes("(337) 270-7044"));
  assert.ok(!/[*_#[\]]/.test(t)); // plain text — no markup into an SMS app
});
