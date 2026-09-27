# Open the current OTB twin on Windows

The integrated twin is at:

**http://127.0.0.1:5174/?view=twin&layout=interior#spatial**

This opens the interior layout of the current OTB app, including permanent asset records and the site/common-area layers. Port 8770 serves a separate standalone exterior/site viewer with a different model and register; those records are not automatically synchronized with this app. Port 8765 was the earlier column inspector. Use 5174 as the primary workspace.

Choose **Interior floor plans** for the building layout, then use **Level** for Ground floor or the upper floor of Unit 101 or 103. **Exterior & site** restores the site context and canopy within this same app.

## One launcher

Double-click **`tools/open-asset-twin.cmd`** in this checkout. It runs the PowerShell launcher, checks port 5174, starts local review in the background if needed, and opens the URL in the Windows default browser. It resolves the project from its own folder, so the current terminal directory does not matter.

To start the server while keeping the existing Codex browser tab:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\open-asset-twin.ps1 -NoBrowser
```

Then open the URL above in that same browser. The execution-policy argument applies only to this launcher process; it does not change the machine policy.

**Use the same browser and exact `127.0.0.1:5174` origin for existing local records and photos.** The Windows default browser and Codex's in-app browser have separate storage. Opening another browser does not move or erase the original browser's records, but it may show a different local register. Model files alone do not back up browser data.

## What the launcher checks

- Reuses a listener only when its HTTP response is the OTB application shell, including the correct title and spatial app entry. A different program occupying 5174 produces an error; the launcher never kills it or selects another port.
- Uses the existing Node executable on PATH, with Adam's bundled Codex Node runtime as the fallback. Existing project dependencies are required; the launcher does not install anything.
- Runs `tools/dev-review.mjs`, which keeps review mode explicit and listens only on `127.0.0.1:5174`. The Vite runner config loader avoids the parent-directory config-bundling problem in restricted workspaces.
- Waits up to 15 seconds for the OTB response. New server logs go into the Git-ignored `.cache/asset-twin-launcher/` folder. The script prints the log paths, not environment values or configuration secrets.

The background server remains available after the launcher window closes. If the computer restarts, run the launcher again. This is local review; it does not deploy the app, alter `.env`, or sync browser data to hosted records.

## Verification (2026-09-26)

- Confirmed the integrated model contains ground-floor interiors plus separate upper floors for Units 101 and 103.
- Visually checked the Ground floor, Unit 101 upper floor, Unit 103 upper floor, and Exterior & site presets in the existing Codex browser.
- Confirmed exterior navigation persists across a page reload.
- Production build passed; it retains the existing large-chunk advisory.
- Confirmed the launcher starts the local review server and reuses the same server on a second run.
- No asset records, photos, geometry, or standalone-viewer data were migrated or removed by this navigation change.
