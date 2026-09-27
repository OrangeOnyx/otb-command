import {esc} from '../lib/format.js';
import {sourceImageURL} from './asset-twin-sources.js';
import {waterLocations} from '../lib/asset-twin-water.js';
import waterMap from '../data/twin-water-map.json' with {type:'json'};
import aerial from '../data/twin-water-aerial.json' with {type:'json'};
import official from '../data/twin-water-official-imagery.json' with {type:'json'};
import candidates from '../data/twin-water-candidates.json' with {type:'json'};

const sources=[...aerial.sources.filter(source=>source.sourceImage.includes('dotd-2024')),...official.sources.filter(source=>!aerial.sources.some(other=>other.sourceImage===source.sourceImage)),...aerial.sources.filter(source=>!source.sourceImage.includes('dotd-2024'))];
const locations=waterLocations(waterMap);
export const waterEvidencePackage=()=>({schemaVersion:1,status:'Source comparison and candidate associations; service connections unverified',map:waterMap,candidates,imagery:{sources,officialSource:official,registration:aerial}});

export function openWaterAerial(dialog,{selectedId=null,onWaterSelect}={}){
  let sourceId=sources.find(source=>source.annotations?.length)?.id??sources[0].id;
  let selected=selectedId;
  const d=dialog('Aerial & GIS comparison',`<p class="at-muted">Compare mapped locations with roofs, rear access lanes and the original GIS symbols.</p><div class="at-aerial-controls"><label>Image<select id="atAerialSource">${sources.map(source=>`<option value="${esc(source.id)}" ${source.id===sourceId?'selected':''}>${esc(source.label)}</option>`).join('')}</select></label><label><input id="atAerialOverlay" type="checkbox" checked> Show mapped locations</label><label>Zoom<select id="atAerialZoom"><option value="1">Fit image</option><option value="2">2× detail</option><option value="3">3× detail</option></select></label></div><p class="at-muted" id="atAerialEvidence"></p><div class="at-aerial-scroll"><div id="atAerialImage"></div></div><div id="atAerialDetail" class="at-map-detail" aria-live="polite"></div><p class="at-warning">Projected markers come from your shutoff map. Their alignment with an aerial image does not independently verify a valve or its service connection.</p>`);
  d.classList.add('at-map-dialog');
  d.querySelector('.at-aerial-controls').insertAdjacentHTML('beforeend',`<label>Location<select id="atAerialLocation"><option value="">All locations</option>${locations.map(item=>`<option value="${esc(item.id)}" ${selected===item.id?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label><button id="atAerialCenter">Center selected</button>`);
  const overlay=d.querySelector('#atAerialOverlay'),image=d.querySelector('#atAerialImage'),detail=d.querySelector('#atAerialDetail');
  const locationSelect=d.querySelector('#atAerialLocation'),centerButton=d.querySelector('#atAerialCenter');
  const lifecycle=new AbortController();d.addEventListener('close',()=>lifecycle.abort(),{once:true});
  centerButton.onclick=()=>{const marker=[...image.querySelectorAll('[data-aerial-marker]')].find(button=>button.dataset.aerialMarker===selected);if(marker){const scroll=image.parentElement;scroll.scrollTo({left:marker.offsetLeft-scroll.clientWidth/2,top:marker.offsetTop-scroll.clientHeight/2});}};
  const renderDetail=()=>{
    const item=locations.find(item=>item.id===selected);
    const registered=sources.find(source=>source.id===sourceId).annotations?.some(point=>point.id===selected&&point.inCrop!==false);
    locationSelect.value=selected??'';centerButton.disabled=!registered||!overlay.checked;
    detail.innerHTML=item?`<strong>${esc(item.title)} · ${item.reportedCount} ${item.category==='city-meter'?'meter':'shutoff'}${item.reportedCount===1?'':'s'}</strong><p class="at-muted">${registered?'Source-map location projected onto this image. Toggle the overlay to inspect the underlying evidence.':'This image provides context only; the selected location is not registered on this image.'}</p><button data-aerial-focus>View location in 3D</button>`:'Select a projected marker to compare its location, or switch off the overlay to inspect the original image.';
    detail.querySelector('[data-aerial-focus]')?.addEventListener('click',()=>{d.close();onWaterSelect?.(selected);});
    image.querySelectorAll('[data-aerial-marker]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.aerialMarker===selected)));
  };
  const render=()=>{
    const source=sources.find(source=>source.id===sourceId),[w,h]=source.imageSizePx,crop=source.crop??{x:0,y:0,width:w,height:h},url=sourceImageURL(source.sourceImage);
    const points=(source.annotations??[]).filter(point=>point.inCrop!==false),registered=points.length>0;
    overlay.disabled=!registered;
    const zoom=Number(d.querySelector('#atAerialZoom').value);
    const availableWidth=image.parentElement.clientWidth,availableHeight=window.innerHeight*(window.matchMedia('(max-width:760px)').matches ? 0.52 : 0.6);
    const fitWidth=Math.min(availableWidth,availableHeight*crop.width/crop.height);
    image.style.width=`${fitWidth*zoom}px`;image.style.minWidth='0';image.style.margin=zoom===1?'0 auto':'0';image.style.aspectRatio=`${crop.width}/${crop.height}`;image.className='at-aerial-image';
    image.innerHTML=`<img src="${esc(url)}" alt="${esc(source.label)}" draggable="false" style="width:${w/crop.width*100}%;height:${h/crop.height*100}%;left:${-crop.x/crop.width*100}%;top:${-crop.y/crop.height*100}%">${registered&&overlay.checked?points.map(point=>{const item=locations.find(item=>item.id===point.id);if(!item)return '';return `<button class="at-aerial-marker" data-aerial-marker="${esc(item.id)}" style="left:${(point.imagePoint.x-crop.x)/crop.width*100}%;top:${(point.imagePoint.y-crop.y)/crop.height*100}%;--marker:${item.category==='city-meter'?'#174cc0':'#b43939'}" title="${esc(item.title)} · ${item.reportedCount}" aria-label="Compare ${esc(item.title)}">${esc(item.code)}</button>`;}).join(''):''}`;
    d.querySelector('#atAerialEvidence').innerHTML=`${esc(source.dateDisplay??'Date unknown')} · ${esc(source.dateStatus??'Image acquisition date unverified')}. ${registered?'Approximate alignment using building reference points.':'Context image; no registered overlay.'} ${source.attribution?esc(source.attribution)+'. ':''}<a href="${esc(url)}" target="_blank" rel="noopener">Open full image ↗</a>${source.sourceURL?` · <a href="${esc(source.sourceURL)}" target="_blank" rel="noopener">Official source ↗</a>`:''}`;
    if(source.id.startsWith('gis-'))d.querySelector('#atAerialEvidence').append(' Original GIS symbols are preserved; their legend is unverified.');
    image.querySelectorAll('[data-aerial-marker]').forEach(button=>button.onclick=()=>{selected=button.dataset.aerialMarker;renderDetail();});
    renderDetail();
  };
  d.querySelector('#atAerialSource').onchange=event=>{sourceId=event.target.value;render();};
  locationSelect.onchange=event=>{selected=event.target.value||null;renderDetail();};
  window.addEventListener('resize',render,{signal:lifecycle.signal});
  d.querySelector('#atAerialZoom').onchange=render;overlay.onchange=render;render();
}
