import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveLine, persistLine, isRouterLine, MAIN_GREETING, mainPersona,
} from "../src/lib/voicerouter.js";
import { speechify, MAINT_TOOL, TOUR_TOOL, PACKAGE_TOOL } from "../src/lib/voiceagent.js";
import sop from "../src/data/sop.json" with { type: "json" };

test("resolveLine / persistLine / isRouterLine", () => {
  assert.equal(resolveLine("leasing"), "leasing");
  assert.equal(resolveLine("main"), "main");
  assert.equal(resolveLine("tenant"), "tenant");
  assert.equal(resolveLine(""), "tenant");
  assert.equal(persistLine("main"), "tenant");
  assert.equal(persistLine("tenant"), "tenant");
  assert.equal(persistLine("leasing"), "leasing");
  assert.ok(isRouterLine("main"));
  assert.ok(isRouterLine("tenant"));
  assert.ok(!isRouterLine("leasing"));
});

test("MAIN_GREETING is speakable", () => {
  assert.ok(MAIN_GREETING.includes("space to lease"));
  assert.equal(speechify(MAIN_GREETING), MAIN_GREETING);
});

test("main persona routes both tracks and keeps the red lines", () => {
  const slots = [{ key: "2026-07-28T10:00", label: "Tuesday, July 28 at 10:00 AM" }];
  const p = mainPersona(sop, { nowLine: "Friday 9 AM", slots });
  assert.ok(p.includes("ROUTE FIRST"));
  assert.ok(p.includes("MAINTENANCE TRACK"));
  assert.ok(p.includes("LEASING TRACK"));
  assert.ok(p.includes("NEVER state or imply any eviction step"));
  assert.ok(p.includes("high teens per square foot"));
  assert.ok(p.includes("2026-07-28T10:00 = Tuesday, July 28 at 10:00 AM"));
  assert.ok(p.includes("ok:true"));
  assert.ok(p.includes("file_maintenance_request"));
  assert.ok(p.includes("send_leasing_package"));
  assert.ok(!p.includes("undefined"));
});

test("router line exposes every tool schema", () => {
  for (const tool of [MAINT_TOOL, TOUR_TOOL, PACKAGE_TOOL]) {
    assert.ok(tool.name && tool.input_schema?.type === "object");
  }
});
