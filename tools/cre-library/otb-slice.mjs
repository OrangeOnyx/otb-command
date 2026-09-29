/* Cypress Command Platform · CRE Asset Library — OTB reference slice (pure).

   Adapter, not a second property database: reads the repo's canonical records
   (src/data/geometry.json demising strings = recorded-plat transcription,
   src/data/heights.json = CAD BLD_HT annotations, src/data/pylon.json = operator
   panel register, src/data/units.public.json = public tenancy fields) and emits
   library exchange records (docs/design/cypress-command/cre-asset-library/
   schemas), deterministic SVG derivatives and a SEPARATE operations overlay.

   Rules carried from the library's source-of-truth.md:
   - geometry comes only from measured/transcribed sources — never the board;
   - tenancy/status never enters a geometry file; it binds by stable entity ID;
   - nothing is marked verified (no reviewer evidence exists yet).
   No IO here; tools/cre-library/build-otb-slice.mjs does the reading/writing. */

export const PROPERTY_ID = "on-the-boulevard";
export const SITE_ID = "site-otb-main";
export const SIGN_ID = "sign-otb-johnston-pylon";
export const BUILDINGS = {
  long: { id: "building-otb-long", key: "longBuilding", name: "Long building (101–133)" },
  short: { id: "building-otb-short", key: "shortBuilding", name: "Short building (135–149)" }
};
export const TOOL = "tools/cre-library/build-otb-slice.mjs";
export const TOOL_VERSION = "1.0.0";

/* Suite labels stay exact ("117.5", "135A"); only the lookup key is normalized
   so it satisfies the library ID pattern ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$. */
export function suiteId(label) {
  return "suite-otb-" + String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function panelId(key) {
  return `panel-otb-johnston-pylon-${String(key).toLowerCase()}`;
}

const ref = (s, locator) => ({ source_id: s.id, revision: s.revision, sha256: s.sha256, ...(locator ? { locator } : {}) });
const draft = (notes) => ({ state: "draft", notes });
const unverified = (notes) => ({ state: "unverified", notes });
const candidate = { state: "candidate" };
const r2 = (n) => Math.round(n * 100) / 100;

/* ── frontage bays in elevation order ─────────────────────────────────────────
   Viewer stands in the main field facing the storefronts. Long building: the
   plat string runs 133→101, Johnston (101) is on the viewer's LEFT, so reverse.
   Short building: 135 (Marie Antoinette end) is on the viewer's left. */
export function frontageBays(geometry, heights, which) {
  const b = geometry.demising[BUILDINGS[which].key];
  const bays = which === "long" ? [...b.bays].reverse() : [...b.bays];
  let x = 0;
  return bays.map(([label, widthFt, basisNote]) => {
    const heightFt = heights[label] ?? heights[label + "A"] ?? null;
    const bay = {
      label, x0Ft: r2(x), widthFt, heightFt,
      widthBasis: /^derived/i.test(basisNote) ? "derived" : "plat",
      basisNote,
      entityIds: label === "135" ? [suiteId("135A")] : [suiteId(label)]
    };
    if (label === "135") bay.note = `${widthFt} ft plat section split at mid-depth: the field face belongs to 135A; 135B is the Patricia half. Both suites front Marie Antoinette.`;
    x += widthFt;
    return bay;
  });
}

/* ── deterministic checks (feed geometry-validation.csv) ─────────────────── */
export function frontageChecks(geometry, heights, unitsPublic) {
  const out = [];
  for (const which of ["long", "short"]) {
    const b = geometry.demising[BUILDINGS[which].key];
    const sum = r2(b.bays.reduce((a, [, w]) => a + w, 0));
    out.push({
      check: `${which}-frontage-closure`, observed: sum, expected: b.lengthFt, unit: "ft",
      delta: r2(sum - b.lengthFt),
      result: Math.abs(sum - b.lengthFt) <= 0.05 ? "pass" : "fail",
      basis: "Sum of plat demising-string bay widths vs recorded building length in geometry.json. 0.05 ft = the 2-decimal rounding of the transcribed strings; a closure check, not a survey tolerance."
    });
  }
  const sf = Object.fromEntries(unitsPublic.map((u) => [u.unit, u.sf]));
  for (const which of ["long", "short"]) {
    const b = geometry.demising[BUILDINGS[which].key];
    for (const [label, w, note] of b.bays) {
      if (label === "135") continue; // 135A/135B split — compared in their own row below
      const footprint = r2(w * b.depthFt);
      out.push({
        check: `area-${label}`, observed: footprint, expected: sf[label] ?? null, unit: "sqft",
        delta: sf[label] == null ? null : r2(footprint - sf[label]),
        result: "not_applicable",
        basis: `Plat footprint (bay ${w} ft × depth ${b.depthFt} ft; ${note}) vs lease SF (units.public.json). Different measurement definitions — reported, never reconciled or averaged.`
      });
    }
  }
  const hvals = Object.values(heights);
  const fallback = hvals.filter((h) => h === 16.4).length;
  out.push({
    check: "parapet-height-provenance", observed: fallback, expected: null, unit: "count",
    delta: null, result: "unresolved",
    basis: `${fallback}/${hvals.length} units carry 16.4 ft, which tools/extract-heights.py also uses as its no-annotation FALLBACK; heights.json does not record which values were annotated vs defaulted.`
  });
  return out;
}

export function joinChecks(unitsPublic, pylon, suiteRecords) {
  const ids = new Set(suiteRecords.map((s) => s.id));
  const missing = unitsPublic.filter((u) => !ids.has(suiteId(u.unit))).map((u) => u.unit);
  const orphanPanels = pylon.panels.filter((p) => p.unit && !ids.has(suiteId(p.unit))).map((p) => p.panel);
  return [
    { check: "units-to-suite-records", observed: unitsPublic.length - missing.length, expected: unitsPublic.length, unit: "count", delta: -missing.length, result: missing.length ? "fail" : "pass", basis: "Every units.public.json unit resolves to exactly one suite record by normalized lookup key." + (missing.length ? " Missing: " + missing.join(", ") : "") },
    { check: "pylon-panels-to-suites", observed: pylon.panels.length - orphanPanels.length, expected: pylon.panels.length, unit: "count", delta: -orphanPanels.length, result: orphanPanels.length ? "fail" : "pass", basis: "Every pylon.json panel→unit assignment resolves to a suite record." + (orphanPanels.length ? " Orphans: " + orphanPanels.join(", ") : "") }
  ];
}

/* ── library records ──────────────────────────────────────────────────────── */
export function sourceRecords(S) {
  const base = (s, extra) => ({ schema_version: "1.0.0", record_type: "source", id: s.id, name: s.name, location: { repository_path: s.path }, revision: s.revision, sha256: s.sha256, ...extra });
  return [
    base(S.geometry, { kind: "verified-property-data", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      owner: { party: "Belle Realty of Lafayette, LLC (operator: Orange Ocean, LLC)" },
      verification: unverified("Repo transcription of the recorded plat (Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019) plus architect-CAD access layer. Native plat PDF is not in the repo (raster crops in reference/). International vs US survey foot not stated; recorded as ft pending confirmation. Demising strings marked 'derived' are SF splits, not plat dimensions.") }),
    base(S.heights, { kind: "verified-property-data", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      verification: unverified("Parapet heights matched to CAD 'BUILDING HEIGHT' annotations (layer BLD_HT) by tools/extract-heights.py; 16.4 ft is also the script's fallback when no annotation is in range, and the output does not flag which values defaulted. Height datum (finished floor vs grade) not stated.") }),
    base(S.cad, { kind: "cad", authority_domains: ["geometry", "dimensions"], units: ["ft"],
      verification: unverified("Architect CAD (cleaned). Parent of heights.json and the geometry.json access layer; not a direct input to this slice. Drawing date/author/as-built status not recorded in the repo.") }),
    base(S.pylon, { kind: "operational-record", authority_domains: ["operations"],
      verification: unverified("Operator panel register (D-19b, 2026-09-17): panel order, nominal sizes and panel→unit assignment. Not a measured sign drawing — cabinet, posts, gaps and installed panel dimensions are unmeasured.") }),
    base(S.units, { kind: "operational-record", authority_domains: ["operations"],
      verification: unverified("Public-safe tenancy fields derived from the Tier-1 rent roll (units.json). Lease SF is a lease definition, not a measured footprint.") }),
    base(S.board, { kind: "generated-image", authority_domains: ["appearance"],
      verification: unverified("Cypress Command CRE asset library master board v1.0.0 (generated). Styling reference only; its streets, counts, tenants and geometry are fictional.") })
  ];
}

export function entityRecords({ S, geometry, unitsPublic, pylon, assetIds }) {
  const geo = ref(S.geometry);
  const recs = [];
  const suitesBy = { long: [], short: [] };
  const buildingOf = (label) => (/^1[34]/.test(label) && Number.parseFloat(label) >= 135 ? "short" : "long");
  for (const u of unitsPublic) {
    const which = buildingOf(u.unit);
    const b = geometry.demising[BUILDINGS[which].key];
    const bayLabel = /^135[AB]$/.test(u.unit) ? "135" : u.unit;
    const bay = b.bays.find(([l]) => l === bayLabel);
    const rec = {
      schema_version: "1.0.0", record_type: "suite", id: suiteId(u.unit), name: `Suite ${u.unit}`,
      verification: draft("Physical suite identity adapted from the canonical unit record; frontage from the plat transcription. Not reviewed."),
      source_refs: [geo], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "unit", entity_id: u.unit, record_location: { repository_path: "src/data/units.json" } }],
      property_id: PROPERTY_ID, building_id: BUILDINGS[which].id, suite_label: u.unit,
      asset_ids: [assetIds[which]]
    };
    if (bay && bayLabel !== "135") {
      rec.measurements = [{
        name: "storefront-frontage", value: bay[1], quantity: "length", unit: "ft",
        basis: bay[2].startsWith("derived") ? `Derived, not a plat dimension: ${bay[2]}` : `Recorded plat demising string (${bay[2]})`,
        source_refs: [ref(S.geometry, `demising.${BUILDINGS[which].key}.bays[${u.unit}]`)],
        verification: unverified("Transcribed; not field-verified.")
      }];
    }
    suitesBy[which].push(rec.id);
    recs.push(rec);
  }
  for (const which of ["long", "short"]) {
    recs.push({
      schema_version: "1.0.0", record_type: "building", id: BUILDINGS[which].id, name: BUILDINGS[which].name,
      verification: draft("Building identity from geometry.json demising key '" + BUILDINGS[which].key + "'."),
      source_refs: [geo], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "geometry-demising", entity_id: BUILDINGS[which].key, record_location: { repository_path: "src/data/geometry.json" } }],
      property_id: PROPERTY_ID, site_id: SITE_ID, suite_ids: suitesBy[which], asset_ids: [assetIds[which]]
    });
  }
  const panelIds = pylon.panels.map((p) => panelId(p.panel));
  for (const p of pylon.panels) {
    recs.push({
      schema_version: "1.0.0", record_type: "panel", id: panelId(p.panel), name: `Pylon panel ${p.panel}`,
      verification: draft(`Panel slot identity from the operator register. Nominal size ${p.size} ft (operator schedule, unmeasured). Content/tenant binding stays in pylon.json.`),
      source_refs: [ref(S.pylon, `panels[${p.panel}]`)], release: candidate,
      existing_operations_refs: [{ system: "otb-command", entity_type: "pylon-panel", entity_id: p.panel, record_location: { repository_path: "src/data/pylon.json" } }],
      property_id: PROPERTY_ID, sign_id: SIGN_ID, panel_key: p.panel, asset_ids: [assetIds.sign]
    });
  }
  recs.push({
    schema_version: "1.0.0", record_type: "sign", id: SIGN_ID, name: "Johnston St pylon sign",
    verification: draft(`pylon.json names this "${pylon.sign.name}"; CLAUDE.md and the operator call it the pylon. One physical sign; the naming difference is logged in the conflict register.`),
    source_refs: [ref(S.pylon)], release: candidate,
    existing_operations_refs: [{ system: "otb-command", entity_type: "sign", entity_id: "pylon", record_location: { repository_path: "src/data/pylon.json" } }],
    property_id: PROPERTY_ID, site_id: SITE_ID, sign_type: "pylon", panel_ids: panelIds, asset_ids: [assetIds.sign]
  });
  recs.push({
    schema_version: "1.0.0", record_type: "site", id: SITE_ID, name: "On The Boulevard — main tract",
    verification: draft("Site container only; parcel boundary stays in geometry.json (boundary.mainTract). Remote Lot 7 not modelled in this slice."),
    source_refs: [geo], release: candidate,
    property_id: PROPERTY_ID, building_ids: [BUILDINGS.long.id, BUILDINGS.short.id], sign_ids: [SIGN_ID]
  });
  recs.push({
    schema_version: "1.0.0", record_type: "property", id: PROPERTY_ID, name: "On The Boulevard",
    verification: draft("First Cypress Command Platform reference property. Identity only; property facts stay in the repo's canonical records."),
    source_refs: [geo], release: candidate,
    existing_operations_refs: [{ system: "otb-command", entity_type: "property", entity_id: "otb" }],
    slug: PROPERTY_ID, site_ids: [SITE_ID], building_ids: [BUILDINGS.long.id, BUILDINGS.short.id],
    asset_ids: [assetIds.long, assetIds.short, assetIds.sign]
  });
  return recs;
}

export function assetRecords({ S, G, assetIds, files, pylon }) {
  const geo = [ref(S.geometry), ref(S.heights)];
  const recs = [];
  for (const which of ["long", "short"]) {
    const g = G[which];
    recs.push({
      schema_version: "1.0.0", record_type: "asset", id: assetIds[which], name: `${BUILDINGS[which].name} — storefront elevation (schematic)`,
      verification: unverified("Deterministic derivative of unverified transcribed sources. Bay widths and parapet heights only; openings, awnings, columns and signage are NOT drawn because no measured source for them was used."),
      source_refs: geo, release: candidate, scope: "property", property_id: PROPERTY_ID,
      subject_refs: [{ record_type: "building", id: BUILDINGS[which].id }],
      asset_type: "elevation", representation: "styled-measured-2d",
      location: { repository_path: files[which].svgPath }, revision: "v1", sha256: files[which].svgSha,
      view: "front", theme: "neutral", style_reference_source_ids: [S.board.id],
      display_label: "DRAFT — schematic massing from plat strings + CAD heights; not field-verified",
      geometry: {
        geometry_id: g.geometry_id, mode: "derived-from-measurement", basis_kind: "verified-property-data",
        location: { repository_path: files[which].geomPath }, revision: "v1", sha256: files[which].geomSha,
        source_refs: geo, length_unit: "ft",
        coordinate_reference: {
          type: "local", identifier: `otb-${which}-frontage-elevation`, axis_order: ["x", "z"], handedness: "right-handed", units: "ft",
          origin: { coordinates: [0, 0], description: which === "long"
            ? "x = 0 at the Johnston-end wall of unit 101, increasing along the storefront toward Patricia; z = 0 at the (unstated) datum of the CAD BLD_HT height annotations."
            : "x = 0 at the Marie Antoinette-end wall of the 135 section, increasing toward Arnould (149); z = 0 at the (unstated) datum of the CAD BLD_HT height annotations." }
        },
        verification: unverified("Frontage closure checked against recorded building length; see geometry-validation.csv. Foot definition and height datum unresolved."),
        derivation: { method: "Cumulative sum of demising-string bay widths (plat order, reversed for viewer-left) × per-unit parapet height; no simplification.", tool: TOOL, tool_version: TOOL_VERSION, input_source_refs: geo }
      },
      render_derivation: { method: "SVG, 1 user unit = 1 ft, y = −z; theme via --cc-cre-* custom properties with light fallbacks.", tool: TOOL, tool_version: TOOL_VERSION, input_source_refs: [...geo, ref(S.board)], geometry_id: g.geometry_id }
    });
  }
  recs.push({
    schema_version: "1.0.0", record_type: "asset", id: assetIds.sign, name: "Johnston St pylon — panel schedule diagram",
    verification: unverified(`Diagram of the operator panel schedule (${pylon.sign.schedule}). Nominal panel sizes only; cabinet, header, posts and gaps are unmeasured and not drawn to scale.`),
    source_refs: [ref(S.pylon)], release: candidate, scope: "property", property_id: PROPERTY_ID,
    subject_refs: [{ record_type: "sign", id: SIGN_ID }, ...pylon.panels.map((p) => ({ record_type: "panel", id: panelId(p.panel) }))],
    asset_type: "signage", representation: "diagram",
    location: { repository_path: files.sign.svgPath }, revision: "v1", sha256: files.sign.svgSha,
    view: "front", theme: "neutral", style_reference_source_ids: [S.board.id],
    display_label: "DIAGRAM — nominal panel schedule; not a measured sign drawing"
  });
  return recs;
}

/* ── derived geometry payloads (the canonical derivative the SVG renders) ── */
export function elevationGeometry(geometry, heights, which) {
  return {
    geometry_id: `geom-otb-${which}-frontage-elevation`,
    units: "ft", frame: `otb-${which}-frontage-elevation`, axis_order: ["x", "z"],
    building_id: BUILDINGS[which].id,
    recorded_length_ft: geometry.demising[BUILDINGS[which].key].lengthFt,
    depth_ft: geometry.demising[BUILDINGS[which].key].depthFt,
    bays: frontageBays(geometry, heights, which)
  };
}

/* ── SVG derivatives: geometry only, no tenancy, no script ────────────────── */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SVG_STYLE = `
    .cc-face{fill:var(--cc-cre-surface-raised,#FCF9F1);stroke:var(--cc-cre-text,#1E1B16);stroke-width:1.25;vector-effect:non-scaling-stroke}
    .cc-face--derived{stroke-dasharray:4 3}
    .cc-grade{stroke:var(--cc-cre-text,#1E1B16);stroke-width:2;vector-effect:non-scaling-stroke}
    .cc-dim{stroke:var(--cc-cre-text-muted,#5C554A);stroke-width:1;vector-effect:non-scaling-stroke;fill:none}
    .cc-label{fill:var(--cc-cre-text,#1E1B16);font-family:var(--cc-cre-font-meta,"Courier Prime",monospace)}
    .cc-muted{fill:var(--cc-cre-text-muted,#5C554A);font-family:var(--cc-cre-font-meta,"Courier Prime",monospace)}
    .cc-frame{fill:none;stroke:var(--cc-cre-text-muted,#5C554A);stroke-width:1;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}`;

export function elevationSvg(geom, title) {
  const maxH = Math.max(...geom.bays.map((b) => b.heightFt ?? 0));
  const L = r2(geom.bays.reduce((a, b) => a + b.widthFt, 0));
  const pad = 6, top = maxH + 12, bottom = 11;
  const vb = [-pad, -top, L + pad * 2, top + bottom].map(r2).join(" ");
  const g = geom.bays.map((b) => {
    const ids = b.entityIds.join(" ");
    const h = b.heightFt ?? 0;
    const cx = r2(b.x0Ft + b.widthFt / 2);
    return `  <g id="${esc(b.entityIds[0])}" class="cc-entity" data-entity-id="${esc(b.entityIds[0])}" data-entity-ids="${esc(ids)}" data-suite-label="${esc(b.label)}" data-width-basis="${b.widthBasis}">
    <title>${esc(`${b.label === "135" ? "135 section" : "Suite " + b.label} — frontage ${b.widthFt} ft (${b.widthBasis === "derived" ? "derived SF split" : "plat"}) · parapet ${h} ft (CAD BLD_HT)`)}</title>
    <rect class="cc-face${b.widthBasis === "derived" ? " cc-face--derived" : ""}" x="${b.x0Ft}" y="${r2(-h)}" width="${b.widthFt}" height="${h}"/>
    <text class="cc-label" x="${cx}" y="4.2" font-size="2.6" text-anchor="middle">${esc(b.label === "135" ? "135A" : b.label)}</text>
    <text class="cc-muted" x="${cx}" y="7.6" font-size="1.7" text-anchor="middle">${esc(b.widthFt + "′")}</text>
  </g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-labelledby="t d" data-geometry-id="${geom.geometry_id}" data-units="ft">
  <title id="t">${esc(title)}</title>
  <desc id="d">Schematic storefront elevation, 1 unit = 1 ft. Bay widths from recorded-plat demising strings (dashed = derived SF split); heights from CAD BLD_HT annotations. Openings, awnings and signage are not drawn. Draft — not field-verified.</desc>
  <style>${SVG_STYLE}
  </style>
${g}
  <line class="cc-grade" x1="${-pad}" y1="0" x2="${r2(L + pad)}" y2="0"/>
  <g class="cc-dimstring">
    <path class="cc-dim" d="M0 ${r2(-maxH - 5)} H${L} M0 ${r2(-maxH - 6.5)} V${r2(-maxH - 3.5)} M${L} ${r2(-maxH - 6.5)} V${r2(-maxH - 3.5)}"/>
    <text class="cc-muted" x="${r2(L / 2)}" y="${r2(-maxH - 6.5)}" font-size="2" text-anchor="middle">${esc(`Σ bays ${L}′ · recorded length ${geom.recorded_length_ft}′`)}</text>
  </g>
</svg>
`;
}

export function signLayout(pylon) {
  /* Operator schedule: P1 2×8 full width, P2 4×8 full width, then P3–P14 as
     2×4 pairs, odd key left / even key right (same order as tools/pylon.py). */
  const nominal = (size) => size.split("x").map(Number); // "2x8" → [h 2, w 8]
  const cells = []; let y = 0; const pairs = [];
  for (const p of pylon.panels) {
    const [h, w] = nominal(p.size);
    if (w >= 8) { cells.push({ key: p.panel, x: 0, y, w, h, size: p.size }); y += h; }
    else pairs.push({ ...p, h, w });
  }
  for (let i = 0; i < pairs.length; i += 2) {
    const L = pairs[i], R = pairs[i + 1];
    cells.push({ key: L.panel, x: 0, y, w: L.w, h: L.h, size: L.size });
    if (R) cells.push({ key: R.panel, x: L.w, y, w: R.w, h: R.h, size: R.size });
    y += L.h;
  }
  return { cells, width: 8, height: y };
}

export function signSvg(pylon, title) {
  const { cells, width, height } = signLayout(pylon);
  const inset = 0.12;
  const body = cells.map((c) => `  <g id="${panelId(c.key)}" class="cc-entity" data-entity-id="${panelId(c.key)}" data-panel-key="${c.key}">
    <title>${esc(`Panel ${c.key} — nominal ${c.size.replace("x", "′ × ")}′ (operator schedule)`)}</title>
    <rect class="cc-face" x="${r2(c.x + inset)}" y="${r2(c.y + inset)}" width="${r2(c.w - 2 * inset)}" height="${r2(c.h - 2 * inset)}"/>
    <text class="cc-muted" x="${r2(c.x + 0.35)}" y="${r2(c.y + 0.75)}" font-size="0.42">${c.key}</text>
  </g>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -2.5 ${width + 3} ${r2(height + 4.5)}" role="img" aria-labelledby="t d" data-units="ft-nominal">
  <title id="t">${esc(title)}</title>
  <desc id="d">Panel schedule diagram: nominal panel sizes and order from the operator register (src/data/pylon.json). Cabinet, header, posts and gaps are unmeasured and not drawn. Not a sign shop drawing.</desc>
  <style>${SVG_STYLE}
  </style>
  <rect class="cc-frame" x="-0.6" y="-0.6" width="${width + 1.2}" height="${r2(height + 1.2)}"/>
  <text class="cc-muted" x="${width / 2}" y="-1.2" font-size="0.5" text-anchor="middle">CABINET / HEADER / POSTS — NOT MEASURED</text>
${body}
  <text class="cc-muted" x="${width / 2}" y="${r2(height + 1.5)}" font-size="0.34" text-anchor="middle">${esc(pylon.sign.schedule)} · nominal feet</text>
</svg>
`;
}

/* ── operations overlay: SEPARATE layer, bound only by entity ID ──────────── */
const LEASE = { active: "occupied", anchor: "occupied", owner: "owner-occupied", vacant: "vacant" };
export function opsOverlay(unitsPublic, pylon, S) {
  const byUnit = Object.fromEntries(unitsPublic.map((u) => [u.unit, u]));
  const suites = unitsPublic.map((u) => ({
    entity_id: suiteId(u.unit), suite_label: u.unit,
    lease_state: LEASE[u.status] ?? "unknown", source_status: u.status,
    display_name: u.dba || null, use: u.use || null, lease_sf: u.sf ?? null
  }));
  const panels = pylon.panels.map((p) => {
    const tenant = p.unit ? byUnit[p.unit] : null;
    const reads = p.physicalReads || null;
    return {
      entity_id: panelId(p.panel), panel_key: p.panel, suite_entity_id: p.unit ? suiteId(p.unit) : null,
      content_mode: p.unit ? "tenant" : "empty",
      display_name: tenant?.dba ?? null,
      installed_reads: reads,
      state: reads && tenant && reads !== tenant.dba ? "conflict" : (p.unit ? "tenant" : "empty"),
      note: reads && tenant && reads !== tenant.dba ? `Installed panel reads "${reads}"; tenant of record for ${p.unit} is "${tenant.dba}".` : null
    };
  });
  return {
    _comment: "Operations overlay for the preview. Bound to geometry by entity ID only; regenerate from the sources, never edit here.",
    sources: [ref(S.units), ref(S.pylon)], suites, panels
  };
}
