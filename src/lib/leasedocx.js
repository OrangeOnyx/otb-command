/* DOCX merge for the executable lease — pure bytes-in/bytes-out (fflate),
   usable in node tests and the browser alike. Template tokens are guaranteed
   single-run by tools/lease-template.mjs, so plain string replacement inside
   word/document.xml is exact. Tested in test/leasedocx.test.mjs. */
import { unzipSync, zipSync } from "fflate";

const xmlEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* Multi-line token values (Schedule G rows) become Word line breaks. */
const xmlVal = s => xmlEsc(s).split("\n").join('</w:t><w:br/><w:t xml:space="preserve">');

export function mergeDocx(templateBytes, tokens) {
  const bytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);
  const zip = unzipSync(bytes);
  const dec = new TextDecoder(), enc = new TextEncoder();
  let xml = dec.decode(zip["word/document.xml"]);
  xml = xml.replace(/\[\[([^\]]+)\]\]/g, (m, name) => name in tokens ? xmlVal(tokens[name]) : m);
  const left = [...xml.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
  if (left.length) throw new Error("unmerged tokens: " + [...new Set(left)].join(", "));
  zip["word/document.xml"] = enc.encode(xml);
  return zipSync(zip);
}

export function leaseFileName(tokens, ext) {
  const slug = String(tokens.LESSEE_LEGAL_NAME || "tenant").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `lease-unit-${tokens.SUITE}-${slug}-draft.${ext}`;
}
