/* B-1 Marketing — pure-half guards (src/lib/marketing.js). Stats from the
   roll, co-tenancy dedupe/order, hero selection, printable HTML (absolute
   images, escaping, key facts present), tour manifest shape. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  OTB_PUBLIC, CARD_HEADLINES, propertyStats, coTenancy, heroFor, librarySummary,
  flyerModel, flyerHTML, overviewModel, overviewHTML, tenantCardModel, tenantCardHTML, tourManifest,
} from "../src/lib/marketing.js";

const UNITS = [
  { unit: "101", dba: "Pink <Paisley>", status: "active", sf: 6877, use: "Boutique" },
  { unit: "103", dba: "Pink <Paisley>", status: "active", sf: 3054, use: "Boutique" },
  { unit: "129", dba: "HotWorx", status: "active", sf: 1789, use: "Fitness" },
  { unit: "131", dba: "VACANT", status: "vacant", sf: 1907, use: "Inline retail" },
  { unit: "133", dba: "VACANT", status: "vacant", sf: 1272, use: "" },
  { unit: "135B", dba: "Belle Realty", status: "owner", sf: 1580 },
  { unit: "149", dba: "Jason's Deli", status: "anchor", sf: 4613, use: "Restaurant" },
];
const logo = u => (["101", "103", "129", "149"].includes(u) ? "/tenant-logos/" + u + ".png" : null);
const CORR = { driveTimes: [{ name: "Downtown", minutes: 9 }, { name: "UL", minutes: 6 }], centerListing: { rating: 4.3, ratings: 184 } };

test("marketing: propertyStats", () => {
  const s = propertyStats(UNITS);
  assert.equal(s.gla, 21092);
  assert.equal(s.count, 7);
  assert.deepEqual(s.vacant.map(v => v.unit), ["131", "133"]);
  assert.equal(s.vacantSf, 3179);
  assert.equal(s.occupancyPct, 84.9);
  assert.equal(s.leased, 5);
  assert.deepEqual(s.anchor, { unit: "149", dba: "Jason's Deli" });
  assert.equal(propertyStats(null).gla, 0);
});

test("marketing: coTenancy — anchor first, one per DBA, logo required, exclusions", () => {
  const c = coTenancy(UNITS, logo);
  assert.deepEqual(c.map(t => t.unit), ["149", "101", "129"]); // 103 folded into Pink Paisley; owner + vacants out
  assert.equal(coTenancy(UNITS, logo, { exclude: "149" })[0].unit, "101");
  assert.equal(coTenancy(UNITS, logo, { limit: 1 }).length, 1);
  assert.deepEqual(coTenancy(UNITS, () => null), []);
});

test("marketing: heroFor + librarySummary", () => {
  const assets = [
    { id: "a1", kind: "photo", addedAt: "2026-09-01", url: "u1" },
    { id: "a2", kind: "photo", addedAt: "2026-09-10", url: "u2" },
    { id: "p1", kind: "plan", addedAt: "2026-09-11", url: "p" },
  ];
  assert.equal(heroFor(assets, {}, "131").id, "a2");            // newest photo
  assert.equal(heroFor(assets, { 131: "a1" }, "131").id, "a1");  // operator pick
  assert.equal(heroFor(assets, { 131: "gone" }, "131").id, "a2"); // stale pick falls back
  assert.equal(heroFor([{ id: "p1", kind: "plan" }], {}, "131"), null);
  const lib = librarySummary({ property: assets, 133: [], 131: assets }, { 131: "a1" });
  assert.deepEqual(lib.map(r => r.unit), ["131", "133", "property"]);
  assert.equal(lib[0].photos, 2); assert.equal(lib[0].plans, 1); assert.equal(lib[0].hero, "a1"); assert.equal(lib[0].pinned, true);
  assert.equal(lib[1].hero, "");
});

test("marketing: flyer model + HTML", () => {
  const m = flyerModel({ unit: "131", units: UNITS, assets: [{ id: "a1", kind: "photo", url: "https://x/h.jpg" }], corridor: CORR, origin: "https://otb.test/", logoUrl: logo });
  assert.equal(m.sf, 1907);
  assert.equal(m.heroUrl, "https://x/h.jpg");
  assert.equal(m.planUrl, "https://otb.test/plat-render.svg");
  assert.equal(m.planIsSite, true);
  assert.deepEqual(m.coTenancy.map(t => t.unit), ["149", "101", "129"]);
  assert.equal(m.coTenancy[0].logo, "https://otb.test/tenant-logos/149.png");
  assert.deepEqual(m.siblings.map(s => s.unit), ["133"]);
  assert.equal(m.qrUrl, "https://otb.test/qr/leasing.svg");
  const html = flyerHTML(m);
  assert.match(html, /<title>OTB-Flyer-Suite-131<\/title>/);
  assert.match(html, /1,907/);
  assert.match(html, /Also available: Suite 133 · 1,272 SF — combinable/);
  assert.match(html, /9 min to Downtown/);
  assert.match(html, /4\.3 ★ · 184 reviews/);
  assert.match(html, /Pink &lt;Paisley&gt;/);
  assert.doesNotMatch(html, /<Paisley>/);
  assert.match(html, /\(337\) 270-7044/);
  assert.doesNotMatch(html, /\$\d/); // never a rate
  assert.equal(flyerModel({ unit: "999", units: UNITS }), null);
  assert.equal(flyerHTML(null), "");
  // no photo yet → placeholder, no broken img
  assert.match(flyerHTML(flyerModel({ unit: "133", units: UNITS, origin: "https://o" })), /Photo coming/);
});

test("marketing: overview + tenant card", () => {
  const o = overviewHTML(overviewModel({ units: UNITS, corridor: CORR, origin: "https://o", logoUrl: logo }));
  assert.match(o, /21,092/);
  assert.match(o, /84\.9%/);
  assert.match(o, /Suite 131 · 1,907 SF · Inline retail/);
  assert.match(o, /https:\/\/o\/plat-render\.svg/);
  assert.match(o, /Jason&#39;s Deli|Jason's Deli/);
  const c = tenantCardModel({ unit: "129", units: UNITS, headline: "open", origin: "https://o", logoUrl: logo });
  assert.equal(c.headline, CARD_HEADLINES.open);
  assert.equal(c.logoUrl, "https://o/tenant-logos/129.png");
  assert.deepEqual(c.neighbors.map(n => n.unit), ["149", "101"]);
  const html = tenantCardHTML(c);
  assert.match(html, /size:1080px 1080px/);
  assert.match(html, /HotWorx · Suite 129/);
  assert.equal(tenantCardModel({ unit: "131", units: UNITS }), null); // vacant has no card
  assert.equal(tenantCardModel({ unit: "129", units: UNITS, headline: "bogus" }).headline, CARD_HEADLINES.welcome);
  assert.equal(OTB_PUBLIC.tourUrl, "https://otb.cypresscommand.com/tour");
});

test("marketing: tourManifest groups panos and hero per suite", () => {
  const m = tourManifest([
    { unit: "131", kind: "pano", url: "b", name: "back", addedAt: "2026-09-20" },
    { unit: "131", kind: "pano", url: "a", name: "front", addedAt: "2026-09-19" },
    { unit: "131", kind: "hero", url: "h1" }, { unit: "131", kind: "hero", url: "h2" },
    { unit: "133", kind: "pano", url: "c" }, null,
  ], "2026-09-18T00:00:00Z");
  assert.equal(m.version, 1);
  assert.equal(m.generated, "2026-09-18T00:00:00Z");
  assert.deepEqual(m.suites["131"].panos.map(p => p.url), ["a", "b"]);
  assert.equal(m.suites["131"].hero, "h1");
  assert.equal(m.suites["133"].hero, "");
});
