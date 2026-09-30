/* Cypress Command — Sections (marketing site)
 * Hero, PositioningTriangle, HowItWorks, GroveSection, TrustBar, ContactSection, ClosingBanner
 */

// --- Hero — moody cypress + trailing period + bracket meta ---
const renderHeadlineEmphasis = (text, style) => {
  // headlineStyle: 'italic-amber' | 'roman-only' | 'italic-white' | 'amber-all'
  if (style === 'roman-only')   return <span style={{ color: '#fff' }}>{text}<span style={{ color: 'var(--cc-amber-500)' }}>.</span></span>;
  if (style === 'italic-white') return <span style={{ fontStyle: 'italic', color: '#fff', fontVariationSettings: '"SOFT" 60, "opsz" 144' }}>{text}<span style={{ color: 'var(--cc-amber-500)' }}>.</span></span>;
  if (style === 'amber-all')    return <span style={{ color: 'var(--cc-amber-400)' }}>{text}<span style={{ color: 'var(--cc-amber-500)' }}>.</span></span>;
  /* default */                 return <span style={{ color: 'var(--cc-amber-400)', fontStyle: 'italic', fontVariationSettings: '"SOFT" 60, "opsz" 144' }}>{text}<span style={{ color: 'var(--cc-amber-500)' }}>.</span></span>;
};

const Hero = ({ orientation = 'left', showMeta = true, headlineStyle = 'italic-amber' } = {}) => (
  <section style={{
    position: 'relative',
    minHeight: 720,
    background: 'var(--cc-slate)',
    color: '#fff',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    paddingBottom: 80,
  }}>
    <img src="../../assets/photography/cypress_grove_blue_hour.jpg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) brightness(0.72)' }}/>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14, 31, 25, 0.94) 0%, rgba(14, 31, 25, 0.55) 45%, rgba(14, 31, 25, 0.25) 100%)' }}/>

    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', position: 'relative', width: '100%',
      display: 'flex', justifyContent: orientation === 'center' ? 'center' : orientation === 'right' ? 'flex-end' : 'flex-start',
      textAlign: orientation === 'center' ? 'center' : orientation === 'right' ? 'right' : 'left',
    }}>
      <div style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          justifyContent: orientation === 'center' ? 'center' : orientation === 'right' ? 'flex-end' : 'flex-start' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cc-amber-500)', boxShadow: '0 0 12px rgba(217, 119, 6, 0.6)' }}/>
          <Eyebrow style={{ color: 'var(--cc-amber-400)' }}>[01 — POSITIONING]</Eyebrow>
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(56px, 8vw, 108px)',
          fontWeight: 800,
          lineHeight: 0.98,
          letterSpacing: '-0.03em',
          color: '#fff',
          margin: 0,
          fontVariationSettings: '"SOFT" 20, "opsz" 144',
          textWrap: 'balance',
        }}>
          The operating system<br/>
          for real-world<br/>
          {renderHeadlineEmphasis('businesses', headlineStyle)}
        </h1>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 20,
          lineHeight: 1.55,
          color: 'rgba(243, 237, 224, 0.85)',
          maxWidth: 620,
          marginTop: 32,
          marginLeft: orientation === 'center' ? 'auto' : orientation === 'right' ? 'auto' : 0,
          marginRight: orientation === 'center' ? 'auto' : orientation === 'right' ? 0 : 'auto',
          textWrap: 'pretty',
        }}>
          Cypress Command brings order, intelligence, and leverage to property owners and operators — where commercial real estate, AI systems, and legal-grade discipline actually converge.
        </p>

        <div style={{ marginTop: 40, display: 'flex', gap: 14, alignItems: 'center',
          justifyContent: orientation === 'center' ? 'center' : orientation === 'right' ? 'flex-end' : 'flex-start' }}>
          <Button variant="primary" size="lg" iconRight="arrow-up-right">Request access</Button>
          <Button variant="onDark" size="lg">See how it works</Button>
        </div>

        <div style={{ marginTop: 72, display: 'flex', gap: 40, alignItems: 'baseline',
          justifyContent: orientation === 'center' ? 'center' : orientation === 'right' ? 'flex-end' : 'flex-start' }}>
          {[
            { v: '94.2%', l: 'Portfolio occupancy' },
            { v: '$4.2M', l: 'Rent under mgmt' },
            { v: '6', l: 'Properties · Lafayette LA' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-sage)', marginTop: 8 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom edge meta ticker */}
    {showMeta && (
      <div style={{ position: 'absolute', bottom: 16, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(138, 166, 148, 0.6)' }}>
        <span>[CYPRESS COMMAND · v1.0]</span>
        <span>LEDGER UPDATED · 14:32 CT</span>
        <span>GROUND TRUTH. DELIVERED.</span>
      </div>
    )}
  </section>
);

// --- PositioningTriangle — the 3-pillar intersection ---
const PositioningTriangle = ({ layout = 'columns' } = {}) => (
  <section style={{ background: 'var(--cc-bg-page)', padding: '120px 32px', position: 'relative' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ maxWidth: 720, marginBottom: 64 }}>
        <Eyebrow style={{ marginBottom: 16 }}>[02 — INTERSECTION]</Eyebrow>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(38px, 4.5vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          color: 'var(--cc-fg-strong)',
          margin: 0,
        }}>
          We sit where three worlds converge — and we've actually worked in all three<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: layout === 'stacked' ? '1fr' : 'repeat(3, 1fr)', gap: layout === 'stacked' ? 16 : 24 }}>
        {[
          {
            id: '2.1',
            title: 'Physical operations.',
            body: 'Buildings, leases, rent rolls, maintenance orders, tenant relationships. The work you actually do walking a site — codified into a system that never forgets an inspection date.',
            meta: '[REAL ESTATE · CRE]',
          },
          {
            id: '2.2',
            title: 'AI + automation.',
            body: 'Agents that draft leases, reconcile ledgers, chase renewals, and surface exceptions before you hear about them from a tenant. Systems that work overnight so mornings are for decisions.',
            meta: '[MODELS · AGENTS · WORKFLOWS]',
          },
          {
            id: '2.3',
            title: 'Risk + governance.',
            body: 'Legal-grade audit trails. Compliance built into the ledger, not bolted on. Every decision defensible. Every change signed and timestamped. The discipline of counsel, at the pace of software.',
            meta: '[COMPLIANCE · AUDIT · TRUST]',
          },
        ].map((col) => (
          <div key={col.id} style={{ padding: '32px 28px', background: 'var(--cc-bg-elevated)', border: '1px solid var(--cc-border-soft)', borderRadius: 10, position: 'relative' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 42, fontWeight: 500, color: 'var(--cc-amber-500)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 24 }}>
              {col.id}
            </div>
            <h3 style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--cc-fg-strong)',
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}>
              {col.title}
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.6, color: 'var(--cc-fg-primary)', margin: 0, textWrap: 'pretty' }}>
              {col.body}
            </p>
            <div style={{ marginTop: 28, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.16em', color: 'var(--cc-fg-muted)', textTransform: 'uppercase' }}>
              {col.meta}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// --- HowItWorks — a 4-step workflow diagram-ish section ---
const HowItWorks = ({ layout = 'row' } = {}) => (
  <section style={{ background: 'var(--cc-cypress-900)', color: '#fff', padding: '120px 32px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('../../assets/patterns/pattern_tile.svg')", backgroundSize: 220, color: 'var(--cc-sage)', opacity: 0.08, pointerEvents: 'none' }}/>

    <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
      <div style={{ maxWidth: 720, marginBottom: 72 }}>
        <Eyebrow style={{ marginBottom: 16, color: 'var(--cc-amber-400)' }}>[03 — HOW IT WORKS]</Eyebrow>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(38px, 4.5vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          color: '#fff',
          margin: 0,
        }}>
          Ledger in. Command out<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(243,237,224,.72)', lineHeight: 1.55, marginTop: 24, maxWidth: 620 }}>
          Four surfaces. One system of record. Cypress Command reads your ledger, watches your operations, and works on them while you sleep.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: layout === 'grid' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: layout === 'grid' ? 24 : 0, position: 'relative' }}>
        {[
          { step: '01', title: 'Ingest.', body: 'Import leases, rent rolls, work orders. We normalize them into a single ledger — signed, timestamped, defensible.' },
          { step: '02', title: 'Observe.', body: 'Agents watch every property. Occupancy drift, missed inspections, tenant complaints — surfaced before they escalate.' },
          { step: '03', title: 'Draft.', body: 'Renewals, notices, lease amendments drafted by agents. Reviewed by counsel. Signed by you. Filed automatically.' },
          { step: '04', title: 'Report.', body: 'Monthly close in one click. Quarterly investor packet in a morning. Audit trail permanent, immutable, ready.' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '28px 20px 28px 24px', borderLeft: '1px solid rgba(255,255,255,.10)', position: 'relative' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.18em', color: 'var(--cc-amber-400)', marginBottom: 20 }}>
              [{s.step}]
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {s.title}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(243,237,224,.72)', margin: 0, textWrap: 'pretty' }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// --- GroveSection (partner/tenant program) ---
const GroveSection = ({ orientation = 'text-left' } = {}) => (
  <section style={{ background: 'var(--cc-bg-page)', padding: '120px 32px' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: orientation === 'text-right' ? '1fr 1.1fr' : '1.1fr 1fr', gap: 80, alignItems: 'center' }}>
      <div style={{ order: orientation === 'text-right' ? 2 : 1 }}>
        <Eyebrow style={{ marginBottom: 16 }}>[04 — THE GROVE]</Eyebrow>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(38px, 4.5vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          color: 'var(--cc-fg-strong)',
          margin: 0,
        }}>
          A stand of trees, not a shopping list of tenants<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--cc-fg-primary)', marginTop: 24, textWrap: 'pretty' }}>
          The Grove is our operator network — merchants, contractors, counsel, and capital partners who've earned a spot at Cypress Command properties. They get first look at new locations. We get partners who show up.
        </p>
        <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
          <Button variant="cypress" size="md" iconRight="arrow-up-right">Apply to The Grove</Button>
          <Button variant="ghost" size="md">Read charter</Button>
        </div>
      </div>

      <div style={{ background: 'var(--cc-bg-elevated)', border: '1px solid var(--cc-border-soft)', borderRadius: 'var(--cc-r-lg)', padding: 32, order: orientation === 'text-right' ? 1 : 2 }}>
        <LedgerLine label="[GROVE ROSTER · Q3 2026]" right="47 OPERATORS"/>
        {[
          { name: 'Broussard & Bayou Co.', cat: 'Retail — Home Goods', tenure: '4 yr', tone: 'active' },
          { name: 'Latham Provisions', cat: 'F&B — Grocer', tenure: '6 yr', tone: 'active' },
          { name: 'Bayou Legal PLLC', cat: 'Professional Services', tenure: '2 yr', tone: 'active' },
          { name: 'Vermilion Trade Co.', cat: 'Contractor', tenure: '3 yr', tone: 'renewal' },
          { name: 'Acadia Fresh Market', cat: 'F&B — Grocer', tenure: '5 yr', tone: 'active' },
        ].map((op, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '14px 0', borderBottom: i < 4 ? '1px solid var(--cc-border-soft)' : 'none' }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--cc-fg-strong)', letterSpacing: '-0.01em' }}>{op.name}</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)', marginTop: 3 }}>
                {op.cat} · {op.tenure}
              </div>
            </div>
            <Badge tone={op.tone}>{op.tone}</Badge>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// --- TrustBar (governance credentials) ---
const TrustBar = () => (
  <section style={{ background: 'var(--cc-bone-050)', padding: '48px 32px', borderTop: '1px solid var(--cc-border-soft)', borderBottom: '1px solid var(--cc-border-soft)' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 48, alignItems: 'center' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
        [DISCIPLINE]
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {['SOC 2 Type II', 'GDPR Ready', 'SEC Rule 15c3-5', 'LA Bar Referenced', 'AICPA Aligned', 'ISO 27001'].map((c) => (
          <div key={c} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, letterSpacing: '0.14em', color: 'var(--cc-cypress-700)', fontWeight: 500 }}>
            {c}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
        [EST · 2026]
      </div>
    </div>
  </section>
);

// --- ClosingBanner ---
const ClosingBanner = ({ headlineStyle = 'italic-amber' } = {}) => (
  <section style={{ background: 'var(--cc-slate)', color: '#fff', padding: '140px 32px', position: 'relative', overflow: 'hidden' }}>
    <img src="../../assets/photography/aerial_portfolio.jpg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, filter: 'saturate(0.85)' }}/>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14, 31, 25, 0.94), rgba(14, 31, 25, 0.72))' }}/>

    <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
      <Eyebrow style={{ marginBottom: 24, color: 'var(--cc-amber-400)', display: 'block' }}>[05 — SIGN-OFF]</Eyebrow>
      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 'clamp(56px, 8vw, 120px)',
        fontWeight: 800,
        lineHeight: 0.95,
        letterSpacing: '-0.03em',
        color: '#fff',
        margin: 0,
        fontVariationSettings: '"SOFT" 20, "opsz" 144',
      }}>
        Ground truth<span style={{ color: 'var(--cc-amber-500)' }}>.</span><br/>
        {renderHeadlineEmphasis('Delivered', headlineStyle)}
      </h2>
      <div style={{ marginTop: 48, display: 'flex', gap: 14, justifyContent: 'center' }}>
        <Button variant="primary" size="lg" iconRight="arrow-up-right">Request access</Button>
        <Button variant="onDark" size="lg">Book a call</Button>
      </div>
    </div>
  </section>
);

Object.assign(window, {
  Hero, PositioningTriangle, HowItWorks, GroveSection, TrustBar, ClosingBanner,
});
