/* E-sign pure seam — harvested from belle-realty-pwa @ 19f7c06 (esign module,
   harvest #6). Token-based signing lifecycle:
     pending → sent → viewed → signed | declined | expired
   The token IS the signer's credential (uuid, unguessable); the signer never
   logs in. All state lives in Supabase esign_requests — transitions run
   through token-gated SECURITY DEFINER RPCs (esign_get / esign_sign /
   esign_decline); this seam is the pure logic both faces share: transition
   predicates, display status, the operator's copy-paste signing message, and
   the deterministic signature receipt. No I/O, no Date.now() — pass nowIso. */

export const ESIGN_STATUS = {
  pending:  ["Draft",    "#5F6E64"],
  sent:     ["Sent",     "#A87E2F"],
  viewed:   ["Viewed",   "#2F6B4F"],
  signed:   ["Signed",   "#1E4F3C"],
  declined: ["Declined", "#C25E33"],
  expired:  ["Expired",  "#5F6E64"],
};

export const ESIGN_OPEN_STATES = ["pending", "sent", "viewed"];

/* Effective display status: an open request past its expiry shows (and is
   treated as) expired even before the RPC stamps it. */
export function esignDisplayStatus(req, nowIso) {
  if (!req) return "pending";
  if (ESIGN_OPEN_STATES.includes(req.status) && req.expires_at && nowIso &&
      new Date(nowIso).getTime() > new Date(req.expires_at).getTime()) {
    return "expired";
  }
  return req.status;
}

export const canSign = (req, nowIso) => ESIGN_OPEN_STATES.includes(esignDisplayStatus(req, nowIso));
export const canDecline = canSign;
/* Resend re-tokens anything not yet signed (declined/expired restart). */
export const canResend = req => !!req && req.status !== "signed";

/* Signing-request message the operator copies into an email/text — the app
   sends nothing itself (deliberate v1 boundary; rent comms are all-electronic
   per SOP but outbound mail is the operator's channel). */
export function signingMessage({ signerName, title, url, expiresAt }) {
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : "";
  return "Dear " + (signerName || "Tenant") + ",\n\n" +
    "Belle Realty of Lafayette, LLC has sent you a document to review and sign.\n\n" +
    "Document: " + title + "\n" +
    (expiry ? "This link expires: " + expiry + "\n" : "") +
    "\nReview and sign here:\n" + url + "\n\n" +
    "If you did not expect this document, please contact us at info@shopontheblvd.com.\n\n" +
    "Belle Realty of Lafayette, LLC\nOn The Boulevard Shopping Center\nshopontheblvd.com";
}

/* Deterministic signature receipt (donor receipt file, made pure). */
export function receiptText(req) {
  const line = "─".repeat(50);
  const sig = String(req.signature_data || "").startsWith("data:image")
    ? "[Drawn signature — see original document]"
    : (req.signature_data || "");
  return [
    "ELECTRONIC SIGNATURE RECEIPT",
    "=".repeat(50),
    "Document:   " + (req.title || ""),
    "Request ID: " + (req.id || ""),
    "",
    "SIGNER INFORMATION",
    line,
    "Name:       " + (req.signer_name || ""),
    "Email:      " + (req.signer_email || ""),
    "IP Address: " + (req.signer_ip || "unknown"),
    "Signed At:  " + (req.signed_at || ""),
    "",
    "SIGNATURE",
    line,
    sig,
    "",
    line,
    "This receipt certifies that the above-named party",
    "electronically signed the document referenced above",
    "via the Belle Realty of Lafayette secure signing portal.",
    "",
    "Belle Realty of Lafayette, LLC",
    "On The Boulevard Shopping Center · Lafayette, LA",
  ].join("\n");
}

/* Status rollup for badges/cards: counts by display status + open total. */
export function summarizeEsign(rows, nowIso) {
  const counts = { pending: 0, sent: 0, viewed: 0, signed: 0, declined: 0, expired: 0 };
  for (const r of rows || []) {
    const s = esignDisplayStatus(r, nowIso);
    if (s in counts) counts[s] += 1;
  }
  counts.open = counts.pending + counts.sent + counts.viewed;
  return counts;
}

/* Signing URL for a token, built off the app origin. */
export const signingUrl = (origin, token) => String(origin).replace(/\/$/, "") + "/api/esign?t=" + token;
