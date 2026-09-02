/* Access-assignment seam for the sidebar "Sign-in access…" panel.
   Pure option-building + validation for "this email IS this person": the
   operator picks owner / vendor / tenant (+ scope), the assign_role RPC does
   the SOT write-back and any in-place promotion. Vendor roster is installed
   from the auth-gated seed (same payload M-1/V-1 ride); units come from the
   public skeleton via the caller. Never offers 'operator'. */

export const ASSIGNABLE_ROLES = ["owner", "vendor", "tenant"];

let vendorRoster = [];
export function installAccessVendors(list) {
  vendorRoster = Array.isArray(list) ? list : [];
}

/* All kinds are selectable (a payee/person can still need portal access);
   non-service kinds are labeled so service companies read unmarked. */
export function accessVendorOptions(roster = vendorRoster) {
  return roster
    .filter(v => v && v.id)
    .map(v => ({ id: v.id, label: v.company + (v.kind && v.kind !== "service" ? " · " + v.kind : "") }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function accessUnitOptions(units) {
  return (Array.isArray(units) ? units : [])
    .filter(u => u && u.unit)
    .map(u => ({ id: u.unit, label: u.unit + (u.dba ? " — " + u.dba : "") }));
}

/* Which scope list a role needs: 'vendor' | 'unit' | null (owner has none). */
export function scopeKind(role) {
  return role === "vendor" ? "vendor" : role === "tenant" ? "unit" : null;
}

/* Returns an error string, or null when the assignment is submittable. */
export function validateAssignment(email, role, scope) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || "").trim().toLowerCase())) return "enter a valid email";
  if (!ASSIGNABLE_ROLES.includes(role)) return "pick a role";
  if (role === "vendor" && !scope) return "pick the vendor company";
  if (role === "tenant" && !scope) return "pick the tenant's unit";
  return null;
}
