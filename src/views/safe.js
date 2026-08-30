/* S-1 Owner Safe — vault for sensitive financial documents.
   Categories are folder prefixes in the private "safe" bucket (read = owner +
   operator roles only; write = operator; every view/upload/delete audited to
   safe_log). Owners get read/open only — operator controls are hidden by the
   existing body.role-owner CSS AND enforced server-side by RLS. */
import { SAFE_CATEGORIES, addSafeDoc, listSafe, safeURL, removeSafeDoc, listLog } from "../lib/safe.js";
import { openBoardReport } from "../lib/boardreport.js";
import { esc } from "../lib/format.js";

const fmtSize = n => !n ? "" : n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const fmtWhen = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

async function render() {
  const host = document.getElementById("safeList");
  if (!host) return;
  const files = await listSafe();
  if (!host.isConnected) return;

  host.innerHTML = SAFE_CATEGORIES.map(([cat, label]) => {
    const rows = files.filter(f => f.category === cat);
    return '<div class="safe-cat">' +
      '<div class="safe-cat-head"><span class="safe-cat-name">' + label + '</span>' +
      '<span class="safe-cat-n mono">' + rows.length + '</span>' +
      '<button class="chip safe-add" data-cat="' + cat + '">+ Upload</button>' +
      '<input type="file" class="safe-file" data-cat="' + cat + '" hidden></div>' +
      (rows.length
        ? rows.map(f =>
          '<div class="safe-row" data-path="' + esc(f.path) + '">' +
          '<span class="safe-name">' + esc(f.name) + '</span>' +
          '<span class="safe-meta mono">' + fmtSize(f.size) + (f.addedAt ? " · " + fmtWhen(f.addedAt) : "") + '</span>' +
          '<a class="rec-link safe-open" href="#">Open 🔒</a>' +
          '<button class="safe-del" title="Remove">✕</button></div>').join("")
        : '<div class="safe-empty mute">nothing filed</div>') +
      '</div>';
  }).join("") +
    /* Quarterly board report (register row #12): composes the stored monthly
       owner-brief models. Operator AND owner — RLS scopes the reads. */
    '<div class="safe-cat">' +
    '<div class="safe-cat-head"><span class="safe-cat-name">Board report</span>' +
    '<button class="chip" id="safeBoardRpt">⤓ Last quarter</button>' +
    '<span class="led-note mute" id="safeBoardNote"></span></div></div>';

  const rptBtn = host.querySelector("#safeBoardRpt");
  if (rptBtn) rptBtn.onclick = async () => {
    const note = host.querySelector("#safeBoardNote");
    rptBtn.disabled = true;
    try {
      const q = await openBoardReport(new Date().toISOString().slice(0, 7));
      if (note) note.textContent = "Opened " + q + ".";
    } catch (err) {
      if (note) note.textContent = err.message; // incl. "hosted backend required" in local mode
    } finally { rptBtn.disabled = false; }
  };

  host.querySelectorAll(".safe-add").forEach(btn => {
    btn.onclick = () => host.querySelector('.safe-file[data-cat="' + btn.dataset.cat + '"]').click();
  });
  host.querySelectorAll(".safe-file").forEach(inp => {
    inp.onchange = async () => {
      const f = inp.files[0];
      inp.value = "";
      if (!f) return;
      try { await addSafeDoc(f, inp.dataset.cat); render(); renderLog(); }
      catch (err) { alert("Upload failed: " + err.message); }
    };
  });
  host.querySelectorAll(".safe-open").forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      const path = a.closest(".safe-row").dataset.path;
      try { window.open(await safeURL(path), "_blank", "noopener"); renderLog(); }
      catch (err) { alert("Could not open: " + err.message); }
    };
  });
  host.querySelectorAll(".safe-del").forEach(b => {
    b.onclick = async () => {
      const row = b.closest(".safe-row");
      if (!confirm("Remove " + row.querySelector(".safe-name").textContent + " from the safe?")) return;
      try { await removeSafeDoc(row.dataset.path); render(); renderLog(); } // L2: surface failures
      catch (err) { alert("Could not remove: " + err.message); }
    };
  });
}

async function renderLog() {
  const el = document.getElementById("safeLog");
  if (!el) return;
  const rows = await listLog(30);
  if (!el.isConnected) return;
  el.innerHTML = rows.length
    ? rows.map(r =>
      '<div class="safe-log-row mono"><span>' + fmtWhen(r.at) + '</span>' +
      '<span class="safe-log-act safe-log-' + esc(r.action) + '">' + esc(r.action) + '</span>' +
      '<span class="safe-log-who">' + esc(r.email || "") + '</span>' +
      '<span class="safe-log-path">' + esc(r.path) + '</span></div>').join("")
    : '<div class="safe-empty mute">no access recorded yet</div>';
}

export function initSafe() {
  render();
  renderLog();
}
