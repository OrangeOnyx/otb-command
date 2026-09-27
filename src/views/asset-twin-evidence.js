import { esc } from '../lib/format.js';
import { PHYSICAL_ASSET_EVIDENCE_DATE_MEANINGS } from '../lib/physical-asset-evidence-model.js';

const kinds = { source: 'Source link', 'dated-view': 'Dated reference view', 'verification-note': 'Verification note' };
const statuses = { reference: 'Reference only', 'needs-verification': 'Needs verification', 'field-observation': 'Recorded field observation' };
export function evidenceLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function evidenceSectionHTML(asset, entries, pending, writable) {
  return `<section class="at-record-section at-evidence" id="atEvidenceBlock" aria-label="${esc(asset.label)} references and verification">
    <div class="at-panel-head"><h3>References & verification</h3><span class="at-evidence-count">${entries.length} saved</span></div>
    <p class="at-muted">Saved on this permanent asset ID. References and research notes stay with the record when its name or model changes.</p>
    ${pending.length ? `<p class="at-warning">${pending.length} research references available to attach. ${writable ? 'Attach them to retain a dated copy on this record.' : 'An operator can attach them to this record.'}</p><button class="at-full" data-evidence-action="attach" ${!writable ? 'disabled' : ''}>Attach research references</button>` : ''}
    <div class="at-evidence-list">${entries.length ? entries.map(entry => {
      const href = evidenceLink(entry.url);
      const sourceDate = entry.sourceDateLabel || (entry.sourceDate ? `${PHYSICAL_ASSET_EVIDENCE_DATE_MEANINGS[entry.dateMeaning] || 'Source date'}: ${entry.sourceDate}` : 'Source date unknown');
      return `<article class="at-evidence-card" data-evidence-id="${esc(entry.id)}">
        <div class="at-evidence-meta"><span>${esc(kinds[entry.kind] || 'Evidence')}</span><span class="at-evidence-status ${entry.status === 'needs-verification' ? 'needs-review' : ''}">${esc(statuses[entry.status] || 'Reference only')}</span></div>
        <h4>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(entry.title)} ↗</a>` : esc(entry.title)}</h4>
        <p class="at-evidence-date">${esc(sourceDate)} · Reviewed ${esc(entry.reviewedAt || 'date not recorded')}</p>
        <p class="at-evidence-scope">${entry.scope === 'site-context' ? 'Site context · does not locate this individual asset' : 'This asset'}${entry.provider ? ` · ${esc(entry.provider)}` : ''}</p>
        ${entry.notes ? `<details ${entry.kind === 'verification-note' ? 'open' : ''}><summary>${entry.kind === 'verification-note' ? 'Verification follow-up' : 'Source note & limitations'}</summary><p>${esc(entry.notes)}</p></details>` : ''}
      </article>`;
    }).join('') : '<p class="at-muted">No reference evidence saved yet.</p>'}</div>
    <details class="at-add-evidence"><summary>Add a source or verification note</summary>
      <form id="atEvidenceForm"><fieldset ${!writable ? 'disabled' : ''}>
        <label>Evidence type<select name="kind"><option value="verification-note">Verification note</option><option value="source">Source link</option><option value="dated-view">Dated reference view</option></select></label>
        <label>Title<input name="title" required maxlength="160" placeholder="e.g. Meter label needs an onsite photograph"></label>
        <label>Source URL <small>(optional for notes)</small><input name="url" type="url" placeholder="https://" maxlength="4000"></label>
        <div class="at-two"><label>Source / observation date<input name="sourceDate" type="date"></label><label>Date means<select name="dateMeaning"><option value="unknown">Unknown / not dated</option><option value="document-date">Document date</option><option value="observed-on">Field observation date</option><option value="imagery-selector">Imagery selector date</option><option value="layer-updated">Layer update date</option></select></label></div>
        <label>Provider / source<input name="provider" maxlength="160" placeholder="e.g. Owner photograph, LUS record"></label>
        <div class="at-two"><label>Applies to<select name="scope"><option value="asset-specific">This asset</option><option value="site-context">Site context</option></select></label><label>Evidence status<select name="status"><option value="needs-verification">Needs verification</option><option value="reference">Reference only</option><option value="field-observation">Recorded field observation</option></select></label></div>
        <label>Verification note<textarea name="notes" rows="3" maxlength="6000" required placeholder="What does this source establish, and what still needs checking?"></textarea></label>
        <p class="at-muted">This adds to the evidence history. It does not mark the asset field verified or change its inspection condition.</p>
        <button class="at-primary" type="submit">Save evidence to record</button>
      </fieldset></form>
    </details>
    <button class="at-full" data-evidence-action="export" ${!entries.length ? 'disabled' : ''}>Export this record’s evidence</button>
  </section>`;
}
