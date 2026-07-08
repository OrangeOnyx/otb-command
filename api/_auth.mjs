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
