/* A read-only detail for the same evidence response used by the property and
   owner draft. The existing maintenance queue remains the operating record. */
import './command-maintenance.css';
import { esc } from '../lib/format.js';
import { previewEvidenceNotice } from '../lib/command-evidence.js';

export const maintenanceReadTime = value => new Intl.DateTimeFormat('en-US', {
  timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',
}).format(new Date(value));

export function createCommandMaintenance({localReview,onProperty,onSource,onDraft}) {
  const page=document.getElementById('pg-maint'), queue=document.getElementById('mtBody');
  if (!page || !queue) return {update(){}};
  const host=document.createElement('section');
  host.className='cm-record';host.hidden=true;host.setAttribute('aria-label','Linked property work order');
  queue.before(host);
  return {update(evidence) {
    const issue=evidence?.issue, read=issue?.systemRecord;
    host.hidden=!issue;
    if (localReview) queue.hidden=!!issue;
    if (!issue) {host.replaceChildren();return;}
    if (localReview) page.querySelector('.page-head .sub').textContent='M-1 · DATED RECORD REVIEW';
    const checked=read?.state==='verified';
    const photoText=read?.photos?.state==='checked'
      ? `${read.photos.complete?'':'At least '}${read.photos.count} visible ${read.photos.count===1?'file':'files'}` : 'Folder not verified';
    host.innerHTML=`<div class="cm-intro"><div><div class="cm-eyebrow">Linked from the property</div><h2>${esc(issue.title)}</h2><p>Common area · associated frontage · suites ${esc(issue.location.suiteIds.join(' / '))}</p></div><button class="cmd-secondary" data-property>View on property ↗</button></div>
      ${issue.preview?`<p class="cm-caveat">${esc(previewEvidenceNotice(issue.preview))}</p>`:''}
      <div class="cm-columns"><div class="cm-main"><div class="cm-status-line"><span class="cmd-status-amber">${checked?`${read.explicitStatus?'Recorded':'Default'} ${esc(read.status.replaceAll('_',' '))}`:'System read unavailable'}</span><span>${checked?(read.preview?'Isolated test database read':read.mode==='live-read'?'Authenticated read':'Verification snapshot'):'Archive remains available'}</span></div>
      <p class="cm-description">${esc(checked?read.detail:issue.description)}</p>
      ${checked?`<dl class="cm-facts"><div><dt>Checked</dt><dd>${esc(maintenanceReadTime(read.readAt))}</dd></div><div><dt>Last logged activity</dt><dd>${esc(maintenanceReadTime(read.lastAt))}</dd></div><div><dt>Vendor assignment</dt><dd>${read.vendorId?esc(read.vendorId):'None in retrieved events'}</dd></div><div><dt>Request photo folder</dt><dd>${esc(photoText)}</dd></div></dl>
      <details class="cm-identity"><summary>Request reference</summary><code>${esc(read.requestId)}</code><p>${esc(read.mode==='live-read'?'Read with the signed-in account’s access.':'A saved database verification, not a continuously live connection.')}</p></details>`:`<p class="cm-caveat">${evidence.currentRead?.state==='not-found'?'The linked request was not visible to this account at the read.':'The linked request could not be verified in this session.'} The ${esc(issue.asOf)} archive records this issue as ${esc(issue.archivedStatus)}; a new status is not inferred.</p>`}
      <h3>Recorded activity</h3><ol class="cm-timeline">${checked&&read.events.length?read.events.map(event=>`<li><time>${esc(maintenanceReadTime(event.created_at))}</time><b>${esc(event.kind==='status'?`Status · ${event.status||'not recorded'}`:event.kind==='assign'?'Assignment recorded':'Note')}</b><p>${esc(event.note||'No accompanying note.')}</p></li>`).join(''):'<li><p>No event trail verified in this view.</p></li>'}</ol></div>
      <aside class="cm-review"><h3>What this establishes</h3><p>A dated record of the reported issue and ${checked?'its retrieved event trail':'the archive status'}. This is not a site inspection.</p><h3>Still to establish</h3><p>Exact defect location, current condition, repair scope, cost, completion evidence and payment.</p><div class="cm-actions"><button class="cmd-primary" data-draft>Draft owner update</button>${checked?'<button class="cmd-secondary" data-source="maintenance-system-record">Read system source</button>':''}<button class="cmd-link" data-source="pothole-record">Read original work order ↗</button></div><p class="cm-caveat">Review only. No dispatch, payment or business-record change.</p></aside></div>`;
    host.querySelector('[data-property]').onclick=onProperty;
    host.querySelector('[data-draft]').onclick=onDraft;
    host.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>onSource(button.dataset.source));
  }};
}
