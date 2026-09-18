/* Outbound e-mail seam (2026-09-18). ONE place that knows how to send mail;
   provider picked by which key exists in the Vercel env:
     RESEND_API_KEY   → https://api.resend.com/emails
     SENDGRID_API_KEY → https://api.sendgrid.com/v3/mail/send
   plus NOTIFY_FROM ("Cypress Command <notices@yourdomain>") — the domain must
   be verified at the provider or the send bounces. Nothing configured →
   { sent:false, reason:"not configured" } and the caller carries on; the app
   never fails a call, a cron, or a request because mail didn't go out.
   Never throws. Recipients are deduped + lowercased; empty list = no-op. */

export const emailConfigured = () =>
  !!process.env.NOTIFY_FROM && !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);

export function emailProvider() {
  if (!process.env.NOTIFY_FROM) return "";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  return "";
}

/* "Name <addr>" | "addr" → { name, email } */
export function parseFrom(s) {
  const m = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(String(s || ""));
  if (m) return { name: (m[1] || "").trim(), email: m[2].trim() };
  return { name: "", email: String(s || "").trim() };
}

export async function sendEmail({ to, subject, text, html }) {
  const list = [...new Set((Array.isArray(to) ? to : [to]).filter(Boolean).map(e => String(e).trim().toLowerCase()))];
  if (!list.length) return { sent: false, reason: "no recipients" };
  const provider = emailProvider();
  if (!provider) return { sent: false, reason: "not configured" };
  const from = parseFrom(process.env.NOTIFY_FROM);
  try {
    let r;
    if (provider === "resend") {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: "Bearer " + process.env.RESEND_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ from: from.name ? `${from.name} <${from.email}>` : from.email, to: list, subject, text, html }),
        signal: AbortSignal.timeout(10000),
      });
    } else {
      r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { authorization: "Bearer " + process.env.SENDGRID_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: list.map(email => ({ email })) }],
          from: { email: from.email, name: from.name || undefined },
          subject,
          content: [{ type: "text/plain", value: text || " " }, ...(html ? [{ type: "text/html", value: html }] : [])],
        }),
        signal: AbortSignal.timeout(10000),
      });
    }
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("email:", provider, r.status, detail.slice(0, 200));
      return { sent: false, reason: provider + " HTTP " + r.status };
    }
    return { sent: true, provider, to: list };
  } catch (e) {
    console.error("email:", provider, e.message);
    return { sent: false, reason: e.message };
  }
}
