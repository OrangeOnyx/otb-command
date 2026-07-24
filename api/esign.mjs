/* /api/esign — the public signing page (harvest #6). The uuid token in ?t= is
   the signer's whole credential: every read/transition goes through the
   token-gated SECURITY DEFINER RPCs (esign_get / esign_sign / esign_decline)
   as anon — no session, no service key. ZERO inline JS by design: the site
   CSP (script-src 'self') stays untouched, so this is a plain HTML form that
   POSTs back to itself (form-action 'self'). Inline styles are allowed by the
   CSP and carry the plan-room look. */
import { configured, rpcUser, storageSignedUrl } from "./_supa.mjs";
import { esc } from "../src/lib/format.js";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&family=Public+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">';

const page = (title, body) =>
  "<!doctype html><html><head><meta charset=\"utf-8\">" +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>" + esc(title) + " — Belle Realty</title>" + FONTS +
  '</head><body style="margin:0;background:#EDEFE8;color:#1C2B26;font-family:\'Public Sans\',sans-serif">' +
  '<div style="max-width:640px;margin:0 auto;padding:32px 20px">' +
  '<div style="font-family:\'Big Shoulders Display\',sans-serif;font-weight:700;font-size:22px;letter-spacing:.06em">ON THE BOULEVARD</div>' +
  '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#5F6E64;margin-bottom:20px">BELLE REALTY OF LAFAYETTE, LLC · SECURE SIGNING</div>' +
  body +
  '<div style="margin-top:28px;padding-top:12px;border-top:1px solid #5F6E64;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:#5F6E64">' +
  "Questions? info@shopontheblvd.com · Belle Realty of Lafayette, LLC</div></div></body></html>";

const card = inner =>
  '<div style="background:#F6F7F1;border:1px solid #5F6E64;border-radius:4px;padding:20px 22px">' + inner + "</div>";

const note = (msg, color) =>
  card('<div style="font-weight:600;color:' + color + '">' + esc(msg) + "</div>");

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" })
  : "";

function signFormHTML(r, token, docUrl) {
  return card(
    '<div style="font-family:\'Big Shoulders Display\',sans-serif;font-weight:600;font-size:19px">' + esc(r.title) + "</div>" +
    (r.description ? '<div style="font-size:14px;margin:8px 0">' + esc(r.description) + "</div>" : "") +
    '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:#5F6E64;margin:8px 0">' +
    "For: " + esc(r.signer_name || r.signer_email) + (r.unit ? " · Unit " + esc(r.unit) : "") +
    " · Link expires " + esc(fmtDate(r.expires_at)) + "</div>" +
    (docUrl
      ? '<div style="margin:12px 0"><a href="' + esc(docUrl) + '" style="color:#2F6B4F;font-weight:600">📄 Review the document</a>' +
        ' <span style="font-size:12px;color:#5F6E64">(opens in a new window — review before signing)</span></div>'
      : "") +
    '<form method="POST" action="/api/esign?t=' + esc(token) + '" style="margin-top:14px">' +
    '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Type your full legal name to sign</label>' +
    '<input name="signature" required maxlength="200" placeholder="' + esc(r.signer_name || "Full legal name") + '" ' +
    'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #5F6E64;border-radius:3px;font-family:\'IBM Plex Mono\',monospace;font-size:15px;background:#fff">' +
    '<div style="font-size:11px;color:#5F6E64;margin:8px 0">By clicking “Sign document” you agree that your typed name is your ' +
    "electronic signature and that you intend to be bound by this document, per the U.S. E-SIGN Act and the Louisiana Uniform " +
    "Electronic Transactions Act.</div>" +
    '<button name="action" value="sign" style="background:#1E4F3C;color:#fff;border:0;border-radius:3px;padding:12px 22px;font-size:15px;font-weight:600;cursor:pointer">✓ Sign document</button>' +
    "</form>" +
    '<details style="margin-top:16px"><summary style="font-size:12px;color:#C25E33;cursor:pointer">I can’t sign this — decline</summary>' +
    '<form method="POST" action="/api/esign?t=' + esc(token) + '" style="margin-top:8px">' +
    '<input name="reason" required maxlength="500" placeholder="Briefly, why are you declining?" ' +
    'style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #5F6E64;border-radius:3px;font-size:13px;background:#fff">' +
    '<button name="action" value="decline" style="margin-top:6px;background:#C25E33;color:#fff;border:0;border-radius:3px;padding:8px 16px;font-size:13px;cursor:pointer">Decline to sign</button>' +
    "</form></details>");
}

function statusHTML(r) {
  if (r.status === "signed") {
    return note("This document was signed on " + fmtDate(r.signed_at) + ". A copy is on file with Belle Realty — no further action is needed.", "#1E4F3C");
  }
  if (r.status === "declined") {
    return note("This signing request was declined" + (r.decline_reason ? " (“" + r.decline_reason + "”)" : "") + ". Contact Belle Realty if that was a mistake.", "#C25E33");
  }
  return note("This signing link has expired. Please contact Belle Realty for a fresh link.", "#5F6E64");
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!configured()) return res.status(500).send(page("Unavailable", note("Signing is temporarily unavailable.", "#C25E33")));

  const token = String(req.query?.t || "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return res.status(404).send(page("Not found", note("This signing link is not valid. Check the link in your email, or contact Belle Realty.", "#C25E33")));
  }

  if (req.method === "GET") {
    let r;
    try { r = await rpcUser("esign_get", null, { p_token: token }); }
    catch { return res.status(404).send(page("Not found", note("This signing link is not valid. Check the link in your email, or contact Belle Realty.", "#C25E33"))); }
    if (r.status !== "viewed" && r.status !== "pending" && r.status !== "sent") {
      return res.status(200).send(page(r.title || "Signing request", statusHTML(r)));
    }
    let docUrl = null;
    if (r.has_doc) {
      try {
        const path = await rpcUser("esign_doc_path", null, { p_token: token });
        if (path) docUrl = await storageSignedUrl("documents", path, null, 3600);
      } catch { /* doc link is best-effort; the form still renders */ }
    }
    return res.status(200).send(page(r.title || "Signing request", signFormHTML(r, token, docUrl)));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
    try {
      if (body.action === "sign") {
        const out = await rpcUser("esign_sign", null, { p_token: token, p_signature: String(body.signature || ""), p_ip: ip });
        return res.status(200).send(page("Signed", note("Thank you — “" + (out.title || "the document") + "” is signed and on file as of " + fmtDate(out.signed_at) + ". Belle Realty has been notified.", "#1E4F3C")));
      }
      if (body.action === "decline") {
        await rpcUser("esign_decline", null, { p_token: token, p_reason: String(body.reason || "") });
        return res.status(200).send(page("Declined", note("Understood — the request is marked declined and Belle Realty has been notified.", "#C25E33")));
      }
      return res.status(400).send(page("Error", note("Unknown action.", "#C25E33")));
    } catch (e) {
      return res.status(400).send(page("Error", note("Could not complete that: the link may have expired or already been used. Contact Belle Realty for help.", "#C25E33")));
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).send(page("Error", note("Method not allowed.", "#C25E33")));
}
