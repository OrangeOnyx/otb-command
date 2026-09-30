/**
 * Cypress Command — Tailwind preset v2.0
 * Usage (tailwind.config.js):
 *   const cypress = require('./design-system/tailwind.preset.js');
 *   module.exports = { presets: [cypress], content: [...] };
 *
 * Pairs with tokens.css (import it once at the app root) so that
 * `bg-paper` etc. resolve through CSS variables and flip in Night mode.
 * shadcn/ui mapping is at the bottom — drop into globals.css :root.
 */
module.exports = {
  darkMode: ['selector', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        paper:        'var(--cc-paper)',
        'paper-deep': 'var(--cc-paper-deep)',
        ink:          'var(--cc-ink)',
        'ink-soft':   'var(--cc-ink-soft)',
        rule:         'var(--cc-rule)',
        cypress:      'var(--cc-cypress)',
        terra:        'var(--cc-terra)',
        olive:        'var(--cc-olive)',
        mustard:      'var(--cc-mustard)',
        oxblood:      'var(--cc-oxblood)',
        // role aliases
        bg:           'var(--cc-bg)',
        'bg-elev':    'var(--cc-bg-elev)',
        fg:           'var(--cc-fg)',
        'fg-muted':   'var(--cc-fg-muted)',
        border:       'var(--cc-border)',
        accent:       'var(--cc-accent)',
        success:      'var(--cc-success)',
        warning:      'var(--cc-warning)',
        critical:     'var(--cc-critical)',
      },
      fontFamily: {
        display: ['Besley', 'Fraunces', 'Georgia', 'serif'],
        sans:    ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"Courier Prime"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        display: ['56px', { lineHeight: '60px', letterSpacing: '-0.02em', fontWeight: '900' }],
        h1:      ['40px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '900' }],
        h2:      ['28px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3:      ['20px', { lineHeight: '26px', fontWeight: '700' }],
        body:    ['16px', { lineHeight: '24px' }],
        'body-doc': ['17px', { lineHeight: '26px' }],
        small:   ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
        label:   ['11px', { lineHeight: '14px', letterSpacing: '0.10em', fontWeight: '700' }],
      },
      borderRadius: { doc: '2px', ui: '4px', mark: '6px' },
      borderWidth:  { hairline: '1px', plate: '3px' },
      maxWidth:     { cc: '1200px', measure: '70ch' },
      boxShadow:    { none: 'none' }, // shadows are not part of the system
      spacing:      { 18: '72px', 30: '120px' },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.eyebrow': {
          fontFamily: 'Archivo, system-ui, sans-serif', fontWeight: '700', fontSize: '11px',
          lineHeight: '14px', letterSpacing: '0.10em', textTransform: 'uppercase',
          color: 'var(--cc-accent)',
        },
        '.hairline': { borderTop: '1px solid var(--cc-border)' },
        '.plate':    { border: '1px solid var(--cc-border)', borderTop: '3px solid var(--cc-accent)', background: 'var(--cc-bg)' },
      });
    },
  ],
};

/* ---- shadcn/ui variable mapping (paste into globals.css) ----
:root {
  --background: 43 39% 92%;      /* paper  #F4EFE2 */
  --foreground: 38 15% 10%;      /* ink    #1E1B16 */
  --card: 43 39% 92%;
  --card-foreground: 38 15% 10%;
  --popover: 43 39% 92%;
  --popover-foreground: 38 15% 10%;
  --primary: 25 80% 36%;         /* terra  #A44E12 */
  --primary-foreground: 43 39% 92%;
  --secondary: 43 41% 86%;       /* paper-deep #EAE2CD */
  --secondary-foreground: 38 15% 10%;
  --muted: 43 41% 86%;
  --muted-foreground: 35 11% 33%; /* ink-soft #5C554A */
  --accent: 43 41% 86%;
  --accent-foreground: 38 15% 10%;
  --destructive: 9 61% 33%;      /* oxblood #8A2F1F */
  --destructive-foreground: 43 39% 92%;
  --border: 42 23% 72%;          /* rule #C9BFA8 */
  --input: 42 23% 72%;
  --ring: 25 80% 36%;
  --radius: 4px;
}
[data-theme="night"] {
  --background: 36 17% 9%;       /* #1B1813 */
  --foreground: 43 39% 92%;
  --card: 36 17% 9%;
  --card-foreground: 43 39% 92%;
  --popover: 36 17% 9%;
  --popover-foreground: 43 39% 92%;
  --primary: 30 64% 50%;         /* #D2802F */
  --primary-foreground: 36 17% 9%;
  --secondary: 38 17% 13%;       /* #26221B */
  --secondary-foreground: 43 39% 92%;
  --muted: 38 17% 13%;
  --muted-foreground: 39 17% 69%; /* #BEB4A2 */
  --accent: 38 17% 13%;
  --accent-foreground: 43 39% 92%;
  --destructive: 8 52% 59%;      /* #D27363 */
  --destructive-foreground: 36 17% 9%;
  --border: 36 22% 27%;          /* #4E463A */
  --input: 36 22% 27%;
  --ring: 30 64% 50%;
}
------------------------------------------------------------- */
