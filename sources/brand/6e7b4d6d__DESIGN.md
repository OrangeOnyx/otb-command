# Cypress Command design system

Live as of 25 September 2026. This is the system on the site, not the earlier four-ink kit.

## Color marks state, never category

| Ink | Role | Day | Night |
|---|---|---|---|
| Olive | Stable | #49573C | #9AA989 |
| Cypress | Platform | #1C4E46 | #86B8AE |
| Mustard | In motion | #8F6D0C | #CFA032 |
| Terra | Action | #A44E12 | #D2802F |
| Oxblood | Review | #8A2F1F | #C96455 |
| Slate | Structure | #3C4C54 | #A3B3B8 |

Paper is the ground: day #F4EFE2, night #181813. Ink is #1E1B16 by day and paper by night.

Each ink has a solid, a surface, a text, and an on-color. Do not put a surface on the same solid. Frame a key with paper so an olive cell does not melt into an olive band.

## Type

- Display: Besley 600
- Sans: Archivo
- Mono: Courier Prime

## Shape and elevation

- Chips and buttons: 2px corners
- Plates: 4px corners
- Two steps only: raised, then floating
- Action shadows are terra-tinted

## Night

Set `data-theme="night"` on `html`. Tokens live as `--cc-*` on `:root` and `html[data-theme="night"]`. Tailwind v4 strips `--color-*` declared outside `@theme`, so `@theme` maps `--color-*` to `var(--cc-*)`.

## Files

- `tokens.json` — roles, day, night
- `tokens.css` — the CSS variables and theme map
- `brand/` — lockups and marks
