/* Presentation only. Evidence arrives through the authorized private seed/report;
   this module never imports tenant terms or creates billing/payment entries. */
import { esc } from './format.js';

const money = value => Number.isFinite(value)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  : 'Amount pending';
const day = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Date pending';
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Date pending';
};

export function leaseSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'mail.google.com' &&
      !url.port && !url.username && !url.password && url.pathname.startsWith('/mail/')
      ? url.href : null;
  } catch { return null; }
}

function sourcesMarkup(sources) {
  const rows = Array.isArray(sources) ? sources.filter(source => source && typeof source === 'object') : [];
  if (!rows.length) return '';
  return `<details class="lease-review-sources"><summary>Source records <span>${rows.length}</span></summary><ol>${rows.map(source => {
    const url = leaseSourceUrl(source.url);
    return `<li><strong>${esc(source.title || 'Source record')}</strong>${source.date ? `<time>${esc(day(source.date))}</time>` : ''}
      ${source.reference ? `<p class="lease-review-reference">${esc(source.reference)}</p>` : ''}
      ${source.excerpt ? `<p>${esc(source.excerpt)}</p>` : ''}
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open source email ↗</a>` : ''}</li>`;
  }).join('')}</ol></details>`;
}

export function leaseEvidenceMarkup(evidence, { sourceButton, sourceId } = {}) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) || !evidence.label) return '';
  const tone = evidence.status === 'conflict' ? 'is-conflict' : evidence.status === 'document-reviewed' ? 'is-reviewed' : 'is-pending';
  const planned = evidence.plannedRenewal;
  const phases = Array.isArray(evidence.rentPhases) ? evidence.rentPhases.filter(phase => phase && typeof phase === 'object') : [];
  const payment = evidence.ownerReportedPayment;
  const openItems = Array.isArray(evidence.openItems) ? evidence.openItems.filter(item => typeof item === 'string' && item) : [];
  return `<section class="lease-review ${tone}" aria-label="Lease review">
    <header><h3>Lease review</h3>${evidence.reviewedAt ? `<time>${esc(day(evidence.reviewedAt))}</time>` : ''}</header>
    <p class="lease-review-status">${esc(evidence.label)}</p>
    ${evidence.summary ? `<p class="lease-review-summary">${esc(evidence.summary)}</p>` : ''}
    ${planned ? `<div class="lease-review-renewal"><h4>Proposed renewal</h4><p class="lease-review-amount">${esc(money(planned.monthly))}<span> / month</span></p>
      <p>${esc(planned.scope || 'Renewal terms')}</p><p>${esc(day(planned.start))} – ${esc(day(planned.end))}</p>
      <p class="lease-review-caution">${planned.includedInSchedule === true ? 'Included in the adopted rent schedule.' : 'Not included in the current rent schedule.'}</p></div>` : ''}
    ${phases.length ? `<div class="lease-review-phases"><h4>Rent phases</h4><dl>${phases.map(phase => `<div><dt>${esc(phase.label || 'Rent phase')}<span>${esc(day(phase.start))}${phase.end ? ` – ${esc(day(phase.end))}` : ' onward'}</span></dt><dd>${esc(money(phase.monthly))}<small> / month</small></dd></div>`).join('')}</dl><p>Calendar mapping is attributed to the owner; contractual commencement remains under review.</p></div>` : ''}
    ${payment && Number.isFinite(payment.monthly) ? `<p class="lease-review-payment"><strong>Owner reports ${esc(money(payment.monthly))}/month being paid.</strong> Confirmed ${esc(day(payment.confirmedAt))}.${payment.bankReconciled === true ? '' : ' Bank settlement has not been reconciled.'}</p>` : ''}
    ${openItems.length ? `<details class="lease-review-followup"><summary>Pending items <span>${openItems.length}</span></summary><ul>${openItems.map(item => `<li>${esc(item)}</li>`).join('')}</ul></details>` : ''}
    ${typeof sourceButton === 'function' && sourceId ? sourceButton(sourceId, 'Lease evidence & source records') : sourcesMarkup(evidence.sources)}
  </section>`;
}
