# On The Boulevard — site twin

A portable 3D model and inspector of the whole On The Boulevard site. It is built from the **A-1 site register** in Cypress Command Platform, so every object in the model carries the same asset ID as the A-1 register. That makes the ID the shared key for the plan, this model, and any future work orders, photos or sensors.

## Open the viewer

1. Extract the complete ZIP into a folder.
2. Double-click **Start Viewer.cmd**. This needs Python 3.
3. Open **http://127.0.0.1:8770** and keep the server window open.

You can also run `python server.py --port 8770` from this folder. The server listens only on this computer. The viewer needs no sign-in, install or internet connection. Opening `index.html` directly may fail, because browsers block local model loading.

## Use it

- **Categories** are grouped as on A-1: Site · Parking · Walkway · Utilities · Systems · No source yet. Click a category to cycle it through **hidden → shown → highlighted**.
- Brass means a highlighted category and amber means the current selection. Neither color indicates condition.
- **Pick an object** by clicking it in the model or choosing it from the list. Selecting a parking zone or a meter cluster also highlights its members.
- **Search** covers labels, IDs, meter numbers, LUS structure IDs, statuses and suites.
- **Isolate** leaves only highlighted categories, your selection and the parcel ground.
- **Views:**
  - **Overview** orbits the site.
  - **Plan** is a top-down view matching A-1, with Marie Antoinette at the top.
  - **Walkway** is eye level along columns 1→39. Use ← → to step between columns, drag to look, and WASD to move. Free movement has no collision checks.
- **Presentation / Record** switches between the marketing palette and the plan-room palette.

## Files

| File | Use |
| --- | --- |
| `model.glb` | glTF 2.0 model in metres, Y up. Its node tree is group → category → asset, and each asset's glTF `extras` carry `assetId`, `category`, `label`, `status` and `source`. Columns also carry `codexAssetId`, the Sep 23 column-twin ID. |
| `twin-data.json` | Every register asset, with each modeled asset's position and each data-only row's reason. Also holds the categories, the walkway tour, the plat transform, the true-north rotation and the decisions used. |
| `site-register.csv` | The A-1 register as a spreadsheet, in plan-px coordinates. |
| `twin-report.json` | GLB validation, counts per category, omissions and limits. |
| `index.html`, `viewer.js`, `styles.css`, `vendor/` | The offline viewer, with three.js bundled under its MIT license. |

## Accuracy

Positions come from the recorded plat and the architect CAD, plus operator sheets digitized onto the plan: to about 3 ft, or about 9 ft for the LUS utility captures. Nothing is surveyed or field verified.

- Building heights are the CAD parapet associations, not ceiling heights.
- The canopy height (10 ft eave, 14 ft top) and one rooftop unit per suite are **presentation** values.
- LUS mains are drawn 1.2 m below grade. That depth is not verified.
- Per-suite records (electrical panels, electric meters, time clocks) are listed as data and not drawn. Seven categories have no source on file yet.

Rebuild from the Cypress Command repository:

```
npm run site-twin -- --check
```
