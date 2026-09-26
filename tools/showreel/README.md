# Motion reel: Cypress Command Platform

A 48-second, 1920×1080 60p commercial built entirely in code. The picture is a canvas renderer (`reel.html`) and the score is synthesized in numpy (`score.py`). Every frame is a pure function of `t`, so the same file plays live in a browser and renders frame-exact to video.

| Time | Sheet | What happens |
|---|---|---|
| 0–6s | A-1 | A survey crosshair walks the recorded boundary. Suites ink in, then the stall rows stamp. |
| 6–14s | D-1 | An odometer counts up to 62,883 SF. Four ink panels push in (27 suites · 2 buildings · 4.84 ac · 13 sheets), then collapse into the footer stripe. |
| 14–22s | A-2 | The plat tilts into an isometric model. Suites extrude, and a colour wave and ground pulses run on the beat. The suite inspector card expands to fill the frame. |
| 22–30s | D-1…AI-1 | Six live plates: KPIs, calendar, compliance checks, a kanban, a maintenance Gantt and the concierge typing. The camera then dives into AI-1. |
| 30–38s | — | Eight beat-cut words, each with its own entrance. Then "Systems under control. / Results that last." |
| 38–48s | — | End card on cypress: construction guides, then the static mark, the lockup, the tagline and the footer stripe. |

## Run

```bash
pip install numpy imageio-ffmpeg           # ffmpeg ships inside imageio-ffmpeg
python3 extract-site.py                     # plan geometry → site.js
python3 score.py                            # → out/score.wav
node render.mjs                             # → out/cypress-command-reel.mp4 (4 workers, 4-subframe motion blur)
node stills.mjs 3 16.5 25                   # spot-check frames → out/still-<t>.png
open reel.html                              # live preview: click to play, space pauses, ←/→ scrub (?t=22 starts at 22s)
```

`site.js` is extracted from `src/data/geometry.json` by `python3 extract-site.py`. It holds the boundary, the remote lot, the 27 suite rectangles and 32 stall rows, which total 314 striped stalls. Re-run the script whenever the geometry revs.

## Brand notes

- **Palette and type:** Brand Standards 2.3. The operator is re-evaluating colours, and every colour is a token in the `C` object at the top of `reel.html`.
- **Mark:** the 2.3 mark is never animated. Construction guides draw around it, and the mark then cuts in whole on the impact at 38.5s.
- **Public facts only:** the drawing uses shapes and cleared figures only. There are no tenant names, unit numbers, occupancy or dollar terms. Plate data (bars, calendar, work orders) is illustrative.
- **Motion:** this piece deliberately goes beyond the product-UI motion rules (durations, no particles/loops), because it is a film and not interface. Do not port its timings into the app.
- **Output:** `out/` is git-ignored. Rendered video is a disposable artifact, and this folder is the source.
- **Fonts:** Besley, Archivo and Courier Prime (OFL). The licences are in `fonts/`.
