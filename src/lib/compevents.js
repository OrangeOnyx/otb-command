/* Event-sourced compliance (otb-ops harvest #3) — pure helpers for the C-1
   audit trail. The append-only rows live in Supabase compliance_events
   (insert = operator, read = owner/operator, no update/delete policies);
   remote.js writes/reads them, this module only shapes and describes.
   Tested in test/compevents.test.mjs. */

export const STATE_WORDS = { u: "unverified", ok: "on file", flag: "flagged", na: "n/a" };

/* Shape a client-side change into an insert row. Returns null when the
   change is a no-op or malformed — callers skip logging those. */
export function eventRow({ unit, field, from, to }) {
  if (!unit || !field) return null;
  const a = String(from ?? ""), b = String(to ?? "");
  if (!a || !b || a === b) return null;
  return { unit: String(unit), field: String(field), old_state: a, new_state: b };
}

/* One display line per stored event: who flipped what, from → to, when. */
export function describeEvent(evt, fieldLabels = {}) {
  const d = evt.created_at ? new Date(evt.created_at) : null;
  return {
    when: d && !isNaN(d) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    line: evt.unit + " · " + (fieldLabels[evt.field] || evt.field) + ": " +
      (STATE_WORDS[evt.old_state] || evt.old_state) + " → " +
      (STATE_WORDS[evt.new_state] || evt.new_state),
    who: String(evt.changed_by || "").split("@")[0],
  };
}
