# OTB historical architectural plan review

Reviewed 2026-09-25 for the Cypress Command Platform OTB digital twin. This is a bounded visual source review, not an as-built verification or an electrical/plumbing assessment.

## Sources actually inspected

The five sheets below were opened as full-page raster renders, rotated for reading, and visually inspected. All are single-page PDFs; page references mean PDF page 1. Selected site and electrical service details were also viewed as crops. The original PDFs were not changed.

Cached source directory:

`C:/Users/adam/Documents/Codex/2026-09-23/ca/work/infrastructure-intake/103/June 14, 1993 - 93-003/`

The drawings identify Gossen Architects, project 93-003, tenant improvements for Brother's at On-The-Boulevard. The folder supplies the June 14, 1993 issue date; title blocks support June 1993. Do not treat PDF creation metadata (December 17, 2021, iOS Notes scan) as a drawing revision or inspection date. The `103` folder is a source filing association, not a fresh registration of every depicted wall or device to today's Unit 103.

| Sheet / page | Directly visible content | Useful twin application | Confidence and limits |
| --- | --- | --- | --- |
| A1.1 / 1, site plan and stair details | Existing shopping-center building and parking are labeled. Parking rows and end islands, the existing bank, and Johnston, Arnould and Marie Antoinette streets are drawn. Hatching distinguishes existing tenant space and tenant expansion space. Stair plan/section and demolition/framing detail occupy the other half of the sheet. | Historical site-layout reference; compare former tenant extent and stair arrangement with later plans. | High confidence in the labels and broad arrangement. This is an old, partial schematic site view, not a current parking inventory, land-cover survey or legal boundary source. No water-shutoff locations were established from it. |
| E1 / 1, Lighting Plan First Floor | Symbol and fixture schedules, first-floor room/light layouts, an exterior row of downlights, decorative post fixture and sign annotations. A note identifies existing downlights to remain, be relamped and wired to Timer #2 for all-night operation, typical of five fixtures. The decorative post fixture is to be relamped and wired to Timer #1; sign wiring also references Timer #1. | A concrete historical lead for a lighting/time-clock survey: distinguish storefront/downlight, decorative post and sign circuits when documenting present equipment. | High confidence in the visible notes. The five-fixture note is a 1993 design scope, not today's installed count. No modern time-clock record, column ID or circuit has been matched to Timer #1 or #2. |
| E2 / 1, Lighting Plan Second Floor | Storage, offices, stairs, mezzanine sales area, mezzanine edge and sales area below are labeled; lighting is drawn both around and over the opening. | Additional historical corroboration of a mezzanine/open-to-below arrangement; a reference for comparing upper-floor partitions and lighting. | High confidence in the labeled arrangement. It does not establish current fixture inventory, ceiling height, floor elevation or today's room uses. |
| E3 / 1, Power Plan First Floor | Existing and new panel schedules, a service/panel cluster at the rear of the depicted tenancy, receptacle changes, and electrical notes. One service note explicitly says an existing meter is to be abandoned and removed. | Locate the service area for a present-day photographic survey and compare panel labels; retain the demolition/change history as evidence. | High confidence in the meter-removal instruction. This is electrical scope. Do not map that symbol to a current water meter or to a workbook electric-meter ID. It supplies no current meter serial number or verified device identity. |
| E4 / 1, Power Plan Second Floor | Offices/storage, stairs, mezzanine sales area/opening, junction-box annotations, and a roof AHU note are visible. | Historical leads for checking upper-floor power, ceiling junction boxes, and mechanical service documentation. | High confidence in the drawing content. No present AHU model, capacity, position, circuit assignment or operating condition is established. |

The lighting and power sheets describe proposed work as well as existing elements. An instruction to retain, replace, relocate or remove an item is not evidence that the work was completed.

## Earlier review and remaining scope

The existing [upper-floor implementation record](asset-twin-upper-floors.md) documents prior visual review of A2.3 (mezzanine plan), A5.1 (section), the combined `101 103/project.pdf`, and the supplied first/second-floor PNGs. That review informed the partial upper footprint at 101, the central opening at 103 and the decision not to turn the historical guardrail into an invented full-height wall. Those source interpretations remain provisional; this pass did not remeasure the earlier sheets.

A2.1, A2.2, A7.1, A7.2 and the other combined/scanned PDFs were not newly visually reviewed in this pass. The existence of cached files or empty text-extraction outputs does not mean their contents were reviewed. The original G: drive was unavailable during this review, so no claim is made that the cached set contains every plan in the supplied Drive folder.

## Parking, grass and common-area modeling decision

Add site surfaces using the newer existing CAD/plat-derived geometry already documented in [the site-access inventory](site-access-inventory-2026-09.md): parking and access lanes, covered walks, frontage planting strips/islands and rear service areas. The 1993 A1.1 sheet is useful comparison evidence; it should not displace that later geometry or become the basis for today's stall count.

Rendered grass/paving provides context for source-map water groups and future located assets. It does not verify an individual shutoff position, underground pipe route, served unit, legal common-area designation, ownership or easement boundary. No historical electrical device was added as a present physical asset by this review.

## Capture checks worth doing next

1. Photograph each grass/service-area water group with one wide context image and one readable device/serial-label image. Record distance to two durable visible features, the source-map group and observer/date. Confirm served units separately; neither imagery nor these architectural sheets proves service connections.
2. At the storefront area depicted on E1, photograph downlights, decorative post fixtures, signage and accessible timer labels. Record what remains before proposing any Timer #1/#2 match. Historical switching intent is not today's timer setting.
3. Photograph the rear electrical service area shown on E3, including meter numbers and panel labels, without opening energized equipment. Reconcile present IDs to the workbook individually; preserve the 1993 removal note as history.
4. Compare the upper-floor opening, stair and office arrangement with current photographs. Measure floor-to-floor and guard heights before replacing the twin's provisional vertical values.

## Exact source fingerprints

| File | SHA-256 |
| --- | --- |
| A1.1.pdf | `d8b969766b6088d98ff6d422a0ebc0604eca65037141ad954baf39b6b451351c` |
| E1.pdf | `ee0c3d04f1cd4564961e27acd20ea42a620a2a65870be05b19bfc11c8923ab41` |
| E2.pdf | `9341ce261b0990006cbcb9d50d94fd2ce1b74443e035b40213cd2cf326867992` |
| E3.pdf | `e44f58686edbe1a80ac773f63da4ba5e4a3d9848df9fa970c46a1b626aace04c` |
| E4.pdf | `5d874a0f2b9bf2dba85d5cfd3a824d306b3aa157221925493b16b34881baf7e0` |

Review renders/crops are local intermediates under `C:/Users/adam/Documents/Codex/2026-09-23/ca/tmp/pdfs/historical-plan-review/`; original plans remain private source material and were not published to the app by this audit.
