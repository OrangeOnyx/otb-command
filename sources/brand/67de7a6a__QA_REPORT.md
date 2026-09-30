# Release QA — 1.1.0

- 34 PDF pages regenerated; page bounds passed, edited color/depth pages visually reviewed.
- 86 declared contrast pairs passed.
- 72 browser combinations passed: guide plus eight starters, four viewport widths (320, 390, 768, 1440), both themes. No horizontal page overflow, broken eager images, page errors or failed resources in the final run.
- Theme-aware hex values and successful clipboard copy verified.
- Flat/raised/floating comparison verified against computed shadows after transitions settled.
- Search matches, no-results feedback and reset verified.
- Form validation, busy, success and reset verified. Nothing is submitted or stored.
- Mobile navigation expansion and closure verified.
- JSON/CSS value parity and theme-role parity passed.

Evidence: browser-check.json, tokens/contrast-matrix.csv and layout-check.json. Final ZIP integrity is verified by source/package.py. These checks do not certify whole-product WCAG conformance.
