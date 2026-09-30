/* Cypress Command — Atoms
 * Icon, Button, Badge, Stat, Divider, Eyebrow, BracketTag,
 * LogoMark, LedgerLine, TerminalPrompt
 *
 * Global-scope styles use `ccAtomStyles` (unique name — never `styles`).
 */

const ccAtomStyles = {
  focusable: {
    transition: 'all 140ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    outline: 'none',
  },
};

// --- Icon (references icons.svg sprite) ---
const Icon = ({ name, size = 20, color, style = {} }) => (
  <svg
    width={size}
    height={size}
    style={{ color: color || 'currentColor', flexShrink: 0, ...style }}
  >
    <use href={`../../assets/icons/icons.svg#i-${name}`} />
  </svg>
);

// --- Eyebrow — the bracketed monospace signature label ---
const Eyebrow = ({ children, color, prefix, style = {} }) => (
  <div
    style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: color || 'var(--cc-amber-500)',
      ...style,
    }}
  >
    {prefix && <span style={{ opacity: 0.6 }}>[{prefix}] </span>}
    {children}
  </div>
);

// --- BracketTag — inline [LEASE-042] token ---
const BracketTag = ({ children, tone = 'muted', style = {} }) => {
  const tones = {
    muted:   'var(--cc-fg-muted)',
    amber:   'var(--cc-amber-500)',
    sage:    'var(--cc-sage)',
    cypress: 'var(--cc-cypress-700)',
    danger:  'var(--cc-danger)',
  };
  return (
    <span
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.85em',
        fontWeight: 500,
        letterSpacing: '0.10em',
        color: tones[tone] || tones.muted,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      [{children}]
    </span>
  );
};

// --- Button ---
const Button = ({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, style = {}, ...rest }) => {
  const sizeMap = {
    sm: { pad: '8px 14px', font: 12, iconGap: 6 },
    md: { pad: '11px 20px', font: 14, iconGap: 8 },
    lg: { pad: '15px 26px', font: 15, iconGap: 10 },
  };
  const s = sizeMap[size];

  const variants = {
    primary: {
      background: 'var(--cc-amber-500)',
      color: '#fff',
      border: '0',
      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.24)',
    },
    cypress: {
      background: 'var(--cc-cypress-700)',
      color: '#fff',
      border: '0',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--cc-cypress-800)',
      border: '1.5px solid var(--cc-cypress-800)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--cc-cypress-700)',
      border: '0',
    },
    dark: {
      background: 'var(--cc-slate)',
      color: '#fff',
      border: '0',
    },
    onDark: {
      background: 'transparent',
      color: '#fff',
      border: '1.5px solid rgba(255,255,255,0.30)',
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.iconGap,
        padding: s.pad,
        borderRadius: 6,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        fontSize: s.font,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        ...ccAtomStyles.focusable,
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.font + 2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.font + 2} />}
    </button>
  );
};

// --- Badge — status pill ---
const BADGE_COLORS = {
  active:    { bg: 'rgba(47,107,78,.12)',   fg: '#2F6B4E' },
  vacant:    { bg: 'rgba(155,62,43,.12)',   fg: '#9B3E2B' },
  renewal:   { bg: 'rgba(217,119,6,.14)',   fg: '#B36104' },
  info:      { bg: 'rgba(30,77,58,.10)',    fg: '#1E4D3A' },
  new:       { bg: 'rgba(217,119,6,.12)',   fg: '#D97706' },
  neutral:   { bg: 'var(--cc-cypress-050)', fg: 'var(--cc-cypress-800)' },
  sage:      { bg: 'rgba(138,166,148,.20)', fg: '#4A5F52' },
  onDark:    { bg: 'rgba(255,255,255,.10)', fg: 'var(--cc-bone-100)' },
};

const Badge = ({ children, tone = 'info', dot = true, mono = true, style = {} }) => {
  const c = BADGE_COLORS[tone] || BADGE_COLORS.info;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 9999,
        background: c.bg,
        color: c.fg,
        fontFamily: mono ? '"JetBrains Mono", monospace' : 'Inter, sans-serif',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg }} />
      )}
      {children}
    </span>
  );
};

// --- Stat — big number w/ meta label + optional delta ---
const Stat = ({ label, value, delta, deltaTone = 'up', size = 'md', mono = false }) => {
  const sizes = { sm: { value: 22, label: 10 }, md: { value: 32, label: 10 }, lg: { value: 48, label: 11 } };
  const s = sizes[size];
  return (
    <div>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: s.label,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--cc-fg-muted)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div
          style={{
            fontFamily: mono ? '"JetBrains Mono", monospace' : 'Fraunces, serif',
            fontSize: s.value,
            fontWeight: mono ? 500 : 700,
            color: 'var(--cc-fg-strong)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontVariationSettings: mono ? undefined : '"SOFT" 20, "opsz" 48',
          }}
        >
          {value}
        </div>
        {delta && (
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: deltaTone === 'up' ? 'var(--cc-cypress-600)' : 'var(--cc-danger)',
            }}
          >
            {deltaTone === 'up' ? '▲' : '▼'} {delta}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Divider ---
const Divider = ({ vertical = false, tone = 'soft', style = {} }) => {
  const c = tone === 'strong' ? 'var(--cc-border-strong)' : tone === 'onDark' ? 'var(--cc-border-on-dark)' : 'var(--cc-border-soft)';
  return vertical ? (
    <div style={{ width: 1, background: c, alignSelf: 'stretch', ...style }} />
  ) : (
    <div style={{ height: 1, background: c, width: '100%', ...style }} />
  );
};

// --- LedgerLine — signature horizontal divider with meta label above ---
const LedgerLine = ({ label, right, style = {} }) => (
  <div style={{ borderTop: '1px solid var(--cc-border-med)', paddingTop: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', ...style }}>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
      {label}
    </span>
    {right && (
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
        {right}
      </span>
    )}
  </div>
);

// --- TerminalPrompt — the `>` prefix for AI agent messages ---
const TerminalPrompt = ({ children, tone = 'sage', style = {} }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: '"JetBrains Mono", monospace', fontSize: 13, lineHeight: 1.6, ...style }}>
    <span style={{ color: 'var(--cc-amber-400)', fontWeight: 600, flexShrink: 0 }}>▸</span>
    <span style={{ color: tone === 'sage' ? 'var(--cc-sage)' : 'var(--cc-bone-100)' }}>{children}</span>
  </div>
);

// --- LogoMark — inline SVG cypress-command monogram (nested rounded-corner C) ---
const LogoMark = ({ size = 32, tone = 'brand', style = {} }) => {
  const bg = tone === 'brand' ? 'var(--cc-cypress-700)' : tone === 'dark' ? 'var(--cc-slate)' : tone === 'light' ? 'transparent' : tone === 'amber' ? 'var(--cc-amber-500)' : 'currentColor';
  const fg = tone === 'light' ? 'var(--cc-cypress-700)' : 'var(--cc-bone-100)';
  const border = tone === 'light' ? '1px solid var(--cc-border-med)' : '0';
  const radius = size > 24 ? size * 0.18 : size * 0.16;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        border,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Rounded-corner nested C — viewbox 100x100 for clean math */}
      <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 100 100" fill="none">
        {/* Outer C: open on the right, rounded top-left + bottom-left corners */}
        <path
          d="M 82 22 L 27 22 Q 18 22 18 31 L 18 69 Q 18 78 27 78 L 82 78"
          stroke={fg}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner C */}
        <path
          d="M 68 40 L 47 40 Q 40 40 40 47 L 40 53 Q 40 60 47 60 L 68 60"
          stroke={fg}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
};

// --- CypressMark — the triangular cypress silhouette (for standard/contour lockups) ---
const CypressMark = ({ size = 32, color, showBase = true, style = {} }) => {
  const c = color || 'var(--cc-cypress-700)';
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ flexShrink: 0, ...style }}>
      <polygon points="30,6 12,50 20,50 16,42 22,42 18,32 24,32 20,22 26,22 22,14 30,4 38,14 34,22 40,22 36,32 42,32 38,42 44,42 40,50 48,50" fill={c}/>
      <rect x="28.5" y="50" width="3" height="6" fill={c}/>
      {showBase && <line x1="10" y1="56" x2="50" y2="56" stroke={c} strokeWidth="1.5"/>}
    </svg>
  );
};

Object.assign(window, {
  Icon, Eyebrow, BracketTag, Button, Badge, Stat, Divider,
  LedgerLine, TerminalPrompt, LogoMark, CypressMark, BADGE_COLORS,
});
