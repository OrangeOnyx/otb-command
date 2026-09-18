# B-1 Marketing + /tour microsite — Runbook (2026-09-18)

**Operator picks (Sep 18): 1 · 2 · 3.** A marketing sheet that assembles every piece from the
source of truth on the fly, and a public microsite for the vacant suites that fills in the
moment the Insta360 / LiDAR scans land. Nothing here is hand-kept: rent roll → numbers,
verified logo set → logo walls, photo library → heroes, corridor snapshot → drive times and
the Google rating, hosted one-pager → QR.

## B-1 Marketing (sheet, operator + any owner who has it ticked)

| Block | What it makes | Source |
|---|---|---|
| Availability flyers | one Letter flyer per vacant suite: hero photo, SF, use, drive times, Google rating, neighbors' logos, site plan (or the suite's floor-plan asset if one is filed), leasing QR, "also available / combinable" | `units.public` · assets bucket · `corridor.json` · `logo-thumbs` |
| Center overview | stats strip (GLA · suites · % leased · Google), property hero, full logo wall, drive times, anchor, availability box, QR | same |
| Tenant cards | 1080×1080 co-marketing card per tenant — headline Welcome / Now open / Featured, logo tile (or typeset name), neighbors' logos, address | logo set · roll |
| Photo library | the private `assets` bucket by suite (+ "property" for exteriors / aerials); ★ pins the hero used on the flyer / overview (persists: `marketing` layer → `layer_settings`); upload lands in the same place as the unit drawer's Photos & Plans | assets bucket |
| 360° tour | per vacant suite: upload panoramas + one hero still to the PUBLIC `tour` bucket; **Publish manifest → /tour** rewrites `manifest.json` the microsite reads | `tour` bucket |

Every output opens as its own page with a **Print / Save PDF** button (Chrome → Save as PDF; the
tab title names the file, e.g. `OTB-Flyer-Suite-131`). Rates are never printed — "quoted per
space" — by the same rule the leasing agent follows.

## /tour microsite (public, no sign-in)

`orangeoceanatlas.com/tour` (moves with the F-23 domain decision; the QR at `public/qr/tour.svg`
encodes this URL — regenerate with segno when the domain changes). One section per vacant
suite: 360° viewer (three.js, drag / touch / scroll-zoom, dots to switch views) when panoramas
exist, otherwise the recorded plat + "scan coming"; real SF and use; Call / Text-to-tour
buttons (337-270-7044, pre-filled SMS); combine-with line; stats strip; leasing-package link.
Reads `https://<supabase>/storage/v1/object/public/tour/manifest.json` (public read by RLS).

## Scan → site (Insta360 + LiDAR)

1. Shoot each suite with the Insta360 on a monopod at ~5 ft, 2–4 positions per suite (door,
   center, back, restroom/hall). Export from Insta360 Studio as **equirectangular JPEG, 2:1,
   8K or 6K** (10–25 MB each; the bucket cap is 50 MB). Straight-line "walkthrough" video is
   for the fly-through (B3), not this page.
2. B-1 → 360° tour → Suite 131 → **＋ 360° panorama** (multi-select) and **＋ Hero still**
   (one exterior or best interior frame; used as the pending-state image and later the flyer
   hero if you also drop it in the photo library).
3. **Publish manifest → /tour**. Reload the microsite; each suite now has the viewer. Order =
   upload order.
4. LiDAR: not needed for the page. When the mesh is cleaned, the whole-center fly-through
   (B3) and the A-2 reality layer take it — separate track.

## Migration + deploy

- `20260918150000_tour_bucket.sql` — APPLIED on prod 2026-09-18 via apply_migration (public
  bucket `tour`, 50 MB cap, public select, operator insert/update/delete).
- Vite now builds two entries (`index.html`, `tour.html`); Vercel rewrites `/tour` →
  `/tour.html`. No new serverless function (still 12).

## Not built (deliberate)

- No AI-generated imagery — the center's own photography sells it.
- ~~No public "book a tour" form~~ — built the same evening once the operator moved Vercel
  to **Pro** (the 12-function cap is gone): each suite section ends in a *Request a tour* form
  → `POST /api/tour-lead` (honeypot, same-origin, length caps) → `web_tour_lead` RPC (deals row
  `lead_source='web'` + L-1 note, 40/day cap) → AI-1 manager thread + owner e-mail when mail is
  configured. The call / text buttons stay.
- Tenant cards export as PDF / screenshot; a one-click PNG needs a canvas pass — say the word.
