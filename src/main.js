/* App boot: auth gate (Path B) → navigation, top-bar, JSON export/import, renders. */
import "./styles.css";
import { exportJSON, importJSON, getOwnerSheets, setOwnerSheet, hydrateRemote, subscribe, getLayerState } from "./store.js";
import { REMOTE, getSession, getRole, sendMagicLink, signOut, loadState, pushOps, fetchLayerRows, listAuthorized, authorizeEmail, revokeAuthorized, listPendingProfiles, listProperties, propertyContext, setActiveProperty, BUNDLED_PROPERTY } from "./lib/remote.js";
import { LAYER_DEFS } from "./lib/layers.js";
import { SyncQueue } from "./lib/statesync.js";
import { startRealtime } from "./lib/realtime.js";
import { migrateLocalToRemote } from "./lib/assets.js";
import { initErrorLog } from "./lib/errlog.js";
import { logClientError } from "./lib/remote.js";
import { loadSeed } from "./lib/seed.js";
import { TODAY, esc } from "./lib/format.js";
import { PAGES, DEFAULT_PAGE, VENDOR_SHEET, TENANT_SHEET } from "./lib/pages.js";
import { pageFromHash, hashFor, resolveRoute } from "./lib/router.js";
import { initDashboard } from "./views/dashboard.js";
import { initPlan } from "./views/plan.js";
import { initSpatial } from "./views/spatial.js";
import { initSafe } from "./views/safe.js";
import { initSearch } from "./views/search.js";
import { printFootText, printDocTitle } from "./lib/printsheet.js";
import { fitZoom } from "./lib/roll.js";
import { renderRoll } from "./views/rentroll.js";
import { initMatrix } from "./views/compliance.js";
import { initDates } from "./views/dates.js";
import { initBoard } from "./views/board.js";
import { initDirectory } from "./views/directory.js";
import { initFinancial } from "./views/financial.js";
import { initConcierge } from "./views/concierge.js";
import { initVendorPortal } from "./views/vendorportal.js";
import { initMaintenance } from "./views/maintenance.js";
import { initSop } from "./views/sop.js";
import { initPortfolio } from "./views/portfolio.js";
import { initComms } from "./views/comms.js";
import { initMatters } from "./views/matters.js";
import { closeDrawer } from "./views/drawer.js";


/* ---------- login gate ---------- */
function showLogin(msg) {
  const app = document.querySelector(".app");
  if (app) app.style.display = "none";
  const o = document.createElement("div");
  o.className = "login-gate";
  o.innerHTML =
    '<div class="login-card">' +
    '<div class="login-wm">ON THE <span>BOULEVARD</span></div>' +
    '<div class="login-sub">Orange Ocean Atlas — sign in</div>' +
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
  let currentPage = DEFAULT_PAGE;
  PAGES.forEach(([id, sheet, label]) => {
    const b = document.createElement("button");
    b.innerHTML = '<span class="sheet">' + sheet + '</span>' + label;
    if (id === DEFAULT_PAGE) b.classList.add("on");
    b.onclick = () => {
      document.querySelectorAll(".nav button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      document.querySelectorAll(".page").forEach(p => p.classList.remove("on"));
      document.getElementById("pg-" + id).classList.add("on");
      currentPage = id;
      document.body.classList.remove("nav-open");
      closeDrawer();
      /* deep link: the hash mirrors the open sheet (pushes a history entry →
         back/forward walk the sheet trail) */
      if (pageFromHash(location.hash) !== id) location.hash = hashFor(id);
    };
    navBtn[id] = b;
    nav.appendChild(b);
  });
  document.getElementById("pg-" + DEFAULT_PAGE).classList.add("on");

  /* mobile: the sheet index is off-canvas behind ☰ (≤860px) */
  document.getElementById("navBurger").onclick = () => document.body.classList.toggle("nav-open");
  document.getElementById("navVeil").onclick = () => document.body.classList.remove("nav-open");

  /* visual sheet export: footer + doc title stamp on print (button or Ctrl+P) */
  let printTheme = null; // paper prints light regardless of screen theme
  const stampPrint = () => {
    const dateStr = TODAY.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
    document.getElementById("printFoot").textContent = printFootText(PAGES, currentPage, dateStr);
    document.title = printDocTitle(PAGES, currentPage, TODAY.toISOString().slice(0, 10));
    if (printTheme === null && document.documentElement.dataset.theme) {
      printTheme = document.documentElement.dataset.theme;
      delete document.documentElement.dataset.theme;
    }
    /* R-1 one-page guarantee (owner requirement): apply the compact print
       layout NOW, measure the real height, and zoom the sheet into budget.
       Budget 590px = 740px letter-landscape printable minus ~100px structural
       overhead outside this element (measured via print emulation 2026-07-24)
       minus safety for browser-margin/font variance — the first ship "fit" at
       720/740 and still spilled to page 2 in the field. Shrink beats spill. */
    const roll = document.getElementById("pg-roll");
    if (roll && roll.classList.contains("on")) {
      roll.classList.add("print-fit");
      roll.style.zoom = fitZoom(roll.offsetHeight, 590);
    }
  };
  window.addEventListener("beforeprint", stampPrint);
  window.addEventListener("afterprint", () => {
    document.title = "Orange Ocean Atlas — On The Boulevard";
    if (printTheme !== null) { document.documentElement.dataset.theme = printTheme; printTheme = null; }
    const roll = document.getElementById("pg-roll");
    if (roll) { roll.classList.remove("print-fit"); roll.style.zoom = ""; }
  });
  document.getElementById("btnPrintSheet").onclick = () => { stampPrint(); window.print(); };
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

  /* sign-in access (operator; ovWrap is hidden for owner/vendor roles).
     Authorize BEFORE first sign-in → the magic-link trigger assigns the role
     directly; anyone already parked in 'pending' is promoted on the spot. */
  if (REMOTE) {
    const ac = document.createElement("details");
    ac.className = "ov-cfg";
    ac.innerHTML = "<summary>Sign-in access…</summary>" +
      '<div class="ac-body"><form class="ac-add" id="acAdd">' +
      '<input id="acEmail" type="email" placeholder="owner@email.com" autocomplete="off">' +
      '<button type="submit">+ Owner</button></form>' +
      '<div class="ac-list" id="acList"></div>' +
      '<div class="ac-note mute">Vendors are authorized by the SOT Vendor List (V-1), not here.</div></div>';
    ovWrap.append(ac);
    const paint = async () => {
      const list = ac.querySelector("#acList");
      try {
        const [auth, pending] = await Promise.all([listAuthorized(), listPendingProfiles()]);
        list.innerHTML =
          pending.map(p => '<div class="ac-row"><span class="ac-mail">' + esc(p.email) + '</span>' +
            '<span class="ac-tag pend mono">pending</span><button class="ac-ok" data-e="' + esc(p.email) + '">make owner</button></div>').join("") +
          auth.map(a => '<div class="ac-row"><span class="ac-mail">' + esc(a.email) + '</span>' +
            '<span class="ac-tag mono">' + esc(a.role) + '</span><button class="ac-x" data-e="' + esc(a.email) + '" title="Revoke pre-authorization">✕</button></div>').join("") ||
          '<div class="mute" style="font-size:11px;padding:4px 2px">no authorized emails yet</div>';
        list.querySelectorAll(".ac-ok").forEach(b => { b.onclick = async () => { await authorizeEmail(b.dataset.e, "owner"); paint(); }; });
        list.querySelectorAll(".ac-x").forEach(b => { b.onclick = async () => { if (!confirm("Revoke pre-authorization for " + b.dataset.e + "?\n(Does not sign out an already-active account.)")) return; try { await revokeAuthorized(b.dataset.e); paint(); } catch (e) { alert(e.message); } }; });
      } catch (e) { list.innerHTML = '<div class="mute" style="font-size:11px">' + esc(e.message) + "</div>"; }
    };
    ac.addEventListener("toggle", () => { if (ac.open) paint(); });
    ac.querySelector("#acAdd").onsubmit = async e => {
      e.preventDefault();
      const inp = ac.querySelector("#acEmail");
      try { await authorizeEmail(inp.value, "owner"); inp.value = ""; paint(); }
      catch (err) { alert(err.message); }
    };
  }
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
    acct.innerHTML = '<span class="acct-who">' + esc(account.email || "") + ' · ' + account.role + '</span>' +
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
  initTheme();
}

function applyRole(role) {
  const owner = role === "owner";
  const vendor = role === "vendor";
  const tenant = role === "tenant";
  document.body.classList.toggle("role-owner", owner);
  document.body.classList.toggle("role-vendor", vendor);
  document.body.classList.toggle("role-tenant", tenant);
  if (vendor || tenant) {
    /* vendors and tenants get exactly one sheet; RLS seals the rest server-side too */
    const only = vendor ? VENDOR_SHEET : TENANT_SHEET;
    PAGES.forEach(([id]) => { navBtn[id].style.display = id === only ? "" : "none"; });
    navBtn[only].click();
    if (ovWrap) ovWrap.style.display = "none";
    return;
  }
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

/* Hash router wiring — runs AFTER buildShell + applyRole so nav visibility is
   final. Navigation always goes through the nav buttons (single code path);
   a hash naming a sheet this role can't see snaps back without navigating
   (visibility is UX — RLS seals the data server-side regardless). */
function initRouter() {
  const visible = () => PAGES.map(([id]) => id).filter(id => navBtn[id] && navBtn[id].style.display !== "none");
  const currentId = () => PAGES.map(([id]) => id).find(id => navBtn[id] && navBtn[id].classList.contains("on"));
  const goHash = () => {
    const target = resolveRoute(pageFromHash(location.hash), visible());
    if (!target) return;
    if (target !== currentId()) navBtn[target].click();
    else if (pageFromHash(location.hash) !== target)
      history.replaceState(null, "", hashFor(target)); // normalize bad/sealed hash, no new entry
  };
  window.addEventListener("hashchange", goHash);
  if (pageFromHash(location.hash)) goHash(); // honor a deep link on load; else keep role default
}

function initViews(account) {
  initPlan();
  initSpatial();
  initSafe();
  initSearch();
  renderRoll();
  initMatrix();
  initDates();
  initBoard();
  initDirectory();
  initFinancial();
  initConcierge();
  initVendorPortal(account);
  initMaintenance(account);
  initSop(account);
  initPortfolio();
  initComms(account);
  initMatters(account);
  initDashboard(); // last — its Action Queue reads the board's live cards
}

/* push operator edits to the shared backend (per-row diffs, debounced).
   Layer emit types == registry keys; "import" re-diffs every layer (a JSON
   import now syncs — under whole-snapshot push it silently didn't).
   detail.remote marks a realtime fold: already server truth, never re-push. */
const CLIENT_ORIGIN = crypto.randomUUID(); // per-tab tag for realtime echo skip
const syncQueue = new SyncQueue();
const LAYER_BY_KEY = Object.fromEntries(LAYER_DEFS.map(d => [d.key, d]));

const dirtyTables = new Set(); // tables whose last push failed → re-pull + re-diff

function wireSync() {
  let t = null;
  const flush = async () => {
    /* Recover failed tables first: the queue cache advanced optimistically at
       queue-time, so after a failed push it lies about server truth. Re-pull
       the table, prime with reality, re-diff local state → exact minimal ops. */
    for (const table of [...dirtyTables]) {
      try {
        const rows = await fetchLayerRows(table);
        for (const d of LAYER_DEFS.filter(x => x.table === table)) {
          syncQueue.prime(d, rows.filter(r => d.ownsRow(r)));
          syncQueue.queue(d, d.toRows(getLayerState(d.key)));
        }
        dirtyTables.delete(table);
      } catch { /* still unreachable — stays dirty, retried below */ }
    }
    const batches = syncQueue.drain();
    if (batches.length) {
      try {
        const { error } = await pushOps(batches, CLIENT_ORIGIN);
        if (error) throw error;
      } catch (e) {
        console.warn("sync push failed:", e.message || e);
        batches.forEach(b => dirtyTables.add(b.table));
      }
    }
    if (dirtyTables.size) { clearTimeout(t); t = setTimeout(flush, 30000); }
  };
  subscribe((type, detail) => {
    if (type === "selection") return;
    if (detail && detail.remote) return;
    const keys = type === "import" ? Object.keys(LAYER_BY_KEY) : (LAYER_BY_KEY[type] ? [type] : []);
    if (!keys.length) return;
    for (const k of keys) syncQueue.queue(LAYER_BY_KEY[k], LAYER_BY_KEY[k].toRows(getLayerState(k)));
    clearTimeout(t);
    t = setTimeout(flush, 800);
  });
}

/* Property switcher (Phase B-3, docs/phase-b/10): renders ONLY when the
   member sees more than one property — today that is nobody, so the OTB
   sidebar stays pixel-identical. Switching = full reload: seed, layer
   hydration, queue priming, and the realtime channel are boot-bound to one
   property context, and reload re-binds them all cleanly. */
async function initPropertySwitcher() {
  try {
    const [props, ctx] = await Promise.all([listProperties(), propertyContext()]);
    if (props.length < 2) return;
    const wrap = document.createElement("div");
    wrap.className = "prop-switch";
    wrap.innerHTML = '<div class="ix-title">Property</div>' +
      '<select id="propSel">' + props.map(p =>
        '<option value="' + esc(p.slug) + '"' + (p.slug === ctx.slug ? " selected" : "") + '>' +
        esc(p.name) + '</option>').join("") + '</select>';
    const side = document.querySelector(".side");
    side.insertBefore(wrap, side.querySelector(".foot"));
    wrap.querySelector("#propSel").onchange = e => { setActiveProperty(e.target.value); location.reload(); };
  } catch { /* roster unavailable — the switcher simply doesn't render */ }
}

function initTheme() {
  const saved = localStorage.getItem("otb-theme") === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = saved;
  const btn = document.getElementById("themeToggle");
  const label = () => { if (btn) btn.textContent = document.documentElement.dataset.theme === "dark" ? "◑ Light mode" : "◐ Dark mode"; };
  label();
  if (btn) btn.onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("otb-theme", next);
    label();
  };
}

/* ---------- boot ---------- */
async function boot() {
  if (REMOTE) {
    let session = null;
    try { session = await getSession(); } catch (e) { console.warn(e); }
    if (!session) { showLogin(); return; }
    let account = null;
    try { account = await getRole(); } catch (e) { console.warn(e); }
    account = account || { email: "", role: "pending" }; // fail closed, not to owner
    if (account.role === "pending") { showPending(account.email); return; }
    // C1: hydrate confidential seed (rents/PII/vendors) before rendering. Owner
    // + operator only; a failure leaves skeletons (never leaks), so don't block boot.
    try { await loadSeed(); } catch (e) { console.warn("seed:", e); }
    try {
      const remote = await loadState();
      for (const d of LAYER_DEFS) // prime the sync queue with server truth
        syncQueue.prime(d, (loadState.lastRows?.[d.table] || []).filter(r => d.ownsRow(r)));
      if (Object.keys(remote).length) hydrateRemote(remote);
      else if (account.role === "operator" && (await propertyContext()).slug === BUNDLED_PROPERTY) {
        /* seed an empty backend from local — ONLY for the bundled property.
           The local snapshot derives from the bundled OTB data package;
           pushing it into a freshly onboarded property mirrors OTB state
           there (caught live by the C-2 demo teardown, 2026-08-05). */
        for (const d of LAYER_DEFS) syncQueue.queue(d, d.toRows(getLayerState(d.key)));
        await pushOps(syncQueue.drain(), CLIENT_ORIGIN);
      }
    } catch (e) { console.warn("remote state:", e); }
    buildShell(account);
    initViews(account);
    applyRole(account.role);
    initRouter();
    /* B-4 error beacon: authed sessions report uncaught errors (deduped,
       session-capped client-side; hourly-capped server-side). */
    initErrorLog(logClientError);
    if (account.role === "operator" || account.role === "owner")
      initPropertySwitcher();
    if (account.role === "operator" || account.role === "owner")
      startRealtime({
        syncQueue, origin: CLIENT_ORIGIN,
        busy: table => syncQueue.pendingFor(table) || dirtyTables.has(table),
      }).catch(e => console.warn("realtime:", e));
    if (account.role === "operator") {
      wireSync();
      if (!localStorage.getItem("otb-assets-migrated")) {
        try { await migrateLocalToRemote(); } catch (e) { console.warn("asset migrate:", e); }
        localStorage.setItem("otb-assets-migrated", "1");
      }
    }
  } else {
    buildShell(null);
    initViews(null);
    initRouter();
  }
}

/* signed in, but not yet operator/owner/vendor — least-privilege holding pen
   (new sign-ins default to 'pending' since the P3 migration; the operator
   promotes real owners in Supabase → profiles.role) */
function showPending(email) {
  const app = document.querySelector(".app");
  if (app) app.style.display = "none";
  const o = document.createElement("div");
  o.className = "login-gate";
  o.innerHTML =
    '<div class="login-card">' +
    '<div class="login-wm">ON THE <span>BOULEVARD</span></div>' +
    '<div class="login-sub">Access pending</div>' +
    '<div class="login-msg">You’re signed in as <b>' + esc(email || "") + '</b>, but this address isn’t linked ' +
    'to an owner, operator, or vendor account yet. Contact management to be granted access.</div>' +
    '<button id="pendingOut">Sign out</button>' +
    '</div>';
  document.body.appendChild(o);
  o.querySelector("#pendingOut").onclick = async () => { await signOut(); location.reload(); };
}

boot();
