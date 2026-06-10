# Paste this as your first message in Claude Code

Read CLAUDE.md, then baseline/OTB_Command_v7.html in full.

Execute Phase 1 (modularize) end-to-end without relitigating any decision in CLAUDE.md:

1. Scaffold a Vite vanilla-JS app in this repo (npm init + vite). Keep it dependency-light.
2. Extract all unit data, compliance fields/states, and site-plan geometry from the
   baseline into /src/data/units.json, compliance.json, geometry.json. Geometry must be
   data, not code — every rect, street band, lot, liquor line, notch, and label position.
3. Split rendering into /src/views/{dashboard,plan,rentroll,compliance,dates}.js and
   /src/lib/{format,colors,svg}.js. Pixel-faithful to the baseline — same plan-room
   design system, same output.
4. Wire Phase 2 persistence: compliance cycling, notes edits, and any future mutations
   write through a single store module backed by localStorage, with JSON export/import
   buttons in the top bar.
5. Quality gates: npm run build passes; open dev server and verify all 5 sheets render
   identically to baseline; list any intentional deviations.

Deliver: a working `npm run dev`, a diff summary vs baseline, and a forced-ranked list
of what Phase 3 (plat-exact geometry from reference/) should trace first.
