/* COI AI-parse (Phase A-1, 2026-07-23) — pure helpers shared by the Vercel
   function (api/coi-parse.js) and the V-1 operator panel. The endpoint sends
   the cert PDF to Haiku with a FORCED tool call; this module owns the tool
   schema and the normalization of whatever comes back (the model's output is
   never trusted raw — dates are shape/plausibility-checked, strings trimmed,
   the coi_note line composed deterministically). Tested in
   test/coiparse.test.mjs. */

/* Vercel serverless body cap is 4.5 MB and base64 inflates ~4/3 — 3 MB of
   PDF keeps the JSON envelope safely under it. */
export const COI_PARSE_MAX_PDF_BYTES = 3 * 1024 * 1024;

/* Forced tool: the model must answer through this schema, so the endpoint
   never parses free text. Nullable fields — "not on the certificate" is a
   valid answer and better than a guess. */
export const COI_EXTRACT_TOOL = {
  name: "record_coi",
  description: "Record the fields extracted from a vendor's certificate of insurance (typically ACORD 25). Use null for any field that is not on the certificate — never guess or infer a value.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      carrier: { type: ["string", "null"], description: "Insurer that writes the GENERAL LIABILITY line (the ACORD 'INSURER' letter the GL row references)" },
      insured: { type: ["string", "null"], description: "Named insured on the certificate (the vendor)" },
      policy_number: { type: ["string", "null"], description: "General-liability policy number" },
      gl_each_occurrence: { type: ["number", "null"], description: "GL EACH OCCURRENCE limit, dollars" },
      gl_aggregate: { type: ["number", "null"], description: "GL GENERAL AGGREGATE limit, dollars" },
      expiry: { type: ["string", "null"], description: "GL policy expiration date as YYYY-MM-DD" },
      additional_insured: { type: "boolean", description: "True if the GL line is marked additional-insured or the description box names the property / owner / manager as additional insured" },
      notes: { type: ["string", "null"], description: "Anything unusual: already expired, no GL section, illegible scan, multiple GL policies" },
    },
    required: ["carrier", "insured", "policy_number", "gl_each_occurrence", "gl_aggregate", "expiry", "additional_insured", "notes"],
  },
};

const trimOrNull = v => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};
const posOrNull = v => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);

/* "$1M", "$2.5M", "$500K" — the vernacular of every COI conversation. */
export function fmtLimit(n) {
  if (!(typeof n === "number" && isFinite(n) && n > 0)) return null;
  if (n >= 1e6) return "$" + String(+(n / 1e6).toFixed(1)).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "$" + String(+(n / 1e3).toFixed(0)) + "K";
  return "$" + n;
}

/* Accept ISO YYYY-MM-DD or US MM/DD/YYYY (what ACORD forms actually carry);
   anything else → null. Returns the ISO string or null. */
export function normalizeCoiDate(v) {
  const s = typeof v === "string" ? v.trim() : "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + String(m[1]).padStart(2, "0") + "-" + String(m[2]).padStart(2, "0");
  return null;
}

/* Deterministic coi_note line: "Hartford · GL $1M/$2M · pol 20SBW... · addl insured" */
export function coiNoteLine(f) {
  const parts = [];
  if (f.carrier) parts.push(f.carrier);
  const occ = fmtLimit(f.glEachOccurrence), agg = fmtLimit(f.glAggregate);
  if (occ || agg) parts.push("GL " + (occ || "?") + (agg ? "/" + agg : ""));
  if (f.policyNumber) parts.push("pol " + f.policyNumber);
  if (f.additionalInsured) parts.push("addl insured");
  return parts.join(" · ");
}

/* Model output → { expires, note, fields, warnings }. `todayISO` keeps the
   expired-check pure/testable. Never throws — a hostile or malformed payload
   degrades to nulls + warnings. */
export function normalizeCoiExtraction(raw, todayISO) {
  const r = raw && typeof raw === "object" ? raw : {};
  const warnings = [];
  if (!raw || typeof raw !== "object") warnings.push("model returned no usable extraction");

  const fields = {
    carrier: trimOrNull(r.carrier),
    insured: trimOrNull(r.insured),
    policyNumber: trimOrNull(r.policy_number),
    glEachOccurrence: posOrNull(r.gl_each_occurrence),
    glAggregate: posOrNull(r.gl_aggregate),
    additionalInsured: r.additional_insured === true,
    modelNotes: trimOrNull(r.notes),
  };

  let expires = normalizeCoiDate(r.expiry);
  if (r.expiry != null && !expires) warnings.push('unreadable expiry "' + String(r.expiry).slice(0, 40) + '"');
  if (expires) {
    const year = +expires.slice(0, 4);
    if (year < 2015 || year > 2040) { warnings.push("implausible expiry year " + year + " — dropped"); expires = null; }
    else if (todayISO && expires < todayISO) warnings.push("certificate is already expired (" + expires + ")");
  } else if (!warnings.length || r.expiry == null) {
    warnings.push("no expiration date found");
  }
  if (!fields.additionalInsured) warnings.push("additional-insured not indicated");
  if (fields.modelNotes) warnings.push(fields.modelNotes);

  return { expires, note: coiNoteLine(fields), fields, warnings };
}

/* One status line for the operator panel: what was read + what to eyeball. */
export function coiParseSummary(x) {
  const head = [x.fields.carrier, x.expires ? "expires " + x.expires : null, coiNoteLine({ ...x.fields, carrier: null, policyNumber: null }) || null]
    .filter(Boolean);
  const lead = head.length ? "Parsed: " + head.join(" · ") : "Parsed: nothing usable";
  return x.warnings.length ? lead + " ⚠ " + x.warnings.join("; ") : lead;
}
