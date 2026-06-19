/* App boot: navigation, top-bar stamp, JSON export/import, initial renders. */
import "./styles.css";
import { exportJSON, importJSON } from "./store.js";
import { TODAY } from "./lib/format.js";
import { renderDashboard } from "./views/dashboard.js";
import { initPlan } from "./views/plan.js";
import { renderRoll } from "./views/rentroll.js";
import { initMatrix } from "./views/compliance.js";
import { renderDates } from "./views/dates.js";
import { initBoard } from "./views/board.js";
import { initDirectory } from "./views/directory.js";
import { initFinancial } from "./views/financial.js";
import { closeDrawer } from "./views/drawer.js";

/* ---------- navigation (drawing-set sheet index) ---------- */
const PAGES = [["dash", "D-1", "Dashboard"], ["plan", "A-1", "Site Plan"], ["roll", "R-1", "Rent Roll"], ["comp", "C-1", "Compliance"], ["fin", "P-1", "Financial"], ["dates", "T-1", "Critical Dates"], ["board", "W-1", "Action Board"], ["dir", "K-1", "Directory"]];
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
  nav.appendChild(b);
});
document.getElementById("pg-dash").classList.add("on");
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
renderDashboard();
initPlan();
renderRoll();
initMatrix();
renderDates();
initBoard();
initDirectory();
initFinancial();
