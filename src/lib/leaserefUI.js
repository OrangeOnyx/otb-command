/* Drawer "Lease abstract · AC" panel — operator-only, read-only reference
   block over lib/leaseref.js (lease_abstracts + rent_escalation_ref,
   AI-extracted from the executed leases). REFERENCE ONLY: the signed rent
   roll (docs/sot-2026-07) stays the economics record — this panel informs,
   never overrides. The drawer passes el = null for non-operators, so the
   null tolerance below is load-bearing. */
import { REMOTE } from "./remote.js";
import {
  getLeaseRef, onLeaseRefChange, refreshLeaseRef, unitAbstract, unitEscalations,
} from "./leaseref.js";
import { fmt$, esc } from "./format.js";

/* fields-jsonb clauses surfaced inside the "＋ clauses" expandable, in order. */
const CLAUSES = [
  ["permittedUse", "Permitted use"], ["exclusiveUse", "Exclusive use"],
  ["camResponsibility", "CAM"], ["taxResponsibility", "Tax"],
  ["insuranceResponsibility", "Insurance"], ["hvacResponsibility", "HVAC"],
  ["signageRights", "Signage"], ["earlyTermination", "Early termination"],
  ["coTenancy", "Co-tenancy"], ["personalGuaranty", "Personal guaranty"],
  ["guarantorName", "Guarantor"],
];

const money = v => (v == null || v === "" ? "—" : Number.isFinite(+v) ? fmt$(+v) : String(v));
const trunc300 = v => { const s = String(v); return s.length > 300 ? s.slice(0, 300) + "…" : s; };

let current = null;     // latest mounted {el, unit} — the repaint target
let listening = false;  // one module-level change listener, ever
let requested = false;  // refreshLeaseRef fired at most once per outcome

export function mountLeaseRef(el, unit) {
  if (!el) return; // non-operator drawer — section not rendered
  if (!REMOTE) { el.innerHTML = '<div class="led-note">Lease reference requires the hosted backend.</div>'; return; }
  current = { el, unit };
  if (!listening) {
    listening = true;
    onLeaseRefChange(() => {
      if (current && current.el.isConnected) paint(current.el, current.unit);
    });
  }
  if (!getLeaseRef().loaded) {
    el.innerHTML = '<div class="led-note">Loading…</div>';
    if (!requested) {
      requested = true;
      refreshLeaseRef().then(() => {
        if (!getLeaseRef().loaded) {
          requested = false; // failed read — let a later mount retry
          if (current && current.el.isConnected)
            current.el.innerHTML = '<div class="led-note">Lease reference unavailable right now.</div>';
        }
      });
    }
    return;
  }
  paint(el, unit);
}

function paint(el, unit) {
  const ref = getLeaseRef();
  const a = unitAbstract(ref.abstracts, unit);
  if (!a) { el.innerHTML = '<div class="led-note">No AC lease abstract for this unit.</div>'; return; }
  const f = a.fields || {};

  const header =
    '<div class="mono mute" style="font-family:var(--mono);font-size:10px;color:var(--ink50);margin-bottom:6px">' +
    "AI abstract · confidence " + esc(a.confidence || "—") +
    " · reference only — the signed rent roll is the record</div>";

  const facts = [
    ["Commencement", a.commencement || "—"],
    ["Expiration", a.expiration || "—"],
    ["Original term", a.original_term || "—"],
    ["Base rent", money(a.base_rent)],
    ["Rent PSF", money(a.rent_psf)],
    ["Security deposit", money(a.security_deposit)],
  ].map(([k, v]) =>
    '<div class="fact"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + "</div></div>").join("");

  const summary = f.keyClausesSummary
    ? '<div class="led-note" style="white-space:pre-wrap">' + esc(f.keyClausesSummary) + "</div>"
    : "";

  const clauseLines = CLAUSES
    .filter(([k]) => f[k] != null && f[k] !== "")
    .map(([k, label]) =>
      '<div style="font-size:11px;margin:3px 0"><b>' + esc(label) + ":</b> " + esc(trunc300(f[k])) + "</div>");
  const ins = f.insuranceMinimums;
  if (ins && typeof ins === "object") {
    clauseLines.push('<div style="font-size:11px;margin:3px 0"><b>Insurance minimums</b>' +
      Object.entries(ins).map(([k, v]) =>
        '<div class="mono" style="font-family:var(--mono);font-size:10px;margin-left:8px">' + esc(k) + ": " +
        esc(v !== null && typeof v === "object" ? JSON.stringify(v) : String(v)) + "</div>").join("") +
      "</div>");
  }
  const clausesHtml = clauseLines.length
    ? '<details style="margin:6px 0"><summary style="cursor:pointer;font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:var(--ink50)">＋ clauses</summary>' +
      clauseLines.join("") + "</details>"
    : "";

  const escRows = unitEscalations(ref.escalations, unit);
  const escHtml = escRows.length
    ? '<div class="led-note">Escalation schedule</div>' +
      escRows.map(r =>
        '<div class="mono" style="display:flex;gap:12px;font-family:var(--mono);font-size:11px;padding:2px 0;border-bottom:1px dashed var(--line)">' +
        "<span>" + esc(r.effective_on) + "</span>" +
        "<span>" + esc(r.increase_value ?? "") + "</span>" +
        '<span style="margin-left:auto">' + money(r.new_rent) + "</span></div>").join("")
    : "";

  const ren = Array.isArray(a.renewal_options) ? a.renewal_options : [];
  const renHtml = ren.length
    ? '<div class="led-note">Renewal options</div>' +
      ren.map(o => '<div style="font-size:11px;margin:2px 0">' +
        esc(o.term || "—") + " · " + esc(o.rentBasis || "—") + " · notice " + esc(o.noticeRequired || "—") +
        "</div>").join("")
    : "";

  el.innerHTML = header + '<div class="facts">' + facts + "</div>" + summary + clausesHtml + escHtml + renHtml;
}
