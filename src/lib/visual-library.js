/* A-7 Visual Library manifest (2026-09-30, operator ruling): appearance-only
   imagery for OTB. Buildings = the Style B "architectural minimal realism"
   center/storefront studies, enhanced; site elements = the CRE master-board
   illustration style. Generated pictures — never a source for counts,
   dimensions or tenancy (A-1/A-2/A-3 own geometry). Pure module: unit-testable. */
export const VISUALS_BASE = "/visuals/";

export const CENTER_VIEWS = [
  { id: "golden", label: "Golden hour", file: "otb-center-golden.webp" },
  { id: "midday", label: "Midday", file: "otb-center-midday.webp" },
  { id: "dusk", label: "Dusk", file: "otb-center-dusk.webp" },
  { id: "study", label: "Style B study", file: "otb-center-study.webp" }
];

export const STOREFRONT_VIEWS = [
  { id: "enhanced", label: "Enhanced", file: "otb-storefront-enhanced.webp" },
  { id: "study", label: "Style B study", file: "otb-storefront-study.webp" }
];

export const SITE_ELEMENTS = [
  { id: "poles", label: "Light poles", note: "Parking-field poles, twin heads", file: "site-light-poles.webp" },
  { id: "bollards", label: "Bollards", note: "Pipe, sleeved and decorative", file: "site-bollards.webp" },
  { id: "hvac", label: "HVAC", note: "Rooftop units, condenser, exhaust fan", file: "site-hvac.webp" },
  { id: "electrical", label: "Electrical", note: "Transformer, meter bank, disconnect, time clock", file: "site-electrical.webp" },
  { id: "trees", label: "Trees", note: "Live oak, crape myrtle, street tree, boxwood", file: "site-trees.webp" },
  { id: "islands", label: "Landscape islands", note: "Planting island · lawn island with twin-head pole", file: "site-islands.webp" },
  { id: "stalls", label: "Parking stalls", note: "Standard and ADA, on concrete", file: "site-stalls.webp" },
  { id: "dumpster", label: "Dumpster enclosure", note: "Stucco enclosure, bronze gates, bollards", file: "site-dumpster.webp" }
];

export const MASTER_BOARD = { id: "board", label: "OTB master board", file: "otb-master-board.webp" };

export const visualURL = file => VISUALS_BASE + file;

export const ALL_VISUAL_FILES = [...CENTER_VIEWS, ...STOREFRONT_VIEWS, ...SITE_ELEMENTS, MASTER_BOARD].map(v => v.file);
