import test from "node:test";
import assert from "node:assert/strict";
import { printFootText, printDocTitle } from "../src/lib/printsheet.js";

const PAGES = [["dash", "D-1", "Dashboard"], ["plan", "A-1", "Site Plan"]];

test("printFootText stamps sheet code, title, date, and headline figures", () => {
  const t = printFootText(PAGES, "plan", "JUL 16, 2026");
  assert.equal(t, "OTB PROPERTY COMMAND · A-1 SITE PLAN · PRINTED JUL 16, 2026 · 62,883 SF GLA · 27 UNITS");
});

test("printFootText tolerates an unknown page id", () => {
  const t = printFootText(PAGES, "nope", "JUL 16, 2026");
  assert.match(t, /^OTB PROPERTY COMMAND · PRINTED/);
});

test("printDocTitle drives the default PDF filename", () => {
  assert.equal(printDocTitle(PAGES, "dash", "2026-07-16"), "OTB-D-1-2026-07-16");
  assert.equal(printDocTitle(PAGES, "nope", "2026-07-16"), "OTB-sheet-2026-07-16");
});
