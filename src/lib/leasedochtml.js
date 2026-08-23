/* HTML rendering of the executable lease — single source is lease-body.json
   (emitted from the SAME scrubbed template as the DOCX by
   tools/lease-template.mjs), so DOCX and HTML can never drift. Tenant-facing
   navy/white brand (matches the lease.js proposal document family, NOT the
   plan-room app chrome). Tested in test/leasedochtml.test.mjs. */
import body from "../data/lease-body.json" with { type: "json" };
import { esc } from "./format.js";

const CSS = `
  body{font-family:Helvetica,Arial,sans-serif;color:#1C2D4F;margin:0;background:#F5F5F5}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.9in .85in}
  .bar{background:#1C2D4F;color:#F5F5F5;padding:18px 28px;display:flex;justify-content:space-between;align-items:baseline}
  .bar .wm{font-size:18px;font-weight:bold;letter-spacing:.1em}
  .draft{font-size:11px;letter-spacing:.18em;border:1px solid #F5F5F5;padding:3px 10px}
  h2{font-size:13px;letter-spacing:.06em;margin:18px 0 6px;white-space:pre-line}
  p{font-size:12.5px;line-height:1.6;margin:8px 0;white-space:pre-wrap}
  .chk{background:#FFF6E8;border:1px solid #A87E2F;padding:14px 18px;margin:0 0 22px;font-size:12px}
  .chk h3{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
  @media print{body{background:#fff}.page{padding:.4in .5in}.chk{display:none}}`;

const isHeading = t => /^(Section [\d.]*|SCHEDULE [A-G]|WITNESSETH|\[SIGNATURES)/.test(t.trim());

export function leaseHtml(tokens, { checklist } = {}) {
  const merged = body.map(p => p.replace(/\[\[([^\]]+)\]\]/g, (m, n) => n in tokens ? tokens[n] : m));
  const left = merged.join("").match(/\[\[([^\]]+)\]\]/);
  if (left) throw new Error("unmerged token in HTML: " + left[1]);
  const paras = merged.map(t => isHeading(t) ? "<h2>" + esc(t) + "</h2>" : "<p>" + esc(t) + "</p>").join("\n");
  const chk = checklist && checklist.length
    ? '<div class="chk"><h3>Issuance checklist — operator copy only</h3>' +
      checklist.map(c => "<p>" + esc(c) + "</p>").join("") + "</div>"
    : "";
  return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Lease — Unit " + esc(tokens.SUITE) + " — DRAFT</title><style>" + CSS + "</style></head><body>" +
    '<div class="bar"><span class="wm">ON THE BOULEVARD SHOPPING CENTER</span>' +
    '<span class="draft">DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW</span></div>' +
    '<div class="page">' + chk + paras + "</div></body></html>";
}
