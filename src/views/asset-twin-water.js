import {esc} from '../lib/format.js';
import {waterLocations,findWaterMeters} from '../lib/asset-twin-water.js';
import {sourceImageURL} from './asset-twin-sources.js';
import candidates from '../data/twin-water-candidates.json' with {type:'json'};
import infrastructure from '../data/twin-infrastructure.json' with {type:'json'};
const countText=item=>`${item.reportedCount} ${item.category==='city-meter'?'meter':'shutoff'}${item.reportedCount===1?'':'s'}`;

export function waterPaneHTML(){return `<h2>Water & shutoffs</h2><p class="at-muted">City meters and tenant shutoffs from your source map.</p>
  <div class="at-water-actions"><button class="at-primary" data-water-action="overview">View all on plan</button><button data-source-map="water">Source map</button><button data-water-action="aerial">Compare aerial & GIS</button></div>
  <div class="at-water-key"><span><i style="background:#174cc0"></i> City meters</span><span><i style="background:#c44141"></i> Tenant shutoffs</span></div>
  <p class="at-muted"><strong>24 city meters · 37 tenant shutoffs</strong><br>Counts at the 19 marked locations, confirmed by Adam.</p><p class="at-warning">The map accounts for 24 city meters; the register has 28 IDs. Coverage and connections need reconciliation. Locations are approximate.</p>
  <p class="at-muted">Select a blue location to review candidate meter matches from the spreadsheet. Aerial/GIS comparisons provide additional location context.</p><div id="atWaterDetail" aria-live="polite"><p class="at-muted">Choose a location in the model or the list below.</p></div>
  <label class="at-filter"><span>Locations</span><select id="atWaterFilter"><option value="all">All 19 locations</option><option value="tenant-shutoff">13 tenant shutoff locations</option><option value="city-meter">6 city meter locations</option></select></label>
  <div id="atWaterLocations" class="at-water-list"></div>
  <details class="at-record-section" open><summary>Water meter register · 28 IDs</summary><p class="at-muted">Search by meter ID, suite, or the spreadsheet's location description. These records are not yet assigned to the map points.</p>
  <label class="at-search"><span class="at-sr">Find a water meter</span><input id="atWaterSearch" type="search" placeholder="105, Behind 119, W1204084…"></label><div id="atWaterMeters" class="at-water-list"></div></details>
  <div class="at-water-actions"><button data-water-action="evidence">Export evidence & candidates</button><button data-water-action="json">Export locations JSON</button><button data-water-action="csv">Export locations CSV</button></div><p class="at-muted">M/S codes identify map locations. The original circle numbers show the count of devices at each location.</p>`;}

export function waterLocationRows(data,filter='all',selectedId=null){return waterLocations(data).filter(item=>filter==='all'||item.category===filter).map(item=>`<button class="at-water-row" data-water-location="${esc(item.id)}" aria-pressed="${item.id===selectedId}"><span class="at-water-code" style="--water-color:${item.category==='city-meter'?'#174cc0':'#b43939'}">${esc(item.code)}</span><span><strong>${esc(item.category==='city-meter'?'City meter location':'Tenant shutoff location')}</strong><small>${esc(countText(item))} at this location</small></span></button>`).join('');}

export function waterDetailHTML(item,getAsset=()=>null){
  if(!item)return '<p class="at-muted">Choose a location in the model or the list below.</p>';
  const x=item.imagePoint.x/item.imagePoint.width*100,y=item.imagePoint.y/item.imagePoint.height*100;
  return `<section class="at-record-section at-water-detail"><h3>${esc(item.title)}</h3><p class="at-muted"><strong>${esc(countText(item))}</strong> at this location. Circle counts confirmed by Adam on September 25, 2026; individual devices await field verification.</p><div class="at-water-actions"><button data-water-focus="${esc(item.id)}">Focus location</button><button data-water-action="aerial">Compare aerial & GIS</button></div><div class="at-water-thumbnail"><img src="${esc(sourceImageURL(item.sourceImage))}" alt="Source water map with selected ${esc(item.code)} location"><span style="left:${x}%;top:${y}%" aria-hidden="true"></span></div>${candidateHTML(item,getAsset)}<p class="at-muted">Location traced from the supplied map and aligned to the building. Underground routes and valve operating connections are unverified.</p></section>`;
}

function candidateHTML(item,getAsset){
  const candidate=candidates.candidates.find(candidate=>candidate.mapAnnotationId===item.id);
  if(!candidate){const context=candidates.shutoffContexts.find(context=>context.mapAnnotationId===item.id);return `<h3>Location context</h3><p class="at-muted">${esc(context?.locationContext??'This is a tenant-shutoff cluster on the source plan.')} Nearby meters do not establish which service these valves isolate.</p>`;}
  const labels={'stronger-location-and-count':'Location and count agree','location-with-count-conflict':'Location clue · count conflict','needs-review':'Location needs review'};
  const records=infrastructure.items.filter(record=>candidate.proposedMeterIds.includes(record.metadata?.meterIdRaw));
  return `<div class="at-water-candidate"><h3>Candidate meter group</h3><strong class="at-candidate-status">${esc(labels[candidate.classification]??'Candidate · needs review')}</strong><p class="at-muted">Workbook IDs: ${candidate.proposedMeterCount} · Map count: ${candidate.reportedMapCount}. Proposed association; not confirmed.</p><p class="at-muted">${esc(Array.isArray(candidate.rationale)?candidate.rationale.join(' '):candidate.rationale)}</p>${(candidate.contradictions??[]).map(text=>`<p class="at-warning">${esc(text)}</p>`).join('')}<details><summary>Review candidate meter records (${records.length})</summary>${waterMeterRows(records,'',getAsset)}</details><p class="at-muted">Basis: workbook location descriptions and the numbered site plan. Aerial imagery provides site context; it does not identify the individual meter IDs.</p></div>`;
}

export function waterMeterRows(items,query,getAsset){
  const matches=findWaterMeters(items,query);
  return `<p class="at-muted">${matches.length} meter record${matches.length===1?'':'s'}</p>`+matches.map(item=>{
    const m=item.metadata,asset=getAsset(item.sourceKey);
    return `<button class="at-water-meter" ${asset?`data-asset="${esc(asset.id)}"`:'disabled'}><strong>${esc(m.meterIdRaw)}</strong><span>${esc(item.unit?`Unit ${item.unit}`:`House service · source ${m.originalUnitLabel}`)}${m.purposeRaw?` · ${esc(m.purposeRaw)}`:''}</span><small>${esc(m.approximateLocationRaw&&m.approximateLocationRaw!=='?'?`Workbook: ${m.approximateLocationRaw}`:'Workbook location unknown')}</small></button>`;
  }).join('');
}
