/* Unit-drawer "Lease" panel — deterministic operator form over the pure
   engine (leasedoc.js). Generates the executable-lease DOCX + HTML and can
   hand the signer HTML to the existing e-sign rail. Operator-only surface;
   the app sends nothing. Pure input harvesting tested in test/leaseui.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";
import { esc } from "./format.js";
import { assembleLease } from "./leasedoc.js";
import { mergeDocx, leaseFileName } from "./leasedocx.js";
import { leaseHtml } from "./leasedochtml.js";
import units from "../data/units.json" with { type: "json" };
import recoveries from "../data/recoveries.json" with { type: "json" };

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const newId = () => "es" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const plusDays = d => new Date(Date.now() + d * 86400000).toISOString();

const NUM = ["basePsf", "termMonths", "escalationPct", "freeRentMonths", "constructionMonths", "deposit"];
/* Operator-entered NNN PSF overrides (vacant units with no recovery history —
   see mountLease's isZeroRec branch). Blank must NOT silently become 0 like
   the NUM fields above: an unset CAM/Tax/Ins should fail assembleLease's
   rec validation loudly, never draft a lease with an invented $0 charge. */
const NNN = ["camPsf", "taxPsf", "insPsf"];
export function harvestInputs(v, unit) {
  const i = { unit };
  for (const [k, val] of Object.entries(v)) {
    if (k === "guarantyRequired") i[k] = !!val;
    else if (NNN.includes(k)) i[k] = val === "" || val == null ? NaN : Number(val);
    else if (NUM.includes(k)) i[k] = val === "" || val == null ? 0 : +val;
    else i[k] = String(val ?? "").trim();
  }
  if (!i.useStandard) i.useStandard = "retail";
  return i;
}

/* [key, label, type, default] — three form groups, rendered in this order. */
const GROUPS = [
  ["Lessee", [
    ["lesseeLegalName", "Lessee legal name", "text"],
    ["lesseeEntityType", "Entity type", "text"],
    ["lesseeState", "State of formation", "text"],
    ["lesseeNoticeAddress", "Notice address", "text"],
    ["lesseeEmail", "Email", "text"],
    ["lesseePhone", "Phone", "text"],
    ["lesseeRep", "Authorized representative", "text"],
    ["signerName", "Signer name", "text"],
    ["signerTitle", "Signer title", "text"],
  ]],
  ["Deal terms", [
    ["permittedUse", "Permitted use", "text"],
    ["useStandard", "Use standard", "text", "retail"],
    ["basePsf", "Base rent (PSF)", "number"],
    ["termMonths", "Term (months)", "number"],
    ["escalationPct", "Escalation %/yr", "number", "0"],
    ["freeRentMonths", "Free rent (months)", "number", "0"],
    ["constructionMonths", "Construction period (months)", "number", "0"],
    ["deposit", "Security deposit ($)", "number", "0"],
    ["guarantyRequired", "Personal guaranty required", "checkbox"],
    ["renewalSummary", "Renewal summary", "text"],
  ]],
  ["Dates", [
    ["executionDate", "Execution date", "date"],
    ["effectiveDate", "Effective date", "date"],
    ["commencementDate", "Commencement date", "date"],
    ["expirationDate", "Expiration date", "date"],
    ["additionalTermDates", "Additional term dates", "text"],
  ]],
];

const fid = k => "lz" + k[0].toUpperCase() + k.slice(1);

function fieldHtml([key, label, type, def]) {
  const id = fid(key);
  if (type === "checkbox")
    return '<label style="display:flex;align-items:center;gap:5px;font-size:11px;min-width:170px">' +
      '<input type="checkbox" id="' + id + '"> ' + esc(label) + "</label>";
  const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
  return '<label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink50);min-width:150px;flex:1">' +
    esc(label) +
    '<input id="' + id + '" type="' + inputType + '"' + (def != null ? ' value="' + esc(def) + '"' : "") + "></label>";
}

/* extraFields: the NNN override inputs (only present when isZeroRec). */
function readForm(el, extraFields) {
  const v = {};
  const all = GROUPS.flatMap(([, fields]) => fields).concat(extraFields || []);
  for (const [key, , type] of all) {
    const node = el.querySelector("#" + fid(key));
    if (!node) continue;
    v[key] = type === "checkbox" ? node.checked : node.value;
  }
  return v;
}

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function paintResult(msg, r) {
  if (!r.ok) {
    msg.innerHTML = '<div style="color:var(--brick)">' + r.errors.map(esc).join("<br>") + "</div>";
    return;
  }
  const warn = r.warnings.length ? '<div style="color:var(--brass)">' + r.warnings.map(esc).join("<br>") + "</div>" : "";
  const chk = r.checklist.length ? "<div>" + r.checklist.map(esc).join("<br>") + "</div>" : "";
  msg.innerHTML = warn + chk;
}

export function mountLease(el, unit) {
  if (!el) return;
  const b = document.body;
  if (b.classList.contains("role-owner") || b.classList.contains("role-tenant") || b.classList.contains("role-vendor")) {
    el.innerHTML = "";
    return;
  }
  const u = units.find(x => String(x.unit) === String(unit));
  const rec = recoveries.units[String(unit)];
  if (!u || !rec) { el.innerHTML = '<div class="led-note">No unit/recovery data — cannot assemble a lease for this unit.</div>'; return; }

  /* Vacant/no-lease-history units carry {cam:0,tax:0,ins:0} in recoveries.json
     (nothing to single-source from). Locking $0.00 into an executable lease
     would be silently wrong, so this unit gets editable NNN inputs instead —
     CAM defaults to the portfolio's camFlatPsf; Tax/Ins are never invented,
     they start blank and the engine rejects a blank/negative entry. Any unit
     with real recovery history keeps the single-sourced, locked line. */
  const isZeroRec = (+rec.cam || 0) === 0 && (+rec.tax || 0) === 0 && (+rec.ins || 0) === 0;
  const nnnFields = [
    ["camPsf", "CAM PSF", "number", recoveries.camFlatPsf],
    ["taxPsf", "Tax PSF", "number"],
    ["insPsf", "Ins PSF", "number"],
  ];

  const groupsHtml = GROUPS.map(([label, fields]) =>
    '<div class="led-note">' + esc(label) + "</div>" +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">' + fields.map(fieldHtml).join("") + "</div>"
  ).join("");

  const derivedLine = "SF " + u.sf.toLocaleString() + " · Suite " + esc(unit) + " · " + esc(unit) + " Arnould Blvd" +
    (isZeroRec ? "" :
      " · CAM $" + (+rec.cam).toFixed(2) + " / Tax $" + (+rec.tax).toFixed(2) + " / Ins $" + (+rec.ins).toFixed(2) + " PSF");
  const nnnHtml = isZeroRec
    ? '<div class="led-note">No recovery history for this unit — enter CAM/Tax/Ins PSF for this deal</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">' + nnnFields.map(fieldHtml).join("") + "</div>"
    : "";

  el.innerHTML =
    '<div class="led-note" style="font-family:var(--mono)">' + derivedLine + "</div>" +
    nnnHtml +
    groupsHtml +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
      '<button class="chip" id="lzDocx">⤓ DOCX</button>' +
      '<button class="chip" id="lzHtml">⤓ HTML</button>' +
      '<button class="chip" id="lzEsign">→ E-Sign</button>' +
    "</div>" +
    '<div class="led-note" id="lzMsg"></div>';

  const msg = el.querySelector("#lzMsg");
  const build = () => {
    const raw = harvestInputs(readForm(el, isZeroRec ? nnnFields : []), unit);
    const effRec = isZeroRec ? { cam: raw.camPsf, tax: raw.taxPsf, ins: raw.insPsf } : rec;
    return assembleLease(raw, u, effRec);
  };

  el.querySelector("#lzDocx").onclick = async () => {
    const r = build();
    paintResult(msg, r);
    if (!r.ok) return;
    try {
      const buf = await fetch(new URL("../data/lease-template.docx", import.meta.url)).then(res => res.arrayBuffer());
      const bytes = mergeDocx(buf, r.tokens);
      download(bytes, leaseFileName(r.tokens, "docx"), DOCX_MIME);
    } catch (e) { msg.innerHTML += '<div style="color:var(--brick)">DOCX failed: ' + esc(e.message) + "</div>"; }
  };

  el.querySelector("#lzHtml").onclick = () => {
    const r = build();
    paintResult(msg, r);
    if (!r.ok) return;
    download(leaseHtml(r.tokens, { checklist: r.checklist }), leaseFileName(r.tokens, "html"), "text/html");
  };

  el.querySelector("#lzEsign").onclick = async () => {
    if (!REMOTE) { msg.innerHTML = '<div class="led-note">E-sign lives on the hosted backend — local mode shows nothing.</div>'; return; }
    const r = build();
    paintResult(msg, r);
    if (!r.ok) return;
    try {
      const signerHtml = leaseHtml(r.tokens);
      const path = unit + "/" + newId() + "__" + leaseFileName(r.tokens, "html");
      const { error } = await sb.storage.from("documents")
        .upload(path, new Blob([signerHtml], { type: "text/html" }), { contentType: "text/html", upsert: false });
      if (error) throw error;
      const ctx = await propertyContext();
      const { error: e2 } = await sb.from("esign_requests").insert({
        id: newId(), org_id: ctx.org_id, property_id: ctx.property_id, unit,
        title: "Lease — Unit " + unit + " — " + r.tokens.LESSEE_LEGAL_NAME + " (DRAFT)",
        signer_email: String(r.tokens.LESSEE_EMAIL || "").toLowerCase(),
        signer_name: r.tokens.LESSEE_SIGNER_NAME,
        doc_path: path,
        expires_at: plusDays(14),
      });
      if (e2) throw e2;
      msg.innerHTML += "<div>Signing request created — copy the link from the E-Sign panel below.</div>";
    } catch (e) { msg.innerHTML += '<div style="color:var(--brick)">E-Sign failed: ' + esc(e.message) + "</div>"; }
  };
}
