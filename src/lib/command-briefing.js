/* Offline owner-review packet. Plain edited text and cited record excerpts
   remain distinct; no documents, financial records, network or DOM are read. */
import { commandDate } from "./command-evidence.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

function citedText(value, anchors) {
  const text = String(value ?? "");
  let result = "", cursor = 0;
  for (const match of text.matchAll(/\[([^\]\r\n]+)\]/g)) {
    result += esc(text.slice(cursor, match.index));
    const anchor = anchors.get(match[1]);
    result += anchor ? `<a class="citation" href="#${anchor}">${esc(match[0])}</a>` : esc(match[0]);
    cursor = match.index + match[0].length;
  }
  return result + esc(text.slice(cursor));
}

// SVGs are rendered only as image data, never inserted into document markup.
// CSP also prevents remote resources, scripts, navigation bases and forms.
const imageData = value => typeof value === "string" &&
  /^data:image\/(?:svg\+xml|png);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value) ? value : null;
const fontData = value => typeof value === "string" &&
  /^data:font\/woff2;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
const FONT_RANGES = [["Fraunces", "100 900"], ["Inter", "100 900"], ["JetBrains Mono", "400 800"]];

/**
 * Build a standalone, print-ready HTML string from the reviewed draft.
 * generatedAt: required export timestamp/date; preparedAt: original draft date.
 * logoDataUrl: optional original PRIMARY horizontal logo as a base64 image.
 * fontDataUrls: optional approved WOFF2 data keyed by fixed brand family names.
 * Source IDs are selected solely by issue.sourceIds, never by draft content.
 */
export function buildBriefingHTML({ issue, sources = [], text = "", generatedAt, preparedAt, logoDataUrl, fontDataUrls = {}, fontLicenseText = "" } = {}) {
  if (!issue?.id || !issue?.title || !issue?.asOf) throw new Error("A dated maintenance record is required for the briefing.");
  const exported = commandDate(generatedAt);
  const prepared = preparedAt === undefined ? exported : commandDate(preparedAt);
  const selectedIds = [...new Set((Array.isArray(issue.sourceIds) ? issue.sourceIds : []).filter(id => typeof id === "string" && id))];
  const supplied = new Map();
  for (const source of Array.isArray(sources) ? sources : []) {
    if (source && typeof source.id === "string" && !supplied.has(source.id)) supplied.set(source.id, source);
  }
  const selected = selectedIds.filter(id => supplied.has(id)).map(id => supplied.get(id));
  const missing = selectedIds.filter(id => !supplied.has(id));
  const anchors = new Map(selected.map((source, index) => [source.id, "source-" + (index + 1)]));
  const unknowns = (Array.isArray(issue.unknowns) ? issue.unknowns : []).filter(item => typeof item === "string" && item);
  const logo = imageData(logoDataUrl);
  const fontFaces = FONT_RANGES.map(([family, range]) => {
    const data = fontData(fontDataUrls?.[family]);
    return data ? `@font-face{font-family:"${family}";src:url("${data}") format("woff2");font-weight:${range};font-style:normal;font-display:swap}` : "";
  }).join("\n");
  const sourceCards = selected.map(source => `
    <article class="source-card" id="${anchors.get(source.id)}">
      <h3>${esc(source.title || "Untitled source")}</h3>
      <div class="source-id">[${esc(source.id)}]</div>
      <dl class="source-meta"><div><dt>Source date</dt><dd>${esc(source.asOf || "Not recorded")}</dd></div><div><dt>Record type</dt><dd>${esc(source.kind || "Not recorded")}</dd></div><div><dt>Source path</dt><dd class="source-path">${esc(source.path || "Not supplied")}</dd></div></dl>
      <pre class="source-excerpt">${esc(source.excerpt || "No excerpt supplied.")}</pre>
    </article>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer"><title>${esc(issue.title)} · Owner briefing draft</title>
<style>
  ${fontFaces}
  :root{color-scheme:light;--cypress:#1E4D3A;--moss:#2F6B4E;--amber:#D97706;--charcoal:#0A1F16;--bone:#F3EDE0;--muted:#505D53;--rule:#C4C4B8}
  *{box-sizing:border-box}html{font-size:16px}body{margin:0;color:var(--charcoal);background:var(--bone);font-family:Inter,"Segoe UI",Arial,sans-serif;line-height:1.55}
  .packet{max-width:8.5in;margin:28px auto;background:#fff;padding:36px 48px 40px;box-shadow:0 4px 24px rgb(10 31 22 / .08)}
  .masthead{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:2px solid var(--cypress);padding-bottom:16px;margin-bottom:25px}
  .brand-logo{display:block;width:260px;height:auto;max-width:none}.brand-name{font-size:.8rem;color:var(--cypress)}
  .packet-label{text-align:right;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .draft-label{display:inline-block;padding:5px 10px;margin-bottom:10px;background:var(--amber);color:var(--charcoal);font-size:.75rem;font-weight:700;letter-spacing:.04em}
  h1,h2{font-family:Fraunces,Georgia,serif;font-weight:450;font-synthesis:none;line-height:1.15;letter-spacing:-.02em}h1{font-size:2rem;margin:14px 0 8px}h2{font-size:1.55rem;margin:0 0 10px}h3{font-size:1rem;line-height:1.35;margin:3px 0 12px}
  .property{margin:0 0 16px;font-size:.95rem;color:var(--cypress)}.dates{font-size:.75rem;color:var(--muted);display:flex;gap:8px 20px;flex-wrap:wrap;margin-bottom:20px}
  .notice{padding:12px 15px;border:1px solid var(--rule);background:#F9F6F0;font-size:.8rem;line-height:1.55;margin-bottom:22px}.notice p{margin:0}.notice p+p{margin-top:7px}
  .section-label{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--cypress);margin:0 0 10px}
  .draft-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;line-height:1.65}.citation{color:var(--cypress);text-decoration:underline;text-underline-offset:3px}
  .appendix{margin-top:40px;padding-top:24px;border-top:2px solid var(--cypress)}.appendix-intro{color:var(--muted);font-size:.8rem;margin:0 0 20px}
  .record-summary{padding:14px 16px;background:var(--bone);margin-bottom:20px}.record-summary p{margin:4px 0;font-size:.8rem}.record-id{font-family:"JetBrains Mono",Consolas,monospace;overflow-wrap:anywhere;font-size:.72rem}
  .unknowns{margin:16px 0 22px;padding:14px 16px;border:1px solid var(--rule)}.unknowns h3{margin:0 0 7px}.unknowns ul{margin:0;padding-left:18px;font-size:.8rem}.unknowns li+li{margin-top:4px}
  .source-card{margin:0 0 22px;padding:0 0 22px;border-bottom:1px solid var(--rule);scroll-margin-top:20px}.source-id{font-family:"JetBrains Mono",Consolas,monospace;font-size:.75rem;color:var(--cypress);overflow-wrap:anywhere;margin-bottom:4px}
  .source-meta{font-size:.74rem;margin:0 0 12px}.source-meta div{display:grid;grid-template-columns:90px minmax(0,1fr);gap:8px;margin:3px 0}.source-meta dt{color:var(--muted)}.source-meta dd{margin:0;overflow-wrap:anywhere}.source-path{font-family:"JetBrains Mono",Consolas,monospace;font-size:.7rem}
  .source-excerpt{white-space:pre-wrap;overflow-wrap:anywhere;font-family:"JetBrains Mono",Consolas,monospace;font-size:.69rem;line-height:1.6;margin:0;padding:12px;background:#F9F6F0}
  .missing{padding:12px;border:1px solid var(--charcoal);font-size:.8rem;margin:14px 0}.foot{font-size:.7rem;color:var(--muted);margin:24px 0 0;padding-top:12px;border-top:1px solid var(--rule)}
  :focus-visible{outline:3px solid var(--cypress);outline-offset:3px}
  @media(max-width:620px){.packet{margin:0;padding:24px 20px;box-shadow:none}.masthead{flex-direction:column;align-items:flex-start;gap:0}.packet-label{text-align:left}.dates{display:block}.dates span{display:block}.source-meta div{grid-template-columns:1fr;gap:0}h1{font-size:1.7rem}}
  @media print{@page{size:letter;margin:.6in}.packet{max-width:none;margin:0;padding:0;box-shadow:none}body{background:#fff}.masthead{margin-bottom:18px}h1,h2,h3,.section-label{break-after:avoid}.appendix{break-before:page;margin-top:0;padding-top:0;border-top:0}.source-card,.record-summary,.unknowns{break-inside:avoid}.draft-text{font-size:10pt;line-height:1.5}.source-excerpt{font-size:8pt}.notice,.draft-label,.record-summary,.source-excerpt{-webkit-print-color-adjust:exact;print-color-adjust:exact}.citation{color:var(--cypress)}p,li{orphans:3;widows:3}}
</style></head><body><main class="packet">
  <header class="masthead">${logo ? `<img class="brand-logo" src="${logo}" alt="Cypress Command">` : '<span class="brand-name">Prepared with Cypress Command</span>'}<div class="packet-label">Owner briefing<br>On The Boulevard</div></header>
  <h1>${esc(issue.title)}</h1><span class="draft-label">DRAFT · FOR REVIEW</span><p class="property">On The Boulevard · Belle Realty</p>
  <div class="dates"><span>Draft prepared ${esc(prepared)}</span><span>Packet exported ${esc(exported)}</span><span>Property calendar: America/Chicago</span></div>
  <section class="notice" aria-label="Review status"><p><strong>This is editable owner-update text, not a certified account of current conditions.</strong> The text below may include operator edits. Compare it with the dated source excerpts in the appendix.</p><p>Archive as of ${esc(issue.asOf)}. Nothing has been sent, approved, dispatched or paid by generating this packet. No business record has changed.</p></section>
  <section aria-label="Draft owner update"><p class="section-label">Owner-update text · may include edits</p><div class="draft-text">${citedText(text, anchors) || "No draft text entered."}</div></section>
  <section class="appendix" aria-labelledby="appendix-title"><h2 id="appendix-title">The evidence behind the update.</h2><p class="section-label">Appendix · underlying records</p><p class="appendix-intro">These excerpts are separate from the edited draft above. Only references selected by the maintenance record are included; a citation is not evidence of inspection, repair, approval or payment.</p>
    <div class="record-summary"><p><strong>${esc(issue.title)}</strong></p><p class="record-id">Record ID: ${esc(issue.id)}</p><p>Archived status: ${esc(issue.archivedStatus || "Not recorded")} · archive as of ${esc(issue.asOf)}</p><p>Location: ${esc(issue.location?.label || "Not recorded")}</p><p>Precision: ${esc(issue.location?.precision || "Exact location unverified")}. Current condition has not been verified by this packet.</p></div>
    <section class="unknowns" aria-label="Record gaps"><h3>Source limits retained for review</h3><ul>${unknowns.map(item => `<li>${esc(item)}</li>`).join("")}<li>Payment is not established by this maintenance record; absence of evidence does not mean unpaid.</li><li>Reported condition and archived status do not establish current condition or completion.</li></ul></section>
    ${missing.length ? `<p class="missing"><strong>Selected references unavailable in this packet:</strong> ${missing.map(id => `[${esc(id)}]`).join(", ")}. Missing excerpts have not been inferred or replaced.</p>` : ""}
    ${sourceCards || '<p class="missing">No matching source excerpts were supplied. Review is incomplete.</p>'}
  </section>
  <footer class="foot">Cypress Command · Owner review copy · Record excerpts retain their own dates. This offline document contains no sending or business-record controls. Use the browser’s Print command to print or save a PDF.</footer>
</main><template id="embedded-font-licenses">${esc(fontLicenseText)}</template></body></html>`;
}
