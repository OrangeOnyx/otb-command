// tools/lease-template.mjs — normalize + scrub the master lease docx.
// Usage: node tools/lease-template.mjs [path-to-master.docx]
// Emits src/data/lease-template.docx + lease-manifest.json + lease-body.json.
// Re-run ONLY when the master house form changes. The raw master is never
// committed (residual PII); these scrubbed artifacts are.
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync, zipSync } from "fflate";

const SRC = process.argv[2] ||
  "C:/Users/adam/OneDrive/Desktop/OTB_Master_Lease_v2_2_Louisiana_House_Form.docx";

/* Forbidden PII needles stored base64-encoded to keep plaintext PII out of source. */
const FORBIDDEN = ["bGVib3VlZg==","Q29uc3RpdHV0aW9uIERyaXZl","OTYyLTEzMTk=","MjEgQXJub3VsZCBCb3VsZXZhcmQ=","c2Fsb24="].map(s => Buffer.from(s, "base64").toString("utf8"));

const zip = unzipSync(readFileSync(SRC));
let xml = Buffer.from(zip["word/document.xml"]).toString("utf8");

/* 0) Stamp DRAFT into the body itself — this document must never be mistaken
   for an execution copy even as a bare plaintext/printed export with no app
   chrome around it. Minimal OOXML: one centered, bold paragraph inserted
   immediately after <w:body> opens, ahead of every other paragraph. */
const DRAFT_STAMP_PARA =
  '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr>' +
  '<w:t>DRAFT \u2014 SUBJECT TO LOUISIANA COUNSEL REVIEW</w:t></w:r></w:p>';
xml = xml.replace(/<w:body[^>]*>/, m => m + DRAFT_STAMP_PARA);

/* 1) Run-normalize per paragraph: Word splits text into runs, so a [[TOKEN]]
   can span runs. For each <w:p> whose concatenated text contains "[[",
   merge ALL its runs' text into the paragraph's first run (keeping that
   run's properties). These paragraphs are plain body text — no formatting is load-bearing. */
xml = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, para => {
  const texts = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
  const joined = texts.join("");
  if (!joined.includes("[[") || texts.length < 2) return para;
  let first = true;
  return para.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, () => {
    if (first) { first = false; return `<w:t xml:space="preserve">${joined}</w:t>`; }
    return "<w:t xml:space=\"preserve\"></w:t>";
  });
});

/* 2) Scrub by pattern (no plaintext PII in source — patterns constructed from base64). */
const SCRUB_PATTERNS = [
  /* a) LESSEE notice: rewrite contact block with tokens. */
  { pattern: /<w:t[^>]*>LESSEE: \[\[LESSEE_LEGAL_NAME\]\] c\/o \[\[LESSEE_AUTHORIZED_REPRESENTATIVE\]\] [\s\S]*?<\/w:t>/g,
    replace: "<w:t>LESSEE: [[LESSEE_LEGAL_NAME]] c/o [[LESSEE_AUTHORIZED_REPRESENTATIVE]] [[LESSEE_NOTICE_ADDRESS]] [[LESSEE_EMAIL]] [[LESSEE_PHONE]]</w:t>" },
  /* b) Municipal address (pattern: literal keyword + encoded address + period). */
  { pattern: new RegExp("Said Premises has a municipal address of " + Buffer.from("MSAyMSBBcm5vdWxkIEJvdWxldmFyZCwgTGFmYXlldHRlLCBMb3Vpc2lhbmEgNzA1MDY=", "base64").toString("utf8") + "\\.", "g"),
    replace: "Said Premises has a municipal address of [[PREMISES_ADDRESS]]." },
  /* c) Use standard (pattern: encoded use-type word in context). */
  { pattern: new RegExp("first-class retail " + Buffer.from("c2Fsb24=", "base64").toString("utf8") + " standards", "g"),
    replace: "first-class [[USE_STANDARD]] standards" },
];
for (const { pattern, replace } of SCRUB_PATTERNS) {
  xml = xml.replace(pattern, replace);
}

/* 3) Manifest + body. <w:br/> (line break, any w:type — Word never puts real
   paragraph structure inside a heading caption, just manual breaks) is
   converted to "\n" BEFORE joining each paragraph's runs, so a caption split
   across breaks — e.g. "SCHEDULE A" / "BOULEVARD SHOPPING CENTER PROPERTY" /
   "PLAT OF LEASED PREMISES" — survives as three lines instead of one
   run-on string. Order matters: w:t and w:br matches are walked in document
   order via a single alternation so line breaks land where they occur. */
const tokens = [...new Set([...xml.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))].sort();
const body = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
  .map(m => [...m[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/>/g)]
    .map(t => (t[1] !== undefined ? t[1] : "\n"))
    .join("")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))
  .filter(t => t.trim());

zip["word/document.xml"] = Buffer.from(xml, "utf8");

/* 4) Whole-zip scrub gate: PII needles and stray [[TOKEN]] artifacts can hide
   in any XML part (footnotes, endnotes, headers/footers, core/app props,
   customXml), not just the main body — scan every XML entry in the zip, and
   assert no [[TOKEN]] exists anywhere except word/document.xml (the only
   part the engine ever merges into). */
for (const name of Object.keys(zip)) {
  if (!name.endsWith(".xml")) continue;
  const content = Buffer.from(zip[name]).toString("utf8");
  for (const f of FORBIDDEN) {
    if (content.toLowerCase().includes(f.toLowerCase()))
      throw new Error(`Scrub failed — forbidden string survives in ${name}: ` + f);
  }
  if (name !== "word/document.xml" && content.includes("[["))
    throw new Error(`Unexpected [[ token found outside word/document.xml, in ${name}`);
}

writeFileSync("src/data/lease-template.docx", zipSync(zip));
writeFileSync("src/data/lease-manifest.json", JSON.stringify({
  tokens, builtFrom: "OTB_Master_Lease_v2_2_Louisiana_House_Form.docx",
  note: "Generated by tools/lease-template.mjs — do not hand-edit. Re-run when the master changes.",
}, null, 1) + "\n");
writeFileSync("src/data/lease-body.json", JSON.stringify(body, null, 1) + "\n");
console.log(`OK: ${tokens.length} tokens, ${body.length} paragraphs.`);
