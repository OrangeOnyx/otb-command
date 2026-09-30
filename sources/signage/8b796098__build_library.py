#!/usr/bin/env python3
"""Build the modular prompt library for On The Blvd signage rendering."""
import json, os, re
from pathlib import Path

ROOT = Path("/home/ubuntu/prompt_library")
(ROOT / "tenant_specific").mkdir(parents=True, exist_ok=True)
(ROOT / "deliverable_templates").mkdir(parents=True, exist_ok=True)

def slug(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

# ============================================================
# LAYER 1 — GLOBAL STYLE BASE
# ============================================================
LAYER_1 = """# LAYER 1 — GLOBAL STYLE BASE
# On The Boulevard Shopping Center — Master Architectural Signage Prompt
# Stack order: [LAYER 1] + [LAYER 2 category] + [LAYER 3 scene] + [TENANT-SPECIFIC]

ROLE
Adopt the role of an expert 3D architectural visualization specialist and technical
rendering director with 15+ years of experience producing photorealistic commercial
real estate renderings for institutional property owners. Output must reflect
investor-grade presentation standards with disciplined real-world geometry,
materials, and operational realism.

PROJECT
On The Boulevard Shopping Center — a polished suburban neighborhood retail center.
Two-building parallel layout with central surface parking. NOT L-shaped. JD Bank
outparcel excluded.

SIGN CONSTRUCTION (default building standard)
- Construction type: dimensional channel letters mounted on raceway or flush to
  facade fascia band, set above the storefront bay
- Standard depth: 3"–5" returns
- Default illumination: internally illuminated channel letters; halo-lit (reverse
  channel with LED backlight) for Facade Family A; face-lit (acrylic face with
  internal LED) for Facade Family B and C — overridden by tenant block
- Returns: dark bronze or matte black aluminum, color-matched to storefront frames
- Trim cap: tight, color-matched, no visible fasteners
- Mounting: clean, level, centered in the designated sign band; no exposed wiring,
  conduit, or transformers visible
- Wordmarks and icons must read as fabricated signage — not flat graphics, decals,
  or printed banners

LOGO INTEGRITY (CRITICAL — NON-NEGOTIABLE)
- Use the supplied tenant logo as the single source of truth for color, typography,
  proportion, kerning, and iconography
- Do NOT redraw, restyle, re-letter, simplify, modernize, or "improve" any logo
- Do NOT stretch, skew, pixelate, or distort
- Do NOT hallucinate alternate brand styles, color palettes, or fonts
- Preserve trademark symbols, taglines, and registered marks exactly as supplied
- Icon/symbol elements (paw prints, monograms, crests, etc.) must remain identifiable
  at the rendered scale
- Maintain accurate proportions and centered alignment above the storefront

ARCHITECTURAL STYLE
- Polished suburban neighborhood retail center, upscale-but-restrained
- Facade colors: White = Benjamin Moore OC-19 Seapearl; Tan = Benjamin Moore HC-79
- Front roof edge: gray architectural shingles
- Main roof: white TPO membrane
- Columns: masonry-wrapped
- Storefront frames: dark bronze aluminum
- Glass: clear with subtle reflectivity
- Sidewalks & curbs: light concrete, broom finish
- Continuous covered pedestrian walkway with consistent column rhythm
- End caps slightly emphasized but not exaggerated
- No invented structures or architectural redesign

LIGHTING & REALISM STANDARDS
- Photoreal, physically-based rendering quality
- Crisp but controlled shadows — never harsh, never dramatic
- Subtle ambient bounce under covered walkways
- Material response accurate to substrate (matte EIFS, satin aluminum returns,
  acrylic faces glowing only when illuminated)
- Avoid over-stylized lighting, neon halos, lens flares, or HDR over-processing
- Signage illumination must read as real LED — soft, even, no hotspots

CAMERA & COMPOSITION (default)
- Lens: 45–60mm equivalent, minimal distortion, slight compression
- Controlled verticals — no exaggerated perspective
- Eye-level to slight upward tilt for storefront views
- Signage centered in frame, legible, properly scaled
- Tone: polished, restrained, professional, investor-grade

MONUMENT SIGN
- Reads exactly: "On The Blvd"
- Included in foreground when composition allows

GLOBAL QUALITY CONTROL
- Maintain suburban retail scale and proportion
- Subtle realistic material textures (EIFS, shingles, asphalt, concrete)
- Landscaping slightly enhanced but believable
- No cartoon, illustration, painterly, or stylized output
- No invented tenants, signage, or architectural features
"""
(ROOT / "layer_1_global_style.txt").write_text(LAYER_1)

# ============================================================
# LAYER 2 — TENANT CATEGORY ENHANCEMENT BLOCKS
# ============================================================
LAYER_2 = {
"fitness": """# LAYER 2 — CATEGORY: FITNESS
Energetic, modern, bold. Channel letters with assertive presence.

- Illumination: face-lit channel letters with crisp white or brand-color LED glow;
  high contrast against facade in both day and dusk views
- Color treatment: saturated brand colors fully preserved — typically bold reds,
  oranges, electric blues, or blacks
- Typography: heavy weight, geometric or industrial sans-serif fonts; allow
  oversized presence within the sign band
- Materials: matte black or dark bronze returns; acrylic faces with strong color
  saturation; optional brushed-metal accent plates for icon elements
- Storefront programming hint: glimpses of equipment, mirrored walls, or branded
  interior graphics through clear glass
- Energy cue: clean, athletic, premium-gym aesthetic — never gritty
""",
"restaurant": """# LAYER 2 — CATEGORY: RESTAURANT
Warm, inviting, culinary. Signage reads hospitable and appetizing.

- Illumination: face-lit channel letters with warm-white LED (2700K–3000K); halo-lit
  acceptable for upscale concepts; soft warm wash on facade at dusk
- Color treatment: warm brand palette preserved — creams, terracottas, deep greens,
  burgundies, gold accents
- Typography: brand-accurate — script, slab serif, or hand-lettered marks rendered
  faithfully without simplification
- Materials: returns in dark bronze or color-matched warm tones; optional faux-patina
  or wood-accent backer panel for artisanal concepts
- Storefront programming hint: visible tables, pendant lighting, menu boards, or
  display cases just inside the glass
- Optional: small chalkboard A-frame or planters flanking entry — only if scene calls
  for it
""",
"salon": """# LAYER 2 — CATEGORY: SALON / BEAUTY
Elegant, refined, spa-inspired. Signage reads boutique and feminine-luxury.

- Illumination: halo-lit channel letters preferred for soft, sophisticated glow;
  face-lit acceptable with warm-white LED
- Color treatment: muted, refined brand palette preserved — blush, sage, ivory,
  matte black, rose gold, soft gold
- Typography: elegant serif, modern script, or refined sans — rendered with
  generous letter spacing and delicate weight when brand allows
- Materials: brushed brass, rose gold, or matte black returns; acrylic faces with
  soft diffusion; optional thin metallic outline trim
- Storefront programming hint: styling chairs, marble counters, soft pendant
  lighting visible through glass
- Tone: clean spa aesthetic — never busy, never neon
""",
"boutique": """# LAYER 2 — CATEGORY: BOUTIQUE
Upscale, fashion-forward, refined. Reads as curated specialty retail.

- Illumination: halo-lit channel letters for soft architectural glow (preferred);
  understated brilliance over loud signage
- Color treatment: brand palette preserved exactly — often blush, navy, black,
  ivory, gold, or signature accent color
- Typography: high-end editorial — refined serifs, modern sans, or signature
  script faithful to the supplied logo
- Materials: matte black, dark bronze, or brushed brass returns; clean trim caps;
  optional subtle backer panel in coordinating tone
- Storefront programming hint: curated apparel displays, mannequins, soft interior
  lighting visible through clear glass
- Tone: confident, polished, never flashy — luxury restraint
""",
"financial": """# LAYER 2 — CATEGORY: FINANCIAL
Professional, bold, trustworthy. Signage prioritizes legibility and authority.

- Illumination: face-lit channel letters with clean cool-white LED; even glow,
  zero hotspots
- Color treatment: corporate brand colors preserved exactly — typically navy,
  deep red, forest green, or black with white accent
- Typography: strong, legible sans-serif or institutional serif at full weight;
  no decorative flourishes added
- Materials: dark bronze or black returns; opaque-color acrylic faces with crisp
  trim cap
- Storefront programming hint: minimal — desks, framed signage, branded interior
  visible only as subtle context
- Tone: stable, established, institutional — never trendy
""",
"medical": """# LAYER 2 — CATEGORY: MEDICAL
Clean, trustworthy, professional. Reads calm and clinical without feeling cold.

- Illumination: face-lit channel letters with crisp cool-white LED (3500K–4000K);
  even, soft glow
- Color treatment: brand palette preserved — typically navy, teal, soft blue,
  white, sage green; no over-saturation
- Typography: clean modern sans-serif or refined humanist serif; full legibility
  at distance
- Materials: white, silver, or dark bronze returns; matte or satin finish; never
  glossy
- Storefront programming hint: tasteful interior — reception desk, framed prints,
  warm pendant lighting visible through glass
- Tone: reassuring, professional, calm — never institutional-cold
""",
"services": """# LAYER 2 — CATEGORY: SERVICES
Modern, accessible, clearly branded. Reads as approachable professional service.

- Illumination: face-lit channel letters with clean white LED; balanced day/dusk
  visibility
- Color treatment: brand palette preserved as supplied; clean and unfussy
- Typography: legible sans-serif or modern slab; brand-accurate weight
- Materials: dark bronze or black returns; standard trim cap; acrylic faces in
  brand color
- Storefront programming hint: clean reception area, branded interior signage,
  desk visible through glass
- Tone: friendly, capable, contemporary — never generic
""",
"retail": """# LAYER 2 — CATEGORY: RETAIL (GENERAL)
Versatile, customer-focused, clean. Reads as approachable specialty retail.

- Illumination: per tenant — halo-lit for upscale, face-lit for high-visibility;
  follow facade family default unless tenant block overrides
- Color treatment: brand palette preserved exactly as supplied
- Typography: brand-accurate; rendered with proper kerning and weight
- Materials: dark bronze returns; standard trim cap; acrylic faces or aluminum
  per illumination type
- Storefront programming hint: clean, organized merchandise displays through glass
- Tone: inviting, polished, brand-forward
""",
}
for cat, body in LAYER_2.items():
    (ROOT / f"layer_2_category_{cat}.txt").write_text(body)

# ============================================================
# LAYER 3 — SCENE VARIANT BLOCKS
# ============================================================
LAYER_3 = {
"daytime": """# LAYER 3 — SCENE: DAYTIME
- Time of day: late morning
- Sun elevation: ~45°, color temperature ~5800K
- Bright clear daylight, clear sky, minimal haze
- Crisp but controlled shadows
- Signage illumination OFF or barely visible (ambient only)
- Facade reads true to material colors
- Parking occupancy: 40–50%, natural vehicle mix
""",
"dusk": """# LAYER 3 — SCENE: DUSK / BLUE HOUR
- Time of day: 15–25 minutes after sunset
- Sky: deep cobalt-to-magenta gradient, soft ambient blue light
- Signage FULLY ILLUMINATED — channel letters glowing evenly, halo-lit pieces
  producing a soft architectural backlight on facade
- Storefront interior lighting ON, warm glow spilling onto sidewalk
- Covered walkway downlights active, warm pools on concrete
- Parking lot pole lights on at low intensity, no lens flare
- Color temperature mix: warm interiors against cool sky
- Photoreal, restrained — no over-saturated neon look
- Parking occupancy: 30–40%, some vehicle headlights subtle
""",
"close_up": """# LAYER 3 — SCENE: SIGNAGE CLOSE-UP
- Tight architectural crop on the storefront sign band
- Lens: 70–100mm equivalent, shallow compression
- Frame fills with channel letters, fascia band, and immediately surrounding
  facade material
- Slight 3/4 angle to show letter depth and returns
- Reveal: trim cap, return depth, mounting cleanliness, illumination quality
- Lighting: soft directional daylight OR controlled dusk illumination
- No vehicles, no people in frame
- Use for architectural detail packages and sign permit illustration
""",
"streetscape": """# LAYER 3 — SCENE: STREETSCAPE / WIDE CONTEXT
- Wider context view showing the subject storefront within the full retail row
- Neighboring tenants visible to left and right with accurate signage
- Lens: 35–50mm equivalent
- Includes sidewalk, covered walkway, landscaping, drive aisle, and edge of
  parking field
- Subtle pedestrian and vehicle activity for scale
- Use for redevelopment context, leasing site plans, and tenant-mix storytelling
""",
"inline": """# LAYER 3 — SCENE: INLINE STOREFRONT
- Standard mid-row strip-center storefront position
- Symmetrical bay framing — single tenant centered, partial neighbors at edges
- Eye-level camera, square-on to facade with very slight 5–10° angle for depth
- Storefront bay shows: signage, transom, glass, entry door, sidewalk, column edge
- Lens: 35–50mm equivalent
- Default leasing-photography composition
""",
"corner_suite": """# LAYER 3 — SCENE: CORNER SUITE / END CAP
- Premium end-cap or corner-suite positioning
- Two-sided signage visible (front fascia + return wall) when applicable
- 3/4 angle camera showing both facade planes
- Enhanced architectural prominence — end-cap pilaster, taller parapet hint
- Landscaping wraps the corner — small accent tree or planter cluster
- Lens: 35mm equivalent
- Use for anchor / premium tenant features
""",
}
for v, body in LAYER_3.items():
    (ROOT / f"layer_3_scene_{v}.txt").write_text(body)

# ============================================================
# TENANT-SPECIFIC ENHANCEMENT BLOCKS
# ============================================================
db = json.loads(Path("/home/ubuntu/tenant_database.json").read_text())
tenants = db["tenants"]

# Curated overrides for tenants with distinctive brand signatures.
TENANT_OVERRIDES = {
    "the pink paisley": dict(colors="signature pink, soft blush, with refined black or charcoal accents; paisley motif preserved exactly",
        icon="paisley emblem and script wordmark — render as separate dimensional pieces, paisley as halo-lit reverse channel icon",
        typo="elegant script wordmark with delicate weight and generous letter spacing",
        materials="matte black returns, halo-lit reverse channel with warm-white LED backlight, optional brushed brass accent on icon",
        illum="halo-lit channel letters with warm soft architectural glow; anchor end-cap presence"),
    "painted bayou": dict(colors="muted earthy palette per logo — soft greens, dusty rose, cream",
        icon="brushstroke/artisanal wordmark preserved with hand-lettered character intact",
        typo="hand-lettered or refined script — do NOT clean up irregularities",
        materials="dark bronze returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters, warm boutique glow"),
    "great american cookie": dict(colors="signature brand red, white, and warm brown preserved exactly; trademark cookie graphic intact",
        icon="cookie icon rendered as separate face-lit dimensional piece with internal white LED glowing through warm-tinted acrylic",
        typo="bold red wordmark, slight slab character, fully legible",
        materials="dark bronze returns, face-lit acrylic faces, crisp trim caps",
        illum="face-lit channel letters with warm-white LED; appetizing warm glow"),
    "jc kate boutique": dict(colors="refined navy, blush, or black per supplied logo; gold accent if present",
        icon="monogram preserved exactly",
        typo="elegant serif or modern editorial sans, refined and feminine",
        materials="matte black returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters with soft architectural backlight"),
    "lola pink": dict(colors="signature hot pink and black per supplied logo",
        icon="brand wordmark preserved with playful character intact",
        typo="bold modern sans or branded script — do not generic-ify",
        materials="matte black returns, halo-lit reverse channel, warm-white LED; optional pink accent illumination at dusk",
        illum="halo-lit channel letters; confident boutique glow"),
    "graze acadiana": dict(colors="warm artisanal palette per logo — olive, charcoal, cream, terracotta",
        icon="olive branch / culinary mark preserved as dimensional icon",
        typo="hand-crafted serif or refined script, brand-accurate",
        materials="dark bronze returns, face-lit channel letters with warm-white LED (2700K)",
        illum="face-lit channel letters, warm hospitality glow; optional wood-accent backer band"),
    "the clothing loft": dict(colors="palette per supplied logo, restrained boutique tones",
        icon="wordmark preserved",
        typo="refined editorial sans or serif, brand-accurate",
        materials="matte black or bronze returns, halo-lit reverse channel",
        illum="halo-lit channel letters, soft boutique backlight"),
    "victoria nails": dict(colors="brand palette per logo — typically refined pink, gold, or black",
        icon="any decorative flourish preserved",
        typo="elegant script or refined sans, salon-appropriate",
        materials="dark bronze returns, face-lit acrylic faces, warm-white LED",
        illum="face-lit channel letters with refined soft glow"),
    "oupac": dict(colors="corporate red and navy per supplied logo, preserved exactly",
        icon="institutional mark preserved",
        typo="strong sans-serif, fully legible at distance",
        materials="dark bronze returns, face-lit acrylic faces, clean cool-white LED",
        illum="face-lit channel letters, institutional even glow"),
    "cat clinic of lafayette": dict(colors="calm professional palette — navy or teal with white accents (apply standard veterinary brand tone if no logo supplied)",
        icon="paw or feline silhouette as a clean dimensional icon if brand-appropriate",
        typo="clean modern sans-serif, fully legible, reassuring",
        materials="dark bronze or silver returns, face-lit acrylic faces, cool-white LED (3500K)",
        illum="face-lit channel letters, calm clinical glow"),
    "magnolia salon": dict(colors="soft sage, ivory, blush, or muted gold per logo; spa palette",
        icon="magnolia bloom motif preserved as halo-lit dimensional accent",
        typo="elegant serif or refined script with generous spacing",
        materials="brushed brass or matte black returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters with soft architectural spa glow"),
    "the tux shoppe": dict(colors="black and white or black and silver per logo; formalwear restraint",
        icon="bowtie or formal motif preserved exactly",
        typo="classic serif or refined sans, formal in character",
        materials="matte black returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters, refined understated glow"),
    "jordan amanda": dict(colors="refined boutique palette per logo — typically black, ivory, or rose gold",
        icon="initials/monogram preserved exactly",
        typo="elegant editorial serif or refined script",
        materials="brushed brass or matte black returns, halo-lit reverse channel",
        illum="halo-lit channel letters, jewelry-boutique luxury glow"),
    "hotworx": dict(colors="signature HOTWORX red, black, and white preserved exactly; flame icon brand-accurate",
        icon="flame/HW icon rendered as separate face-lit dimensional piece, internal red LED glow",
        typo="bold geometric sans, full weight, assertive scale",
        materials="matte black returns, face-lit red and white acrylic faces, crisp trim caps",
        illum="face-lit channel letters with strong even LED glow; powerful day and dusk presence — flagship fitness energy"),
    "c wolf barber shop": dict(colors="classic barber palette — black, white, with optional red or chrome accent per logo",
        icon="wolf, razor, or barber-pole motif preserved as dimensional element",
        typo="bold slab serif or classic barber lettering, brand-accurate",
        materials="matte black returns, face-lit acrylic faces, warm-white LED",
        illum="face-lit channel letters, classic barbershop confidence"),
    "belle realty": dict(colors="professional refined palette — navy, charcoal, or signature brand accent",
        icon="brand mark preserved exactly",
        typo="modern serif or refined sans, professional service character",
        materials="dark bronze returns, face-lit acrylic faces, clean cool-white LED",
        illum="face-lit channel letters, calm professional glow; on-site management presence"),
    "greek expressions": dict(colors="brand palette per logo — typically navy, with secondary accent",
        icon="any greek-letter motif preserved exactly",
        typo="bold collegiate or refined serif, brand-accurate",
        materials="matte black or bronze returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters, refined collegiate glow"),
    "fast pass tag & title": dict(colors="brand palette per logo — typically blue, red, or yellow accent for high-visibility service",
        icon="key, road, or auto-service motif preserved exactly",
        typo="bold legible sans-serif, full weight",
        materials="dark bronze returns, face-lit acrylic faces, clean white LED",
        illum="face-lit channel letters, high-visibility service glow"),
    "1st franklin financial": dict(colors="institutional navy and white per supplied logo, preserved exactly",
        icon="institutional mark preserved",
        typo="strong serif or sans-serif, full institutional weight",
        materials="dark bronze returns, face-lit acrylic faces, clean cool-white LED, even glow",
        illum="face-lit channel letters, stable institutional presence"),
    "blvd nutrition": dict(colors="fresh palette — greens, citrus, white per brand; energetic but clean",
        icon="leaf, smoothie, or fitness-nutrition motif preserved if present",
        typo="modern sans-serif, friendly and athletic",
        materials="dark bronze returns, face-lit acrylic faces, crisp white LED",
        illum="face-lit channel letters, fresh energetic glow"),
    "jason's deli": dict(colors="brand red, yellow, and white preserved exactly per Jason's Deli standards",
        icon="brand wordmark and any registered symbols preserved exactly",
        typo="signature Jason's Deli wordmark — script/sans combination per brand standards",
        materials="dark bronze returns, face-lit acrylic faces with warm-white LED",
        illum="face-lit channel letters, appetizing warm glow; end-cap prominence"),
    "mary ellen's": dict(colors="boutique palette per supplied logo",
        icon="brand wordmark preserved exactly",
        typo="elegant script or refined serif per brand",
        materials="matte black returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters, soft boutique architectural glow"),
    "rehabilitation services": dict(colors="medical professional palette — navy, teal, or sage with white",
        icon="medical or motion motif preserved",
        typo="clean humanist sans-serif, reassuring and legible",
        materials="dark bronze or silver returns, face-lit acrylic faces, cool-white LED (3500K–4000K)",
        illum="face-lit channel letters, calm clinical professional glow"),
}

CATEGORY_DEFAULTS = {
    "boutique": dict(colors="brand palette per supplied logo, restrained boutique tones",
        icon="wordmark and any monogram preserved exactly",
        typo="refined editorial serif or modern sans per brand",
        materials="matte black or dark bronze returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters with soft boutique glow"),
    "restaurant": dict(colors="warm brand palette preserved exactly",
        icon="brand mark preserved",
        typo="brand-accurate — script, slab, or serif rendered faithfully",
        materials="dark bronze returns, face-lit acrylic faces, warm-white LED (2700K–3000K)",
        illum="face-lit channel letters with warm hospitality glow"),
    "salon": dict(colors="refined salon palette per logo",
        icon="brand mark preserved",
        typo="elegant serif or refined script, generous spacing",
        materials="brushed brass or matte black returns, halo-lit reverse channel, warm-white LED",
        illum="halo-lit channel letters with refined spa glow"),
    "financial": dict(colors="corporate palette preserved exactly",
        icon="institutional mark preserved",
        typo="strong legible sans or institutional serif",
        materials="dark bronze returns, face-lit acrylic faces, cool-white LED",
        illum="face-lit channel letters, even institutional glow"),
    "medical": dict(colors="calm professional palette per brand",
        icon="brand mark preserved",
        typo="clean humanist sans, fully legible",
        materials="silver or dark bronze returns, face-lit acrylic faces, cool-white LED",
        illum="face-lit channel letters, calm clinical glow"),
    "services": dict(colors="brand palette preserved",
        icon="brand mark preserved",
        typo="legible modern sans per brand",
        materials="dark bronze returns, face-lit acrylic faces, white LED",
        illum="face-lit channel letters, clean professional glow"),
    "retail": dict(colors="brand palette per logo",
        icon="brand mark preserved",
        typo="brand-accurate type",
        materials="dark bronze returns, illumination per facade family default",
        illum="channel letters per facade family default"),
    "fitness": dict(colors="bold brand palette preserved",
        icon="brand mark preserved as dimensional element",
        typo="heavy geometric sans, assertive",
        materials="matte black returns, face-lit acrylic faces, strong LED",
        illum="face-lit channel letters with strong energetic glow"),
}

for t in tenants:
    name = t["tenant_name"]
    if t["category"] == "vacant":
        continue
    key = name.lower()
    o = TENANT_OVERRIDES.get(key) or CATEGORY_DEFAULTS.get(t["category"], CATEGORY_DEFAULTS["retail"])
    body = f"""# TENANT-SPECIFIC ENHANCEMENT — {name}
# Unit {t['unit_number']} | Category: {t['category']} | Facade Family: {t['facade_family']}
# Logo reference: {t.get('logo_file') or 'NOT SUPPLIED — use brand standards from category default'}

BRAND COLOR TREATMENT
- {o['colors']}
- Match supplied logo PMS / hex values exactly; do not shift hue, saturation, or value

LOGO ICON / SYMBOL HANDLING
- {o['icon']}
- All icon elements rendered as discrete dimensional pieces with proper depth and
  trim cap finishing — never as flat printed graphic

TYPOGRAPHY EMPHASIS
- {o['typo']}
- Preserve kerning, weight, and any custom letterforms from the supplied logo

MATERIAL RECOMMENDATIONS
- {o['materials']}
- Returns, trim caps, and mounting hardware finished consistent with adjacent
  tenants on the same facade family ({t['facade_family']})

ILLUMINATION STYLE
- Default: {t.get('illumination_type') or 'per facade family default'}
- {o['illum']}
- Illumination reads soft and even at dusk; barely active in daytime ambient

NOTES
- {t.get('notes') or '—'}
"""
    (ROOT / "tenant_specific" / f"{slug(name)}.txt").write_text(body)

# Vacancy block (special)
(ROOT / "tenant_specific" / "vacant_units.txt").write_text("""# TENANT-SPECIFIC — VACANCY SIGNAGE (Units 131 / 133)
# Combined 3,179 SF available

SIGNAGE CONTENT
- Two lines, centered, clean professional vinyl or temporary panel signage
- Line 1: "3,179 SF"
- Line 2: "AVAILABLE"
- Below or beside lines: leasing contact placeholder (omit if unspecified)

VISUAL TREATMENT
- White or light gray opaque backer panel sized to fill the sign band
- Dark text — charcoal or navy — clean modern sans-serif
- Mounted in the same fascia sign band as adjacent tenants, level and centered
- No illumination required; reads cleanly in daylight
- Storefront glass: vinyl "AVAILABLE" graphic or clean papered interior
- Maintain architectural consistency — no construction debris, no banner sag
""")

# ============================================================
# DELIVERABLE TYPE TEMPLATES
# ============================================================
DELIVERABLES = {
"hero_storefront": ("Hero Storefront (Primary Leasing Showcase)",
    "inline", "daytime",
    """Composition: eye-level storefront-centered hero of the subject tenant within
On The Boulevard Shopping Center. Bright, polished, investor-grade leasing image.
Signage fully legible and brand-accurate. Storefront entry, sidewalk, and partial
covered walkway visible. Slight 5–10° camera angle for depth. Frame the subject
tenant with partial neighbors at edges for context."""),
"dusk_illuminated": ("Dusk Illuminated Variant (Social / Marketing)",
    "inline", "dusk",
    """Composition: same inline storefront framing as the hero, captured at deep
blue hour with full signage illumination. Channel letters glowing evenly, halo-lit
elements producing soft architectural backlight on facade. Warm interior light
spilling onto sidewalk. Cinematic but restrained — suitable for social media,
marketing collateral, and stakeholder leasing decks."""),
"signage_close_up": ("Signage Close-Up (Architectural Detail Package)",
    None, "close_up",
    """Composition: tight architectural crop on the channel-letter signage. Reveals
letter depth, returns, trim cap, mounting, and illumination quality. Slight 3/4
angle. Use for sign permit packages, fabrication review, and architectural detail
decks. Crystal clarity required — no people or vehicles in frame."""),
"context_streetscape": ("Context Streetscape View (Redevelopment Decks)",
    None, "streetscape",
    """Composition: wide context view showing the subject tenant within the full
retail row. Neighboring tenants visible with accurate signage. Covered walkway,
landscaping, drive aisle, and edge of parking field included. Subtle pedestrian
and vehicle activity for scale. Use for redevelopment context, leasing site plans,
tenant-mix storytelling, and ownership decks."""),
}

for fname, (title, default_l2_hint, scene, blurb) in DELIVERABLES.items():
    body = f"""# DELIVERABLE TEMPLATE — {title}
# Full stack: LAYER 1 (Global Style) + LAYER 2 (Category) + LAYER 3 (Scene: {scene}) + TENANT-SPECIFIC

USAGE
Replace {{TENANT_NAME}}, {{CATEGORY}}, and concatenate the four blocks below in order.

DELIVERABLE INTENT
{blurb}

============================================================
[BLOCK 1] LAYER 1 — GLOBAL STYLE
Insert full contents of: prompt_library/layer_1_global_style.txt
============================================================

[BLOCK 2] LAYER 2 — CATEGORY ENHANCEMENT
Insert full contents of: prompt_library/layer_2_category_{{CATEGORY}}.txt
(boutique | restaurant | salon | fitness | financial | medical | services | retail)

============================================================

[BLOCK 3] LAYER 3 — SCENE VARIANT
Insert full contents of: prompt_library/layer_3_scene_{scene}.txt

============================================================

[BLOCK 4] TENANT-SPECIFIC ENHANCEMENT
Insert full contents of: prompt_library/tenant_specific/{{tenant_slug}}.txt

============================================================

FINAL DIRECTIVE
Generate one photorealistic rendering of {{TENANT_NAME}} at On The Boulevard
Shopping Center matching every specification above. Logo integrity is paramount.
Output investor-grade quality.
"""
    (ROOT / "deliverable_templates" / f"{fname}.txt").write_text(body)

# ============================================================
# PROMPT STACKING GUIDE
# ============================================================
GUIDE = """# Prompt Stacking Guide — On The Boulevard Signage Rendering

## The Core Formula

```
FINAL PROMPT = [LAYER 1: GLOBAL STYLE]
             + [LAYER 2: TENANT CATEGORY]
             + [LAYER 3: SCENE VARIANT]
             + [TENANT-SPECIFIC ENHANCEMENT]
```

Always concatenate **in this order**. Layer 1 establishes non-negotiable
architectural rules; later layers refine and never override.

## Layer Responsibilities

| Layer | File pattern | Purpose | Override authority |
|---|---|---|---|
| 1 | `layer_1_global_style.txt` | Project DNA — architecture, materials, logo integrity, camera defaults | Lowest — sets the floor |
| 2 | `layer_2_category_*.txt` | Category personality (fitness energy, boutique restraint, etc.) | Refines Layer 1 within its scope |
| 3 | `layer_3_scene_*.txt` | Lighting, time of day, framing, lens | Overrides Layer 1 camera/lighting defaults |
| Tenant | `tenant_specific/*.txt` | Brand exactness — color, icon, typography, materials, illumination | Highest authority on the specific sign |

## How to Combine Layers — Step by Step

1. **Identify the tenant** → look up `tenant_database.json` for category, facade family, illumination type
2. **Pick the deliverable** → Hero / Dusk / Close-Up / Streetscape
3. **Open the matching deliverable template** in `deliverable_templates/`
4. **Inline the four block files** (copy-paste their contents into the template's BLOCK placeholders)
5. **Replace `{TENANT_NAME}`, `{CATEGORY}`, `{tenant_slug}`**
6. **Submit** to the renderer

## When to Use Each Scene Variant

- **daytime** → default leasing hero, inline storefronts, broker packages
- **dusk** → social media, marketing campaigns, leasing collateral that needs emotion
- **close_up** → sign permit submissions, fabrication review, architectural detail decks
- **streetscape** → redevelopment decks, tenant-mix storytelling, ownership presentations
- **inline** → standard mid-row storefront framing (combine with daytime or dusk)
- **corner_suite** → end-cap or anchor tenants (Pink Paisley, Jason's Deli) — combine with daytime or dusk

You may stack TWO Layer 3 blocks when needed (e.g., `inline` + `dusk`, or `corner_suite` + `daytime`). The composition block (`inline` / `corner_suite`) sets framing; the time-of-day block (`daytime` / `dusk`) sets lighting.

## Customizing for Specific Tenants

Every active tenant has a pre-built file under `tenant_specific/`. The file is named after a slug of the tenant (e.g., `hotworx.txt`, `the_pink_paisley.txt`). Drop it in as Block 4 of the deliverable template.

If a new tenant is added:
1. Add a record to `tenant_database.json`
2. Create `tenant_specific/{slug}.txt` covering: brand color treatment, icon handling, typography, material recommendations, illumination style
3. Use the existing files (`hotworx.txt`, `the_pink_paisley.txt`) as references

## Example — Fully Stacked Prompt (HOTWORX, Dusk Variant)

```
[Paste full contents of layer_1_global_style.txt]

[Paste full contents of layer_2_category_fitness.txt]

[Paste full contents of layer_3_scene_inline.txt]
[Paste full contents of layer_3_scene_dusk.txt]

[Paste full contents of tenant_specific/hotworx.txt]

FINAL DIRECTIVE
Generate one photorealistic rendering of HotWorx at On The Boulevard Shopping
Center matching every specification above. Logo integrity is paramount. Output
investor-grade quality.
```

## Best Practices for Consistency

- **Never edit Layer 1** per-tenant — it is the project bible
- **Logo integrity rules are non-negotiable** — never let a renderer "improve" a wordmark
- **Match facade family illumination defaults** — Family A = halo-lit; Family B/C = face-lit (unless tenant block overrides)
- **Use the same camera lens range** across a deliverable series for visual cohesion
- **Maintain time-of-day continuity** across batched social-media variants
- **Keep monument sign reading "On The Blvd"** whenever it appears in frame
- **Exclude the JD Bank outparcel** in any streetscape composition
- **Validate every prompt** by spot-checking: Are colors brand-accurate? Is the icon intact? Are returns dark bronze? Is illumination soft and even?

## Quick Composition Cheatsheet

| Deliverable | Layer 3 stack |
|---|---|
| Hero Storefront | `inline` + `daytime` |
| Dusk Illuminated | `inline` + `dusk` |
| Signage Close-Up | `close_up` |
| Context Streetscape | `streetscape` + `daytime` (or `dusk`) |
| Anchor Tenant Hero | `corner_suite` + `daytime` |
| Anchor Tenant Dusk | `corner_suite` + `dusk` |
"""
(ROOT / "PROMPT_STACKING_GUIDE.md").write_text(GUIDE)

# ============================================================
# INDEX
# ============================================================
tenant_rows = []
for t in tenants:
    if t["category"] == "vacant":
        continue
    s = slug(t["tenant_name"])
    tenant_rows.append(f"| {t['tenant_name']} | {t['unit_number']} | {t['category']} | {t['facade_family']} | `tenant_specific/{s}.txt` |")

INDEX = f"""# Prompt Library — Index
**Project:** On The Boulevard Shopping Center — Hybrid Tenant Signage Rendering System

## Directory Structure

```
prompt_library/
├── INDEX.md                        ← this file
├── PROMPT_STACKING_GUIDE.md        ← how to combine layers
├── layer_1_global_style.txt        ← master architectural prompt
├── layer_2_category_boutique.txt
├── layer_2_category_restaurant.txt
├── layer_2_category_salon.txt
├── layer_2_category_fitness.txt
├── layer_2_category_financial.txt
├── layer_2_category_medical.txt
├── layer_2_category_services.txt
├── layer_2_category_retail.txt
├── layer_3_scene_daytime.txt
├── layer_3_scene_dusk.txt
├── layer_3_scene_close_up.txt
├── layer_3_scene_streetscape.txt
├── layer_3_scene_inline.txt
├── layer_3_scene_corner_suite.txt
├── deliverable_templates/
│   ├── hero_storefront.txt
│   ├── dusk_illuminated.txt
│   ├── signage_close_up.txt
│   └── context_streetscape.txt
└── tenant_specific/
    ├── <one file per active tenant>
    └── vacant_units.txt
```

## Quick Reference

### Layer 1 — Global Style
One file: **`layer_1_global_style.txt`** — the architectural backbone. Always Block 1.

### Layer 2 — Category Enhancements (8 categories)
- `layer_2_category_fitness.txt` — energetic, modern, bold
- `layer_2_category_restaurant.txt` — warm, inviting, culinary
- `layer_2_category_salon.txt` — elegant, refined, spa-inspired
- `layer_2_category_boutique.txt` — upscale, fashion-forward
- `layer_2_category_financial.txt` — professional, bold, legible
- `layer_2_category_medical.txt` — clean, trustworthy
- `layer_2_category_services.txt` — modern, accessible
- `layer_2_category_retail.txt` — versatile, customer-focused

### Layer 3 — Scene Variants (6 variants)
- `layer_3_scene_daytime.txt`
- `layer_3_scene_dusk.txt`
- `layer_3_scene_close_up.txt`
- `layer_3_scene_streetscape.txt`
- `layer_3_scene_inline.txt`
- `layer_3_scene_corner_suite.txt`

### Deliverable Templates (4 core)
- `deliverable_templates/hero_storefront.txt`
- `deliverable_templates/dusk_illuminated.txt`
- `deliverable_templates/signage_close_up.txt`
- `deliverable_templates/context_streetscape.txt`

## Tenant Cross-Reference

| Tenant | Unit | Category | Facade | Prompt File |
|---|---|---|---|---|
{chr(10).join(tenant_rows)}
| Vacant 131/133 | 131/133 | vacant | B | `tenant_specific/vacant_units.txt` |

## Category Cross-Reference

| Category | Tenants |
|---|---|
| boutique | The Pink Paisley, Painted Bayou, JC Kate Boutique, Lola Pink, The Clothing Loft, Jordan Amanda |
| restaurant | Great American Cookie, Graze Acadiana, Blvd Nutrition, Jason's Deli |
| salon | Victoria Nails, Magnolia Salon, C Wolf Barber Shop |
| fitness | HotWorx |
| financial | Oupac, 1st Franklin Financial |
| medical | Cat Clinic of Lafayette, Rehabilitation Services |
| services | Belle Realty, Fast Pass Tag & Title |
| retail | The Tux Shoppe, Greek Expressions, Mary Ellen's |

## Usage Example — HotWorx Hero Storefront

1. Open `deliverable_templates/hero_storefront.txt`
2. Concatenate, in order:
   - `layer_1_global_style.txt`
   - `layer_2_category_fitness.txt`
   - `layer_3_scene_inline.txt`
   - `layer_3_scene_daytime.txt`
   - `tenant_specific/hotworx.txt`
3. Append the FINAL DIRECTIVE with `{{TENANT_NAME}}` = HotWorx
4. Submit to the image renderer

For full guidance, see **`PROMPT_STACKING_GUIDE.md`**.
"""
(ROOT / "INDEX.md").write_text(INDEX)

print("Library built. File count:")
for p in sorted(ROOT.rglob("*")):
    if p.is_file():
        print(" ", p.relative_to(ROOT))
