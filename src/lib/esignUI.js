/* Unit-drawer "E-Sign" mount (harvest #6). Operator creates token-based
   signing requests per unit, copies the link + message into their own email/
   text (the app sends nothing — v1 boundary), re-tokens stale requests, and
   watches status land: sent → viewed → signed/declined. The signer side is
   /api/esign (public, token-gated). Owners see the list read-only via the
   body.role-owner CSS; vendors never reach the drawer. Pure logic lives in
   src/lib/esign.js. REMOTE-only. */
import { REMOTE, sb } from "./remote.js";
import {
  ESIGN_STATUS, esignDisplayStatus, canResend, signingMessage, signingUrl, receiptText,
} from "./esign.js";
import { esc } from "./format.js";

const nowIso = () => new Date().toISOString();
const plusDays = d => new Date(Date.now() + d * 86400000).toISOString();
const newId = () => "es" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const tag = s => {
  const [label, color] = ESIGN_STATUS[s] || [s, "#5F6E64"];
  return '<span style="background:' + color + ';color:#fff;border-radius:3px;padding:0 5px;font-size:10px">' + esc(label) + "</span>";
};
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

async function copyText(text, btn, doneLabel) {
  try { await navigator.clipboard.writeText(text); } catch { prompt("Copy:", text); return; }
  const old = btn.textContent;
  btn.textContent = doneLabel;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

export function mountEsign(el, unit) {
  if (!el) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">E-sign lives on the hosted backend — local mode shows nothing.</div>'; return; }
  el.innerHTML = '<div class="led-note">Loading…</div>';
  paint(el, unit);
}

async function paint(el, unit) {
  let rows;
  try {
    const { data, error } = await sb.from("esign_requests").select("*")
      .eq("unit", unit).order("created_at", { ascending: false });
    if (error) throw error;
    rows = data || [];
  } catch (e) { el.innerHTML = '<div class="led-note">E-sign unavailable: ' + esc(e.message) + "</div>"; return; }

  const now = nowIso();
  const rowsHtml = rows.map(r => {
    const st = esignDisplayStatus(r, now);
    return '<div class="es-row" data-es="' + esc(r.id) + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-bottom:1px dashed #5f6e6444">' +
      tag(st) +
      '<span style="font-weight:600;font-size:12px">' + esc(r.title) + "</span>" +
      '<span class="mono mute" style="font-size:11px">' + esc(r.signer_email) +
      (r.signed_at ? " · signed " + fmtWhen(r.signed_at)
        : r.viewed_at ? " · viewed " + fmtWhen(r.viewed_at)
        : r.sent_at ? " · sent " + fmtWhen(r.sent_at)
        : " · created " + fmtWhen(r.created_at)) + "</span>" +
      '<span style="margin-left:auto;display:flex;gap:4px">' +
      (st === "signed"
        ? '<button class="chip es-receipt">Receipt</button>'
        : '<button class="chip es-link">Copy link</button><button class="chip es-msg">Copy message</button>') +
      (canResend(r) && st !== "pending" && st !== "sent" && st !== "viewed"
        ? '<button class="chip es-resend">↻ Re-send</button>' : "") +
      (st !== "signed" && st !== "expired" ? '<button class="led-void es-cancel" title="Cancel this request">✕</button>' : "") +
      "</span></div>";
  }).join("");

  el.innerHTML =
    (rowsHtml || '<div class="led-note">No signing requests for this unit yet.</div>') +
    '<div class="es-add" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
    '<input id="esTitle" type="text" placeholder="Document title (e.g. Lease Amendment #2)" style="flex:1;min-width:170px">' +
    '<input id="esName" type="text" placeholder="Signer name" style="min-width:120px">' +
    '<input id="esEmail" type="email" placeholder="signer@email.com" style="min-width:160px">' +
    '<input id="esDoc" type="text" placeholder="documents-bucket path (optional)" style="min-width:170px" title="Object path inside the documents bucket; the signer gets a review link">' +
    '<button class="chip on" id="esCreate">+ Signing request</button>' +
    '</div><div class="led-note" id="esMsg"></div>';

  const msg = el.querySelector("#esMsg");
  const rerender = () => paint(el, unit);

  el.querySelector("#esCreate").onclick = async () => {
    const title = el.querySelector("#esTitle").value.trim();
    const email = el.querySelector("#esEmail").value.trim();
    if (!title || !email) { msg.textContent = "Title and signer email are required."; return; }
    try {
      const { error } = await sb.from("esign_requests").insert({
        id: newId(), unit, title,
        signer_email: email.toLowerCase(),
        signer_name: el.querySelector("#esName").value.trim(),
        doc_path: el.querySelector("#esDoc").value.trim(),
        expires_at: plusDays(14),
      });
      if (error) throw error;
      rerender();
    } catch (e) { msg.textContent = "Create failed: " + e.message; }
  };

  el.querySelectorAll(".es-row").forEach(row => {
    const r = rows.find(x => x.id === row.dataset.es);
    if (!r) return;
    const url = signingUrl(location.origin, r.token);
    const markSent = async () => {
      if (r.status === "pending") {
        await sb.from("esign_requests").update({ status: "sent", sent_at: nowIso() }).eq("id", r.id);
      }
    };
    const link = row.querySelector(".es-link");
    if (link) link.onclick = async () => { await copyText(url, link, "✓ Copied"); await markSent(); };
    const m = row.querySelector(".es-msg");
    if (m) m.onclick = async () => {
      await copyText(signingMessage({ signerName: r.signer_name, title: r.title, url, expiresAt: r.expires_at }), m, "✓ Copied");
      await markSent();
    };
    const receipt = row.querySelector(".es-receipt");
    if (receipt) receipt.onclick = () => copyText(receiptText(r), receipt, "✓ Copied");
    const resend = row.querySelector(".es-resend");
    if (resend) resend.onclick = async () => {
      try {
        const { error } = await sb.from("esign_requests").update({
          token: crypto.randomUUID(), status: "sent", sent_at: nowIso(),
          expires_at: plusDays(14), declined_at: null, decline_reason: "",
        }).eq("id", r.id);
        if (error) throw error;
        rerender();
      } catch (e) { msg.textContent = "Re-send failed: " + e.message; }
    };
    const cancel = row.querySelector(".es-cancel");
    if (cancel) cancel.onclick = async () => {
      if (!confirm("Cancel this signing request? The link stops working immediately.")) return;
      try {
        const { error } = await sb.from("esign_requests").update({ status: "expired", expires_at: nowIso() }).eq("id", r.id);
        if (error) throw error;
        rerender();
      } catch (e) { msg.textContent = "Cancel failed: " + e.message; }
    };
  });
}
