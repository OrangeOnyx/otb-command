// Map references are independent of physical asset records and meter membership.
export function waterLocationCode(item) {
  const suffix=String(item.id).split(':').at(-1);
  return `${item.category==='city-meter'?'M':'S'}${suffix}`;
}
export function waterLocations(data) {
  return (data.annotations??[]).map(item=>({...item,code:waterLocationCode(item),
    label:waterLocationCode(item),title:`${item.category==='city-meter'?'City meter':'Tenant shutoff'} ${waterLocationCode(item)}`}));
}
export function findWaterMeters(items,query='') {
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item=>item.metadata?.utility==='water').filter(item=>{
    const m=item.metadata;
    const text=[item.label,item.unit,m.meterIdRaw,m.originalUnitLabel,m.approximateLocationRaw,m.purposeRaw,item.unit?null:'house common area'].filter(Boolean).join(' ').toLowerCase();
    return words.every(word=>text.includes(word));
  });
}
export function waterLocationsCSV(data) {
  const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
  const rows=[['reference_id','map_code','category','source_label','label_meaning','reported_count','model_x_m','model_y_m','model_z_m','position_status','source_pixel_x','source_pixel_y','member_meter_ids','served_units'],
    ...waterLocations(data).map(item=>[item.id,item.code,item.category,item.markerLabelRaw,item.markerLabelMeaning,item.reportedCount,...item.modelPositionMeters,item.positionStatus,item.imagePoint.x,item.imagePoint.y,'',''])];
  return rows.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
}
