/* Cypress Command is the operating surface of A-2, using the existing store
   and geometry. Evidence is read through a bounded server seam, never bundled. */
import './command.css';
import geometry from '../data/geometry.json' with { type: 'json' };
import planSourceUrl from '../../reference/plat-full-72.png?url';
import { UNITS, byUnit, setSelected, getSelected, subscribe } from '../store.js';
import { LOCAL_REVIEW, REMOTE, getSession, propertyContext, BUNDLED_PROPERTY } from '../lib/remote.js';
import { esc } from '../lib/format.js';
import { createCommandMap } from '../lib/command-map.js';
import { suiteEvidence, buildOwnerUpdate, commandDate } from '../lib/command-evidence.js';

const n = value => Number(value).toLocaleString('en-US');
const icon = (name) => {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    file: '<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    reset: '<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>',
    focus: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5"/>',
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${paths[name] || paths.file}</svg>`;
};

export function initCommand(account) {
  const page = document.getElementById('pg-spatial');
  if (!page) return;
  const legacy = document.createElement('div');
  legacy.className = 'cmd-legacy'; legacy.hidden = true;
  while (page.firstChild) legacy.append(page.firstChild);
  page.innerHTML = `
    <header class="cmd-heading">
      <div><div class="cmd-location">Lafayette, Louisiana <span class="cmd-dot"></span> Belle Realty</div>
        <h1>On The Boulevard</h1><p>Every space. Every record. A clearer next step.</p></div>
      <div class="cmd-heading-right"><span class="cmd-mode" id="cmdMode">${LOCAL_REVIEW ? 'Local evidence review' : 'Property workspace'}</span>
        <button class="cmd-primary" id="cmdDraft" disabled>${icon('file')} Draft owner update</button></div>
    </header>
    <div class="cmd-workspace">
      <section class="cmd-stage" aria-label="Interactive property model">
        <div class="cmd-stage-bar"><div class="cmd-segment" aria-label="Property view">
          <button id="cmdModel" aria-pressed="true">Model</button><button id="cmdPlan" aria-pressed="false">Plan</button></div>
          <span class="cmd-stage-title">The full property <span>27 suites · 2 buildings</span></span>
          <button class="cmd-quiet" id="cmdGeometry">${icon('file')} Geometry & sources</button></div>
        <div class="cmd-map-host" id="cmdMap"></div>
        <div class="cmd-map-controls" aria-label="Map navigation">
          <button id="cmdZoomIn" aria-label="Zoom in">+</button><button id="cmdZoomOut" aria-label="Zoom out">−</button>
          <button id="cmdReset" aria-label="Fit full property">${icon('reset')}</button></div>
        <div class="cmd-map-key"><span><i class="cmd-key-solid"></i> Suite</span><span><i class="cmd-key-dashed"></i> Derived division</span><span><i class="cmd-key-amber"></i> Record association</span></div>
        <div class="cmd-map-footer"><span id="cmdViewNote">Plat-based footprints · CAD-assigned height estimates</span><span>Drag to pan · Scroll to zoom · Select a suite</span></div>
      </section>
      <aside class="cmd-inspector" aria-label="Suite and maintenance details">
        <div class="cmd-inspector-nav"><button id="cmdSuiteTab" class="is-active" aria-pressed="true">Suite detail</button><button id="cmdIssueTab" aria-pressed="false">Maintenance <span id="cmdIssueCount">—</span></button></div>
        <div id="cmdDetail" class="cmd-detail"></div>
      </aside>
    </div>
    <div class="cmd-bottom">
      <section class="cmd-directory" aria-label="Suite directory">
        <div class="cmd-section-head"><h2>Explore the suites <span id="cmdSuiteCount">27</span></h2>
          <label class="cmd-search">${icon('search')}<input id="cmdSearch" type="search" aria-label="Find a suite or tenant" placeholder="Find a suite or tenant"></label></div>
        <div id="cmdSuites" class="cmd-suite-list"></div>
        <p class="cmd-muted">Tenant names and areas reflect the July 2026 adopted roster. Current occupancy has not been revalidated.</p>
      </section>
      <section class="cmd-record-card" aria-label="Evidence and next step"><div class="cmd-record-top">${icon('pin')} From the property record</div>
        <h2 id="cmdRecordTitle">Reading supporting records</h2><p id="cmdRecordDescription">Loading the property’s available maintenance evidence.</p>
        <button id="cmdOpenIssue" class="cmd-link" disabled>Inspect the record ${icon('arrow')}</button>
        <div class="cmd-record-foot" id="cmdRecordFoot">Source status will be shown with its date.</div>
      </section>
    </div>
    <footer class="cmd-foot"><span>Cypress Command <span class="cmd-dot"></span> Property intelligence with a source behind it.</span>
      <button id="cmdLegacy" class="cmd-quiet" aria-expanded="false">Capture & legacy views</button></footer>
    <dialog class="cmd-dialog" id="cmdSourceDialog" aria-labelledby="cmdSourceTitle"><div class="cmd-dialog-head"><span>Source library</span><button class="cmd-close" aria-label="Close source" data-close>×</button></div><div id="cmdSourceContent"></div></dialog>
    <dialog class="cmd-dialog cmd-draft-dialog" id="cmdDraftDialog" aria-labelledby="cmdDraftTitle"><div class="cmd-dialog-head"><span>Owner communication</span><button class="cmd-close" aria-label="Close draft" data-close>×</button></div>
      <div class="cmd-dialog-body"><div class="cmd-mode">Draft · Review required</div><h2 id="cmdDraftTitle">An update grounded in the record.</h2><p class="cmd-muted">Generated from the dated maintenance record and its source references. Edit before sharing.</p>
        <label class="cmd-draft-label" for="cmdDraftText">Owner-update draft</label><textarea id="cmdDraftText" spellcheck="true"></textarea>
        <div id="cmdDraftStatus" class="cmd-draft-status" role="status">Nothing has been sent. Edits remain in this tab.</div>
        <div class="cmd-draft-actions"><button id="cmdDownloadDraft" class="cmd-primary">Download draft</button><button id="cmdCopyDraft" class="cmd-secondary">Copy draft</button><button id="cmdDraftSources" class="cmd-quiet">Review sources</button></div>
      </div></dialog>`;
  page.append(legacy);
  const $ = id => document.getElementById(id);
  let evidence = null, active = '101', tab = 'suite', sourceReturn = null;
  const map = createCommandMap($('cmdMap'), { units: UNITS, onPick: select, onIssue: showIssue });

  function select(id, focus = false) {
    if (!byUnit[id]) return;
    active = id; tab = 'suite'; setSelected(id); map.selectSuite(id);
    if (focus) map.focusSuite(id);
    renderDetail(); highlightDirectory();
  }
  function highlightDirectory() {
    $('cmdSuites').querySelectorAll('button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.unit === active);
      b.setAttribute('aria-pressed', String(b.dataset.unit === active));
    });
  }
  function renderDirectory() {
    const q = $('cmdSearch').value.trim().toLowerCase();
    const list = UNITS.filter(u => `${u.unit} ${u.dba} ${u.use}`.toLowerCase().includes(q));
    $('cmdSuiteCount').textContent = list.length;
    $('cmdSuites').innerHTML = list.map(u => `<button class="cmd-suite" data-unit="${esc(u.unit)}" aria-label="Select suite ${esc(u.unit)}, ${esc(u.dba)}"><b>${esc(u.unit)}</b><span>${esc(u.dba === 'VACANT' ? 'No tenant in snapshot' : u.dba)}</span></button>`).join('') || '<p class="cmd-empty">No matching suites. Try a suite number or tenant name.</p>';
    $('cmdSuites').querySelectorAll('button').forEach(b => b.onclick = () => select(b.dataset.unit, true));
    highlightDirectory();
  }
  function sourceButton(id, label) {
    return `<button class="cmd-source-link" data-source="${esc(id)}">${icon('file')} ${esc(label)} <span>↗</span></button>`;
  }
  function wireSources(el) { el.querySelectorAll('[data-source]').forEach(b => b.onclick = () => showSource(b.dataset.source)); }
  function renderDetail() {
    $('cmdSuiteTab').classList.toggle('is-active', tab === 'suite'); $('cmdSuiteTab').setAttribute('aria-pressed', String(tab === 'suite'));
    $('cmdIssueTab').classList.toggle('is-active', tab === 'issue'); $('cmdIssueTab').setAttribute('aria-pressed', String(tab === 'issue'));
    if (tab === 'issue') { renderIssue(); return; }
    const u = byUnit[active], info = suiteEvidence(u, geometry);
    const associated = evidence?.issue?.location?.suiteIds?.includes(active);
    const classification = info.geometry?.classification || 'Mixed source authority';
    $('cmdDetail').innerHTML = `<div class="cmd-suite-kicker">Suite ${esc(u.unit)} <button class="cmd-icon-btn" id="cmdFocus" aria-label="Focus suite ${esc(u.unit)}">${icon('focus')}</button></div>
      <h2>${esc(u.dba === 'VACANT' ? 'No tenant in snapshot' : u.dba)}</h2><p class="cmd-use">${esc(u.use || 'Use not recorded')}</p>
      <div class="cmd-suite-area"><strong>${n(u.sf)}</strong><span>square feet<br>Adopted roster</span></div>
      <dl class="cmd-facts"><div><dt>Building</dt><dd>${+u.unit < 135 ? 'Long building' : 'Patricia building'}</dd></div><div><dt>Roster status</dt><dd>${esc(({active:'Active',anchor:'Anchor',owner:'Owner occupied',vacant:'Vacant'})[u.status] || u.status)} <small>July 2026</small></dd></div><div><dt>Recorded term end</dt><dd>${u.end ? esc(u.end) : 'Not recorded'}</dd></div></dl>
      <div class="cmd-evidence-note"><b>${esc(classification)}</b><p>${esc(info.geometry?.description || 'Review the geometry source for this suite.')}</p></div>
      ${associated ? `<button id="cmdSuiteIssue" class="cmd-associated">${icon('pin')}<span><b>Maintenance in this frontage</b><small>${esc(evidence.issue.title)} · exact point unknown</small></span>${icon('arrow')}</button>` : ''}
      <div class="cmd-detail-sources"><h3>Behind this view</h3>${sourceButton('suite-roster','Adopted suite roster')}${sourceButton('suite-geometry','Footprint & demising record')}${sourceButton('plan-source','Supplied plat scan')}</div>
      <p class="cmd-muted cmd-detail-note">Record-backed snapshot. This panel does not verify current possession, payment, or lease-instrument priority.</p>`;
    $('cmdFocus').onclick = () => map.focusSuite(active);
    if ($('cmdSuiteIssue')) $('cmdSuiteIssue').onclick = showIssue;
    wireSources($('cmdDetail'));
  }
  function showIssue() {
    tab = 'issue'; renderDetail(); if (evidence?.issue) map.focusIssue();
  }
  function renderIssue() {
    const issue = evidence?.issue;
    if (!issue) { $('cmdDetail').innerHTML = '<div class="cmd-empty"><h2>No maintenance evidence loaded</h2><p>Use local evidence review or an authorized property account. No sample ticket is substituted.</p></div>'; return; }
    $('cmdDetail').innerHTML = `<div class="cmd-suite-kicker">Common area <span class="cmd-status-amber">Archived ${esc(issue.archivedStatus)}</span></div>
      <h2>${esc(issue.title)}</h2><blockquote>“${esc(issue.description)}”</blockquote><p class="cmd-muted">Description from the original work order.</p>
      <dl class="cmd-facts"><div><dt>Reported</dt><dd>${esc(issue.reportedAt?.slice(0,10) || 'Unknown')}</dd></div><div><dt>Status recorded</dt><dd>${esc(issue.asOf)}</dd></div><div><dt>Associated frontage</dt><dd>Suites ${esc(issue.location.suiteIds.join(' / '))}</dd></div></dl>
      <div class="cmd-evidence-note is-amber"><b>Location association, not a surveyed point</b><p>The description and tenant roster connect the report to this frontage. The exact defect location and extent are unverified.</p></div>
      <h3 class="cmd-detail-subhead">Still to establish</h3><p class="cmd-unknowns">Current condition, repair completion, vendor, cost and payment status are not established by these records.</p>
      <button id="cmdIssueDraft" class="cmd-primary cmd-wide">${icon('file')} Draft owner update</button>
      <div class="cmd-detail-sources"><h3>Supporting records</h3>${sourceButton('pothole-record','Original work-order excerpt')}${sourceButton('harvest-verification','Archive & import record')}${sourceButton('roster-101-103','Frontage association')}</div>`;
    $('cmdIssueDraft').onclick = openDraft; wireSources($('cmdDetail'));
  }
  const publicSource = id => {
    if (id === 'plan-source') return {id, title:'Supplied recorded-plat scan', path:'reference/plat-full-72.png', asOf:'1994-05-20 · last revision 2019-07-19', kind:'Source plan image', excerpt:'Supplied scan of the Montagnet & Domingue plat. The source image is oriented differently from the interactive view: Arnould Boulevard at top, Marie Antoinette below, Patricia at left and Johnston at right. Use the recorded courses for orientation. This copy does not settle conflicts between legal instruments.'};
    if (id === 'suite-roster') return { id, title:'Adopted suite roster', path:'src/data/units.public.json · docs/sot-2026-07/', asOf:'July 2026 · adopted 2026-07-16', kind:'Owner-corrected source extracts', excerpt:JSON.stringify(UNITS.map(({unit,dba,sf,use,status,start,end}) => ({unit,dba,sf,use,status,start,end})),null,2) };
    if (id === 'geometry') return { id, title:`Property geometry · ${geometry.rev}`, path:'src/data/geometry.json', asOf:'Plat last revised 2019-07-19; model REV 12', kind:'Mixed plat trace and derived suite divisions', excerpt:`${geometry.source}\n\n${JSON.stringify(geometry.demising,null,2)}\n\nOrientation: long building follows the NW–SE plat bearing; street-side references are approximate cardinal directions.\n\nParking discrepancy: 314 drawn versus 324 provided / 344 required in the variance reference. Legal-instrument conflicts remain unresolved.\n\nArea discrepancy: 62,810 SF in the 27-suite roster versus 62,883 SF headline.\n\nSatellite overlay uses a separately fitted CAD envelope and approximate alignment. Heights are assigned from CAD annotations, not individually field-measured.` };
    if (id === 'plat') return { id, title:'Plat and CAD reference', path:'reference/plat-full-72.png · public/plat-render.svg', asOf:'1994-05-20 · last plat revision 2019-07-19', kind:'Source image / schematic reproduction', excerpt:'Montagnet & Domingue recorded-plat reference. The linked SVG is the existing CAD schematic reproduction, not the certified legal instrument. Derived demising divisions and legal overlays do not establish legal boundaries or instrument priority.', imageUrl:'/plat-render.svg' };
    return null;
  };
  function showSource(id) {
    const suiteSource = ['suite-roster','suite-geometry'].includes(id) ? suiteEvidence(byUnit[active],geometry)?.sources.find(s=>s.id===id) : null;
    const source = suiteSource || evidence?.sources?.find(s => s.id === id) || publicSource(id);
    const dialog = $('cmdSourceDialog');
    if (!source) return;
    if (!dialog.open) sourceReturn = document.activeElement;
    $('cmdSourceContent').innerHTML = `<div class="cmd-dialog-body"><div class="cmd-source-meta">${esc(source.kind || 'Source reference')}</div><h2 id="cmdSourceTitle">${esc(source.title)}</h2><p class="cmd-source-path">${esc(source.path)}</p><div class="cmd-mode">${esc(source.asOf || 'Date not established')}</div>
      <div class="cmd-source-options">${['suite-roster','suite-geometry','geometry','plan-source','plat',...(evidence ? ['pothole-record','harvest-verification','roster-101-103'] : [])].map(key => `<button data-source="${key}" class="${key===id ? 'is-active' : ''}">${esc(({ 'suite-roster':'Suite roster','suite-geometry':'Suite boundary',geometry:'Geometry', 'plan-source':'Supplied plan',plat:'CAD reproduction','pothole-record':'Work order','harvest-verification':'Archive','roster-101-103':'Location'})[key])}</button>`).join('')}</div>
      <pre class="cmd-source-excerpt">${esc(typeof source.excerpt === 'string' ? source.excerpt : JSON.stringify(source.excerpt,null,2))}</pre>
      ${id === 'plan-source' ? `<a class="cmd-source-image" href="${esc(planSourceUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(planSourceUrl)}" alt="Supplied Montagnet and Domingue recorded plat scan with revision table"><span>Open supplied plan at full resolution ↗</span></a>` : source.imageUrl === '/plat-render.svg' ? '<a class="cmd-source-image" href="/plat-render.svg" target="_blank" rel="noopener noreferrer"><img src="/plat-render.svg" alt="Existing CAD schematic reproduction of the shopping center"><span>Open CAD reproduction ↗</span></a>' : ''}</div>`;
    wireSources($('cmdSourceContent'));
    if (!dialog.open) dialog.showModal();
  }
  function openDraft() {
    if (!evidence?.issue) return;
    if (!$('cmdDraftText').value) {
      const draft = buildOwnerUpdate({ issue:evidence.issue, generatedAt:new Date().toISOString() });
      $('cmdDraftText').value = draft.text;
    }
    $('cmdDraftDialog').showModal();
  }
  $('cmdDraftText').addEventListener('input', () => { $('cmdDraftStatus').textContent = 'Edited in this tab. Review changes before sharing. Nothing has been sent.'; });
  $('cmdDownloadDraft').onclick = () => {
    const blob = new Blob([$('cmdDraftText').value], {type:'text/plain;charset=utf-8'}), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Cypress-Command-owner-update-DRAFT-${commandDate(new Date())}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('cmdDraftStatus').textContent = 'Draft downloaded for review. Nothing has been sent.';
  };
  $('cmdCopyDraft').onclick = async () => {
    try { await navigator.clipboard.writeText($('cmdDraftText').value); $('cmdDraftStatus').textContent = 'Draft copied for review. Nothing has been sent.'; }
    catch { $('cmdDraftText').focus(); $('cmdDraftText').select(); $('cmdDraftStatus').textContent = 'Select and copy the draft text with your keyboard.'; }
  };
  $('cmdDraftSources').onclick = () => showSource('pothole-record');
  for (const dialog of [$('cmdSourceDialog'), $('cmdDraftDialog')]) {
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) { const b = dialog.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close(); } });
  }
  $('cmdSourceDialog').addEventListener('close', () => sourceReturn?.isConnected && sourceReturn.focus());
  $('cmdSearch').oninput = renderDirectory;
  $('cmdSuiteTab').onclick = () => { tab='suite'; renderDetail(); };
  $('cmdIssueTab').onclick = showIssue; $('cmdOpenIssue').onclick = showIssue; $('cmdDraft').onclick = openDraft;
  $('cmdGeometry').onclick = () => showSource('geometry');
  $('cmdZoomIn').onclick = () => map.zoomBy(1.3); $('cmdZoomOut').onclick = () => map.zoomBy(1/1.3); $('cmdReset').onclick = () => map.reset();
  for (const [id,view] of [['cmdModel','model'],['cmdPlan','plan']]) $(id).onclick = () => {
    map.setView(view); $('cmdModel').setAttribute('aria-pressed',String(view==='model')); $('cmdPlan').setAttribute('aria-pressed',String(view==='plan'));
    $('cmdViewNote').textContent = view==='model' ? 'Plat-based footprints · CAD-assigned height estimates' : 'Street-oriented plat view · dashed divisions are derived';
  };
  // A plan uses the narrow mobile canvas more effectively; both views remain
  // available and subsequent viewport changes preserve the user's choice.
  if (window.matchMedia('(max-width:660px)').matches) $('cmdPlan').click();
  $('cmdLegacy').onclick = () => { legacy.hidden = !legacy.hidden; $('cmdLegacy').setAttribute('aria-expanded', String(!legacy.hidden)); if (!legacy.hidden) legacy.scrollIntoView({behavior:'auto',block:'start'}); };
  subscribe(type => { if (type === 'selection' && getSelected() && getSelected() !== active) select(getSelected()); });
  renderDirectory(); select('101');
  loadEvidence();
  async function loadEvidence() {
    try {
      if (!LOCAL_REVIEW && !REMOTE) throw new Error('Run npm run dev:review to load the local property records.');
      if (REMOTE && !['operator','owner'].includes(account?.role)) throw new Error('An authorized owner or operator account is required.');
      if (REMOTE && (await propertyContext()).slug !== BUNDLED_PROPERTY) throw new Error('The OTB evidence package is not available for this property.');
      const headers = {};
      if (REMOTE) { const session = await getSession(); if (!session) throw new Error('Sign in to read the supporting records.'); headers.Authorization = `Bearer ${session.access_token}`; }
      const response = await fetch(LOCAL_REVIEW ? '/__review/evidence' : '/api/command-evidence', {headers});
      if (!response.ok) throw new Error(`Supporting records are unavailable (${response.status}).`);
      const payload = await response.json();
      if (!payload.issue || !Array.isArray(payload.sources)) throw new Error('The evidence response is incomplete.');
      evidence = payload;
      map.setIssueVisible?.(true);
      $('cmdDraft').disabled = false; $('cmdOpenIssue').disabled = false; $('cmdIssueCount').textContent = '1';
      $('cmdRecordTitle').textContent = evidence.issue.title;
      $('cmdRecordDescription').textContent = `“${evidence.issue.description}” The tenant roster connects this report to suites ${evidence.issue.location.suiteIds.join(' / ')}.`;
      $('cmdRecordFoot').textContent = `${evidence.issue.archivedStatus} in the ${evidence.issue.asOf} archive · current condition unverified`;
      renderDetail();
    } catch (error) {
      $('cmdRecordTitle').textContent = 'Supporting records unavailable'; $('cmdRecordDescription').textContent = error.message;
      $('cmdRecordFoot').textContent = 'No live status or sample work order is inferred.';
    }
  }
}
