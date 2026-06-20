/* App boot: navigation, top-bar stamp, JSON export/import, initial renders. */
import "./styles.css";
import { exportJSON, importJSON, getOwnerSheets, setOwnerSheet } from "./store.js";
import { TODAY } from "./lib/format.js";
import { initDashboard } from "./views/dashboard.js";
import { initPlan } from "./views/plan.js";
import { renderRoll } from "./views/rentroll.js";
import { initMatrix } from "./views/compliance.js";
import { initDates } from "./views/dates.js";
import { initBoard } from "./views/board.js";
import { initDirectory } from "./views/directory.js";
import { initFinancial } from "./views/financial.js";
import { closeDrawer } from "./views/drawer.js";

/* ---------- navigation (drawing-set sheet index) ---------- */
const PAGES = [["dash", "D-1", "Dashboard"], ["plan", "A-1", "Site Plan"], ["roll", "R-1", "Rent Roll"], ["comp", "C-1", "Compliance"], ["fin", "P-1", "Financial"], ["dates", "T-1", "Critical Dates"], ["board", "W-1", "Action Board"], ["dir", "K-1", "Directory"]];
const nav = document.getElementById("nav");
const navBtn = {};
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

/* ---------- owner view: operator picks owner-visible sheets, then previews ---------- */
let ownerPreview = false;
const ovWrap = document.createElement("div");
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
document.getElementById("todayStamp").textContent = TODAY.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

/* ---------- JSON export / import ---------- */
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
  try {
    importJSON(await f.text());
  } catch (err) {
    alert("Import failed — " + err.message);
  }
};

/* ---------- boot ---------- */
initPlan();
renderRoll();
initMatrix();
initDates();
initBoard();
initDirectory();
initFinancial();
initDashboard(); // last — its Action Queue reads the board's live cards
