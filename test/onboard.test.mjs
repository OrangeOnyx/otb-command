import test from "node:test";
import assert from "node:assert/strict";
import { validateIntake, intakePlan, ROLES } from "../src/lib/onboard.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const template = JSON.parse(readFileSync(
  fileURLToPath(new URL("../docs/phase-c/onboarding-intake-template.json", import.meta.url)), "utf8"));

const good = () => JSON.parse(JSON.stringify(template));

test("the shipped intake template validates clean", () => {
  const r = validateIntake(good());
  assert.deepEqual(r.errors, []);
  assert.ok(r.ok);
});

test("slug shape is enforced to the DB CHECK", () => {
  const i = good();
  i.org.slug = "Bad_Slug!";
  i.property.slug = "x"; // too short
  const r = validateIntake(i);
  assert.ok(!r.ok);
  assert.ok(r.errors.some(e => e.startsWith("org.slug")));
  assert.ok(r.errors.some(e => e.startsWith("property.slug")));
});

test("ledger_start_ym must be YYYY-MM; numerics non-negative", () => {
  const i = good();
  i.settings.ledger_start_ym = "2026-9";
  i.settings.late_flat = -5;
  const r = validateIntake(i);
  assert.ok(r.errors.some(e => e.includes("ledger_start_ym")));
  assert.ok(r.errors.some(e => e.includes("late_flat")));
});

test("authorized rows need a valid email and a whitelisted role", () => {
  const i = good();
  i.authorized.push({ email: "not-an-email", role: "admin" });
  const r = validateIntake(i);
  assert.ok(r.errors.some(e => e.includes("authorized[2].email")));
  assert.ok(r.errors.some(e => e.includes("authorized[2].role")));
  assert.deepEqual(ROLES, ["operator", "owner", "vendor", "tenant"]);
});

test("junk input never throws — it reports", () => {
  for (const junk of [null, 42, "x", [], {}]) {
    const r = validateIntake(junk);
    assert.equal(r.ok, false);
    assert.ok(r.errors.length);
  }
});

test("intakePlan names org reuse and the property-exists raise", () => {
  const lines = intakePlan(good()).join("\n");
  assert.ok(lines.includes("created or reused"));
  assert.ok(lines.includes("RAISES if it already exists"));
  assert.ok(lines.includes("operator@example.com → operator"));
});
