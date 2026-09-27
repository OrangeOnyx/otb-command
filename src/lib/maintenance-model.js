/* Shared event derivation for the existing M-1 queue and evidence reads. */
export const COMMON_AREA_UNIT = 'common-area';
export const LOCAL_MAINTENANCE_KEY = 'otb-maintenance:local-review:v1:otb';

/* Only immutable linkage is stored on the request head. Status, assignment,
   condition, and inspection findings are never inferred from a model. */
export function maintenanceLinkFields({ unit, assetId, assetLabel, spatialLocation } = {}) {
  const actualUnit = String(unit ?? '').trim();
  if (!actualUnit || /^C\d{1,3}$/i.test(actualUnit)) throw new Error('Choose a real suite or common-area; a column label is not a unit.');
  const fields = { unit: actualUnit };
  if (assetId != null && assetId !== '') {
    if (!/^pa_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) throw new Error('A permanent physical asset ID is required.');
    fields.asset_id = assetId;
    fields.asset_label = String(assetLabel || '').trim().slice(0, 160) || null;
  } else if (assetLabel) throw new Error('An asset label requires a permanent asset ID.');
  if (spatialLocation != null) {
    if (typeof spatialLocation !== 'object' || Array.isArray(spatialLocation)) throw new Error('Spatial location must be an object.');
    const location = {};
    for (const key of ['modelId', 'sourceKey', 'label']) {
      if (spatialLocation[key] != null) {
        const value = String(spatialLocation[key]).trim().slice(0, 240);
        if (value) location[key] = value;
      }
    }
    if (spatialLocation.position != null) {
      const p = spatialLocation.position;
      if (!p || !['x', 'y', 'z'].every(key => typeof p[key] === 'number' && Number.isFinite(p[key]))) throw new Error('Spatial coordinates must be finite numbers.');
      if (spatialLocation.units !== 'm') throw new Error('Spatial coordinates must explicitly use meters (units: m).');
      location.position = { x: p.x, y: p.y, z: p.z }; location.units = 'm';
    }
    if (!Object.keys(location).length) throw new Error('Provide a spatial label, source reference, or position.');
    fields.spatial_location = location;
  }
  return fields;
}

export function maintenanceLocationLabel(row) {
  const unit = row.unit === COMMON_AREA_UNIT ? 'Common area' : `Unit ${row.unit}`;
  return [...new Set([unit, row.asset_label, row.spatial_location?.label].filter(Boolean))].join(' · ');
}

export function maintenanceEventFields({ kind, status = null, vendorId = null, note = '' } = {}) {
  const text = String(note || '').trim().slice(0, 1000);
  if (!['status', 'assign', 'note'].includes(kind)) throw new Error('Unknown maintenance event.');
  if (kind === 'status' && !['open', 'in_progress', 'done', 'closed'].includes(status)) throw new Error('Unknown maintenance status.');
  if (kind === 'assign' && !String(vendorId || '').trim()) throw new Error('Choose a vendor.');
  if (kind === 'note' && !text) throw new Error('A note cannot be empty.');
  return { kind, status: kind === 'status' ? status : null, vendor_id: kind === 'assign' ? String(vendorId).trim() : null, note: text };
}

/* Separate browser-only review copy. No seed business records, remote client,
   synchronization, or mutation of existing heads/events. Inject storage for
   meaningful persistence/reload tests without enabling review in production. */
export function createLocalMaintenanceStore(storage, key = LOCAL_MAINTENANCE_KEY) {
  const read = () => {
    const raw = storage.getItem(key);
    if (!raw) return { version: 1, requests: [], events: [] };
    let value; try { value = JSON.parse(raw); } catch { throw new Error('Local maintenance review data is unreadable; it has not been overwritten.'); }
    if (value.version !== 1 || !Array.isArray(value.requests) || !Array.isArray(value.events)) throw new Error('Unsupported local maintenance review data; it has not been overwritten.');
    return value;
  };
  const save = data => storage.setItem(key, JSON.stringify(data));
  return {
    list() { const data = read(); return data.requests.map(row => deriveRequest(row, data.events)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); },
    insertRequest(row) {
      const data = read();
      if (data.requests.some(r => r.id === row.id)) throw new Error('Request ID already exists.');
      data.requests.push({ ...row, local_review: true }); save(data);
    },
    appendEvent(requestId, event, actor, createdAt = new Date().toISOString()) {
      const data = read();
      if (!data.requests.some(r => r.id === requestId)) throw new Error('Local review request not found.');
      data.events.push({ ...maintenanceEventFields(event), id: data.events.length + 1, request_id: requestId, actor: String(actor || ''), created_at: createdAt, local_review: true }); save(data);
    },
  };
}

export function deriveRequest(row, events = []) {
  const forThis = events.filter(e => e.request_id === row.id);
  const latest = kind => forThis.filter(e => e.kind === kind).slice(-1)[0] || null;
  const st = latest('status'), asg = latest('assign');
  const status = (st && st.status) || 'open';
  const vendorId = asg ? asg.vendor_id : null;
  return {
    ...row, events:forThis, status, vendorId,
    displayStatus:status === 'open' && vendorId ? 'assigned' : status,
    lastAt:forThis.length ? forThis[forThis.length - 1].created_at : row.created_at,
  };
}
