# Opt-in visual tokens

These exact values are implementation defaults, with source/extension boundaries in `visual-tokens.json`. They do not install globally. Apply `.cc-cre` to an isolated preview root and `data-cc-theme="dark"` on that same root for dark mode. Map the variables to the existing component system before any production use.

Body text uses text/surface. Action, success, watch and stop values are intended as text/icon accents on theme surfaces; action buttons use action-text/action-fill. The light watch text token uses an accessible darker alias (#7D5F0A); the mustard primitive (#8F6D0C) is retained without changing its meaning. Rules are decorative only and must not be the sole boundary of an essential control. Sign treatments use their explicit fill/text pairs in either theme; artwork materials are not automatically inverted. Status must also be conveyed in text. Test rendered hover/focus/disabled/selected combinations; the contrast check covers only declared pairs.

Logo is a content mode and has no fixed fill token. No fonts, font loaders or third-party tenant artwork are bundled. Exact spacing and font fallbacks are implementation extensions.
