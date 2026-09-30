# PROPOSED PATCH — A-5 embedded panel dark mode

**Status:** PROPOSAL ONLY — do **not** apply to production without Adam approval.
**Bug:** When the app is in dark mode (`document.documentElement.dataset.theme = "dark"`, persisted as `localStorage.otb-theme`), the A-5 exterior viewer iframe (`site-twin/index.html?embedded=1`) keeps a light aside/register panel because its CSS hardcodes light tokens on `:root` and never receives the parent theme.

## Root cause (evidence)

1. Host: `src/views/site-exterior.js` loads `site-twin/index.html?embedded=1` in an iframe (same-origin).
2. Viewer: `tools/site-twin/viewer/viewer.js` sets `html.embedded` from the query param but does **not** read parent theme.
3. Styles: `tools/site-twin/viewer/styles.css` (and built `dist-twin/OTB_Site_Twin/styles.css`) define only light `:root` variables (`--paper:#edefe8`, `--surface:#fcfcf9`, `--ink:#1c2b26`, …). The right-hand `aside` / `.panel-section` / `.provenance` / `#list .row` all use those light tokens.
4. Parent dark tokens live in `src/styles.css` under `[data-theme="dark"]` and do not pierce the iframe document.

## Minimal proposed change

### A) `tools/site-twin/viewer/styles.css` — add dark token block

```css
/* Dark theme for standalone or parent-synced embeds (A-5). */
html[data-theme="dark"] {
  --paper: #12151A;
  --surface: #1A1F26;
  --ink: #E8EBE6;
  --muted: #A8B0A4;
  --line: #2C333C;
  --brass: #C4A35A;
  --sel: #E5A045;
  color: var(--ink);
  background: var(--paper);
}
html[data-theme="dark"] button { background: var(--surface); }
html[data-theme="dark"] button:hover { background: #232A31; }
html[data-theme="dark"] #stage { background: #0E1116; }
html[data-theme="dark"] .mk { background: rgba(26,31,38,.92); color: var(--ink); }
html[data-theme="dark"] .mk.sel { background: #3A2E16; }
html[data-theme="dark"] .stage-caption,
html[data-theme="dark"] .tour { background: rgba(26,31,38,.95); }
html[data-theme="dark"] .search input { background: #12151A; color: var(--ink); }
html[data-theme="dark"] .row { border-bottom-color: #2C333C; }
html[data-theme="dark"] .row.on { background: #3A2E16; }
html[data-theme="dark"] .cat[data-state="hi"] { color: #12151A; }
html[data-theme="dark"] .cat[data-state="hi"] .n { color: #2A2416; }
```

Token values mirror parent `src/styles.css` `[data-theme="dark"]` paper/ink/line family (not CRE Terra — stays scoped to `.cc-cre`).

### B) `tools/site-twin/viewer/viewer.js` — sync theme from parent when embedded

Near existing embedded bootstrap:

```js
const embedded = new URLSearchParams(location.search).get('embedded') === '1';
if (embedded) document.documentElement.classList.add('embedded');

function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  if (t === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}
function readParentTheme() {
  try {
    if (embedded && window.parent && window.parent !== window) {
      const t = window.parent.document?.documentElement?.dataset?.theme;
      if (t) return t;
      const ls = window.parent.localStorage?.getItem('otb-theme');
      if (ls) return ls;
    }
  } catch (_) {}
  return localStorage.getItem('otb-theme') || 'light';
}
applyTheme(readParentTheme());
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'otb-theme' && (event.data.theme === 'dark' || event.data.theme === 'light')) {
    applyTheme(event.data.theme);
  }
});
```

### C) `src/main.js` theme toggle — notify open iframes

Where theme is set, also:

```js
document.querySelectorAll('iframe').forEach((frame) => {
  try {
    frame.contentWindow?.postMessage({ type: 'otb-theme', theme: next }, location.origin);
  } catch (_) {}
});
```

### D) Host chrome

`src/views/site-exterior.css` already uses `var(--paper)` / `var(--ink)` — follows parent theme. Defect is inside the iframe document.

## Out of scope

- Do not switch A-5 to CRE Terra tokens in this patch.
- Do not change coordinate frames or asset IDs.

## Validation plan (after approval)

1. Open A-5, toggle dark/light — aside panel/list/search/provenance track theme.
2. Standalone site-twin still defaults light.
3. `otb-site-twin-status` postMessage still works.
4. Keyboard list selection/focus rings visible on dark.
5. Rebuild site-twin artifact only after source change approved.

## Rollback

Revert the three file hunks; rebuild site-twin package; no data migration.

## Approval gate

Explicit Adam approval required before editing production paths listed above.
