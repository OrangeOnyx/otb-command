import { test } from "node:test";
import assert from "node:assert/strict";
import { underDailyCap, capReply } from "../api/_auth.mjs";

/* Carry-forward problem #8 (server half): underDailyCap used to fail OPEN on
   infra error, so a limiter outage waived the cap on every paid endpoint.
   Now it fails CLOSED with an honest tri-state. */

test("limiter unreachable → outage (fail closed), never allow", async () => {
  // No Supabase env in the test process → the RPC fetch cannot succeed.
  const cap = await underDailyCap("test", 5, "not-a-token");
  assert.equal(cap, "outage");
});

test("capReply maps limit→429, outage→503, allow→proceed", () => {
  assert.equal(capReply("allow", "x"), null);
  const lim = capReply("limit", "COI-parse");
  assert.equal(lim.status, 429);
  assert.match(lim.error, /daily COI-parse limit/);
  const out = capReply("outage", "voice");
  assert.equal(out.status, 503);
  assert.match(out.error, /rate limiter unavailable/);
});
