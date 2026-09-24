import './asset-twin.css';
import { UNITS, getFeatures } from '../store.js';
import { REMOTE, LOCAL_REVIEW, sb, propertyContext } from '../lib/remote.js';
import { esc } from '../lib/format.js';
import * as Assets from '../lib/physical-assets.js';
import { getMaintCache, refreshMaint, submitRequest, MR_STATUS, onMaintChange } from '../lib/maintenance.js';
import { openMaintenanceRequest } from './maintenance.js';
import { listHvacUnits } from '../lib/hvac.js';
import { assetTwinLink, readAssetTwinLink, assetQrSvg, latestLocatedBinding, sourceObjectForAsset } from '../lib/asset-twin-links.js';
import storefrontReference from '../assets/twin/storefront-reference.jpg';
import aerialReference from '../assets/twin/aerial-reference.jpg';
import { sourceItems, sourceSearchText, sourceAssetKind, sourceTypeLabels } from '../lib/asset-twin-source-data.js';
import { sourcePaneHTML, recordSourceHTML, openSourceMap } from './asset-twin-sources.js';
import nightReference from '../assets/twin/night-reference.jpg';

const conditions = Assets.PHYSICAL_ASSET_CONDITIONS;
const types = Assets.PHYSICAL_ASSET_TYPES;
const conditionColors = {uninspected:'#a6a99c',good:'#56836a',monitor:'#d9ac45',repair:'#c26535',urgent:'#ac3434'};
const modelId = 'otb-floorplanner';
const modelVersion = 'floorplanner-241952337-2026-09-23';
const modelUrl = `${import.meta.env.BASE_URL}twin/model.glb`;
const upperDataUrl = `${import.meta.env.BASE_URL}twin/upper-floors.json`;
const upperModelUrl = `${import.meta.env.BASE_URL}twin/upper-floors.glb`;
const dataUrl = `${import.meta.env.BASE_URL}twin/model-data.json`;
const options = (items, selected) => Object.entries(items).map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dateLabel = value => value ? String(value).slice(0,10) : 'Not recorded';
const icon = name => {
  const paths={back:'M19 12H5m6-6-6 6 6 6',cube:'m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8',close:'m6 6 12 12M6 18 18 6',camera:'M4 7h4l2-3h4l2 3h4v13H4zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',plus:'M12 4v16M4 12h16',arrow:'M5 12h14m-6-6 6 6-6 6'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${paths[name]||paths.cube}"/></svg>`;
};

export function initAssetTwin(account) {
  if (REMOTE && !['operator','owner'].includes(account?.role)) return;
  const heading=document.querySelector('#pg-spatial .cmd-heading-right');
  if(!heading || document.getElementById('openAssetTwin'))return;
  const launch=document.createElement('button');launch.id='openAssetTwin';launch.className='cmd-secondary';launch.innerHTML=`${icon('cube')} Open asset twin`;heading.append(launch);
  const root=document.createElement('section');root.className='at-workspace';root.hidden=true;root.setAttribute('aria-label','On The Boulevard asset twin');
  root.innerHTML=`
    <header class="at-header"><button data-action="close" class="at-back">${icon('back')}<span>Property workspace</span></button><div class="at-heading"><h1>On The Boulevard</h1><p>Asset twin <span id="atPersistence">Loading records</span></p></div><div class="at-mode" aria-label="Workspace mode"><button data-mode="inspect" aria-pressed="true">Inspect</button><button data-mode="present" aria-pressed="false">Present</button><button data-mode="field" aria-pressed="false">Field</button></div></header>
    <div class="at-body"><section class="at-model" aria-label="3D model and tools"><div class="at-toolbar"><div class="at-camera-tabs"><button data-camera="overview" aria-pressed="true">Overview</button><button data-camera="plan" aria-pressed="false">Plan</button><button data-camera="eye" aria-pressed="false">Eye level</button></div><div class="at-tool-actions"><button data-action="measure">Measure</button><button data-action="save-view">Save view</button><button data-action="reset">Fit model</button></div></div>
      <div class="at-level-row"><label for="atLevel">Level</label><select id="atLevel"><option value="all">All levels</option><option value="ground">Ground floor</option><option value="upper-101">Unit 101 · Upper floor</option><option value="upper-103">Unit 103 · Upper floor</option><option value="custom" hidden>Custom layers</option></select><button data-tab="sources">Plans & sources</button></div><div class="at-canvas" id="atCanvas"><div class="at-loading" id="atLoading">Loading the source model…</div></div>
      <div class="at-scene-note"><span id="atSceneNote">Source geometry · Model dimensions unverified</span><span id="atMeasureReadout" aria-live="polite"></span></div>
      <div class="at-presentation-bar"><button data-action="tour-prev">Previous stop</button><span id="atTourLabel">Guided walkway tour</span><button data-action="tour-next">Next stop</button><button data-action="tour-play">Play tour</button><button data-action="tour-stop">Stop</button></div>
      <details class="at-model-tools" open><summary>Layers & viewing tools</summary><div class="at-layer-grid"><label><input id="atColumns" type="checkbox" checked> Highlight columns</label><label><input id="atCanopy" type="checkbox"> Show canopy</label><label><input id="atWalls" type="checkbox" checked> Building walls</label><label><input id="atWalkway" type="checkbox" checked> Walkway</label><label><input id="atFade" type="checkbox"> Fade walls</label><label><input id="atCondition" type="checkbox"> Color by inspection</label><label><input id="atSuitePins" type="checkbox" checked> Suite labels</label><label><input id="atEquipmentPins" type="checkbox" checked> Equipment pins</label></div><div class="at-section-row"><label for="atSection">Section height</label><input id="atSection" type="range" min="0.4" max="4" step="0.1" value="4"><output id="atSectionValue">Full model</output><button data-action="clear-measure">Clear measure</button></div><div class="at-condition-key" id="atConditionKey" hidden>${Object.entries(conditions).map(([key,label])=>`<span><i style="background:${conditionColors[key]}"></i>${esc(label)}</span>`).join('')}</div></details>
    </section><aside class="at-panel" aria-label="Asset records"><nav class="at-panel-tabs"><button data-tab="assets" aria-pressed="true">Assets <span id="atAssetCount"></span></button><button data-tab="record" aria-pressed="false">Record</button><button data-tab="views" aria-pressed="false">Views</button><button data-tab="sources" aria-pressed="false">Sources</button></nav>
      <section id="atAssetsPane" class="at-pane"><div class="at-panel-head"><h2>Units & physical assets</h2><button data-action="new-asset" aria-label="Add an asset">${icon('plus')}</button></div><p class="at-muted">Permanent records, connected to the model.</p><label class="at-search"><span class="at-sr">Search assets</span><input id="atSearch" type="search" placeholder="Find C12, unit, equipment…"></label><label class="at-filter"><span>Show</span><select id="atType"><option value="all">All asset types</option>${options(types,'')}<option value="time_clock">Time clocks</option><option value="bench">Benches</option><option value="waste_bin">Trash cans</option></select></label><div id="atAssetList" class="at-asset-list"></div><p class="at-muted" id="atRegisterNote"></p></section>
      <section id="atRecordPane" class="at-pane" hidden><div id="atRecord"><h2>Select an asset</h2><p class="at-muted">Choose a column in the model or an item in the register.</p></div></section>
      <section id="atViewsPane" class="at-pane" hidden><h2>Views & finishes</h2><p class="at-muted">Create a repeatable tour and compare the model with the actual center.</p><button class="at-primary at-full" data-action="tour-start">Start guided walkway tour</button><div class="at-saved-views" id="atSavedViews"></div><div class="at-divider"></div><h3>Exterior reference</h3><label class="at-filter"><span>Materials</span><select id="atFinish"><option value="reference">Brochure reference</option><option value="neutral">Source neutral</option></select></label><p class="at-muted">Ivory columns, cream fascia and concrete walkway, based on your brochure. Roof profiles and sign geometry still follow the available model.</p><div class="at-reference-gallery"><figure><img src="${storefrontReference}" alt="Shopping center storefront and painted columns from the supplied marketing package"><figcaption>Storefront materials · Brochure p. 2</figcaption></figure><figure><img src="${aerialReference}" alt="Aerial view of the shopping center"><figcaption>Site and exterior · Brochure p. 4</figcaption></figure><figure><img src="${nightReference}" alt="Shopping center illuminated at night"><figcaption>Lighting reference · Brochure p. 6</figcaption></figure></div><p class="at-muted">Provided and generally confirmed current by Adam on September 24, 2026. Signage in photographs is a visual reference, not a tenant-status update.</p></section>
      <section id="atSourcesPane" class="at-pane" hidden>${sourcePaneHTML()}</section>
    </aside></div><div id="atMessage" class="at-message" role="status" aria-live="polite" hidden></div>
    <dialog id="atDialog" class="at-dialog"></dialog>`;
  document.body.append(root);
  const $=id=>root.querySelector(`#${id}`);
  const canWrite=()=>!document.body.classList.contains('state-recovery') && (LOCAL_REVIEW || REMOTE && account?.role==='operator');
  let scene=null,data=null,upperData=null,selectedId=null,loaded=false,loading=null,busy=false,mode='inspect',activeTab='assets',tourIndex=0,photoGeneration=0,viewStorageKey='';
  let savedViews=[];let currentPhotos=[];let openGeneration=0,messageTimer=0;const inertSiblings=new Map();
  const selected=()=>Assets.getPhysicalAsset(selectedId);
  const sourceId=a=>{const id=sourceObjectForAsset(a,data?.columns||[]);return id&&Assets.getPhysicalAssetForModelObject(id)?.id===a.id?id:null;};
  const showMessage=(text,error=false)=>{clearTimeout(messageTimer);$('atMessage').textContent=text;$('atMessage').hidden=false;$('atMessage').classList.toggle('is-error',error);messageTimer=setTimeout(()=>{$('atMessage').hidden=true;},error?14000:8000);};
  async function run(action,button){
    if(busy)return;busy=true;if(button)button.disabled=true;
    try{await action();}catch(error){showMessage(error.message||String(error),true);}finally{busy=false;if(button?.isConnected)button.disabled=false;}
  }
  function persistViews(next){
    try{localStorage.setItem(viewStorageKey,JSON.stringify(next));savedViews=next;}catch{throw new Error('This browser could not save the viewpoints. Free browser storage and retry.');}
  }
  function updateURL(assetId=selectedId){
    const url=new URL(location.href);url.searchParams.set('view','twin');if(assetId)url.searchParams.set('asset',assetId);else url.searchParams.delete('asset');url.hash='spatial';history.replaceState(null,'',url);
  }
  function close(){
    openGeneration++;photoGeneration++;loading=null;clearTimeout(messageTimer);$('atMessage').hidden=true;$('atDialog').close();
    scene?.stopTour();scene?.dispose();scene=null;loaded=false;root.hidden=true;document.body.classList.remove('asset-twin-open');
    for(const [element,previous] of inertSiblings)element.inert=previous;inertSiblings.clear();
    const url=new URL(location.href);url.searchParams.delete('view');url.searchParams.delete('asset');history.replaceState(null,'',url);launch.focus();
    for(const photo of currentPhotos)if(photo.url?.startsWith('blob:'))URL.revokeObjectURL(photo.url);currentPhotos=[];
  }
  function setTab(tab){
    activeTab=tab;for(const name of ['assets','record','views','sources']){$(`at${name[0].toUpperCase()+name.slice(1)}Pane`).hidden=name!==tab;root.querySelectorAll(`[data-tab="${name}"]`).forEach(button=>button.setAttribute('aria-pressed',String(name===tab)));}
    if(tab==='record')renderRecord();
  }
  function setMode(next){
    mode=next;root.dataset.mode=next;for(const button of root.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===next));
    scene?.setPresentation(next==='present');
    if(next==='present'){scene?.clearMeasurement();scene?.setSectionHeight(null);scene?.setFadeWalls(false);$('atCanopy').checked=true;scene?.setLayer('canopy',true);setTab('views');}
    if(next==='field')setTab(selectedId?'record':'assets');
    applyFinish();requestAnimationFrame(()=>scene?.resize());
  }
  function applyFinish(){
    scene?.setFinishPalette?.($('atFinish').value==='reference'?{walls:'#e6e2d7',columns:'#f0eee6',walkway:'#aaa9a1',canopy:'#d8cfba',canopyTop:'#666760',glazing:'#a8bdc5'}:null);
  }
  function refreshPins(){
    if(!scene)return;
    const assets=Assets.listPhysicalAssets();
    const pins=assets.filter(a=>!(a.type==='column'&&sourceId(a))&&(a.type==='unit'?$('atSuitePins').checked:$('atEquipmentPins').checked)).flatMap(a=>{const b=latestLocatedBinding(a);return b?[{assetId:a.id,label:a.label,position:b.metadata.position,levelId:b.metadata.source?.layerId,kind:a.type,condition:$('atCondition').checked?a.condition:null}]:[];});
    scene.setAssetPins(pins);
    const colors={};for(const a of assets){const color=conditionColors[a.condition]||conditionColors.uninspected;colors[a.id]=color;const source=sourceId(a);if(source)colors[source]=color;}
    scene.setConditionColors($('atCondition').checked?colors:null);
    $('atConditionKey').hidden=!$('atCondition').checked;
  }
  function renderDirectory(){
    const assets=Assets.listPhysicalAssets();const query=$('atSearch').value.trim().toLowerCase();const type=$('atType').value;
    const visible=assets.filter(a=>(type==='all'||a.type===type||sourceAssetKind(a)===type)&&`${sourceSearchText(a)} ${UNITS.find(u=>u.unit===a.unit)?.dba||''}`.toLowerCase().includes(query));
    $('atAssetCount').textContent=assets.length;
    $('atAssetList').innerHTML=visible.length?visible.map(a=>`<button class="at-asset-row ${selectedId===a.id?'is-selected':''}" data-asset="${esc(a.id)}" aria-pressed="${selectedId===a.id}"><span class="at-asset-dot" style="background:${conditionColors[a.condition]||conditionColors.uninspected}"></span><span><strong>${esc(a.label)}</strong><small>${esc(sourceTypeLabels[sourceAssetKind(a)]||types[a.type]||a.type)}${a.unit&&a.type!=='unit'?` · Unit ${esc(a.unit)}`:''}</small></span><span class="at-location-note">${latestLocatedBinding(a)?'Located':'Unlocated'}</span></button>`).join(''):'<p class="at-muted">No assets match this search.</p>';
    const located=assets.filter(a=>latestLocatedBinding(a)).length;
    $('atRegisterNote').textContent=`${located} of ${assets.length} located in this model. Fixture pins are approximate source positions. Meters and clock references need onsite placement.`;
    const status=Assets.getPhysicalAssetsStatus();$('atPersistence').textContent=status.error?'Records need attention':LOCAL_REVIEW?'Local review · saved in this browser':REMOTE?'Shared property records':'Offline records';
  }
  function selectAsset(id,{focus=false}={}){
    const asset=Assets.getPhysicalAsset(id);if(!asset)return;
    selectedId=id;updateURL();const source=sourceId(asset);
    if(source){scene?.selectSource(source);if(focus)scene?.focusSource(source);}else{scene?.selectSource(null);scene?.selectAsset(id);if(focus)scene?.focusAsset(id);}
    setTab('record');renderDirectory();
  }
  const unitOptions=(unit='')=>`<option value="">Common area / property</option>${UNITS.map(u=>`<option value="${esc(u.unit)}" ${String(u.unit)===String(unit)?'selected':''}>Unit ${esc(u.unit)}${u.dba?` · ${esc(u.dba)}`:''}</option>`).join('')}`;
  function renderRecord(){
    const asset=selected();if(!asset)return;
    const writable=canWrite();const dims=asset.dimensions||{};const b=latestLocatedBinding(asset);const source=sourceId(asset);const c=data.columns.find(c=>c.id===source);
    const inspections=Assets.listPhysicalAssetInspections(asset.id);
    $('atRecord').innerHTML=`<div class="at-record-heading"><div><h2>${esc(asset.label)}</h2><p class="at-muted">${esc(types[asset.type])}${asset.unit?` · Unit ${esc(asset.unit)}`:' · Common area'}</p></div><button data-record-action="focus" ${!b?'disabled':''}>Focus</button></div><div class="at-record-state"><span style="--condition:${conditionColors[asset.condition]}">${esc(conditions[asset.condition])}</span><span>${asset.verification==='field-verified'?'Field verified':'Verification pending'}</span></div>
      ${c?.reviewNote?`<p class="at-warning">${esc(c.reviewNote)}</p>`:''}
      ${recordSourceHTML(asset,source)}
      <div class="at-record-actions"><button data-record-action="issue" class="at-primary" ${!writable?'disabled':''}>Record an issue</button><button data-record-action="qr">Asset link & QR</button></div>
      <div class="at-record-subtabs"><button data-record-scroll="atPhotoBlock">Photos</button><button data-record-scroll="atInspectionBlock">Inspections</button><button data-record-scroll="atWorkBlock">Work orders</button></div>
      <section class="at-record-section" id="atPhotoBlock"><div class="at-panel-head"><h3>Photos</h3><label class="at-upload ${!writable?'is-disabled':''}">${icon('camera')} Add photos<input id="atPhotoInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple ${!writable?'disabled':''}></label></div><div id="atPhotos" class="at-photos"><p class="at-muted">Loading photos…</p></div></section>
      <details class="at-record-section" open><summary>Asset details</summary><form id="atRecordForm"><fieldset ${!writable?'disabled':''}><label>Name<input name="label" value="${esc(asset.label)}" required maxlength="120"></label><label>Unit association<select name="unit" ${asset.type==='unit'?'disabled':''}>${unitOptions(asset.unit)}</select></label><label>Material / finish<input name="material" value="${esc(asset.material||'')}" placeholder="Not yet recorded" maxlength="160"></label><label>Asset notes<textarea name="notes" rows="3" maxlength="4000">${esc(asset.notes||'')}</textarea></label><div class="at-dimensions"><label>Width<input name="width" type="number" min="0.001" step="any" value="${dims.width||''}"></label><label>Depth<input name="depth" type="number" min="0.001" step="any" value="${dims.depth||''}"></label><label>Height<input name="height" type="number" min="0.001" step="any" value="${dims.height||''}"></label><label>Units<select name="dimensionUnit">${options({ft:'Feet',m:'Meters',in:'Inches',cm:'Centimeters'},dims.unit||'ft')}</select></label></div><label class="at-checkbox"><input name="verified" type="checkbox" ${asset.verification==='field-verified'?'checked':''}> I have field-verified this asset record</label><button class="at-primary" type="submit">Save asset record</button></fieldset></form>${c?`<p class="at-muted">Source model bounds: ${c.dimensionsMeters.map(v=>(v/.3048).toFixed(2)).join(' × ')} ft (width × height × depth). Separate from recorded field measurements.</p>`:''}</details>
      <section class="at-record-section" id="atInspectionBlock"><h3>Inspection history</h3><div class="at-history">${inspections.length?inspections.map(i=>`<article><div><strong>${esc(conditions[i.condition]||i.condition)}</strong><time>${esc(i.date)}</time></div><p>${esc(i.notes||'No inspection notes.')}</p><small>${esc(i.inspector||'Inspector not recorded')}</small></article>`).join(''):'<p class="at-muted">No inspections recorded. Model appearance does not establish condition.</p>'}</div><details><summary>Add an inspection</summary><form id="atInspectionForm"><fieldset ${!writable?'disabled':''}><div class="at-two"><label>Inspection date<input type="date" name="date" value="${localDate()}" required></label><label>Condition<select name="condition">${options(conditions,asset.condition)}</select></label></div><label>Inspector<input name="inspector" value="${esc(account?.email||'')}" placeholder="Your name" maxlength="160"></label><label>Findings<textarea name="notes" rows="3" maxlength="6000" required></textarea></label><button type="submit" class="at-primary">Save inspection</button></fieldset></form></details></section>
      <section class="at-record-section" id="atWorkBlock"><h3>Linked OTB maintenance</h3><div id="atWorkOrders"></div></section>
      <details class="at-record-section"><summary>Identity & model binding</summary><p class="at-muted">This permanent ID holds the photos and history. Source objects can change without replacing it.</p><code class="at-asset-id">${esc(asset.id)}</code><p class="at-muted">${asset.bindings.length} source binding revision(s). ${b?'Model location recorded.':'No 3D location recorded.'}</p><button data-record-action="place" ${!writable||source?'disabled':''}>${b?'Update model location':'Place in model'}</button><button data-record-action="rebind" ${!writable?'disabled':''}>Link replacement model object</button></details>`;
    $('atRecordForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{
      await Assets.savePhysicalAsset({...asset,label:f.get('label'),unit:asset.type==='unit'?asset.unit:f.get('unit'),material:f.get('material'),notes:f.get('notes'),verification:f.has('verified')?'field-verified':'unverified',dimensions:{width:f.get('width'),depth:f.get('depth'),height:f.get('height'),unit:f.get('dimensionUnit')}});
      renderRecord();renderDirectory();showMessage('Asset record saved. Its permanent ID is unchanged.');
    },e.submitter);};
    $('atInspectionForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{
      await ensureSaved(asset);await Assets.appendPhysicalAssetInspection(asset.id,{date:f.get('date'),condition:f.get('condition'),notes:f.get('notes'),inspector:f.get('inspector'),material:asset.material,dimensions:asset.dimensions});
      renderRecord();renderDirectory();refreshPins();showMessage('Inspection added to the permanent history.');
    },e.submitter);};
    $('atPhotoInput').onchange=e=>{const files=[...e.target.files];if(!files.length)return;run(async()=>{
      await ensureSaved(asset);let count=0;for(const file of files){await Assets.addPhysicalAssetPhoto(file,asset.id);count++;}
      if(selectedId===asset.id)await renderPhotos(asset.id);showMessage(`${count} photo${count===1?'':'s'} saved to ${asset.label}.`);
    });};
    $('atRecord').querySelectorAll('[data-record-scroll]').forEach(button=>button.onclick=()=>$(button.dataset.recordScroll)?.scrollIntoView({block:'start',behavior:'auto'}));
    $('atRecord').querySelectorAll('[data-record-action]').forEach(button=>button.onclick=()=>recordAction(button.dataset.recordAction,button));
    renderPhotos(asset.id);renderWorkOrders();
  }
  async function renderPhotos(id){
    const generation=++photoGeneration;
    try{
      const photos=await Assets.listPhysicalAssetPhotos(id);
      if(generation!==photoGeneration||selectedId!==id){for(const photo of photos)if(photo.url?.startsWith('blob:'))URL.revokeObjectURL(photo.url);return;}
      for(const photo of currentPhotos)if(photo.url?.startsWith('blob:'))URL.revokeObjectURL(photo.url);currentPhotos=photos;
      $('atPhotos').innerHTML=photos.length?photos.map(photo=>`<a href="${esc(photo.url)}" target="_blank" rel="noopener" title="${esc(photo.name)}"><img src="${esc(photo.url)}" alt="${esc(photo.name)}"><span>${esc(photo.name)}</span></a>`).join(''):'<p class="at-muted">No photos attached to this asset yet.</p>';
    }catch(error){if(generation===photoGeneration&&$('atPhotos'))$('atPhotos').textContent=`Photos unavailable: ${error.message}`;}
  }
  function renderWorkOrders(){
    const host=$('atWorkOrders');if(!host)return;
    const requests=getMaintCache().filter(r=>r.asset_id===selectedId);
    host.innerHTML=requests.length?requests.map(r=>`<button class="at-work-order" data-work-order="${esc(r.id)}"><strong>${esc(r.title)}</strong><span>${esc(MR_STATUS[r.displayStatus]?.[0]||r.displayStatus)}${r.vendorId?` · Assigned vendor`:''}</span><small>Open in OTB maintenance ${icon('arrow')}</small></button>`).join(''):'<p class="at-muted">No maintenance requests linked to this asset.</p>';
    host.querySelectorAll('[data-work-order]').forEach(button=>button.onclick=()=>run(async()=>{const id=button.dataset.workOrder;close();await openMaintenanceRequest(id);},button));
  }
  async function ensureSaved(asset){return asset.persisted?asset:Assets.savePhysicalAsset(asset);}
  function dialog(title,body){
    const d=$('atDialog');d.classList.remove('at-map-dialog');d.innerHTML=`<header><h2>${esc(title)}</h2><button aria-label="Close dialog" data-dialog-close>${icon('close')}</button></header>${body}`;d.querySelector('[data-dialog-close]').onclick=()=>d.close();d.showModal();return d;
  }
  function recordAction(action,button){
    const asset=selected();if(!asset)return;
    if(action==='focus'){const source=sourceId(asset);if(source)scene.focusSource(source);else scene.focusAsset(asset.id);return;}
    if(action==='qr'){if(asset.persisted)showQR(asset);else if(canWrite())run(async()=>showQR(await ensureSaved(asset)),button);else showMessage('An operator must save this asset record before creating a permanent tag.',true);return;}
    if(!canWrite())return;
    if(action==='issue'){showIssue(asset);return;}
    if(action==='place')run(async()=>{
      if(sourceId(asset))throw new Error('This column is located by source geometry. Link its replacement object when the model changes.');
      await ensureSaved(asset);showMessage(`Click the actual model surface where ${asset.label} belongs. Press Escape to cancel.`);
      scene.beginPlacement(result=>run(async()=>{
        await Assets.bindModelSource(asset.id,{sourceKey:`manual:${asset.id}`,modelId,modelVersion:`placement-${Date.now()}`,objectId:asset.id,metadata:{position:result.position,placement:'operator-placed-unverified',source:result.source}});
        refreshPins();renderDirectory();renderRecord();showMessage(`${asset.label} placed. Its location remains unverified until checked onsite.`);
      }));
    },button);
    if(action==='rebind'){
      const d=dialog('Link a replacement model object',`<p class="at-muted">Photos and history stay on ${esc(asset.label)}. Enter the source object ID from the replacement model. This does not change model geometry.</p><form id="atBindForm"><label>Replacement object ID<input name="object" required maxlength="160"></label><label>Model revision<input name="revision" required value="${modelVersion}-revised" maxlength="160"></label><button type="submit" class="at-primary">Save new source binding</button></form>`);
      d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{await ensureSaved(asset);const object=String(f.get('object')).trim();const owner=Assets.getPhysicalAssetForModelObject(object);if(owner&&owner.id!==asset.id)throw new Error('That source object already belongs to another permanent record. Use an unclaimed replacement object.');const c=data.columns.find(c=>c.id===object);await Assets.bindModelSource(asset.id,{sourceKey:`model:${modelId}:column:${object}`,modelId,modelVersion:f.get('revision'),objectId:object,sourceGuids:c?.sourceRefs?.wallGuids||[],metadata:c?{position:c.position,dimensionsMeters:c.dimensionsMeters}:{registration:'pending-source-model'}});d.close();renderRecord();refreshPins();showMessage('New model binding saved. Existing inspection and photo history retained.');},e.submitter);};
    }
  }
  function showIssue(asset){
    const d=dialog(`Record an issue · ${asset.label}`,`<p class="at-muted">Create a request in the existing OTB maintenance queue, linked to this permanent asset.</p><form id="atIssueForm"><label>Issue title<input name="title" maxlength="120" placeholder="What needs attention?" required></label><label>Details<textarea name="detail" rows="4" maxlength="2000" required></textarea></label><div class="at-two"><label>Urgency<select name="urgency"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></label><label>Location<input value="${esc(asset.unit?'Unit '+asset.unit:'Common area')}" readonly></label></div><p class="at-muted">${LOCAL_REVIEW?'This creates a local review request only. No vendor is notified.':'Assignment and status changes are managed in OTB maintenance.'}</p><button type="submit" class="at-primary">Create linked request</button></form>`);
    d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{
      await ensureSaved(asset);const binding=latestLocatedBinding(asset);const point=binding?.metadata?.position;
      const id=await submitRequest({unit:asset.unit||'common-area',title:f.get('title'),detail:f.get('detail'),urgency:f.get('urgency'),assetId:asset.id,assetLabel:asset.label,spatialLocation:{modelId,sourceKey:binding?.source_key,label:asset.label,...(point?{position:{x:point[0],y:point[1],z:point[2]},units:'m'}:{})}},account?.email||'local-review');
      d.close();await refreshMaint();renderWorkOrders();showMessage(`Request saved and linked to ${asset.label}. Open it below to assign or track work.`);
      const link=$('atWorkOrders')?.querySelector(`[data-work-order="${CSS.escape(id)}"]`);link?.focus();
    },e.submitter);};
  }
  function showQR(asset){
    const d=dialog(`Asset link · ${asset.label}`,`<p class="at-muted">The tag opens this permanent record, even when its model object changes.</p><label>Application address<input id="atQrBase" type="url" value="${esc(location.origin+location.pathname)}"></label><div id="atQr" class="at-qr"></div><label>Asset link<input id="atQrLink" readonly></label><p class="at-muted" id="atQrNote"></p><button id="atQrDownload" class="at-primary">Download SVG tag</button>`);
    let svg='';
    const update=()=>{try{const link=assetTwinLink(d.querySelector('#atQrBase').value,asset.id);svg=assetQrSvg(link);d.querySelector('#atQr').innerHTML=svg;d.querySelector('#atQrLink').value=link;d.querySelector('#atQrNote').textContent=LOCAL_REVIEW?'Local preview: this record is saved only in this browser. A phone cannot open this loopback address. Deploy and persist the same asset record before printing field tags.':'Use the deployment containing this record. The person scanning must have property access.';d.querySelector('#atQrDownload').disabled=false;}catch(error){d.querySelector('#atQrNote').textContent=error.message;d.querySelector('#atQrDownload').disabled=true;}};
    d.querySelector('#atQrBase').oninput=update;update();d.querySelector('#atQrDownload').onclick=()=>downloadBlob(new Blob([svg],{type:'image/svg+xml'}),`${asset.label.replace(/[^a-z0-9_-]/gi,'-')}-asset-tag.svg`);
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function newAsset(){
    if(!canWrite())return;
    const d=dialog('Add a physical asset',`<form><label>Asset type<select name="type">${options(types,'hvac')}</select></label><label>Name / field label<input name="label" required maxlength="120" placeholder="e.g. RTU-101-A"></label><label>Unit association<select name="unit">${unitOptions()}</select></label><p class="at-muted">The new record starts uninspected and unlocated. Place it in the model after saving.</p><button type="submit" class="at-primary">Create permanent record</button></form>`);
    d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{const asset=await Assets.savePhysicalAsset({type:f.get('type'),label:f.get('label'),unit:f.get('unit'),verification:'unverified'});d.close();renderDirectory();selectAsset(asset.id);showMessage('Permanent asset record created.');},e.submitter);};
  }
  function renderViews(){
    $('atSavedViews').innerHTML=`<h3>Saved viewpoints</h3>${savedViews.length?savedViews.map((v,i)=>`<div><button data-restore-view="${i}">${esc(v.name)}</button><button data-remove-view="${i}" aria-label="Remove saved view ${esc(v.name)}">${icon('close')}</button></div>`).join(''):'<p class="at-muted">Position the camera, then choose Save view.</p>'}<p class="at-muted">Viewpoints are saved in this browser. They do not contain asset records.</p><a class="at-download" href="${import.meta.env.BASE_URL}twin/complete-model.glb" download="On-The-Boulevard-All-Levels.glb">Download complete model (.glb)</a><a class="at-download" href="${upperModelUrl}" download="On-The-Boulevard-Upper-Floors.glb">Download upper floors (.glb)</a><a class="at-download" href="${upperDataUrl}" download="On-The-Boulevard-Upper-Floors.json">Download upper-floor geometry & sources (.json)</a><p class="at-muted">Exports retain editable geometry and source IDs. Upper-floor elevation and stair envelopes remain unverified.</p>`;
  }
  function tourStep(delta){
    if(!loaded||!scene||!data?.columns?.length)return;const columns=data.columns;tourIndex=(tourIndex+delta+columns.length)%columns.length;const c=columns[tourIndex];scene.setView('eye');scene.focusSource(c.id);$('atTourLabel').textContent=`${c.label} · Stop ${tourIndex+1} of ${columns.length}`;
  }
  function syncSceneControls(event){
    if(['selection','focus','tour-stop','view-restored'].includes(event.reason)){
      const asset=event.selectedSourceId?Assets.getPhysicalAssetForModelObject(event.selectedSourceId):event.selectedAssetId?Assets.getPhysicalAsset(event.selectedAssetId):null;
      if(asset&&asset.id!==selectedId){selectedId=asset.id;updateURL();renderDirectory();if(activeTab==='record')renderRecord();}
      if(event.selectedSourceId)tourIndex=data.columns.findIndex(c=>c.id===event.selectedSourceId);
    }
    if(event.level){$('atLevel').value=event.level;$('atSceneNote').textContent=event.level.startsWith('upper-')?'Registered source upper floor · Elevation unverified (3.05 m source level)':'Source geometry · Upper elevations and field dimensions unverified';}
    if(event.layers)for(const [id,category] of [['atCanopy','canopy'],['atWalls','walls'],['atWalkway','walkway']])$(id).checked=!!event.layers[category];
    if(typeof event.fadeWalls==='boolean')$('atFade').checked=event.fadeWalls;
    if(typeof event.highlight==='boolean')$('atColumns').checked=event.highlight;
    if('sectionHeight' in event){$('atSection').value=event.sectionHeight??Number($('atSection').max);$('atSectionValue').textContent=event.sectionHeight==null?'Full model':`${(event.sectionHeight/.3048).toFixed(1)} ft`;}
  }
  async function open(){
    root.hidden=false;document.body.classList.add('asset-twin-open');updateURL(readAssetTwinLink(location.href).assetId||selectedId);
    for(const element of document.body.children)if(element!==root&&!inertSiblings.has(element)){inertSiblings.set(element,element.inert);element.inert=true;}
    root.querySelector('[data-action="close"]').focus();
    if(loaded){scene?.resize();return;}if(loading)return loading;const generation=++openGeneration;
    $('atLoading').hidden=false;$('atLoading').textContent='Loading the source model…';
    loading=(async()=>{
      const responses=await Promise.all([fetch(dataUrl),fetch(upperDataUrl)]);if(responses.some(response=>!response.ok))throw new Error('The model or upper-floor register could not load.');[data,upperData]=await Promise.all(responses.map(response=>response.json()));
      $('atSection').max=Math.ceil(Math.max(data.boundsMeters.max[1],...upperData.layers.map(layer=>layer.boundsMeters.max[1]))*10)/10;
      const ctx=REMOTE?await propertyContext():{slug:'otb',property_id:'otb'};if(REMOTE&&ctx.slug!=='otb')throw new Error('This model belongs to On The Boulevard. Switch to that property before opening it.');
      viewStorageKey=`otb-twin-views:v1:${LOCAL_REVIEW?'review':ctx.property_id}`;try{savedViews=JSON.parse(localStorage.getItem(viewStorageKey)||'[]');if(!Array.isArray(savedViews))savedViews=[];}catch{savedViews=[];}
      const inventory=REMOTE?await listHvacUnits():[];
      const items=[...sourceItems,...inventory.map(item=>({sourceKey:`hvac:${item.id}`,type:'hvac',label:item.label||item.name||`HVAC ${item.unit||''} ${item.id}`,unit:item.unit,metadata:{source:'hvac_units',sourceId:item.id}})),...getFeatures().map(item=>({sourceKey:`site-feature:${item.id}`,type:types[item.type]?item.type:'other',label:item.label||`${types[item.type]||'Site asset'} ${item.id}`,metadata:{source:'site-feature',sourceId:item.id,planCoordinates:{x:item.x,y:item.y},registration:'2D plan; not registered to 3D'}}))];
      await Assets.initializePhysicalAssets({units:UNITS,columns:data.columns,items,modelVersion,modelId,propertyKey:LOCAL_REVIEW?'otb-local-review':ctx.slug});await refreshMaint();
      const {createAssetTwinScene}=await import('../lib/asset-twin-scene.js');
      if(root.hidden||generation!==openGeneration)return;
      scene=createAssetTwinScene($('atCanvas'),{data,modelUrl,upperData,upperModelUrl,onSelect:selection=>{const asset=selection.kind==='asset'?Assets.getPhysicalAsset(selection.assetId):Assets.getPhysicalAssetForModelObject(selection.sourceId);if(asset)selectAsset(asset.id);},onMeasurement:event=>{$('atMeasureReadout').textContent=event.status==='complete'?`Model distance: ${(event.distanceMeters/.3048).toFixed(2)} ft · ${event.distanceMeters.toFixed(2)} m`:event.status==='started'?'Pick two model surfaces':event.status==='point'?'Pick the second model surface':'';},onChange:event=>{syncSceneControls(event);if(event.mode){root.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===event.mode)));}if(event.tour?.running)$('atTourLabel').textContent=`Tour stop ${event.tour.index+1} of ${event.tour.total}`;}});
      const createdScene=scene;await createdScene.ready;if(root.hidden||generation!==openGeneration||scene!==createdScene)return;loaded=true;$('atLoading').hidden=true;syncSceneControls(scene.getState());renderDirectory();refreshPins();renderViews();applyFinish();setMode(mode);
      const requested=readAssetTwinLink(location.href).assetId||selectedId;if(requested){if(Assets.getPhysicalAsset(requested))selectAsset(requested);else showMessage('This asset record is not available in this property or browser. Select a record from the register.',true);}
      root.querySelector('[data-action="new-asset"]').disabled=!canWrite();
    })().catch(error=>{if(generation!==openGeneration)return;scene?.dispose();scene=null;$('atLoading').textContent=`The asset twin could not open: ${error.message}`;showMessage(error.message,true);}).finally(()=>{if(generation===openGeneration)loading=null;});return loading;
  }
  launch.onclick=open;
  root.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.sourceMap){openSourceMap(dialog,button.dataset.sourceMap);return;}
    if(button.dataset.upperUnit){scene?.setLevel(`upper-${button.dataset.upperUnit}`);return;}
    if(button.dataset.sourceUnit){const asset=Assets.getPhysicalAssetForSource(`unit:${button.dataset.sourceUnit}`);if(asset)selectAsset(asset.id);return;}
    if(button.dataset.asset){selectAsset(button.dataset.asset);return;}
    if(button.dataset.tab){setTab(button.dataset.tab);return;}
    if(button.dataset.mode){setMode(button.dataset.mode);return;}
    if(button.dataset.camera){scene?.setView(button.dataset.camera);return;}
    if(button.dataset.restoreView!=null){scene?.restoreView(savedViews[+button.dataset.restoreView].view);return;}
    if(button.dataset.removeView!=null){run(async()=>{persistViews(savedViews.filter((_,i)=>i!==+button.dataset.removeView));renderViews();});return;}
    const action=button.dataset.action;
    if(action==='close')close();
    if(action==='reset')scene?.setView('overview');
    if(action==='measure'){scene?.beginMeasurement();showMessage('Pick two visible model surfaces. Distances are based on unverified model geometry.');}
    if(action==='clear-measure')scene?.clearMeasurement();
    if(action==='new-asset')newAsset();
    if(action==='save-view'){
      if(!scene)return;const view=scene.saveView();const d=dialog('Save viewpoint','<form><label>View name<input name="name" required maxlength="80" placeholder="e.g. West walkway"></label><button class="at-primary" type="submit">Save viewpoint</button></form>');
      d.querySelector('form').onsubmit=event=>{event.preventDefault();const name=String(new FormData(event.currentTarget).get('name')).trim();if(!name)return;run(async()=>{persistViews([...savedViews,{name,view}]);d.close();renderViews();showMessage('Viewpoint saved in this browser.');},event.submitter);};
    }
    if(action==='tour-start'){setMode('present');tourIndex=-1;tourStep(1);}
    if(action==='tour-prev')tourStep(-1);
    if(action==='tour-next')tourStep(1);
    if(action==='tour-play'&&loaded&&data){setMode('present');scene?.startTour(data.columns.filter((_,i)=>i%4===0).map(c=>c.id));}
    if(action==='tour-stop')scene?.stopTour();
  });
  $('atLevel').onchange=()=>scene?.setLevel($('atLevel').value);
  $('atSearch').oninput=renderDirectory;$('atType').onchange=renderDirectory;
  $('atColumns').onchange=()=>scene?.setHighlight($('atColumns').checked);
  for(const [id,category] of [['atCanopy','canopy'],['atWalls','walls'],['atWalkway','walkway']])$(id).onchange=()=>scene?.setLayer(category,$(id).checked);
  $('atFade').onchange=()=>scene?.setFadeWalls($('atFade').checked);
  $('atCondition').onchange=refreshPins;$('atSuitePins').onchange=refreshPins;$('atEquipmentPins').onchange=refreshPins;
  $('atSection').oninput=()=>{const height=Number($('atSection').value);scene?.setSectionHeight(height>=Number($('atSection').max)?null:height);$('atSectionValue').textContent=height>=Number($('atSection').max)?'Full model':`${(height/.3048).toFixed(1)} ft`;} ;
  $('atFinish').onchange=applyFinish;
  Assets.onPhysicalAssetsChange(()=>{if(!root.hidden){renderDirectory();refreshPins();}});onMaintChange(()=>{if(!root.hidden)renderWorkOrders();});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!root.hidden){scene?.cancelPlacement();scene?.stopTour();}});
  window.addEventListener('popstate',()=>{if(!readAssetTwinLink(location.href).open&&!root.hidden)close();});
  if(REMOTE)sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')close();});
  if(readAssetTwinLink(location.href).open)open();
  return {open,close};
}
