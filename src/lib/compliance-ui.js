/* View-only compliance helpers. They never mutate business state. */
const READ_ONLY_CLASSES = new Set(["role-owner", "role-tenant", "role-vendor", "owner-preview"]);

export function canEditCompliance(classes = []) {
  const values = typeof classes === "string" ? classes.split(/\s+/) : [...classes];
  return !values.some(value => READ_ONLY_CLASSES.has(value));
}

export function filterComplianceRows(units, fields, stateOf, { query = "", flaggedOnly = false } = {}) {
  const term = String(query).trim().toLowerCase();
  return units.filter(unit => {
    const matches = !term || [unit.unit, unit.dba].join(" ").toLowerCase().includes(term);
    return matches && (!flaggedOnly || fields.some(([field]) => stateOf(unit.unit, field) === "flag"));
  });
}
