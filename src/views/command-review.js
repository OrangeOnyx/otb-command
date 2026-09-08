/* A local drafting surface over the existing, dated evidence response.
   Recovery is tab-scoped, never a business-state layer or an approval record. */
import './command-review.css';
import approvedLogo from '../../public/brand/cypress/cc-04c-horizontal-primary.svg?raw';
import frauncesLicense from '../../public/brand/cypress/fonts/Fraunces-OFL.txt?raw';
import interLicense from '../../public/brand/cypress/fonts/Inter-OFL.txt?raw';
import monoLicense from '../../public/brand/cypress/fonts/JetBrainsMono-OFL.txt?raw';
import { esc } from '../lib/format.js';
import { buildOwnerUpdate, commandDate } from '../lib/command-evidence.js';
import { buildBriefingHTML } from '../lib/command-briefing.js';
import { createCommandDraftSession, MAX_COMMAND_DRAFT_TEXT } from '../lib/command-draft-session.js';

const TEXT_LIMIT = MAX_COMMAND_DRAFT_TEXT;
const closeIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const logoDataUrl = 'data:image/svg+xml;base64,' + btoa(String.fromCharCode(...new TextEncoder().encode(approvedLogo)));
const fontLicenseText = [frauncesLicense,interLicense,monoLicense].join('\n\n');
let exportFonts = null;
async function briefingFonts() {
  if (exportFonts) return exportFonts;
  exportFonts = Promise.all([['Fraunces','Fraunces-400'],['Inter','Inter-400'],['JetBrains Mono','JetBrainsMono-400']].map(async ([family,file]) => {
    const response = await fetch(`/brand/cypress/fonts/${file}.woff2`);
    if (!response.ok) throw new Error('Approved font unavailable.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let start=0;start<bytes.length;start+=8192) binary += String.fromCharCode(...bytes.subarray(start,start+8192));
    return [family,'data:font/woff2;base64,'+btoa(binary)];
  })).then(Object.fromEntries).catch(error => { exportFonts=null;throw error; });
  return exportFonts;
}

export function createCommandReview({dialog, getEvidence, getScope}) {
  dialog.classList.add('cmd-review');
  dialog.innerHTML = `<div class="cmd-dialog-head"><span>Owner communication</span><button class="cmd-close" aria-label="Close draft" data-close>${closeIcon}</button></div>
    <div class="cr-heading"><h2 id="cmdDraftTitle">Prepare the owner update.</h2><p>Edit the brief with its supporting record in view.</p>
      <div class="cr-dates"><span id="crArchiveDate"></span><span id="crPreparedDate"></span><strong>Draft · Not sent</strong></div></div>
    <div class="cr-workspace">
      <section class="cr-writing" aria-label="Owner draft editor">
        <div class="cr-editor-bar"><div class="cmd-segment" aria-label="Draft view"><button id="crEdit" aria-pressed="true">Edit draft</button><button id="crRead" aria-pressed="false">Read draft</button></div><span id="crLength"></span></div>
        <label for="cmdDraftText" class="cr-label">Owner-update draft <span>Operator edits are not verified source facts.</span></label>
        <textarea id="cmdDraftText" maxlength="${TEXT_LIMIT}" spellcheck="true" aria-describedby="crRecovery"></textarea>
        <div id="crReadView" class="cr-read" tabindex="0" aria-label="Draft reading view" hidden></div>
        <p id="crRecovery" class="cr-recovery" role="status"></p>
        <div class="cr-replace"><button id="crRegenerate" class="cmd-quiet">Regenerate from records</button>
          <div id="crReplacePrompt" hidden><p>Replace your edits with a fresh draft from these records?</p><button id="crReplaceConfirm" class="cmd-secondary">Replace draft</button><button id="crReplaceCancel" class="cmd-quiet">Keep edits</button></div></div>
      </section>
      <aside class="cr-evidence" aria-label="Evidence for owner update"><h3>Check the record</h3><p class="cr-evidence-intro">Recorded status may differ from conditions today.</p>
        <div id="crSources" class="cr-source-list" aria-label="Supporting sources"></div>
        <section class="cr-source-content" aria-labelledby="crSourceTitle"><h4 id="crSourceTitle"></h4><p id="crSourceMeta"></p><p id="crSourcePath"></p><pre id="crSourceExcerpt" tabindex="0" aria-label="Selected source excerpt"></pre></section>
        <details class="cr-gaps"><summary>What still needs verification</summary><ul id="crUnknowns"></ul><p>Reading a source does not confirm the repair, payment, or current condition.</p></details>
      </aside>
    </div>
    <footer class="cr-footer"><div><p id="cmdDraftStatus" role="status">Nothing has been sent.</p><p class="cr-export-note">The briefing includes your text, dated source excerpts, and record gaps.</p></div>
      <div class="cr-actions"><button id="cmdDownloadBriefing" class="cmd-primary">Download briefing</button><button id="cmdDownloadDraft" class="cmd-secondary">Text file</button><button id="cmdCopyDraft" class="cmd-quiet">Copy text</button></div></footer>`;
  const $ = id => dialog.querySelector('#' + id);
  let context = null, recovery = null, preparedAt = null, initialized = false, opening = false, exporting = false, returnTo = null, generation = 0;
  const announce = (id,message) => { if($(id).textContent !== message) $(id).textContent = message; };
  const status = message => announce('cmdDraftStatus',message);
  const sourceList = () => context.issue.sourceIds.map(id => context.sources.find(source => source.id === id)).filter(Boolean);
  const text = () => $('cmdDraftText').value;
  const valid = () => !!context && !!text().trim() && text().length <= TEXT_LIMIT;

  function showRecord(id, focus = false) {
    const source = sourceList().find(item => item.id === id);
    if (!source) return;
    $('crSourceTitle').textContent = source.title;
    $('crSourceMeta').textContent = `${source.kind || 'Source record'} · ${source.asOf || 'Date not established'}`;
    $('crSourcePath').textContent = source.path;
    $('crSourceExcerpt').textContent = source.excerpt;
    $('crSourceExcerpt').scrollTop = 0;
    $('crSources').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reviewSource === id)));
    if (focus) $('crSourceExcerpt').focus({preventScroll:false});
  }
  function renderReading() {
    if (!context) { $('crReadView').textContent='';return; }
    const ids = new Set(context.issue.sourceIds);
    $('crReadView').innerHTML = text().split(/(\[[a-zA-Z0-9_-]+\])/g).map(part => {
      const id = part.slice(1,-1);
      return part.startsWith('[') && ids.has(id) ? `<button class="cr-citation" data-review-source="${esc(id)}">${esc(part)}</button>` : esc(part);
    }).join('');
    $('crReadView').querySelectorAll('[data-review-source]').forEach(button => button.onclick = () => showRecord(button.dataset.reviewSource,true));
  }
  function refreshEditor() {
    $('crLength').textContent = `${text().length.toLocaleString('en-US')} / 50,000`;
    for (const id of ['cmdDownloadBriefing','cmdDownloadDraft','cmdCopyDraft']) $(id).disabled = !valid() || (id === 'cmdDownloadBriefing' && exporting);
    renderReading();
  }
  function save() {
    if (!context || !recovery) return;
    const result = recovery?.save({text:text(),generatedAt:preparedAt});
    announce('crRecovery',result?.status === 'saved'
      ? 'Saved for recovery in this tab. Closing the tab ends recovery.'
      : 'Tab recovery is unavailable. Download your draft to keep a copy.');
  }
  function generate() {
    const draft = buildOwnerUpdate({issue:context.issue,generatedAt:new Date()});
    preparedAt = draft.generatedAt;
    $('cmdDraftText').value = draft.text;
    $('crPreparedDate').textContent = `Draft prepared ${preparedAt}`;
    refreshEditor(); save();
  }
  function setRead(read) {
    $('crReadView').hidden = !read; $('cmdDraftText').hidden = read;
    $('crEdit').setAttribute('aria-pressed',String(!read)); $('crRead').setAttribute('aria-pressed',String(read));
    if (read) renderReading();
  }
  async function open() {
    if (opening || dialog.open || !getEvidence()?.issue) return;
    opening = true;
    const current = generation;
    returnTo = document.activeElement;
    try {
      const scope = await getScope();
      if (current !== generation) return;
      if (!scope) throw new Error('This draft requires an authorized property session.');
      if (!initialized) {
        context = getEvidence();
        const boundSources = context.issue.sourceIds.map(id => context.sources.find(source => source.id === id));
        if (boundSources.some(source => !source)) throw new Error('A required source is unavailable. Reopen the property workspace to try again.');
        const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({issue:context.issue,sources:boundSources})));
        if (current !== generation) return;
        const sourceFingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
        recovery = createCommandDraftSession({storage:()=>window.sessionStorage,scope,issueId:context.issue.id,sourceFingerprint});
        const restored = recovery.load();
        $('crArchiveDate').textContent = `Source archive ${context.issue.asOf}`;
        $('crSources').innerHTML = sourceList().map(source => `<button data-review-source="${esc(source.id)}" aria-pressed="false"><span>${esc(({ 'pothole-record':'Work order','harvest-verification':'Archive verification','roster-101-103':'Frontage association','maintenance-system-record':'Linked work order'})[source.id] || source.title)}</span><small>${esc(source.id==='maintenance-system-record'?commandDate(source.asOf):source.asOf || 'Undated')}</small></button>`).join('');
        $('crSources').querySelectorAll('button').forEach(button => button.onclick = () => showRecord(button.dataset.reviewSource));
        $('crUnknowns').innerHTML = (context.issue.unknowns || []).map(item => `<li>${esc(item)}</li>`).join('');
        showRecord(context.issue.sourceIds[0]);
        if (restored.status === 'restored') {
          preparedAt = restored.draft.generatedAt;
          $('cmdDraftText').value = restored.draft.text;
          $('crPreparedDate').textContent = `Draft prepared ${preparedAt}`;
          refreshEditor();
          $('crRecovery').textContent = 'Recovered your draft from this tab. Review edits before sharing.';
        } else {
          generate();
          if (restored.reason === 'source-changed') status('The source record changed. A fresh draft was generated; review it before sharing.');
          else if (restored.status === 'rejected') status('The saved draft could not be restored safely. A fresh draft was generated for review.');
        }
        initialized = true;
      }
      dialog.showModal();
    } catch (error) {
      const notice = document.getElementById('cmdRecordFoot');
      if (notice) notice.textContent = error.message;
    } finally { opening = false; }
  }
  function download(contents,type,extension) {
    const url = URL.createObjectURL(new Blob([contents],{type}));
    const link = document.createElement('a'); link.href = url;
    link.download = `Cypress-Command-owner-update-DRAFT-${commandDate(new Date())}.${extension}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  $('cmdDraftText').addEventListener('input', () => { refreshEditor();save();status(valid() ? 'Edited draft · Review before sharing. Nothing has been sent.' : 'Add draft text before downloading or copying.'); });
  $('crEdit').onclick = () => setRead(false); $('crRead').onclick = () => setRead(true);
  $('crRegenerate').onclick = () => { $('crReplacePrompt').hidden = false; $('crReplaceCancel').focus(); };
  $('crReplaceCancel').onclick = () => { $('crReplacePrompt').hidden = true; $('crRegenerate').focus(); };
  $('crReplaceConfirm').onclick = () => { if(!context)return;generate();setRead(false);$('crReplacePrompt').hidden=true;$('cmdDraftText').focus();status('Draft regenerated from the dated records. Nothing has been sent.'); };
  $('cmdDownloadDraft').onclick = () => { if(valid()) { download(text(),'text/plain;charset=utf-8','txt');status('Text file prepared for download. Nothing has been sent.'); } };
  $('cmdDownloadBriefing').onclick = async () => {
    if(!valid() || exporting) return;
    const current = generation;
    const packet = {issue:context.issue,sources:sourceList(),text:text(),generatedAt:new Date(),preparedAt,logoDataUrl,fontLicenseText};
    exporting=true;
    $('cmdDownloadBriefing').disabled=true;$('cmdDownloadBriefing').textContent='Preparing briefing…';
    try {
      const fontDataUrls = await briefingFonts();
      if(current !== generation) return;
      download(buildBriefingHTML({...packet,fontDataUrls}),'text/html;charset=utf-8','html');
      status('Briefing prepared for download. Open the HTML file to read or print it. Nothing has been sent.');
    }
    catch { status('The briefing could not be prepared. Your edits remain here; use Text file to keep a copy.'); }
    finally { exporting=false;$('cmdDownloadBriefing').textContent='Download briefing';$('cmdDownloadBriefing').disabled=!valid(); }
  };
  $('cmdCopyDraft').onclick = async () => {
    if(!valid()) return;
    try { await navigator.clipboard.writeText(text());status('Draft copied for review. Nothing has been sent.'); }
    catch { setRead(false);$('cmdDraftText').focus();$('cmdDraftText').select();status('Copy is unavailable. Use your keyboard to copy the selected draft, or download a text file.'); }
  };
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => returnTo?.isConnected && returnTo.focus({preventScroll:true}));
  function clear() {
    generation++;recovery=null;context=null;initialized=false;preparedAt=null;
    $('cmdDraftText').value='';$('crReadView').textContent='';$('crSources').textContent='';
    for(const id of ['crSourceTitle','crSourceMeta','crSourcePath','crSourceExcerpt','crUnknowns','crArchiveDate','crPreparedDate','crRecovery']) $(id).textContent='';
    $('crReplacePrompt').hidden=true;refreshEditor();dialog.close();
  }
  return {open,clear};
}
