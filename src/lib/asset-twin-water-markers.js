import * as THREE from 'three';
import { isPoint3, validBounds } from './asset-twin-scene-math.js';

export const WATER_REFERENCE_STYLES = Object.freeze({
  'city-meter': Object.freeze({ layer: 'water_meters', prefix: 'M', color: '#2464e8', background: '#edf3ff', label: 'City meter reference' }),
  'tenant-shutoff': Object.freeze({ layer: 'water_shutoffs', prefix: 'S', color: '#d54c57', background: '#fff0f1', label: 'Tenant shutoff reference' }),
});

/** Map references are independent of permanent physical assets and raw marker numbers. */
export function normalizeWaterMarkers(items = []) {
  const accepted = [], rejected = [], seen = new Set(), usedCodes = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const style = Object.hasOwn(WATER_REFERENCE_STYLES, item?.category) ? WATER_REFERENCE_STYLES[item.category] : null;
    if (typeof item?.id !== 'string' || !item.id.trim() || seen.has(item.id) || !style || !isPoint3(item.modelPositionMeters)) {
      rejected.push({ id: item?.id ?? null, reason: 'A unique reference ID, supported water category and finite model position are required.' });
      continue;
    }
    seen.add(item.id);
    const suppliedCode = item.code ?? item.label;
    let code = typeof suppliedCode === 'string' && new RegExp(`^${style.prefix}\\d{2,3}$`).test(suppliedCode) && !usedCodes.has(suppliedCode) ? suppliedCode : null;
    if (!code) { let sequence = 1; do { code = `${style.prefix}${String(sequence++).padStart(2, '0')}`; } while (usedCodes.has(code)); }
    usedCodes.add(code);
    accepted.push({ ...item, code, modelPositionMeters: [...item.modelPositionMeters],
      markerLabelRaw: item.markerLabelRaw ?? '', referenceOnly: true, physicalAsset: false, physicalVerification: 'unverified' });
  }
  return { accepted, rejected };
}

export function waterMarkerVisible(item, layers, presentation = false) {
  const get = key => layers instanceof Map ? layers.get(key) : layers?.[key];
  return !presentation && get('ground') !== false && get(WATER_REFERENCE_STYLES[item.category]?.layer) === true;
}

export function waterReferenceTitle(item) {
  const style = WATER_REFERENCE_STYLES[item.category];
  const count = Number.isInteger(item.reportedCount) && item.reportedCount >= 0 ? item.reportedCount : null;
  const noun = item.category === 'city-meter' ? 'meter' : 'shutoff';
  const detail = count !== null ? ` · ${count} reported ${noun}${count === 1 ? '' : 's'} at this location`
    : item.markerLabelRaw === '' || item.markerLabelRaw == null ? '' : ` · source label ${String(item.markerLabelRaw)}`;
  return `Select ${style.label} ${item.code}${detail} — approximate source-map location`;
}

export function restoreWaterReferenceState(view, markerIds = []) {
  return {
    layers: { water_meters: view?.layers?.water_meters === true, water_shutoffs: view?.layers?.water_shutoffs === true },
    selectedWaterId: typeof view?.selectedWaterId === 'string' && markerIds.includes(view.selectedWaterId) ? view.selectedWaterId : null,
    waterMapFit: view?.mode === 'plan' && view?.waterMapFit === true,
  };
}

/** Separate camera framing bounds; never expand source measurement/placement bounds. */
export function waterReferenceBounds(items, sourceBounds) {
  if (!validBounds(sourceBounds)) throw new TypeError('Valid source bounds are required');
  const result = { min: [...sourceBounds.min], max: [...sourceBounds.max] };
  for (const item of items) {
    if (!isPoint3(item?.modelPositionMeters)) continue;
    const [x, y, z] = item.modelPositionMeters;
    result.min[0] = Math.min(result.min[0], x - 1.2); result.max[0] = Math.max(result.max[0], x + 1.2);
    result.min[1] = Math.min(result.min[1], y); result.max[1] = Math.max(result.max[1], y + 1.5);
    result.min[2] = Math.min(result.min[2], z - 1.2); result.max[2] = Math.max(result.max[2], z + 1.2);
  }
  return result;
}

/** Symbolic overlay glyph, deliberately not a physical valve or meter model. */
export function createWaterReferenceMarker(item) {
  const style = Object.hasOwn(WATER_REFERENCE_STYLES, item?.category) ? WATER_REFERENCE_STYLES[item.category] : null;
  if (!style || !isPoint3(item.modelPositionMeters) || typeof item.id !== 'string') throw new TypeError('A valid water reference is required');
  const group = new THREE.Group(); group.name = `water-reference:${item.id}`;
  group.position.fromArray(item.modelPositionMeters);
  const data = { referenceId: item.id, referenceOnly: true, physicalAsset: false, symbolicScale: true,
    category: 'water-reference', waterCategory: item.category, markerLabelRaw: item.markerLabelRaw,
    reportedCount: Number.isInteger(item.reportedCount) && item.reportedCount >= 0 ? item.reportedCount : null,
    code: item.code, sourcePositionMeters: [...item.modelPositionMeters], physicalVerification: 'unverified' };
  group.userData = { ...data };
  const surface = color => {
    const material = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
    material.userData.referenceBaseColor = color; return material;
  };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.68, .075, 6, 32), surface(style.color));
  ring.rotation.x = Math.PI / 2; ring.position.y = .09;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1.05, 8), surface(style.color)); stem.position.y = .6;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 8), surface(style.color)); sphere.position.y = 1.22;
  for (const [name, object] of [['ring', ring], ['stem', stem], ['point', sphere]]) {
    object.name = `${group.name}/${name}`; object.userData = { ...data, markerPart: name }; object.renderOrder = 45; group.add(object);
  }
  group.updateMatrixWorld(true);
  return group;
}

export function setWaterReferenceSelected(group, selected) {
  group.traverse(object => {
    if (!object.isMesh) return;
    object.material.color.set(selected ? '#e8861d' : object.material.userData.referenceBaseColor);
  });
}
