/* Cypress Command — Data
 * Card, StatCard, PropertyCard, LeaseRow, MaintenanceCard,
 * TenantCard, MiniChart, DataTable, AgentCard, TerminalWindow
 *
 * Uses Atoms from window.
 */

const ccDataStyles = {
  card: {
    background: 'var(--cc-bg-elevated)',
    border: '1px solid var(--cc-border-soft)',
    borderRadius: 10,
    boxShadow: '0 2px 6px rgba(14, 31, 25, 0.06)',
  },
};

const Card = ({ children, style = {}, padded = true, dark = false, onClick }) => (
  <div
    onClick={onClick}
    style={{
      ...ccDataStyles.card,
      padding: padded ? 24 : 0,
      background: dark ? 'var(--cc-cypress-900)' : 'var(--cc-bg-elevated)',
      border: dark ? '1px solid rgba(255,255,255,.08)' : ccDataStyles.card.border,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
  >
    {children}
  </div>
);

// --- StatCard ---
const StatCard = ({ label, value, delta, deltaTone = 'up', sparkline, footerLabel, footerValue }) => (
  <Card>
    <Stat label={label} value={value} delta={delta} deltaTone={deltaTone} />
    {sparkline && (
      <div style={{ marginTop: 16, height: 44 }}>{sparkline}</div>
    )}
    {footerLabel && (
      <LedgerLine label={footerLabel} right={footerValue} style={{ marginTop: 20, marginBottom: 0 }} />
    )}
  </Card>
);

// --- MiniChart — inline SVG sparkline in cypress palette ---
const MiniChart = ({ data = [], height = 44, tone = 'cypress', fill = true, width = 240 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 6) - 3]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const stroke = tone === 'amber' ? 'var(--cc-amber-500)' : 'var(--cc-cypress-600)';
  const fillColor = tone === 'amber' ? 'rgba(217,119,6,.14)' : 'rgba(47,107,78,.14)';
  const fillPath = fill ? `${path} L ${width} ${height} L 0 ${height} Z` : null;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fillPath && <path d={fillPath} fill={fillColor} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" />
    </svg>
  );
};

// --- BarChart — vertical bars for cash flow / occupancy ---
const BarChart = ({ data = [], labels = [], height = 140, highlight = -1 }) => {
  const max = Math.max(...data);
  const width = 100 / data.length;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, position: 'relative' }}>
      {data.map((v, i) => {
        const h = (v / max) * 100;
        const isHi = i === highlight;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: '70%',
                height: `${h}%`,
                background: isHi ? 'var(--cc-amber-500)' : 'var(--cc-cypress-600)',
                borderRadius: 2,
                transition: 'height 240ms cubic-bezier(0.22, 0.61, 0.36, 1)',
              }}
            />
            {labels[i] && (
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--cc-fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {labels[i]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- PropertyCard — a portfolio building ---
const PropertyCard = ({ name, address, occupancy, ledger, tone = 'active', imageUrl }) => (
  <Card padded={false} style={{ overflow: 'hidden' }}>
    <div style={{ height: 144, background: 'var(--cc-cypress-800)', position: 'relative', overflow: 'hidden' }}>
      {imageUrl && <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.9)' }}/>}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14, 31, 25, 0.85), transparent 60%)' }}/>
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        <Badge tone={tone === 'active' ? 'onDark' : tone}>{tone === 'active' ? 'Active' : tone}</Badge>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {name}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cc-sage)', marginTop: 4 }}>
          {address}
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>Occupancy</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--cc-cypress-800)', letterSpacing: '-0.02em' }}>{occupancy}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>Ledger MTD</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--cc-cypress-800)', letterSpacing: '-0.02em' }}>{ledger}</div>
      </div>
    </div>
  </Card>
);

// --- LeaseRow — a lease in the pipeline table ---
const LeaseRow = ({ id, tenant, property, sqft, term, rate, status = 'active' }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '90px 1.5fr 1fr 80px 90px 100px 90px', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--cc-border-soft)', alignItems: 'center', fontSize: 13 }}>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.10em', color: 'var(--cc-fg-muted)' }}>[{id}]</span>
    <span style={{ fontWeight: 600, color: 'var(--cc-fg-strong)' }}>{tenant}</span>
    <span style={{ color: 'var(--cc-fg-muted)' }}>{property}</span>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--cc-fg-primary)' }}>{sqft}</span>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--cc-fg-primary)' }}>{term}</span>
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--cc-fg-primary)', fontWeight: 600 }}>{rate}</span>
    <Badge tone={status === 'signed' ? 'active' : status === 'draft' ? 'renewal' : status === 'expired' ? 'vacant' : 'info'} dot={true}>{status}</Badge>
  </div>
);

// --- AgentCard — for the AI console: shows an agent running ---
const AgentCard = ({ name, task, status = 'running', progress, runtime, actions }) => {
  const statusColor = status === 'running' ? 'var(--cc-amber-500)' : status === 'complete' ? 'var(--cc-cypress-500)' : 'var(--cc-fg-muted)';
  return (
    <Card padded={false} style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--cc-cypress-050)', border: '1px solid var(--cc-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="settings" size={18} style={{ color: 'var(--cc-cypress-700)' }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--cc-fg-strong)' }}>{name}</span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: statusColor,
                animation: status === 'running' ? 'ccPulse 1.6s ease-in-out infinite' : 'none',
              }}/>
            </div>
            <div style={{ fontSize: 12, color: 'var(--cc-fg-muted)', lineHeight: 1.4 }}>{task}</div>
          </div>
        </div>
        <Badge tone={status === 'running' ? 'renewal' : status === 'complete' ? 'active' : 'neutral'}>{status}</Badge>
      </div>
      {progress != null && (
        <div style={{ marginTop: 14, height: 3, background: 'var(--cc-cypress-050)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--cc-amber-500)', transition: 'width 240ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}/>
        </div>
      )}
      {(runtime || actions) && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {runtime && (
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.10em', color: 'var(--cc-fg-muted)', textTransform: 'uppercase' }}>
              {runtime}
            </span>
          )}
          {actions}
        </div>
      )}
      <style>{`@keyframes ccPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }`}</style>
    </Card>
  );
};

// --- TerminalWindow — the AI console output stream ---
const TerminalWindow = ({ lines = [], style = {} }) => (
  <div style={{
    background: 'var(--cc-slate)',
    border: '1px solid var(--cc-border-terminal)',
    borderRadius: 10,
    padding: 20,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--cc-sage)',
    ...style,
  }}>
    {lines.map((line, i) => {
      if (line.type === 'prompt') {
        return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <span style={{ color: 'var(--cc-amber-400)' }}>▸</span>
            <span style={{ color: 'var(--cc-bone-100)' }}>{line.text}</span>
          </div>
        );
      }
      if (line.type === 'output') {
        return (
          <div key={i} style={{ marginLeft: 20, color: 'var(--cc-sage)', marginBottom: 2 }}>
            {line.text}
          </div>
        );
      }
      if (line.type === 'meta') {
        return (
          <div key={i} style={{ marginLeft: 20, color: 'rgba(138, 166, 148, 0.55)', fontSize: 11, marginBottom: 8 }}>
            {line.text}
          </div>
        );
      }
      return null;
    })}
  </div>
);

// --- MaintenanceCard ---
const MaintenanceCard = ({ id, title, property, priority = 'medium', status = 'open', due, assignee }) => {
  const priorityColor = priority === 'urgent' ? 'var(--cc-danger)' : priority === 'high' ? 'var(--cc-amber-500)' : 'var(--cc-cypress-500)';
  return (
    <Card padded={false} style={{ padding: 16, borderLeft: `3px solid ${priorityColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <BracketTag tone="muted">{id}</BracketTag>
        <Badge tone={status === 'open' ? 'renewal' : status === 'in-progress' ? 'info' : 'active'}>{status}</Badge>
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--cc-fg-strong)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--cc-fg-muted)' }}>{property}</div>
      <LedgerLine label={`DUE ${due}`} right={assignee} style={{ marginTop: 14, marginBottom: 0 }}/>
    </Card>
  );
};

// --- TenantCard ---
const TenantCard = ({ name, category, unit, sqft, yearsActive, tone = 'active' }) => (
  <Card padded={false} style={{ padding: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--cc-fg-strong)', lineHeight: 1.2, letterSpacing: '-0.015em' }}>{name}</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)', marginTop: 3 }}>{category}</div>
      </div>
      <Badge tone={tone}>{tone}</Badge>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>Unit</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: 'var(--cc-fg-strong)', marginTop: 2 }}>{unit}</div>
      </div>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>Sq Ft</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: 'var(--cc-fg-strong)', marginTop: 2 }}>{sqft}</div>
      </div>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-fg-muted)' }}>Tenure</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: 'var(--cc-fg-strong)', marginTop: 2 }}>{yearsActive}</div>
      </div>
    </div>
  </Card>
);

Object.assign(window, {
  Card, StatCard, MiniChart, BarChart, PropertyCard, LeaseRow,
  AgentCard, TerminalWindow, MaintenanceCard, TenantCard,
});
