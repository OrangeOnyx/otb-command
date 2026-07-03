/* App boot: auth gate (Path B) → navigation, top-bar, JSON export/import, renders. */
import "./styles.css";
import { exportJSON, importJSON, getOwnerSheets, setOwnerSheet, hydrateRemote, subscribe } from "./store.js";
import { REMOTE, getSession, getRole, sendMagicLink, signOut, loadState, pushState } from "./lib/remote.js";
import { migrateLocalToRemote } from "./lib/assets.js";
import { TODAY } from "./lib/format.js";
import { initDashboard } from "./views/dashboard.js";
import { initPlan } from "./views/plan.js";
import { initSpatial } from "./views/spatial.js";
import { renderRoll } from "./views/rentroll.js";
import { initMatrix } from "./views/compliance.js";
import { initDates } from "./views/dates.js";
import { initBoard } from "./views/board.js";
import { initDirectory } from "./views/directory.js";
import { initFinancial } from "./views/financial.js";
import { closeDrawer } from "./views/drawer.js";

const PAGES = [["dash", "D-1", "Dashboard"], ["plan", "A-1", "Site Plan"], ["spatial", "A-2", "Spatial"], ["roll", "R-1", "Rent Roll"], ["comp", "C-1", "Compliance"], ["fin", "P-1", "Financial"], ["dates", "T-1", "Critical Dates"], ["board", "W-1", "Action Board"], ["dir", "K-1", "Directory"]];

/* ---------- login gate ---------- */
function showLogin(msg) {
  const app = document.querySelector(".app");
  if (app) app.style.display = "none";
  const o = document.createElement("div");
  o.className = "login-gate";
  o.innerHTML =
    '<div class="login-card">' +
    '<div class="login-wm">ON THE <span>BOULEVARD</span></div>' +
    '<div class="login-sub">Property Command — sign in</div>' +
    '<input id="loginEmail" type="email" placeholder="you@email.com" autocomplete="email">' +
    '<button id="loginBtn">Email me a sign-in link</button>' +
    '<div class="login-msg" id="loginMsg">' + (msg || "Owners &amp; operator only. We’ll email you a one-time link.") + '</div>' +
    '</div>';
  document.body.appendChild(o);
  const email = o.querySelector("#loginEmail"), btn = o.querySelector("#loginBtn"), out = o.querySelector("#loginMsg");
  btn.onclick = async () => {
    const v = (email.value || "").trim();
    if (!v) { out.textContent = "Enter your email."; return; }
    btn.disabled = true; out.textContent = "Sending…";
    const { error } = await sendMagicLink(v);
    out.textContent = error ? ("Could not send: " + error.message) : "Check your email for the sign-in link, then come back.";
    btn.disabled = false;
  };
  email.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
}

/* ---------- the app (built only once authed, or when no backend) ---------- */
let navBtn = {}, ovWrap = null;

function buildShell(account) {
  /* navigation (drawing-set sheet index) */
  const nav = document.getElementById("nav");
  PAGES.forEach(([id, sheet, label], i) => {
    const b = document.createElement("button");
    b.innerHTML = '<span class="sheet">' + sheet + '</span>' + label;
    if (i === 0) b.classList.add("on");
    b.onclick = () => {
      document.querySelectorAll(".nav button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      document.querySelectorAll(".page").forEach(p => p.classList.remove("on"));
      document.getElementById("pg-" + id).classList.add("on");
      closeDrawer();
    };
    navBtn[id] = b;
    nav.appendChild(b);
  });
  document.getElementById("pg-dash").classList.add("on");
  document.getElementById("todayStamp").textContent = TODAY.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  /* owner view: operator picks owner-visible sheets, then previews */
  let ownerPreview = false;
  ovWrap = document.createElement("div");
  ovWrap.className = "ownerview";
  const ovToggle = document.createElement("button");
  ovToggle.className = "ov-toggle";
  const ovCfg = document.createElement("details");
  ovCfg.className = "ov-cfg";
  ovCfg.innerHTML = "<summary>Owners can see…</summary>";
  const ovList = document.createElement("div");
  ovList.className = "ov-list";
  PAGES.forEach(([id, sheet, label]) => {
    const lab = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = getOwnerSheets().includes(id);
    cb.onchange = () => { setOwnerSheet(id, cb.checked); if (ownerPreview) applyOwner(); };
    lab.append(cb, document.createTextNode(" " + sheet + " · " + label));
    ovList.appendChild(lab);
  });
  ovCfg.appendChild(ovList);
  ovWrap.append(ovToggle, ovCfg);
  const side = document.querySelector(".side");
  side.insertBefore(ovWrap, side.querySelector(".foot"));

  function applyOwner() {
    const vis = new Set(getOwnerSheets());
    document.body.classList.toggle("owner-preview", ownerPreview);
    PAGES.forEach(([id]) => { navBtn[id].style.display = (ownerPreview && !vis.has(id)) ? "none" : ""; });
    if (ownerPreview) {
      const active = document.querySelector(".nav button.on");
      if (!active || active.style.display === "none") {
        const first = PAGES.find(([id]) => vis.has(id));
        if (first) navBtn[first[0]].click();
      }
    }
    ovToggle.textContent = ownerPreview ? "✕  Exit owner view" : "👁  Preview owner view";
    ovToggle.classList.toggle("on", ownerPreview);
  }
  ovToggle.onclick = () => { ownerPreview = !ownerPreview; applyOwner(); };
  applyOwner();

  /* account / sign-out (only when a backend session exists) */
  if (account) {
    const acct = document.createElement("div");
    acct.className = "acct";
    acct.innerHTML = '<span class="acct-who">' + escapeHtml(account.email || "") + ' · ' + account.role + '</span>' +
      '<button class="acct-out" id="signOut">Sign out</button>';
    side.appendChild(acct);
    acct.querySelector("#signOut").onclick = async () => { await signOut(); location.reload(); };
  }

  /* JSON export / import */
  document.getElementById("btnExport").onclick = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "otb-command-state-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = document.getElementById("importFile");
  document.getElementById("btnImport").onclick = () => importFile.click();
  importFile.onchange = async () => {
    const f = importFile.files[0];
    importFile.value = "";
    if (!f) return;
    try { importJSON(await f.text()); location.reload(); }
    catch (err) { alert("Import failed — " + err.message); }
  };

  /* expose for role application */
  buildShell._applyOwner = applyOwner;
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function applyRole(role) {
  const owner = role === "owner";
  document.body.classList.toggle("role-owner", owner);
  if (owner) {
    const vis = new Set(getOwnerSheets());
    PAGES.forEach(([id]) => { navBtn[id].style.display = vis.has(id) ? "" : "none"; });
    const active = document.querySelector(".nav button.on");
    if (!active || active.style.display === "none") {
      const first = PAGES.find(([id]) => vis.has(id));
      if (first) navBtn[first[0]].click();
    }
    if (ovWrap) ovWrap.style.display = "none"; // owners don't configure visibility
  }
}

function initViews() {
  initPlan();
  initSpatial();
  renderRoll();
  initMatrix();
  initDates();
  initBoard();
  initDirectory();
  initFinancial();
  initDashboard(); // last — its Action Queue reads the board's live cards
}

/* push operator edits to the shared backend (debounced) */
function wireSync() {
  let t = null;
  subscribe(type => {
    if (type === "selection" || type === "import") return;
    clearTimeout(t);
    t = setTimeout(async () => {
      try {
        const { error } = await pushState(JSON.parse(exportJSON()));
        if (error) console.warn("sync push failed:", error.message);
      } catch (e) { console.warn("sync error:", e); }
    }, 800);
  });
}

/* ---------- boot ---------- */
async function boot() {
  if (REMOTE) {
    let session = null;
    try { session = await getSession(); } catch (e) { console.warn(e); }
    if (!session) { showLogin(); return; }
    let account = null;
    try { account = await getRole(); } catch (e) { console.warn(e); }
    account = account || { email: "", role: "owner" };
    try {
      const remote = await loadState();
      if (Object.keys(remote).length) hydrateRemote(remote);
      else if (account.role === "operator") await pushState(JSON.parse(exportJSON())); // seed empty backend from local
    } catch (e) { console.warn("remote state:", e); }
    buildShell(account);
    initViews();
    applyRole(account.role);
    if (account.role === "operator") {
      wireSync();
      if (!localStorage.getItem("otb-assets-migrated")) {
        try { await migrateLocalToRemote(); } catch (e) { console.warn("asset migrate:", e); }
        localStorage.setItem("otb-assets-migrated", "1");
      }
    }
  } else {
    buildShell(null);
    initViews();
  }
}

boot();
