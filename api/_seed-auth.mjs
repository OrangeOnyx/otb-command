/* The bundled private dataset belongs to Orange Ocean's OTB property.
   Profiles are a UI mirror; current org_members rows authorize this payload.
   Every lookup uses the caller JWT and RLS, with no cross-user cache. */
import { configured, supaJson } from "./_supa.mjs";

export async function requireBundledPropertyAccess(req, { read = supaJson, ready = configured } = {}) {
  if (!ready()) return { error: "not configured", status: 503 };
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "sign in required", status: 401 };
  try {
    const user = await read("/auth/v1/user", token);
    if (!user?.id) return { error: "invalid session", status: 401 };
    const orgs = await read("/rest/v1/orgs?slug=eq.orange-ocean&select=id", token);
    if (!Array.isArray(orgs) || orgs.length !== 1 || !orgs[0]?.id)
      return { error: "OTB owner/operator membership required", status: 403 };
    const orgId = orgs[0].id;
    const properties = await read("/rest/v1/properties?slug=eq.otb&org_id=eq." + encodeURIComponent(orgId) + "&select=id,org_id,slug", token);
    if (!Array.isArray(properties) || properties.length !== 1 || !properties[0]?.id || properties[0].org_id !== orgId)
      return { error: "OTB owner/operator membership required", status: 403 };
    const property = properties[0];
    const memberships = await read("/rest/v1/org_members?user_id=eq." + encodeURIComponent(user.id) +
      "&org_id=eq." + encodeURIComponent(orgId) + "&select=user_id,org_id,property_id,role", token);
    const matching = Array.isArray(memberships) ? memberships.filter(m =>
      m.user_id === user.id && m.org_id === orgId &&
      (m.property_id === null || m.property_id === property.id) &&
      (m.role === "owner" || m.role === "operator")) : [];
    if (!matching.length) return { error: "OTB owner/operator membership required", status: 403 };
    return { user, token, property, role: matching.some(m => m.role === "operator") ? "operator" : "owner" };
  } catch {
    return { error: "membership verification unavailable", status: 503 };
  }
}
