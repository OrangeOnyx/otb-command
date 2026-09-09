/* Financial figures are fetched only after property authorization. Nothing in
   this module imports, caches, or substitutes a private financial snapshot. */
import { esc } from '../lib/format.js';
import { LOCAL_REVIEW, REMOTE, BUNDLED_PROPERTY, activeSlug, getSession, propertyContext, sb } from '../lib/remote.js';

const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value) : 'Unavailable';
const date = value => {
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value}T12:00:00Z` : value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}) : 'Date unavailable';
};
const month = value => /^\d{4}-\d{2}$/.test(value || '') ? new Date(`${value}-15T12:00:00Z`).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'America/Chicago'}) : 'Period unavailable';

export function recordedAmount(record, empty = 'No entries recorded') {
  return Number.isInteger(record?.count) && record.count > 0 && Number.isFinite(record.amount) ? money(record.amount) : empty;
}

export function atlasSuiteMarkup(report, unitId, sourceButton) {
  const unit = report?.scheduled?.units?.[unitId];
  if (!unit) return '';
  return `<section class="cmd-suite-rent" aria-label="Suite scheduled rent from Atlas"><div><h3>Scheduled monthly rent</h3><strong>${esc(money(unit.monthly))}</strong></div>
    <p>Contractual schedule · ${esc(date(report.scheduled.asOf))}</p>
    ${unit.allocationNote ? `<p class="cmd-rent-allocation">${esc(unit.allocationNote)}</p>` : ''}
    ${sourceButton(unit.sourceId || report.scheduled.sourceId,'Atlas rent-roll source')}
    <p class="cmd-rent-qualification">A dated schedule; current occupancy and payment are unverified.</p></section>`;
}

export function createCommandNumbers({host, account, onChange = () => {}, onSource, onInvalidate = () => {}}) {
  let report = null, period = null, scope = null, generation = 0, loading = false;
  const sourceLink = (id, label = 'View source') => id ? `<button class="cmd-numbers-source" data-atlas-source="${esc(id)}">${esc(label)}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 5H5v14h14v-3M12 4h8v8M10 14 20 4"/></svg></button>` : '';
  const wire = () => host.querySelectorAll('[data-atlas-source]').forEach(button => { button.onclick = () => onSource(button.dataset.atlasSource); });
  function unavailable(message, {retry = false, pending = false} = {}) {
    host.innerHTML = `<div class="cmd-numbers-head"><div><h2 id="cmdNumbersTitle">Numbers from Atlas</h2><p>${esc(message)}</p></div>${retry ? '<button class="cmd-secondary" data-atlas-retry>Try again</button>' : ''}</div>
      <p class="cmd-numbers-state" role="status">${pending ? 'Reading the authorized property report…' : LOCAL_REVIEW ? 'Available after sign-in on the <a href="https://otb.cypresscommand.com/#spatial" target="_blank" rel="noopener noreferrer">hosted property workspace</a>.' : 'Financial figures are shown only when an authorized source is available.'}</p>`;
    host.setAttribute('aria-busy', String(pending));
    const retryButton = host.querySelector('[data-atlas-retry]');
    if (retryButton) retryButton.onclick = load;
  }
  function clear(message = 'Sign in to review the property’s financial records.') {
    generation++;
    report = null; scope = null; loading = false;
    onInvalidate(); unavailable(message); onChange();
  }
  async function currentScope() {
    const session = await getSession();
    if (!session?.user?.id || !session.access_token) throw new Error('Sign in to review the property’s financial records.');
    const ctx = await propertyContext();
    if (ctx.slug !== BUNDLED_PROPERTY || (activeSlug() && activeSlug() !== ctx.slug) || !ctx.org_id || !ctx.property_id) throw new Error('This financial report is available only in the On The Boulevard workspace.');
    return {userId:session.user.id,orgId:ctx.org_id,propertyId:ctx.property_id,token:session.access_token};
  }
  const sameScope = (left, right) => left && right && ['userId','orgId','propertyId'].every(key => left[key] === right[key]);
  async function load() {
    if (LOCAL_REVIEW || !REMOTE) { clear('A private report from the Atlas production records.'); return; }
    if (!['owner','operator'].includes(account?.role)) { clear('An authorized property owner or operator account is required.'); return; }
    if (loading) return;
    const requestGeneration = ++generation;
    report = null; onInvalidate(); onChange(); loading = true;
    unavailable('Loading the dated Atlas production extract.', {pending:true});
    try {
      const requestScope = await currentScope();
      if (generation !== requestGeneration) return;
      scope = requestScope;
      const response = await fetch('/api/atlas-numbers', {headers:{Authorization:`Bearer ${requestScope.token}`},cache:'no-store'});
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Sign in again to read the financial report.' : response.status === 403 ? 'This account does not have access to the property’s financial report.' : `Atlas financial records are unavailable (${response.status}). Try again.`);
      const payload = await response.json();
      const latestScope = await currentScope();
      if (generation !== requestGeneration) return;
      if (!sameScope(requestScope, latestScope) || !sameScope(requestScope, payload.accessScope) || !['owner','operator'].includes(payload.accessScope?.role)) throw new Error('The account or property changed. Reopen this workspace to read its financial report.');
      if (payload.schemaVersion !== 1 || payload.mode !== 'dated-production-extract' || !payload.scheduled || !Array.isArray(payload.periods) || !Array.isArray(payload.sources)) throw new Error('The financial report is incomplete. Try again after its source has been checked.');
      report = payload;
      if (!report.periods.some(row => row.period === period)) period = [...report.periods].sort((a,b) => b.period.localeCompare(a.period))[0]?.period || null;
      render(); onChange();
    } catch (error) {
      if (generation !== requestGeneration) return;
      report = null; scope = null; onInvalidate(); onChange();
      unavailable(error.message, {retry:true});
    } finally { if (generation === requestGeneration) loading = false; }
  }
  function render() {
    if (!report) return;
    const scheduled = report.scheduled, selected = report.periods.find(row => row.period === period);
    const history = report.historical;
    const records = count => `${count || 0} ${count === 1 ? 'entry' : 'entries'} in Atlas`;
    host.setAttribute('aria-busy','false');
    host.innerHTML = `<div class="cmd-numbers-head"><div><h2 id="cmdNumbersTitle">Numbers from Atlas</h2><p>Production records captured ${esc(date(report.capturedAt))}. This is a dated extract.</p></div>
      ${report.periods.length ? `<label class="cmd-numbers-period">Entry month<select aria-label="Atlas entry month">${[...report.periods].sort((a,b) => b.period.localeCompare(a.period)).map(row => `<option value="${esc(row.period)}"${row.period === period ? ' selected' : ''}>${esc(month(row.period))}</option>`).join('')}</select></label>` : ''}</div>
      <dl class="cmd-numbers-grid">
        <div><dt>Scheduled monthly rent</dt><dd>${esc(money(scheduled.monthly))}</dd><dd class="cmd-numbers-context"><p>${esc(date(scheduled.asOf))} adopted rent roll</p>${sourceLink(scheduled.sourceId,'Rent-roll source')}</dd></div>
        <div><dt>Recorded charges</dt><dd class="${selected?.charges?.count > 0 ? '' : 'is-unavailable'}">${esc(recordedAmount(selected?.charges,'No charges recorded'))}</dd><dd class="cmd-numbers-context"><p>${esc(month(period))} · ${records(selected?.charges?.count)}</p>${sourceLink(selected?.charges?.sourceId,'Ledger source')}</dd></div>
        <div><dt>Recorded receipts</dt><dd class="${selected?.payments?.count > 0 ? '' : 'is-unavailable'}">${esc(recordedAmount(selected?.payments,'No receipts recorded'))}</dd><dd class="cmd-numbers-context"><p>${esc(month(period))} · ${selected?.payments?.count > 0 ? records(selected.payments.count) : 'Collection status unknown'}</p>${sourceLink(selected?.payments?.sourceId,'Receipt source')}</dd></div>
        <div><dt>Expenses &amp; NOI</dt><dd class="is-unavailable">Unavailable</dd><dd class="cmd-numbers-context"><p>${report.expenses?.state === 'not-entered' ? 'Operating expenses have not been entered.' : 'Operating-expense inputs have not been verified.'}</p>${sourceLink(report.expenses?.sourceId,'Expense source')}</dd></div>
      </dl>
      <div class="cmd-numbers-foot"><p>Ledger entries are grouped by entry date. Allocation to rent periods, bank settlement and current collections are unverified.</p>
        ${history?.recordCount > 0 ? `<details class="cmd-numbers-history"><summary>Earlier payment records <span>${esc(history.from)}–${esc(history.to)}</span></summary><div><p><strong>${esc(money(history.recordedPaid))}</strong> recorded as paid across ${Number(history.recordCount).toLocaleString('en-US')} historical entries. These are imported historical records, separate from the selected ledger month.</p>${sourceLink(history.sourceId,'Historical payment source')}</div></details>` : ''}
        ${report.caveats?.length ? `<details class="cmd-numbers-notes"><summary>Read the report’s limitations</summary><ul>${report.caveats.map(note => `<li>${esc(note)}</li>`).join('')}</ul></details>` : ''}</div>`;
    host.querySelector('select')?.addEventListener('change', event => { period = event.target.value; render(); host.querySelector('select')?.focus({preventScroll:true}); });
    wire();
  }
  if (REMOTE) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (scope && session?.user?.id !== scope.userId)) clear();
      else if (event === 'USER_UPDATED') { clear('Checking your access to the financial records.'); queueMicrotask(load); }
    });
    window.addEventListener('storage', event => {
      if (event.key === 'otb-active-property') clear('The active property changed. Reopen this workspace to read its financial report.');
    });
    // Returning to the property rechecks authorization and rereads the dated
    // report. It never turns a snapshot into a claim of live financial status.
    window.addEventListener('focus', () => { if (scope && document.visibilityState === 'visible') load(); });
  }
  return {start:load,clear,source:id => report?.sources.find(source => source.id === id),sources:() => report?.sources || [],suiteMarkup:(id,sourceButton) => atlasSuiteMarkup(report,id,sourceButton)};
}
