# Target architecture · CRE Asset Library in OTB Command

Every item below is annotated with one of four markers:
- **[retain]**: stays as it is.
- **[adapter]**: read-only bridge to an existing record.
- **[add]**: new.
- **[proposed]**: needs approval.

Nothing moves. The canonical OTB data stays where the app reads it today.

```text
otb-command/
  src/data/                          [retain] CANONICAL (operator SOT; Tier-1 leases per CLAUDE.md)
    geometry.json                    plat transcription + CAD access: frontages, boundary, parking
    heights.json                     CAD BLD_HT parapet heights
    pylon.json                       panel register (content + panel→unit)
    units.json / units.public.json   tenancy (Tier-1); public subset for client/library overlay
    site-register.json               270 digitized site items          → [proposed] adapter mm-06
  cad/Boulev_CLEAN.dxf                [retain] native CAD (never edited)
  reference/                          [retain] plat crops (native plat PDF: external — scope ledger)
  public/OTB-mesh.glb, OTB-splat.ksplat, twin/*   [retain] twin frame EPSG:6344+NAVD88 (LiDAR governs)
  supabase/ (pa_ physical assets, site_features…) [retain] live; library joins by alias only (mm-07)
  tools/cre-library/                  [add] otb-slice.mjs (pure) + build-otb-slice.mjs (IO)
  test/cre-library-otb-slice.test.mjs [add]
  docs/design/cypress-command/cre-asset-library/   [add] package v1.0.0 (contract home)
    schemas/ tokens/ templates/ integration/ references/   package, unmodified
    audits/2026-09-29-run-01/          this audit
    properties/on-the-boulevard/
      provenance/   6 source records, hash-pinned to exact input bytes
      records/      property · site · 2 buildings · 27 suites · sign · 14 panels · 3 assets
      elevations/   *.geometry.json (derived, ft) + *.svg (schematic, no tenancy)
      signage/      pylon panel-schedule diagram (nominal; not measured)
      preview/      index.html (isolated) · ops-overlay.json · slice-checks.json
```

## Flow

```text
plat (external) ─┐
CAD .dxf ────────┼─► geometry.json / heights.json ─► otb-slice.mjs ─► *.geometry.json ─► *.svg ─┐
                 │   (existing transcription tools)    (deterministic, ft)                        ├─► preview
units.public.json + pylon.json ───────────────────────► ops-overlay.json (bound by entity ID) ────┘
```

## ID spaces

The repo already has three live ID spaces. The library adds a fourth that acts as the join key, and every other space maps to it through an alias.

| Space | Example | Used by | Library mapping |
|---|---|---|---|
| Raw unit | `117.5`, `135A` | A-1 drawer, A-2, B-1, units.json | `suite-otb-117-5` + `existing_operations_refs` |
| Register | `unit-117.5`, `rtu-117.5`, `stall-F-001` | A-1 register, A-5 | proposed: alias table (mm-06) |
| Physical asset | `pa_<uuid>` | A-3 (Supabase) | proposed: `existing_operations_refs` (mm-07) |
| Library | `suite-otb-*`, `panel-otb-johnston-pylon-p*`, `building-otb-*` | library records | — |

The `otb` segment scopes these IDs so that a second property can never collide with them. It also avoids the existing camera IDs, which start with `suite-`.

## Shared vs property-specific

`otb-slice.mjs` is OTB-specific on purpose. It is the adapter, and it holds the property constants. The following parts are property-neutral:

- the schemas
- the tokens
- the SVG style block
- the preview shell

To add a second property, write a sibling adapter with its own source register.

## Brand boundary (open decision, see change-plan)

There are three token systems in the repo:

- The package's `.cc-cre` tokens: Terra/Olive, Besley/Archivo/Courier Prime. These are opt-in and namespaced.
- The approved brand release 04C v1.0.1: Cypress/Moss/Amber, Fraunces/Inter/JetBrains Mono.
- The locked plan-room app shell: paper, ink and brass.

The preview uses the package tokens. None of the three is mapped into the app.
