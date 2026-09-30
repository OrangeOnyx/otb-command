/* Cypress Command — Property OS Screens
 * DashboardScreen, LeasesScreen, MaintenanceScreen, TenantsScreen,
 * AIConsoleScreen
 */

// --- DashboardScreen ---
const DashboardScreen = () => (
  <div style={{ padding: '28px 32px 60px', background: 'var(--cc-bg-page)', minHeight: '100%' }}>
    {/* Top stat row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
      <StatCard
        label="[PORTFOLIO OCCUPANCY]"
        value="94.2%"
        delta="+0.8 pt"
        deltaTone="up"
        sparkline={<MiniChart data={[88, 89, 91, 90, 92, 93, 94.2]} tone="cypress" />}
        footerLabel="Audited monthly"
        footerValue="↑ vs Q2"
      />
      <StatCard
        label="[MONTHLY LEDGER]"
        value="$342.8K"
        delta="+4.1%"
        deltaTone="up"
        sparkline={<MiniChart data={[298, 305, 312, 318, 326, 330, 342.8]} tone="amber" />}
        footerLabel="Aug 2026"
        footerValue="→ $4.2M ARR"
      />
      <StatCard
        label="[ACTIVE LEASES]"
        value="47"
        delta="+3"
        deltaTone="up"
        sparkline={<MiniChart data={[42, 43, 44, 44, 45, 46, 47]} tone="cypress" />}
        footerLabel="8 renewals due"
        footerValue="Q4 2026"
      />
      <StatCard
        label="[AGENT WORKLOG]"
        value="1,247"
        delta="last 30d"
        deltaTone="up"
        sparkline={<MiniChart data={[820, 950, 1020, 1080, 1150, 1190, 1247]} tone="amber" />}
        footerLabel="Actions taken"
        footerValue="94% audited"
      />
    </div>

    {/* Portfolio properties */}
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>[PORTFOLIO · 6 PROPERTIES]</Eyebrow>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
            Ground truth<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon="plus">Add property</Button>
          <Button variant="secondary" size="sm">Export ledger</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <PropertyCard name="Kaliste Court" address="Lafayette, LA · 68K sq ft" occupancy="94.2%" ledger="$142.3K" tone="active" imageUrl="../../assets/photography/shopping_center_dusk.jpg"/>
        <PropertyCard name="Vermilion Plaza" address="Lafayette, LA · 42K sq ft" occupancy="88.1%" ledger="$88.7K" tone="active" imageUrl="../../assets/photography/aerial_portfolio.jpg"/>
        <PropertyCard name="Bayou Row" address="Broussard, LA · 24K sq ft" occupancy="100%" ledger="$62.4K" tone="active" imageUrl="../../assets/photography/boardroom_dusk.jpg"/>
      </div>
    </div>

    {/* Two-col: cash flow + activity */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <Eyebrow style={{ marginBottom: 6 }}>[LEDGER · TRAILING 12]</Eyebrow>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 800, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
              Rent collected<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['1M','3M','12M','ALL'].map((r, i) => (
              <button key={r} style={{
                padding: '4px 10px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                borderRadius: 4,
                border: '1px solid var(--cc-border-soft)',
                background: r === '12M' ? 'var(--cc-cypress-700)' : 'transparent',
                color: r === '12M' ? '#fff' : 'var(--cc-fg-muted)',
                cursor: 'pointer',
              }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <BarChart
            data={[298, 302, 305, 311, 308, 320, 324, 330, 336, 340, 338, 342.8]}
            labels={['S','O','N','D','J','F','M','A','M','J','J','A']}
            height={180}
            highlight={11}
          />
        </div>
        <LedgerLine label="TOTAL COLLECTED · 12M" right="$3,854,000 · +12.4% YoY" style={{ marginTop: 8, marginBottom: 0 }}/>
      </Card>

      <Card>
        <Eyebrow style={{ marginBottom: 12 }}>[AGENT ACTIVITY · LIVE]</Eyebrow>
        {[
          { time: '14:32', text: 'Drafted renewal notice for Latham Provisions', status: 'complete' },
          { time: '13:18', text: 'Flagged missed inspection · Bayou Row unit 12', status: 'flag' },
          { time: '12:04', text: 'Reconciled ledger · Kaliste Court · $142.3K', status: 'complete' },
          { time: '11:47', text: 'Generated Q3 investor packet · 47 pages', status: 'complete' },
          { time: '10:20', text: 'Filed lease amendment · Broussard & Bayou', status: 'complete' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--cc-border-soft)' : 'none' }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.10em', color: 'var(--cc-fg-muted)', paddingTop: 3, flexShrink: 0, width: 44 }}>
              {row.time}
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', marginTop: 8, flexShrink: 0,
              background: row.status === 'complete' ? 'var(--cc-cypress-500)' : 'var(--cc-amber-500)',
            }}/>
            <span style={{ fontSize: 13, color: 'var(--cc-fg-primary)', lineHeight: 1.4 }}>{row.text}</span>
          </div>
        ))}
      </Card>
    </div>
  </div>
);

// --- LeasesScreen ---
const LeasesScreen = () => (
  <div style={{ padding: '28px 32px 60px', background: 'var(--cc-bg-page)', minHeight: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>[LEASE PIPELINE · 47 ACTIVE]</Eyebrow>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
          Every lease. Every clause<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" icon="lease">Draft with AI</Button>
        <Button variant="primary" size="sm" icon="plus">New lease</Button>
      </div>
    </div>

    <Card padded={false}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1.5fr 1fr 80px 90px 100px 90px', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--cc-border-med)', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>
        <span>ID</span>
        <span>Tenant</span>
        <span>Property</span>
        <span>Sq Ft</span>
        <span>Term</span>
        <span>Rate/mo</span>
        <span>Status</span>
      </div>
      {[
        { id: 'LEASE-042', tenant: 'Latham Provisions', property: 'Kaliste Court · 12A', sqft: '4,200', term: '60 mo', rate: '$14,700', status: 'signed' },
        { id: 'LEASE-041', tenant: 'Broussard & Bayou Co.', property: 'Kaliste Court · 08', sqft: '2,800', term: '36 mo', rate: '$9,240', status: 'signed' },
        { id: 'LEASE-040', tenant: 'Bayou Legal PLLC', property: 'Vermilion Plaza · 04', sqft: '1,600', term: '24 mo', rate: '$5,280', status: 'draft' },
        { id: 'LEASE-039', tenant: 'Vermilion Trade Co.', property: 'Kaliste Court · 15', sqft: '3,400', term: '48 mo', rate: '$11,900', status: 'signed' },
        { id: 'LEASE-038', tenant: 'Acadia Fresh Market', property: 'Bayou Row · 01', sqft: '8,200', term: '120 mo', rate: '$28,700', status: 'signed' },
        { id: 'LEASE-037', tenant: 'Delta Home Goods', property: 'Vermilion Plaza · 09', sqft: '1,200', term: '12 mo', rate: '$4,080', status: 'expired' },
        { id: 'LEASE-036', tenant: 'Coteau Coffee Co.', property: 'Kaliste Court · 03', sqft: '900', term: '36 mo', rate: '$3,150', status: 'signed' },
      ].map((l) => <LeaseRow key={l.id} {...l} />)}
    </Card>
  </div>
);

// --- MaintenanceScreen ---
const MaintenanceScreen = () => (
  <div style={{ padding: '28px 32px 60px', background: 'var(--cc-bg-page)', minHeight: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>[WORK ORDERS · 3 OPEN]</Eyebrow>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
          The list of what's broken<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
      </div>
      <Button variant="primary" size="sm" icon="plus">New work order</Button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <MaintenanceCard id="WO-2081" title="HVAC compressor down" property="Kaliste Court · Unit 12A" priority="urgent" status="in-progress" due="Today · 17:00" assignee="Vermilion Trade"/>
      <MaintenanceCard id="WO-2080" title="Parking lot repaving Ph.1" property="Kaliste Court · West lot" priority="medium" status="open" due="Sep 8" assignee="Boudreaux Paving"/>
      <MaintenanceCard id="WO-2079" title="Signage refresh · storefront" property="Vermilion Plaza · Unit 04" priority="high" status="open" due="Sep 5" assignee="Cypress Signs"/>
      <MaintenanceCard id="WO-2078" title="Roof inspection Q3" property="Bayou Row · Full building" priority="medium" status="complete" due="Aug 28" assignee="Acadia Roof Co."/>
      <MaintenanceCard id="WO-2077" title="Pest control · quarterly" property="All properties" priority="medium" status="complete" due="Aug 25" assignee="Gulf Pest"/>
      <MaintenanceCard id="WO-2076" title="Water heater replacement" property="Kaliste Court · Unit 03" priority="high" status="complete" due="Aug 22" assignee="Vermilion Trade"/>
    </div>
  </div>
);

// --- TenantsScreen ---
const TenantsScreen = () => (
  <div style={{ padding: '28px 32px 60px', background: 'var(--cc-bg-page)', minHeight: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>[TENANT ROSTER · 47 ACTIVE]</Eyebrow>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
          The people who show up<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
        </h2>
      </div>
      <Button variant="primary" size="sm" icon="plus">Add tenant</Button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <TenantCard name="Latham Provisions" category="F&B · GROCER" unit="12A" sqft="4,200" yearsActive="6 YR"/>
      <TenantCard name="Broussard & Bayou Co." category="RETAIL · HOME GOODS" unit="08" sqft="2,800" yearsActive="4 YR"/>
      <TenantCard name="Bayou Legal PLLC" category="PROFESSIONAL SVC" unit="04" sqft="1,600" yearsActive="2 YR" tone="renewal"/>
      <TenantCard name="Vermilion Trade Co." category="CONTRACTOR" unit="15" sqft="3,400" yearsActive="3 YR"/>
      <TenantCard name="Acadia Fresh Market" category="F&B · GROCER" unit="01" sqft="8,200" yearsActive="5 YR"/>
      <TenantCard name="Coteau Coffee Co." category="F&B · CAFE" unit="03" sqft="900" yearsActive="1 YR" tone="new"/>
    </div>
  </div>
);

// --- AIConsoleScreen — the star surface ---
const AIConsoleScreen = () => {
  const terminalLines = [
    { type: 'prompt', text: 'Reconcile Kaliste Court ledger for August 2026.' },
    { type: 'output', text: 'Reading rent roll · 21 tenants · $142,340 expected.' },
    { type: 'output', text: 'Cross-referencing bank feed · Cypress Federal ·••7742.' },
    { type: 'output', text: 'Matched 20 of 21 payments. 1 flagged.' },
    { type: 'meta',   text: '  ▸ Delta Home Goods · $4,080 · 3 days late · sending notice.' },
    { type: 'output', text: 'Draft late-notice · 30-day cure period · queued for review.' },
    { type: 'prompt', text: 'Show me every lease expiring in Q4 2026.' },
    { type: 'output', text: '3 leases · $8,520/mo combined · 7,300 sqft.' },
    { type: 'meta',   text: '  ▸ Coteau Coffee Co. · Dec 15 · unit 03 · 900 sqft · $3,150' },
    { type: 'meta',   text: '  ▸ Bayou Legal PLLC · Nov 30 · unit 04 · 1,600 sqft · $5,280' },
    { type: 'meta',   text: '  ▸ Delta Home Goods · Oct 22 · unit 09 · 1,200 sqft · $4,080' },
    { type: 'output', text: 'Renewal probability model: 92% / 78% / 34%.' },
    { type: 'output', text: 'Recommend: retention outreach on Delta Home Goods.' },
  ];

  return (
    <div style={{ padding: '28px 32px 60px', background: 'var(--cc-bg-page)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>[AI CONSOLE · 4 AGENTS · BETA]</Eyebrow>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cc-fg-strong)', letterSpacing: '-0.02em' }}>
            Command surface<span style={{ color: 'var(--cc-amber-500)' }}>.</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm">Audit log</Button>
          <Button variant="primary" size="sm" icon="plus">New agent</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Terminal */}
        <div>
          <TerminalWindow lines={terminalLines}/>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', padding: '12px 16px', background: 'var(--cc-bg-elevated)', border: '1px solid var(--cc-border-soft)', borderRadius: 8 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--cc-amber-500)', fontWeight: 600 }}>▸</span>
            <input placeholder="Ask an agent — 'draft renewal for Latham', 'reconcile Q3', 'find high-risk leases'…"
              style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontSize: 13, fontFamily: '"JetBrains Mono", monospace', color: 'var(--cc-fg-primary)' }}/>
            <kbd style={{ padding: '2px 6px', background: 'var(--cc-bg-surface)', border: '1px solid var(--cc-border-soft)', borderRadius: 4, fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: 'var(--cc-fg-muted)' }}>↵</kbd>
          </div>
        </div>

        {/* Agent roster */}
        <div>
          <Eyebrow style={{ marginBottom: 12 }}>[AGENT ROSTER]</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AgentCard
              name="Ledger.reconcile"
              task="Reconciling Kaliste Court · August · 20/21 matched"
              status="running"
              progress={82}
              runtime="[02:14 RUNTIME]"
              actions={<Button variant="ghost" size="sm">View</Button>}
            />
            <AgentCard
              name="Lease.renewal"
              task="Drafting renewal notice · Latham Provisions · 60mo"
              status="complete"
              progress={100}
              runtime="[COMPLETED · 14:32 CT]"
              actions={<Button variant="ghost" size="sm">Review draft</Button>}
            />
            <AgentCard
              name="Ops.watcher"
              task="Monitoring 6 properties · flagging exceptions"
              status="running"
              progress={100}
              runtime="[ALWAYS-ON · 47D UPTIME]"
            />
            <AgentCard
              name="Compliance.audit"
              task="Q3 audit packet generation queued"
              status="queued"
              runtime="[STARTS 22:00 CT]"
              actions={<Button variant="ghost" size="sm">Configure</Button>}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DashboardScreen, LeasesScreen, MaintenanceScreen, TenantsScreen, AIConsoleScreen });
