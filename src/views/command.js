/* Cypress Command is the operating surface of A-2, using the existing store
   and geometry. Evidence is read through a bounded server seam, never bundled. */
import './command.css';
import geometry from '../data/geometry.json' with { type: 'json' };
import planSourceUrl from '../../reference/plat-full-72.png?url';
import { UNITS, byUnit, setSelected, getSelected, subscribe } from '../store.js';
import { LOCAL_REVIEW, REMOTE, getSession, propertyContext, BUNDLED_PROPERTY, sb } from '../lib/remote.js';
import { esc } from '../lib/format.js';
import { createCommandMap } from '../lib/command-map.js';
import { suiteEvidence } from '../lib/command-evidence.js';
import { createCommandReview } from './command-review.js';
import { createCommandMaintenance, maintenanceReadTime } from './command-maintenance.js';
import { clearCommandDraftSessions } from '../lib/command-draft-session.js';
import { createCommandNumbers } from './command-numbers.js';

const n = value => Number(value).toLocaleString('en-US');
const icon = (name) => {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    file: '<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    reset: '<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>',
    focus: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    external: '<path d="M8 5H5v14h14v-3M12 4h8v8M10 14 20 4"/>',
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
      <div><h1>On The Boulevard</h1>
        <div class="cmd-location">101–149 Arnould Blvd · Lafayette, Louisiana <span class="cmd-dot"></span> Belle Realty of Lafayette, LLC</div></div>
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
          <button id="cmdZoomIn" aria-label="Zoom in">${icon('plus')}</button><button id="cmdZoomOut" aria-label="Zoom out">${icon('minus')}</button>
          <button id="cmdReset" aria-label="Fit full property">${icon('reset')}</button></div>
        <div class="cmd-map-key"><span><i class="cmd-key-solid"></i> Suite</span><span><i class="cmd-key-dashed"></i> Derived division</span><span><i class="cmd-key-amber"></i> Record association</span></div>
        <div class="cmd-map-footer"><span id="cmdViewNote">Plat-based footprints · CAD-assigned height estimates</span><span>Mouse drag to pan · Alt + scroll to zoom · Tap a suite</span></div>
      </section>
      <aside class="cmd-inspector" aria-label="Suite and maintenance details">
        <div class="cmd-inspector-nav"><button id="cmdSuiteTab" class="is-active" aria-pressed="true">Suite detail</button><button id="cmdIssueTab" aria-pressed="false">Maintenance <span id="cmdIssueCount">—</span></button></div>
        <div id="cmdDetail" class="cmd-detail"></div>
      </aside>
    </div>
    <p id="cmdSelectionStatus" class="cmd-selection-status" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0"></p>
    <section id="cmdNumbers" class="cmd-numbers" aria-labelledby="cmdNumbersTitle"></section>
    <div class="cmd-bottom">
      <section class="cmd-directory" aria-label="Suite directory">
        <div class="cmd-section-head"><h2>Explore the suites <span id="cmdSuiteCount">27</span></h2>
          <label class="cmd-search">${icon('search')}<input id="cmdSearch" type="search" aria-label="Find a suite or tenant" placeholder="Find a suite or tenant"></label></div>
        <div id="cmdSuites" class="cmd-suite-list"></div>
        <p class="cmd-muted">Tenant names and areas reflect the July 2026 adopted roster. Current occupancy has not been revalidated.</p>
      </section>
      <section class="cmd-record-card" aria-label="Evidence and next step"><h2 id="cmdRecordTitle">Reading supporting records</h2>
        <div class="cmd-record-top">${icon('pin')} From the property record</div><p id="cmdRecordDescription">Loading the property’s available maintenance evidence.</p>
        <button id="cmdOpenIssue" class="cmd-link" disabled>Inspect the record ${icon('arrow')}</button>
        <div class="cmd-record-foot" id="cmdRecordFoot">Source status will be shown with its date.</div>
      </section>
    </div>
    <footer class="cmd-foot"><span>Cypress Command <span class="cmd-dot"></span> A-2 property workspace</span>
      <button id="cmdLegacy" class="cmd-quiet" aria-expanded="false">Capture & legacy views</button></footer>
    <dialog class="cmd-dialog" id="cmdSourceDialog" aria-labelledby="cmdSourceTitle"><div class="cmd-dialog-head"><span>Source library</span><button class="cmd-close" aria-label="Close source" data-close>${icon('close')}</button></div><div id="cmdSourceContent"></div></dialog>
    <dialog class="cmd-dialog" id="cmdDraftDialog" aria-labelledby="cmdDraftTitle"></dialog>`;
  page.append(legacy);
  const $ = id => document.getElementById(id);
  let evidence = null, active = '101', tab = 'suite', sourceReturn = null, evidenceScope = null, evidenceGeneration = 0;
  const map = createCommandMap($('cmdMap'), { units: UNITS, onPick: id => select(id, false, true), onIssue: () => showIssue(true) });
  const review = createCommandReview({dialog:$('cmdDraftDialog'),getEvidence:()=>evidence,getScope:async () => {
    if (LOCAL_REVIEW) return {mode:'local-review',propertyId:'otb'};
    const [session,ctx] = await Promise.all([getSession(),propertyContext()]);
    return session?.user?.id === evidenceScope?.userId && ctx.property_id === evidenceScope?.propertyId ? evidenceScope : null;
  }});
  const openDraft = () => review.open();
  const inProperty = action => {
    if (location.hash==='#spatial') { action?.();return; }
    window.addEventListener('hashchange',()=>action?.(),{once:true});
    location.hash='spatial';
  };
  const maintenance = createCommandMaintenance({localReview:LOCAL_REVIEW,
    onProperty:()=>inProperty(()=>showIssue()),onSource:id=>inProperty(()=>showSource(id)),onDraft:()=>inProperty(openDraft)});
  const numbers = createCommandNumbers({host:$('cmdNumbers'),account,onChange:renderDetail,onSource:showSource,
    onInvalidate:()=>{ if ($('cmdSourceContent').querySelector('[data-atlas-reference]')) { $('cmdSourceDialog').close(); $('cmdSourceContent').textContent=''; } }});
  if (REMOTE) sb.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_OUT' && (!evidenceScope || session?.user?.id === evidenceScope.userId)) return;
    evidenceGeneration++;
    clearCommandDraftSessions(() => window.sessionStorage);
    review.clear(); evidence=null; evidenceScope=null;maintenance.update(null);
    $('cmdSourceDialog').close(); $('cmdSourceContent').textContent='';
    $('cmdDraft').disabled=true; $('cmdOpenIssue').disabled=true; $('cmdIssueCount').textContent='—';
    $('cmdRecordTitle').textContent='Sign in to review the property records';
    $('cmdRecordDescription').textContent='This account session has ended or changed.';
    $('cmdRecordFoot').textContent='Reopen the property workspace after signing in.';
    map.setIssueVisible?.(false);renderDetail();
  });

  function revealInWorkspace(element) {
    const main = page.closest('.main');
    if (!main || !element) return;
    // Keep the application header fixed: scrollIntoView also scrolls ancestors.
    main.scrollTo({top:main.scrollTop + element.getBoundingClientRect().top - main.getBoundingClientRect().top - 12, behavior:'auto'});
  }
  function revealInspector(message) {
    $('cmdSelectionStatus').textContent = message;
    if (!window.matchMedia('(max-width:660px)').matches) return;
    const title = $('cmdDetailTitle');
    if (!title) return;
    revealInWorkspace(title.closest('.cmd-inspector'));
    title.focus({preventScroll:true});
  }
  function select(id, focus = false, userInitiated = false) {
    if (!byUnit[id]) return;
    active = id; tab = 'suite'; setSelected(id); map.selectSuite(id);
    if (focus) map.focusSuite(id);
    renderDetail(); highlightDirectory();
    if (userInitiated) {
      $('cmdDetail').scrollTop = 0;
      revealInspector(`Suite ${id}, ${byUnit[id].dba === 'VACANT' ? 'no tenant in snapshot' : byUnit[id].dba}. Details updated.`);
    }
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
    $('cmdSuites').querySelectorAll('button').forEach(b => b.onclick = () => select(b.dataset.unit, true, true));
    highlightDirectory();
  }
  function sourceButton(id, label) {
    return `<button class="cmd-source-link" data-source="${esc(id)}">${icon('file')} ${esc(label)} <span>${icon('external')}</span></button>`;
  }
  function wireSources(el) { el.querySelectorAll('[data-source]').forEach(b => b.onclick = () => showSource(b.dataset.source)); }
  function renderDetail() {
    $('cmdSuiteTab').classList.toggle('is-active', tab === 'suite'); $('cmdSuiteTab').setAttribute('aria-pressed', String(tab === 'suite'));
    $('cmdIssueTab').classList.toggle('is-active', tab === 'issue'); $('cmdIssueTab').setAttribute('aria-pressed', String(tab === 'issue'));
    if (tab === 'issue') { renderIssue(); return; }
    const u = byUnit[active], info = suiteEvidence(u, geometry);
    const associated = evidence?.issue?.location?.suiteIds?.includes(active);
    const classification = info.geometry?.classification || 'Mixed source authority';
    $('cmdDetail').innerHTML = `<h2 id="cmdDetailTitle" tabindex="-1">${esc(u.dba === 'VACANT' ? 'No tenant in snapshot' : u.dba)}</h2>
      <div class="cmd-suite-kicker">Suite ${esc(u.unit)} <button class="cmd-icon-btn" id="cmdFocus" aria-label="Focus suite ${esc(u.unit)}">${icon('focus')}</button></div><p class="cmd-use">${esc(u.use || 'Use not recorded')}</p>
      <div class="cmd-suite-area"><strong>${n(u.sf)}</strong><span>square feet<br>Adopted roster</span></div>
      <dl class="cmd-facts"><div><dt>Building</dt><dd>${+u.unit < 135 ? 'Long building' : 'Patricia building'}</dd></div><div><dt>Roster status</dt><dd>${esc(({active:'Active',anchor:'Anchor',owner:'Owner occupied',vacant:'Vacant'})[u.status] || u.status)} <small>July 2026</small></dd></div><div><dt>Recorded term end</dt><dd>${u.end ? esc(u.end) : 'Not recorded'}</dd></div></dl>
      ${numbers.suiteMarkup(active,sourceButton)}
      <div class="cmd-evidence-note"><b>${esc(classification)}</b><p>${esc(info.geometry?.description || 'Review the geometry source for this suite.')}</p></div>
      ${associated ? `<button id="cmdSuiteIssue" class="cmd-associated">${icon('pin')}<span><b>Maintenance in this frontage</b><small>${esc(evidence.issue.title)} · exact point unknown</small></span>${icon('arrow')}</button>` : ''}
      <div class="cmd-detail-sources"><h3>Behind this view</h3>${sourceButton('suite-roster','Adopted suite roster')}${sourceButton('suite-geometry','Footprint & demising record')}${sourceButton('plan-source','Supplied plat scan')}</div>
      <p class="cmd-muted cmd-detail-note">Record-backed snapshot. This panel does not verify current possession, payment, or lease-instrument priority.</p>`;
    $('cmdFocus').onclick = () => {
      map.focusSuite(active);
      if (window.matchMedia('(max-width:660px)').matches) revealInWorkspace($('cmdMap'));
    };
    if ($('cmdSuiteIssue')) $('cmdSuiteIssue').onclick = showIssue;
    wireSources($('cmdDetail'));
  }
  function showIssue(userInitiated = true) {
    tab = 'issue'; renderDetail(); if (evidence?.issue) map.focusIssue();
    if (userInitiated) { $('cmdDetail').scrollTop=0; revealInspector(evidence?.issue ? `${evidence.issue.title}. Maintenance records shown.` : 'No maintenance evidence loaded.'); }
  }
  function renderIssue() {
    const issue = evidence?.issue;
    if (!issue) { $('cmdDetail').innerHTML = '<div class="cmd-empty"><h2 id="cmdDetailTitle" tabindex="-1">No maintenance evidence loaded</h2><p>Use local evidence review or an authorized property account. No sample ticket is substituted.</p></div>'; return; }
    $('cmdDetail').innerHTML = `<h2 id="cmdDetailTitle" tabindex="-1">${esc(issue.title)}</h2>
      <div class="cmd-suite-kicker">Common area <span class="cmd-status-amber">Archived ${esc(issue.archivedStatus)}</span></div><blockquote>“${esc(issue.description)}”</blockquote><p class="cmd-muted">Description from the original work order.</p>
      <dl class="cmd-facts"><div><dt>Reported</dt><dd>${esc(issue.reportedAt?.slice(0,10) || 'Unknown')}</dd></div><div><dt>Status recorded</dt><dd>${esc(issue.asOf)}</dd></div><div><dt>Associated frontage</dt><dd>Suites ${esc(issue.location.suiteIds.join(' / '))}</dd></div></dl>
      <div class="cmd-evidence-note is-amber"><b>Location association, not a surveyed point</b><p>The description and tenant roster connect the report to this frontage. The exact defect location and extent are unverified.</p></div>
      <div class="cmd-system-check"><b>${issue.systemRecord?`System record · ${esc(issue.systemRecord.status.replaceAll('_',' '))}`:'System read unavailable'}</b><p>${issue.systemRecord?`${issue.systemRecord.mode==='live-read'?'Read':'Snapshot checked'} ${esc(maintenanceReadTime(issue.systemRecord.readAt))}. This records the event trail, not current site condition.`:'The archive remains available. No new status is inferred.'}</p><button class="cmd-secondary" id="cmdLinkedOrder">Open linked work order ${icon('arrow')}</button></div>
      <h3 class="cmd-detail-subhead">Still to establish</h3><p class="cmd-unknowns">Current condition, repair completion, vendor, cost and payment status are not established by these records.</p>
      <button id="cmdIssueDraft" class="cmd-primary cmd-wide">${icon('file')} Draft owner update</button>
      <div class="cmd-detail-sources"><h3>Supporting records</h3>${sourceButton('pothole-record','Original work-order excerpt')}${sourceButton('harvest-verification','Archive & import record')}${sourceButton('roster-101-103','Frontage association')}</div>`;
    $('cmdIssueDraft').onclick = openDraft; $('cmdLinkedOrder').onclick=()=>{location.hash='maint';}; wireSources($('cmdDetail'));
  }
  const publicSource = id => {
    if (id === 'plan-source') return {id, title:'Supplied recorded-plat scan', path:'reference/plat-full-72.png', asOf:'1994-05-20 · last revision 2019-07-19', kind:'Source plan image', excerpt:'Supplied scan of the Montagnet & Domingue plat. The source image is oriented differently from the interactive view: Arnould Boulevard at top, Marie Antoinette below, Patricia at left and Johnston at right. Use the recorded courses for orientation. This copy does not settle conflicts between legal instruments.'};
    if (id === 'suite-roster') return { id, title:'Adopted suite roster', path:'src/data/units.public.json · docs/sot-2026-07/', asOf:'July 2026 baseline · term review 2026-09-10', kind:'Owner-corrected roster with reviewed term updates', excerpt:JSON.stringify(UNITS.map(({unit,dba,sf,use,status,start,end}) => ({unit,dba,sf,use,status,start,end})),null,2) };
    if (id === 'geometry') return { id, title:`Property geometry · ${geometry.rev}`, path:'src/data/geometry.json', asOf:'Plat last revised 2019-07-19; model REV 12', kind:'Mixed plat trace and derived suite divisions', excerpt:`${geometry.source}\n\n${JSON.stringify(geometry.demising,null,2)}\n\nOrientation: long building follows the NW–SE plat bearing; street-side references are approximate cardinal directions.\n\nParking discrepancy: 314 drawn versus 324 provided / 344 required in the variance reference. Legal-instrument conflicts remain unresolved.\n\nArea discrepancy: 62,810 SF in the 27-suite roster versus 62,883 SF headline.\n\nSatellite overlay uses a separately fitted CAD envelope and approximate alignment. Heights are assigned from CAD annotations, not individually field-measured.` };
    if (id === 'plat') return { id, title:'Plat and CAD reference', path:'reference/plat-full-72.png · public/plat-render.svg', asOf:'1994-05-20 · last plat revision 2019-07-19', kind:'Source image / schematic reproduction', excerpt:'Montagnet & Domingue recorded-plat reference. The linked SVG is the existing CAD schematic reproduction, not the certified legal instrument. Derived demising divisions and legal overlays do not establish legal boundaries or instrument priority.', imageUrl:'/plat-render.svg' };
    return null;
  };
  function showSource(id) {
    const suiteSource = ['suite-roster','suite-geometry'].includes(id) ? suiteEvidence(byUnit[active],geometry)?.sources.find(s=>s.id===id) : null;
    const financeSource = numbers.source(id);
    const source = suiteSource || evidence?.sources?.find(s => s.id === id) || publicSource(id) || financeSource;
    const dialog = $('cmdSourceDialog');
    if (!source) return;
    const switchingSource = dialog.open;
    if (!dialog.open) sourceReturn = document.activeElement;
    const sourceChoices = financeSource ? numbers.sources().map(item=>({id:item.id,label:item.title})) : ['suite-roster','suite-geometry','geometry','plan-source','plat',...(evidence ? ['pothole-record','harvest-verification','roster-101-103'] : []),...(evidence?.issue?.systemRecord?['maintenance-system-record']:[])].map(key=>({id:key,label:({'suite-roster':'Suite roster','suite-geometry':'Suite boundary',geometry:'Geometry','plan-source':'Supplied plan',plat:'CAD reproduction','pothole-record':'Work order','harvest-verification':'Archive','roster-101-103':'Location','maintenance-system-record':'System read'})[key]}));
    $('cmdSourceContent').innerHTML = `<div class="cmd-dialog-body"${financeSource ? ' data-atlas-reference' : ''}><div class="cmd-source-meta">${esc(source.kind || (financeSource ? 'Dated production-ledger extract' : 'Source reference'))}</div><h2 id="cmdSourceTitle">${esc(source.title)}</h2><p class="cmd-source-path">${esc(source.path)}</p><div class="cmd-mode">${esc(source.asOf || 'Date not established')}</div>
      <div class="cmd-source-options">${sourceChoices.map(item => `<button data-source="${esc(item.id)}" class="${item.id===id ? 'is-active' : ''}">${esc(item.label)}</button>`).join('')}</div>
      <pre class="cmd-source-excerpt">${esc(typeof source.excerpt === 'string' ? source.excerpt : JSON.stringify(source.excerpt,null,2))}</pre>
      ${id === 'plan-source' ? `<a class="cmd-source-image" href="${esc(planSourceUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(planSourceUrl)}" alt="Supplied Montagnet and Domingue recorded plat scan with revision table"><span>Open supplied plan at full resolution ${icon('external')}</span></a>` : source.imageUrl === '/plat-render.svg' ? `<a class="cmd-source-image" href="/plat-render.svg" target="_blank" rel="noopener noreferrer"><img src="/plat-render.svg" alt="Existing CAD schematic reproduction of the shopping center"><span>Open CAD reproduction ${icon('external')}</span></a>` : ''}</div>`;
    wireSources($('cmdSourceContent'));
    if (!dialog.open) dialog.showModal();
    if (switchingSource) [...$('cmdSourceContent').querySelectorAll('[data-source]')].find(button => button.dataset.source === id)?.focus({preventScroll:true});
  }
  for (const dialog of [$('cmdSourceDialog'), $('cmdDraftDialog')]) {
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) { const b = dialog.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close(); } });
  }
  $('cmdSourceDialog').addEventListener('close', () => sourceReturn?.isConnected && sourceReturn.focus());
  $('cmdSearch').oninput = renderDirectory;
  $('cmdSuiteTab').onclick = () => { tab='suite'; renderDetail(); $('cmdDetail').scrollTop=0; };
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
  $('cmdLegacy').onclick = () => { legacy.hidden = !legacy.hidden; $('cmdLegacy').setAttribute('aria-expanded', String(!legacy.hidden)); if (!legacy.hidden) revealInWorkspace(legacy); };
  subscribe(type => { if (type === 'selection' && getSelected() && getSelected() !== active) select(getSelected()); });
  renderDirectory(); select('101');
  loadEvidence();
  numbers.start();
  async function loadEvidence() {
    const generation = evidenceGeneration;
    try {
      if (!LOCAL_REVIEW && !REMOTE) throw new Error('Run npm run dev:review to load the local property records.');
      if (REMOTE && !['operator','owner'].includes(account?.role)) throw new Error('An authorized owner or operator account is required.');
      const ctx = REMOTE ? await propertyContext() : null;
      if (REMOTE && ctx.slug !== BUNDLED_PROPERTY) throw new Error('The OTB evidence package is not available for this property.');
      const headers = {};
      let requestScope = null;
      if (REMOTE) { const session = await getSession(); if (!session?.user?.id) throw new Error('Sign in to read the supporting records.'); headers.Authorization = `Bearer ${session.access_token}`; requestScope={mode:'authenticated',userId:session.user.id,propertyId:ctx.property_id}; }
      if (generation !== evidenceGeneration) return;
      evidenceScope = requestScope;
      const response = await fetch(LOCAL_REVIEW ? '/__review/evidence' : '/api/command-evidence', {headers});
      if (!response.ok) throw new Error(`Supporting records are unavailable (${response.status}).`);
      const payload = await response.json();
      if (REMOTE) {
        const session = await getSession();
        if (!session?.user?.id || session.user.id !== requestScope.userId) throw new Error('The account session changed. Reopen the property workspace.');
      }
      if (generation !== evidenceGeneration) return;
      if (!payload.issue || !Array.isArray(payload.sources)) throw new Error('The evidence response is incomplete.');
      evidence = payload; maintenance.update(evidence);
      map.setIssueVisible?.(true);
      $('cmdDraft').disabled = false; $('cmdOpenIssue').disabled = false; $('cmdIssueCount').textContent = '1';
      $('cmdRecordTitle').textContent = evidence.issue.title;
      $('cmdRecordDescription').textContent = `“${evidence.issue.description}” The tenant roster connects this report to suites ${evidence.issue.location.suiteIds.join(' / ')}.`;
      $('cmdRecordFoot').textContent = `${evidence.issue.archivedStatus} in the ${evidence.issue.asOf} archive · current condition unverified`;
      renderDetail();
    } catch (error) {
      if (generation !== evidenceGeneration) return;
      $('cmdRecordTitle').textContent = 'Supporting records unavailable'; $('cmdRecordDescription').textContent = error.message;
      $('cmdRecordFoot').textContent = 'No live status or sample work order is inferred.';
    }
  }
}
