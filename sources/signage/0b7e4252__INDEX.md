# Prompt Library — Index
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
| The Pink Paisley | 101-103 | boutique | A | `tenant_specific/the_pink_paisley.txt` |
| Painted Bayou | 105 | boutique | A | `tenant_specific/painted_bayou.txt` |
| Great American Cookie | 107 | restaurant | B | `tenant_specific/great_american_cookie.txt` |
| JC Kate Boutique | 109 | boutique | A | `tenant_specific/jc_kate_boutique.txt` |
| Lola Pink | 111 | boutique | A | `tenant_specific/lola_pink.txt` |
| Graze Acadiana | 113 | restaurant | B | `tenant_specific/graze_acadiana.txt` |
| The Clothing Loft | 115-117 | boutique | A | `tenant_specific/the_clothing_loft.txt` |
| Victoria Nails | 117 1/2 | salon | C | `tenant_specific/victoria_nails.txt` |
| Oupac | 119 | financial | C | `tenant_specific/oupac.txt` |
| Cat Clinic of Lafayette | 119 1/2 | medical | C | `tenant_specific/cat_clinic_of_lafayette.txt` |
| Magnolia Salon | 121 | salon | A | `tenant_specific/magnolia_salon.txt` |
| The Tux Shoppe | 123 | retail | A | `tenant_specific/the_tux_shoppe.txt` |
| Jordan Amanda | 125-127 | boutique | A | `tenant_specific/jordan_amanda.txt` |
| HotWorx | 129 | fitness | B | `tenant_specific/hotworx.txt` |
| C Wolf Barber Shop | 135A | salon | C | `tenant_specific/c_wolf_barber_shop.txt` |
| Belle Realty | 135B | services | C | `tenant_specific/belle_realty.txt` |
| Greek Expressions | 137 | retail | A | `tenant_specific/greek_expressions.txt` |
| Fast Pass Tag & Title | 139/141 | services | C | `tenant_specific/fast_pass_tag_title.txt` |
| 1st Franklin Financial | 143 | financial | C | `tenant_specific/1st_franklin_financial.txt` |
| Blvd Nutrition | 145 | restaurant | B | `tenant_specific/blvd_nutrition.txt` |
| Jason's Deli | 149 | restaurant | B | `tenant_specific/jason_s_deli.txt` |
| Mary Ellen's | Historic | retail | A | `tenant_specific/mary_ellen_s.txt` |
| Rehabilitation Services | Historic | medical | C | `tenant_specific/rehabilitation_services.txt` |
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
3. Append the FINAL DIRECTIVE with `{TENANT_NAME}` = HotWorx
4. Submit to the image renderer

For full guidance, see **`PROMPT_STACKING_GUIDE.md`**.
