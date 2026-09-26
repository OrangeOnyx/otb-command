import { validBounds, isPoint3 } from './asset-twin-scene-math.js';

export const SITE_LAYER_LABELS = { parking:'Parking', landscape:'Grass & planting', sidewalk:'Sidewalks', service:'Service areas', roads:'Street context', 'off-parcel':'Off-parcel context' };
export const siteLayerKey = kind => `site-${kind}`;
export function siteZoneSourceKey(id) { return `site-area:${id}`; }
export function siteBindingForAsset(asset) {
  return (Array.isArray(asset?.bindings)?asset.bindings:[]).find(binding=>binding.model_id==='otb-site-context'&&binding.metadata?.assetKind==='site_area'
    &&typeof binding.metadata.siteZoneId==='string'&&binding.metadata.siteZoneId.trim()&&binding.source_key===siteZoneSourceKey(binding.metadata.siteZoneId))??null;
}
export function siteZoneForAsset(asset) {
  return siteBindingForAsset(asset)?.metadata.siteZoneId??null;
}
export function siteAreaSeeds(data) {
  const seen=new Set();
  return (Array.isArray(data?.zones)?data.zones:[]).filter(zone=>{
    if(!zone||zone.contextOnly||zone.assetRecord===false||typeof zone.id!=='string'||!zone.id.trim()||zone.id!==zone.id.trim()||seen.has(zone.id)||typeof zone.label!=='string'||!zone.label.trim()||!isPoint3(zone.position)||!validBounds(zone.boundsMeters)||!Object.hasOwn(SITE_LAYER_LABELS,zone.kind)||['roads','off-parcel'].includes(zone.kind))return false;
    seen.add(zone.id);return true;
  }).map(zone=>({sourceKey:siteZoneSourceKey(zone.id),type:'other',label:zone.label,unit:null,modelId:'otb-site-context',modelVersion:'site-context-v1',objectId:zone.id,
    metadata:{assetKind:'site_area',siteZoneId:zone.id,siteCategory:zone.kind,position:[...zone.position],boundsMeters:structuredClone(zone.boundsMeters),positionStatus:'source-derived-approximate',
      geometryStatus:zone.geometryStatus??'Source-derived; field verification pending',sourceDescription:structuredClone(zone.source??null),provenance:structuredClone(zone.provenance??null),
      locationMethod:'CAD/plat site context registered to the existing model. Display elevation is schematic; confirm location and grade onsite.',
      sourceRefs:[{file:'geometry.json · REV 14 / Boulev_CLEAN.dxf / recorded plat'}]}}));
}
