import infrastructure from '../data/twin-infrastructure.json' with { type: 'json' };
import fixtures from '../data/twin-site-fixtures.json' with { type: 'json' };

export { infrastructure, fixtures };
export const fixtureSeeds=fixtures.items.filter(item=>item.seedPolicy==='new_asset_candidate').map(item=>({
  sourceKey:item.sourceKey,type:'other',label:item.label,unit:null,modelId:'otb-a1-fixtures',modelVersion:'source-registration-v1',objectId:item.id,
  metadata:{assetKind:item.kind,position:item.modelPositionMeters,positionStatus:item.positionStatus,physicalVerification:'not-verified',
    sourceImage:'infrastructure/site-fixtures.png',sourceRefs:[{file:item.provenance.sourceFile}],sourceImagePx:item.sourceImagePx,
    locationMethod:item.provenance.locationMethod,registrationRmsMeters:fixtures.registration.planToNative.rmsMeters,
    registrationMaxMeters:fixtures.registration.planToNative.maxResidualMeters}
}));
export const sourceItems=[...infrastructure.items,...fixtureSeeds];
const sourcesByKey=new Map(sourceItems.map(item=>[item.sourceKey,item]));
export function sourceItemForAsset(asset){return asset?.bindings?.map(binding=>sourcesByKey.get(binding.source_key)).find(Boolean)??null;}
export function sourceMetadata(asset){return sourceItemForAsset(asset)?.metadata??{};}
export function sourceAssetKind(asset){return sourceMetadata(asset).assetKind??asset?.type;}
export function columnReference(modelColumnId){return fixtures.items.find(item=>item.kind==='column'&&item.modelColumnId===modelColumnId)??null;}
export function sourceSearchText(asset){const m=sourceMetadata(asset);return [asset.label,asset.unit,m.meterIdRaw,m.utility,m.originalUnitLabel,m.approximateLocationRaw,...(m.servedUnits??[])].filter(Boolean).join(' ').toLowerCase();}
export const sourceTypeLabels={time_clock:'Time clock reference',bench:'Bench',waste_bin:'Trash can',utility_meter:'Utility meter'};
