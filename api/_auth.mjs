/* Shared Supabase auth gate for the Vercel functions (concierge, voice, seed).
   Verifies the caller's magic-link session token and resolves their role;
   vendor and pending roles are rejected — these endpoints are owner/operator
   surfaces. Returns { user, role } or { error, status }.
   All Supabase plumbing lives in _supa.mjs. */
import { configured, supaJson, supaPost } from "./_supa.mjs";
export { supaJson }; // consumers historically import it from here

/* Per-user daily cap on the paid endpoints. Postgres counts (serverless-safe);
   the caller's email is resolved server-side from their JWT, so the count can't
   be spoofed. Returns "allow" (counted), "limit" (cap reached), or "outage"
   (limiter unreachable). Fails CLOSED (2026-07-23 hardening, carry-forward #8):
   if the counter can't be consulted, the paid call doesn't happen — consistent
   with the guardrail philosophy everywhere else in this codebase. Callers map
   "limit"→429 and "outage"→503 so the operator sees an honest error. */
export async function underDailyCap(kind, limit, token) {
  try {
    const r = await supaPost("/rest/v1/rpc/check_and_bump_usage", token,
      { p_kind: kind, p_limit: limit });
    if (!r.ok) return "outage";
    return (await r.json()) === true ? "allow" : "limit";
  } catch { return "outage"; }
}

/* Shared cap→HTTP response mapping. Returns null when the request may proceed. */
export function capReply(cap, what) {
  if (cap === "allow") return null;
  return cap === "limit"
    ? { status: 429, error: "daily " + what + " limit reached — try again tomorrow" }
    : { status: 503, error: "rate limiter unavailable — try again shortly" };
}

export async function requireOwnerOrOperator(req) {
  if (!configured()) return { error: "not configured (missing Supabase env)", status: 500 };
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "sign in required", status: 401 };
  const user = await supaJson("/auth/v1/user", token);
  if (!user || !user.id) return { error: "invalid session", status: 401 };
  const prof = await supaJson("/rest/v1/profiles?id=eq." + user.id + "&select=role", token);
  const role = (Array.isArray(prof) && prof[0]?.role) || "pending";
  if (role !== "owner" && role !== "operator") return { error: "owner/operator only", status: 403 };
  return { user, role, token };
}
