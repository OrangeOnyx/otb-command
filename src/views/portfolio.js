/* D-0 Portfolio — cross-property rollup (Phase B-3, docs/phase-b/10).
   DB-native aggregates only (roster + ledger + maintenance via RLS); the
   bundled data package belongs to the ACTIVE property's sheets. Fetches at
   init + on demand (no realtime on D-0 v1 — that stays scoped to the active
   property's layer tables). "Open →" switches the active property and
   reloads: every boot-bound context (seed, hydration, queue priming, the
   realtime channel) re-binds cleanly. */
import { REMOTE, listProperties, listPortfolioLedger, listPortfolioMaintenance, setActiveProperty, activeSlug, propertyContext } from "../lib/remote.js";
import { byProperty, portfolioModel, cardHTML } from "../lib/portfolio.js";

export function initPortfolio() {
  const grid = document.getElementById("pfGrid");
  const note = document.getElementById("pfNote");
  if (!grid) return;
  if (!REMOTE) {
    grid.innerHTML = "";
    note.textContent = "Portfolio requires the hosted backend — local mode shows the bundled property only.";
    return;
  }
  let loaded = false;
  const load = async () => {
    try {
      const [properties, ledger, maint, ctx] = await Promise.all([
        listProperties(), listPortfolioLedger(), listPortfolioMaintenance(), propertyContext(),
      ]);
      const maintByProp = {};
      for (const [pid, rows] of Object.entries(byProperty(maint.rows)))
        maintByProp[pid] = { rows, events: maint.events }; // events filter per-request inside the fold
      const models = portfolioModel({
        properties,
        ledgerByProp: byProperty(ledger),
        maintByProp,
        activeSlug: activeSlug() || ctx.slug, // unset selection = the resolved boot property
      });
      grid.innerHTML = models.map(cardHTML).join("") ||
        '<div class="mute">No properties visible to this account.</div>';
      note.textContent = "A/R = sum of positive unit balances (effective ledger entries). " +
        "Work orders = open/assigned/in-progress heads. Figures as of " + new Date().toLocaleString() + ".";
      grid.querySelectorAll(".pf-open").forEach(b => {
        b.onclick = () => { setActiveProperty(b.dataset.slug); location.reload(); };
      });
      loaded = true;
    } catch (e) {
      note.textContent = "Portfolio unavailable: " + (e.message || String(e));
    }
  };
  load();
  /* re-pull when the sheet is opened again after first load (cheap, keeps
     figures honest without a realtime channel) */
  window.addEventListener("hashchange", () => {
    if (location.hash.replace(/^#\/?/, "") === "portfolio" && loaded) load();
  });
}
