/* Published phone lines seam (decision H-2, 2026-09-01: PUBLISH the Twilio
   bridge's numbers; AC's Vapi/Retell line retires after a forwarding soak).
   Pure: normalization + display + validation for the two lines the property
   publishes — tenant service (maintenance / after-hours) and leasing. The
   numbers themselves live on the voice_settings row (published_lines /
   set_voice_lines RPCs in remote.js); this module never touches the network.
   Tenants see the tenant line on M-1, K-1 lists both, the sidebar
   "Phone lines…" panel is the one place the operator types them. */

export const LINE_DEFS = [
  ["tenant", "Tenant service line", "maintenance · after-hours emergencies"],
  ["leasing", "Leasing line", "availability · tours"],
];

/* Any US format → E.164 ('+13375550100'), or null when it isn't a 10-digit
   NANP number (area code and exchange can't start with 0/1). Mirrors the
   DB's voice_line_e164() so client validation never disagrees with the RPC. */
export function normalizeUsNumber(input) {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? "+1" + digits : null;
}

/* '+13375550100' → '(337) 555-0100'; '' for anything that doesn't normalize. */
export function formatUsNumber(input) {
  const n = normalizeUsNumber(input);
  if (!n) return "";
  const t = n.slice(2);
  return "(" + t.slice(0, 3) + ") " + t.slice(3, 6) + "-" + t.slice(6);
}

export function telHref(input) {
  const n = normalizeUsNumber(input);
  return n ? "tel:" + n : "";
}

/* published_lines() row ({tenant, leasing, updated_at} — E.164 or '') or the
   raw voice_settings row ({tenant_number, leasing_number}) → per-line
   {e164, display, href} | null, plus updatedAt. Unset/invalid = null, so a
   surface can simply skip a null line. */
export function linesFromRow(row) {
  const out = { updatedAt: row?.updated_at || null };
  for (const [key] of LINE_DEFS) {
    const raw = row?.[key + "_number"] ?? row?.[key];
    const n = normalizeUsNumber(raw);
    out[key] = n ? { e164: n, display: formatUsNumber(n), href: telHref(n) } : null;
  }
  return out;
}

export function hasLines(lines) {
  return LINE_DEFS.some(([key]) => !!lines?.[key]);
}

/* Rows a surface should list, in LINE_DEFS order, set lines only.
   audience 'tenant' = the tenant line alone (a tenant on M-1 has no
   business with the leasing line); anything else = both. */
export function lineRows(lines, audience = "operator") {
  return LINE_DEFS
    .filter(([key]) => audience !== "tenant" || key === "tenant")
    .filter(([key]) => !!lines?.[key])
    .map(([key, label, hint]) => ({ key, label, hint, display: lines[key].display, href: lines[key].href }));
}

/* Returns an error string, or null when the pair is submittable. Blank is
   allowed (a line can be unpublished); a non-blank entry must normalize;
   the two lines can't be the same number. */
export function validateLines(tenant, leasing) {
  const t = String(tenant ?? "").trim(), l = String(leasing ?? "").trim();
  const nt = t ? normalizeUsNumber(t) : "";
  const nl = l ? normalizeUsNumber(l) : "";
  if (t && !nt) return "tenant line: enter a 10-digit US number";
  if (l && !nl) return "leasing line: enter a 10-digit US number";
  if (nt && nt === nl) return "tenant and leasing lines must differ";
  return null;
}

/* One-line status for the operator panel. */
export function publishNote(lines) {
  if (!hasLines(lines)) return "Not published yet — paste the two Twilio numbers (Console → Phone Numbers) and Save.";
  const parts = LINE_DEFS.filter(([k]) => lines[k]).map(([k]) => k + " " + lines[k].display);
  const when = lines.updatedAt ? " · updated " + String(lines.updatedAt).slice(0, 10) : "";
  return "Published · " + parts.join(" · ") + when;
}
