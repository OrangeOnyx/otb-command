/* Cypress Command — Chrome
 * Sidebar, TopBar, MarketingHeader, MarketingFooter
 *
 * Uses Atoms (Icon, Eyebrow, LogoMark, Badge, BracketTag) from window.
 */

const NAV_SECTIONS = [
  {
    label: 'Portfolio',
    items: [
      { id: 'dashboard',  icon: 'chart',    label: 'Dashboard' },
      { id: 'properties', icon: 'building', label: 'Properties', count: 6 },
      { id: 'ledger',     icon: 'dollar',   label: 'Rent Roll' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'leases',      icon: 'lease',    label: 'Leases',      count: 8 },
      { id: 'maintenance', icon: 'settings', label: 'Maintenance', count: 3 },
      { id: 'tenants',     icon: 'tenant',   label: 'Tenants' },
    ],
  },
  {
    label: 'Command',
    items: [
      { id: 'console', icon: 'chart',    label: 'AI Console', badge: 'BETA' },
      { id: 'agents',  icon: 'settings', label: 'Agents',    count: 4 },
      { id: 'audit',   icon: 'lease',    label: 'Audit Log' },
    ],
  },
];

const Sidebar = ({ current, onNavigate }) => (
  <aside
    style={{
      width: 244,
      background: 'var(--cc-cypress-900)',
      color: 'var(--cc-bone-100)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,.06)',
      position: 'relative',
      flexShrink: 0,
    }}
  >
    {/* Pattern texture */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('../../assets/patterns/pattern_tile.svg')",
        backgroundSize: 180,
        color: 'var(--cc-sage)',
        opacity: 0.04,
        pointerEvents: 'none',
      }}
    />

    {/* Brand lockup */}
    <div style={{ padding: '20px 22px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
      <LogoMark size={30} tone="amber" />
      <div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em' }}>
          Cypress Command
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cc-sage)', marginTop: 5 }}>
          [PROPERTY OS]
        </div>
      </div>
    </div>

    {/* Property switcher */}
    <div
      style={{
        margin: '0 12px 20px',
        padding: '10px 12px',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: 'var(--cc-amber-500)',
          color: '#fff',
          fontFamily: 'Fraunces, serif',
          fontWeight: 800,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        KC
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cc-cypress-400)', boxShadow: '0 0 0 2px rgba(107,160,126,.20)', flexShrink: 0 }} title="Healthy"/>
          Kaliste Court
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }}>
          Lafayette, LA · 94.2%
        </div>
      </div>
      <Icon name="arrow-up-right" size={12} style={{ color: 'rgba(255,255,255,.4)' }} />
    </div>

    {/* Nav */}
    <nav style={{ flex: 1, padding: '0 12px', position: 'relative', overflowY: 'auto' }}>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.35)',
              padding: '4px 10px 8px',
            }}
          >
            {section.label}
          </div>
          {section.items.map((item) => {
            const active = current === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  background: active ? 'rgba(217,119,6,.14)' : 'transparent',
                  color: active ? '#fff' : 'rgba(243,237,224,.75)',
                  borderLeft: active ? '2px solid var(--cc-amber-500)' : '2px solid transparent',
                  paddingLeft: active ? 8 : 10,
                  transition: 'all 120ms',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon name={item.icon} size={16} style={{ color: active ? 'var(--cc-amber-400)' : 'inherit' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count != null && (
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 9999, background: active ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)', color: active ? '#fff' : 'rgba(255,255,255,.65)', minWidth: 18, textAlign: 'center' }}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', padding: '2px 5px', borderRadius: 3, background: 'var(--cc-amber-500)', color: '#fff' }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>

    {/* Footer */}
    <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cc-bone-100)', color: 'var(--cc-cypress-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontWeight: 800, fontSize: 12 }}>
          AA
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Adam Abdalla</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }}>Operator</div>
        </div>
        <Icon name="settings" size={14} style={{ color: 'rgba(255,255,255,.5)' }} />
      </div>
    </div>
  </aside>
);

const TopBar = ({ title, subtitle, meta, actions }) => (
  <header
    style={{
      padding: '18px 32px',
      background: 'var(--cc-bg-elevated)',
      borderBottom: '1px solid var(--cc-border-soft)',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
    }}
  >
    <div style={{ flex: 1 }}>
      {subtitle && <Eyebrow style={{ marginBottom: 4 }}>{subtitle}</Eyebrow>}
      <h1
        style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--cc-fg-strong)',
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          fontVariationSettings: '"SOFT" 20, "opsz" 48',
        }}
      >
        {title}
      </h1>
      {meta && (
        <div style={{ marginTop: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
          {meta}
        </div>
      )}
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: 'var(--cc-bg-surface)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 8,
        width: 320,
      }}
    >
      <Icon name="search" size={16} style={{ color: 'var(--cc-fg-muted)' }} />
      <input
        placeholder="Search leases, tenants, cases…"
        style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--cc-fg-primary)' }}
      />
      <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid var(--cc-border-soft)', borderRadius: 4, fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: 'var(--cc-fg-muted)' }}>
        ⌘K
      </kbd>
    </div>

    <button style={{ width: 40, height: 40, border: '1px solid var(--cc-border-soft)', borderRadius: 8, background: 'var(--cc-bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Icon name="bell" size={18} style={{ color: 'var(--cc-fg-primary)' }} />
      <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, background: 'var(--cc-amber-500)', borderRadius: '50%', border: '2px solid #fff' }} title="3 pending"/>
    </button>

    {actions}
  </header>
);

// --- MarketingHeader (public site) ---
const MarketingHeader = ({ current = 'home', onNav, dark = false }) => {
  const bg = dark ? 'rgba(14, 31, 25, 0.72)' : 'rgba(243, 237, 224, 0.86)';
  const border = dark ? 'rgba(255,255,255,.06)' : 'rgba(30, 77, 58, 0.10)';
  const fg = dark ? '#fff' : 'var(--cc-cypress-800)';
  const links = [
    { id: 'home', label: 'Home' },
    { id: 'how', label: 'How it works' },
    { id: 'grove', label: 'The Grove' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: bg,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onNav && onNav('home')}>
          <LogoMark size={28} tone={dark ? 'amber' : 'brand'} />
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 800, color: fg, letterSpacing: '-0.015em' }}>
            Cypress Command<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', gap: 28 }}>
          {links.map((l) => (
            <a key={l.id} onClick={() => onNav && onNav(l.id)} style={{
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: current === l.id ? 'var(--cc-amber-500)' : (dark ? 'rgba(255,255,255,.72)' : 'var(--cc-cypress-800)'),
              textDecoration: 'none',
              padding: '4px 0',
              borderBottom: current === l.id ? '1.5px solid var(--cc-amber-500)' : '1.5px solid transparent',
            }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a style={{ cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: dark ? 'rgba(255,255,255,.72)' : 'var(--cc-cypress-800)' }}>Log in</a>
          <Button variant="primary" size="sm" iconRight="arrow-up-right">Request access</Button>
        </div>
      </div>
    </header>
  );
};

// --- MarketingFooter ---
const MarketingFooter = () => (
  <footer style={{ background: 'var(--cc-slate)', color: 'var(--cc-bone-100)', padding: '80px 32px 40px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('../../assets/patterns/pattern_tile.svg')", backgroundSize: 160, color: 'var(--cc-sage)', opacity: 0.06, pointerEvents: 'none' }}/>
    <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 60 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <LogoMark size={32} tone="amber" />
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.015em' }}>
              Cypress Command<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
            </div>
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, lineHeight: 1.4, color: 'var(--cc-bone-100)', maxWidth: 380, fontStyle: 'italic' }}>
            "Ground truth. Delivered."
          </div>
          <div style={{ marginTop: 20, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cc-sage)' }}>
            [LAFAYETTE, LA · EST 2026]
          </div>
        </div>

        {[
          { title: 'Platform', links: ['Property OS', 'AI Console', 'Ledger', 'Audit Log'] },
          { title: 'Company', links: ['About', 'The Grove', 'Careers', 'Contact'] },
          { title: 'Discipline', links: ['Security', 'Compliance', 'Trust', 'Terms'] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cc-amber-400)', marginBottom: 16 }}>
              [{col.title}]
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((l) => (
                <a key={l} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(243,237,224,.72)', textDecoration: 'none', cursor: 'pointer' }}>{l}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.10)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,224,.5)' }}>
          © 2026 Cypress Command · All rights reserved · SOC 2 Type II
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,224,.5)', textDecoration: 'none', cursor: 'pointer' }}>Privacy</a>
          <a style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,224,.5)', textDecoration: 'none', cursor: 'pointer' }}>Terms</a>
          <a style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,224,.5)', textDecoration: 'none', cursor: 'pointer' }}>Status</a>
        </div>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Sidebar, TopBar, MarketingHeader, MarketingFooter, NAV_SECTIONS });
