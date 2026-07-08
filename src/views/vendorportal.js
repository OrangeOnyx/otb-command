/* V-1 Vendor Portal (P3) — two faces on one sheet.
   OPERATOR: roster from src/data/vendors.json (service vendors first), select a
   vendor → their private folder in the vendor-docs bucket (upload/open/delete)
   + access log. Vendors with an email can sign in via the same magic-link gate;
   role 'vendor' is assigned automatically by email match (DB trigger).
   VENDOR: sees only their own folder — "shared with you" list + an upload box
   (COIs, W-9s, invoices). RLS enforces the folder boundary; this UI just mirrors it. */
import { REMOTE, sb } from "../lib/remote.js";
import { rosterOrder, portalCapable, findVendorByEmail, addVendorDoc, listVendorDocs, vendorDocURL, removeVendorDoc, listVendorLog } from "../lib/vendors.js";
import { esc } from "../lib/format.js";
import roster from "../data/vendors.json";

const fmtSize = n => !n ? "" : n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

let selected = null; // operator's selected vendor id

function fileRows(files, canDelete) {
  if (!files.length) return '<div class="safe-empty mute">nothing filed</div>';
  return files.map(f =>
    '<div class="safe-row" data-path="' + esc(f.path) + '">' +
    '<span class="safe-name">' + esc(f.name) + '</span>' +
    '<span class="safe-meta mono">' + fmtSize(f.size) + (f.addedAt ? " · " + fmtWhen(f.addedAt) : "") + '</span>' +
    '<a class="rec-link vp-open" href="#">Open 🔒</a>' +
    (canDelete ? '<button class="safe-del vp-del" title="Remove">✕</button>' : "") +
    '</div>').join("");
}

function wireFileActions(host, rerender) {
  host.querySelectorAll(".vp-open").forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      try { window.open(await vendorDocURL(a.closest(".safe-row").dataset.path), "_blank", "noopener"); }
      catch (err) { alert("Could not open: " + err.message); }
    };
  });
  host.querySelectorAll(".vp-del").forEach(b => {
    b.onclick = async () => {
      const row = b.closest(".safe-row");
      if (!confirm("Remove " + row.querySelector(".safe-name").textContent + "?")) return;
      await removeVendorDoc(row.dataset.path);
      rerender();
    };
  });
}

/* ---------- operator face ---------- */
async function renderOperator(host) {
  const list = rosterOrder(roster);
  const v = list.find(x => x.id === selected) || null;
  host.innerHTML =
    '<div class="vp-grid">' +
    '<div class="vp-roster"><div class="dw-sec">Vendors — ' + list.length + ' <span class="mute">(portal = has email)</span></div>' +
    '<input id="vpFilter" type="text" placeholder="Filter vendors…" class="vp-filter">' +
    '<div class="vp-list" id="vpList"></div></div>' +
    '<div class="vp-detail" id="vpDetail"></div>' +
    '</div>';
  const listEl = host.querySelector("#vpList");
  const paint = q => {
    const needle = (q || "").toLowerCase();
    listEl.innerHTML = list
      .filter(x => !needle || x.company.toLowerCase().includes(needle) || x.email.includes(needle))
      .map(x =>
        '<button class="vp-vendor' + (x.id === selected ? " on" : "") + '" data-id="' + esc(x.id) + '">' +
        '<span class="vp-co">' + esc(x.company) + '</span>' +
        '<span class="vp-tags mono">' + esc(x.kind) + (portalCapable(x) ? ' · <span class="vp-portal">portal</span>' : "") + '</span>' +
        '</button>').join("");
    listEl.querySelectorAll(".vp-vendor").forEach(b => {
      b.onclick = () => { selected = b.dataset.id; renderOperator(host); };
    });
  };
  paint("");
  host.querySelector("#vpFilter").oninput = e => paint(e.target.value);

  const det = host.querySelector("#vpDetail");
  if (!v) { det.innerHTML = '<div class="ai-note mute">Select a vendor — upload COIs, W-9s, contracts to their private folder. Vendors with an email can sign in with a magic link and see ONLY their folder.</div>'; return; }
  const files = await listVendorDocs(v.id);
  if (!det.isConnected) return;
  det.innerHTML =
    '<div class="safe-cat-head"><span class="safe-cat-name">' + esc(v.company) + '</span>' +
    '<span class="mono mute">' + esc(v.email || "no email — no portal access") + (v.contact ? " · " + esc(v.contact) : "") + '</span>' +
    '<button class="chip" id="vpAdd">+ Upload</button><input type="file" id="vpFile" hidden></div>' +
    '<div id="vpFiles">' + fileRows(files, true) + '</div>' +
    '<div class="dw-sec" style="margin-top:18px">Recent access (all vendors)</div><div id="vpLog" class="mute mono" style="font-size:11px"></div>';
  det.querySelector("#vpAdd").onclick = () => det.querySelector("#vpFile").click();
  det.querySelector("#vpFile").onchange = async e => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try { await addVendorDoc(f, v.id); renderOperator(host); }
    catch (err) { alert("Upload failed: " + err.message); }
  };
  wireFileActions(det, () => renderOperator(host));
  listVendorLog(15).then(rows => {
    const el = det.querySelector("#vpLog");
    if (el) el.innerHTML = rows.map(r => esc(fmtWhen(r.at) + " · " + r.email + " · " + r.action + " · " + r.path)).join("<br>") || "no access yet";
  });
}

/* ---------- vendor face ---------- */
async function renderVendor(host, email) {
  const v = findVendorByEmail(roster, email);
  if (!v) { host.innerHTML = '<div class="ai-note mute">Your login isn’t linked to a vendor record yet — contact management.</div>'; return; }
  const files = await listVendorDocs(v.id);
  if (!host.isConnected) return;
  host.innerHTML =
    '<div class="safe-cat-head"><span class="safe-cat-name">' + esc(v.company) + '</span>' +
    '<span class="mono mute">documents shared between you and On The Boulevard management</span>' +
    '<button class="chip" id="vpAdd">+ Send a file to management</button><input type="file" id="vpFile" hidden></div>' +
    '<div id="vpFiles">' + fileRows(files, false) + '</div>';
  host.querySelector("#vpAdd").onclick = () => host.querySelector("#vpFile").click();
  host.querySelector("#vpFile").onchange = async e => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try { await addVendorDoc(f, v.id); renderVendor(host, email); }
    catch (err) { alert("Upload failed: " + err.message); }
  };
  wireFileActions(host, () => renderVendor(host, email));
}

export function initVendorPortal(account) {
  const host = document.getElementById("vpBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">The vendor portal runs on the hosted backend — unavailable in local-only mode.</div>';
    return;
  }
  if (account && account.role === "vendor") renderVendor(host, account.email);
  else renderOperator(host);
}
