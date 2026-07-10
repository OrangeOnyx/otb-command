/* Shared Supabase auth gate for the Vercel functions (concierge, voice).
   Verifies the caller's magic-link session token and resolves their role;
   vendor and pending roles are rejected — these endpoints are owner/operator
   surfaces. Returns { user, role } or { error, status }. */
const SUPA = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

export async function supaJson(path, token) {
  const r = await fetch(SUPA + path, { headers: { apikey: ANON, authorization: "Bearer " + token } });
  if (!r.ok) return null;
  return r.json();
}

/* Per-user daily cap on the paid endpoints. Postgres counts (serverless-safe);
   the caller's email is resolved server-side from their JWT, so the count can't
   be spoofed. Returns true if this request is allowed (and now counted).
   Fails OPEN on infra error — a rate-limiter outage shouldn't take the feature
   down; the DB is the durable ceiling. */
export async function underDailyCap(kind, limit, token) {
  try {
    const r = await fetch(SUPA + "/rest/v1/rpc/check_and_bump_usage", {
      method: "POST",
      headers: { apikey: ANON, authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({ p_kind: kind, p_limit: limit }),
    });
    if (!r.ok) return true;
    return (await r.json()) === true;
  } catch { return true; }
}

export async function requireOwnerOrOperator(req) {
  if (!SUPA || !ANON) return { error: "not configured (missing Supabase env)", status: 500 };
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "sign in required", status: 401 };
  const user = await supaJson("/auth/v1/user", token);
  if (!user || !user.id) return { error: "invalid session", status: 401 };
  const prof = await supaJson("/rest/v1/profiles?id=eq." + user.id + "&select=role", token);
  const role = (Array.isArray(prof) && prof[0]?.role) || "pending";
  if (role !== "owner" && role !== "operator") return { error: "owner/operator only", status: 403 };
  return { user, role, token };
}
