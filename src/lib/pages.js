/* Sheet index — SINGLE SOURCE OF TRUTH for the drawing-set nav.
   [id, sheet code, label]. main.js renders nav + "Owners can see…" from PAGES;
   store.js validates the persisted ownerSheets layer against PAGE_IDS (derived,
   so a new sheet added here is automatically owner-tickable — the old split
   lists let A-2/S-1 checkboxes silently no-op). Pure module: unit-testable. */
export const PAGES = [
  ["portfolio", "D-0", "Portfolio"],
  ["dash", "D-1", "Dashboard"],
  ["plan", "A-1", "Site Plan"],
  ["spatial", "A-2", "Spatial"],
  ["roll", "R-1", "Rent Roll"],
  ["comp", "C-1", "Compliance"],
  ["fin", "P-1", "Financial"],
  ["safe", "S-1", "Owner Safe"],
  ["ai", "AI-1", "Concierge"],
  ["dates", "T-1", "Critical Dates"],
  ["board", "W-1", "Action Board"],
  ["dir", "K-1", "Directory"],
  ["comms", "L-1", "Comm Log"],
  ["matters", "N-1", "Matters"],
  ["maint", "M-1", "Maintenance"],
  ["sop", "O-1", "Operations"],
  ["vendors", "V-1", "Vendor Portal"]
];

/* The one sheet a role-vendor login sees (P3) — everything else is hidden in
   the nav AND sealed at the DB layer (RLS). */
export const VENDOR_SHEET = "vendors";
/* Same deal for role-tenant logins (A-2): the maintenance sheet, unit-scoped. */
export const TENANT_SHEET = "maint";

export const PAGE_IDS = PAGES.map(([id]) => id);

/* Boot lands here (D-1 remains the working home sheet — D-0 sits above it in
   drawing-set order but is a cross-property rollup, not the daily surface). */
export const DEFAULT_PAGE = "dash";

/* Owner-view defaults (fresh state / reset only — a persisted ownerSheets
   selection always wins). Deliberate calls:
   - "safe" IN: S-1 is the owners' vault by design (RLS read is already
     owner+operator; this layer is nav visibility, not security).
   - "spatial" OUT: A-2 is heavy (3D/satellite/splat) — operator opt-in.
   - "ai", "comp", "dates", "board", "dir" OUT: operator working sheets;
     AI-1 owner visibility is off by default per the P4 ship note. */
export const DEFAULT_OWNER_SHEETS = ["dash", "plan", "roll", "fin", "safe"];
