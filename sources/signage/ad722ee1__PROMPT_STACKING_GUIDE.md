# Prompt Stacking Guide — On The Boulevard Signage Rendering

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
