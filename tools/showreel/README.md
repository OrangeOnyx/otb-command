# Motion films: Cypress Command Platform

This folder holds two commercials built entirely in code. Each picture is a canvas renderer and each score is synthesized in numpy (instruments in `synth.py`). Every frame is a pure function of `t`, so the same page plays live in a browser and renders frame-exact to video.

| Film | Page / score | Length | Brief |
|---|---|---|---|
| **A Thousand Promises** | `film.html` / `film_score.py` | 90s | Unconstrained. Chaos, then order, then the mark. Three palettes. |
| Reel v1 | `reel.html` / `score.py` | 48s | Built within the Brand 2.3 motion rules. |

## A Thousand Promises (90s)

A terra square is the protagonist. It appears as the cursor, the stillness, the flood of light, the pointer, every sentence's full stop, and finally the mark's core.

| Time | Act | What happens |
|---|---|---|
| 0–8s | Promises | A block cursor types *"Every property runs on a thousand small promises."* over a ticking clock, and the e-piano plays a minor "question" motif. *promises* shatters. |
| 6–26s | The pile | A 220-fragment 3D flight through leases, calendars, invoices, notes and alerts. Words land on the beat, and an unread counter climbs to 248. The shake, flashes and chromatic split build to a peak. |
| 26–28s | Freeze | Everything stops dead in silence: one square, a heartbeat, *"What if every promise had a place?"* |
| 28–30.5s | The snap | The square floods the frame with light. The 144 nearest fragments lock into a 16×9 wall with a mechanical cascade, over the release into A major. |
| 30.5–45.6s | The place | The cards fly into the 27 suites on the traced plat, and the buildings rise. A one-year day-to-night time-lapse follows: sweeping shadows, traffic, storefronts glowing, and event pins popping and resolving. The music low-passes into night. The camera then dives through one roof. |
| 45.6–64s | One command | The app window opens and a 13-sheet 3D carousel plays a melody. The concierge answers *"What needs my attention this week?"* and the square acts as the cursor, clicking each item onto W-1. Then everything implodes into the square. |
| 64–80s | Manifesto | Six lines, each on a colour field that opens out of the square, which is every line's full stop. Then *"Build AI into how you actually operate"* lands one word per beat. |
| 80–90s | The mark | The square becomes the core. The frame slams home in four pieces on four beats, then the wordmark and the sign-off land. The chord drains away to the opening clock, the core blinks twice like the first cursor, and it cuts to black. |

Palettes (`?palette=`): **terra** (Brand 2.3, terra mark on paper), **bayou** (teal, copper and gold on night) and **signal** (black, chartreuse and cobalt). Each palette is one object in `PALETTES` at the top of `film.html`.

## Run

```bash
pip install numpy imageio-ffmpeg                            # ffmpeg ships inside imageio-ffmpeg
python3 extract-site.py                                      # plan geometry → site.js
python3 film_score.py                                        # → out/film-score.wav
node render.mjs --page film.html --palette bayou --share     # → out/film-bayou.mp4 (+ -share.mp4 under 30 MB)
node stills.mjs --page film.html --palette signal 28.4 83    # spot-check frames → out/still-<t>.png
open film.html                                               # live: click to play · space · ←/→ · ?t=64&palette=terra

python3 score.py && node render.mjs                          # the 48s v1 reel → out/cypress-command-reel.mp4
```

A full 90s render at 1080p60 with 4-subframe motion blur takes about 7 minutes on 4 cores. `site.js` is extracted from `src/data/geometry.json`. It holds the boundary, the remote lot, 27 suite rectangles and 32 stall rows (314 striped stalls). `synth.Mulberry` ports the page's seeded RNG, so audio cues land on the film's random events.

## Brand notes

- **Film vs. product:** both films deliberately exceed the Brand 2.3 product motion rules on durations, particles, loops and flashes. Do not port their timings into the app.
- **Mark:** v1 keeps 2.3's "never animated" rule. *A Thousand Promises* builds the mark on screen at the operator's direction (2026-09-26). The terra palette shows it in terra, the 2.3 cover/byline colour, rather than paper-on-cypress.
- **Public facts only:** the site drawing shows shapes and cleared figures only. There are no tenant names, unit numbers, occupancy or dollar terms. Dashboard data, events and concierge answers are illustrative.
- **Output:** `out/` is git-ignored. Rendered video is disposable, and this folder is the source.
- **Fonts:** Besley, Archivo and Courier Prime (OFL). The licences are in `fonts/`.
