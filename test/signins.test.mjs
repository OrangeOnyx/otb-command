/* D-24b (2026-09-17): sign-in audit KPI — pure. The D-1 card derives from
   signin_log rows the operator can read; the view never infers state. The
   migration is pinned for the two invariants that make the log trustworthy:
   no client write policy, and the RPC stamps email + role itself. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { signinKpi, hoursAgoLabel, SIGNIN_WINDOW_DAYS } from "../src/lib/signins.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG = readFileSync(join(root, "supabase/migrations/20260917120000_signin_log.sql"), "utf8");

const NOW = Date.parse("2026-09-17T18:00:00Z");
const ago = h => new Date(NOW - h * 3600e3).toISOString();

test("signins: window count, distinct accounts, role tally, newest-first 'last' line", () => {
  const k = signinKpi([
    { email: "adam@example.com", role: "operator", at: ago(30) },
    { email: "owner@example.com", role: "owner", at: ago(2) },
    { email: "Adam@example.com", role: "operator", at: ago(5) },
    { email: "old@example.com", role: "owner", at: ago(24 * 9) },   // outside 7d
    { email: "bad@example.com", role: "vendor", at: "not-a-date" }, // ignored
  ], NOW);
  assert.equal(k[0], "ink");
  assert.equal(k[1], "Sign-ins (" + SIGNIN_WINDOW_DAYS + "d)");
  assert.equal(k[2], 3);
  assert.ok(k[3].startsWith("last: owner@example.com · 2h ago"));
  assert.ok(k[3].includes("2 accounts"), "email compare is case-insensitive");
  assert.ok(k[3].includes("2 operator · 1 owner"));
});

test("signins: nothing in the window → null (card doesn't render)", () => {
  assert.equal(signinKpi([], NOW), null);
  assert.equal(signinKpi(null, NOW), null);
  assert.equal(signinKpi([{ email: "x", role: "owner", at: ago(24 * 8) }], NOW), null);
});

test("signins: age label reads minutes, hours, then days", () => {
  assert.equal(hoursAgoLabel(ago(0.25), NOW), "15m ago");
  assert.equal(hoursAgoLabel(ago(30), NOW), "30h ago");
  assert.equal(hoursAgoLabel(ago(72), NOW), "3d ago");
  assert.equal(hoursAgoLabel("junk", NOW), "");
});

test("signin_log migration: operator-only read, no client write policy, RPC stamps identity server-side", () => {
  assert.match(MIG, /create policy "signin log read operator"[\s\S]*array\['operator'\]/);
  assert.ok(!/for insert/.test(MIG) && !/for update/.test(MIG), "no direct write policies");
  assert.match(MIG, /auth\.jwt\(\)->>'email'/);
  assert.match(MIG, /select role from profiles where id = auth\.uid\(\)/);
  assert.match(MIG, /interval '10 minutes'/, "reload storms dedupe into one session");
  assert.match(MIG, /grant execute on function public\.log_signin\(text, text\) to authenticated/);
});
