import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  normalizeWaterMarkers, waterMarkerVisible, waterReferenceBounds, createWaterReferenceMarker,
  setWaterReferenceSelected, restoreWaterReferenceState, waterReferenceTitle,
} from '../src/lib/asset-twin-water-markers.js';
import { modelDistance, pointInBounds, validateSavedView } from '../src/lib/asset-twin-scene-math.js';

const sourceBounds = { min: [-95, 0, -42], max: [95, 7, 41] };
const input = [
  { id: 'city-a', category: 'city-meter', code: 'M01', markerLabelRaw: '8', modelPositionMeters: [-102, 0, -46] },
  { id: 'city-b', category: 'city-meter', code: 'M02', markerLabelRaw: '8', modelPositionMeters: [101, 0, 45] },
  { id: 'shutoff-a', category: 'tenant-shutoff', code: 'S01', markerLabelRaw: '1', modelPositionMeters: [103, 0, 48] },
];
const dispose = root => root.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });

test('water references preserve repeated raw map numbers while using independent unique reference IDs/codes', () => {
  const before = structuredClone(input), result = normalizeWaterMarkers(input);
  assert.equal(result.rejected.length, 0); assert.equal(result.accepted.length, 3);
  assert.deepEqual(result.accepted.map(item => item.code), ['M01', 'M02', 'S01']);
  assert.deepEqual(result.accepted.map(item => item.markerLabelRaw), ['8', '8', '1']);
  assert.deepEqual(input, before);
  for (const item of result.accepted) {
    assert.equal(item.referenceOnly, true); assert.equal(item.physicalAsset, false);
    assert.equal(item.physicalVerification, 'unverified'); assert.equal(item.assetId, undefined);
  }
  result.accepted[0].modelPositionMeters[0] = 0;
  assert.equal(input[0].modelPositionMeters[0], -102, 'Normalizing reference geometry does not mutate source coordinates');
});

test('invalid and duplicate references are rejected without coercing positions or interpreting raw labels as quantities', () => {
  const result = normalizeWaterMarkers([
    ...input,
    { ...input[0] },
    { ...input[0], id: 'bad-category', category: '__proto__' },
    { ...input[0], id: 'bad-position', modelPositionMeters: [1, '2', 3] },
    { ...input[0], id: 'bad-number', modelPositionMeters: [Infinity, 0, 3] },
    { ...input[0], id: 'new-meter', code: 'M02', markerLabelRaw: '10' },
  ]);
  assert.equal(result.rejected.length, 4); assert.equal(result.accepted.length, 4);
  assert.equal(result.accepted[3].code, 'M03'); assert.equal(result.accepted[3].markerLabelRaw, '10');
  assert.equal(new Set(result.accepted.map(item => item.code)).size, 4);
});

test('water geometry is a symbolic reference overlay with no physical asset identity', () => {
  const marker = createWaterReferenceMarker(normalizeWaterMarkers(input).accepted[0]);
  assert.deepEqual(marker.position.toArray(), input[0].modelPositionMeters);
  assert.equal(marker.children.length, 3);
  for (const mesh of marker.children) {
    assert.equal(mesh.userData.referenceId, input[0].id);
    assert.equal(mesh.userData.category, 'water-reference');
    assert.equal(mesh.userData.referenceOnly, true); assert.equal(mesh.userData.physicalAsset, false);
    assert.equal(mesh.userData.assetId, undefined); assert.equal(mesh.userData.pin, undefined);
    assert.equal(mesh.userData.symbolicScale, true);
    assert.equal(mesh.material.depthTest, false); assert.equal(mesh.material.depthWrite, false);
    assert.ok(mesh.geometry.getAttribute('position').array.every(Number.isFinite));
  }
  const ray = new THREE.Raycaster(new THREE.Vector3(-102, 10, -46), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(marker, true).length, 'Reference points outside the building can be selected');
  dispose(marker);
});

test('blue/red reference layers have independent visibility and never show in upper-only or presentation mode', () => {
  const [meter, , shutoff] = normalizeWaterMarkers(input).accepted;
  assert.equal(waterMarkerVisible(meter, { ground: true }), false);
  const layers = new Map([['ground', true], ['water_meters', true], ['water_shutoffs', false]]);
  assert.equal(waterMarkerVisible(meter, layers), true); assert.equal(waterMarkerVisible(shutoff, layers), false);
  layers.set('water_shutoffs', true); layers.set('water_meters', false);
  assert.equal(waterMarkerVisible(meter, layers), false); assert.equal(waterMarkerVisible(shutoff, layers), true);
  assert.equal(waterMarkerVisible(shutoff, layers, true), false);
  layers.set('ground', false); assert.equal(waterMarkerVisible(shutoff, layers), false);
});

test('camera framing includes outside references without expanding native measurement/placement bounds', () => {
  const before = structuredClone(sourceBounds), frame = waterReferenceBounds(input, sourceBounds);
  assert.deepEqual(sourceBounds, before);
  for (const item of input) assert.equal(pointInBounds(item.modelPositionMeters, frame), true);
  assert.equal(pointInBounds(input[0].modelPositionMeters, sourceBounds), false);
  assert.throws(() => modelDistance([0, 0, 0], input[0].modelPositionMeters, sourceBounds), RangeError);
  assert.ok(frame.min[0] < sourceBounds.min[0] && frame.max[2] > sourceBounds.max[2]);
  assert.equal(sourceBounds.max[1], 7);
});

test('selected references restore their natural category colors without affecting another marker', () => {
  const items = normalizeWaterMarkers(input).accepted, first = createWaterReferenceMarker(items[0]), second = createWaterReferenceMarker(items[2]);
  const firstColor = first.children[0].material.color.getHex(), secondColor = second.children[0].material.color.getHex();
  assert.notEqual(firstColor, secondColor);
  setWaterReferenceSelected(first, true);
  assert.notEqual(first.children[0].material.color.getHex(), firstColor);
  assert.equal(second.children[0].material.color.getHex(), secondColor);
  setWaterReferenceSelected(first, false); assert.equal(first.children[0].material.color.getHex(), firstColor);
  dispose(first); dispose(second);
});

test('legacy saved views keep water layers off while new views retain known reference selection', () => {
  const legacy = { version: 1, mode: 'plan', position: [0, 250, 0], target: [0, 0, 0], zoom: 1, layers: { ground: true }, sectionHeight: null };
  assert.deepEqual(restoreWaterReferenceState(legacy, input.map(item => item.id)), {
    layers: { water_meters: false, water_shutoffs: false }, selectedWaterId: null, waterMapFit: false,
  });
  const current = { ...legacy, layers: { ...legacy.layers, water_meters: true, water_shutoffs: true }, selectedWaterId: 'city-b', waterMapFit: true };
  assert.equal(validateSavedView(current, sourceBounds, ['ground', 'water_meters', 'water_shutoffs']), true);
  assert.deepEqual(restoreWaterReferenceState(current, input.map(item => item.id)), {
    layers: { water_meters: true, water_shutoffs: true }, selectedWaterId: 'city-b', waterMapFit: true,
  });
  assert.equal(restoreWaterReferenceState({ ...current, selectedWaterId: 'missing' }, input.map(item => item.id)).selectedWaterId, null);
});

test('accessible map labels distinguish confirmed group quantities from stable reference codes', () => {
  const marker = normalizeWaterMarkers([{ ...input[0], reportedCount: 8 }]).accepted[0];
  const title = waterReferenceTitle(marker);
  assert.match(title, /reference M01/); assert.match(title, /8 reported meters at this location/);
  assert.equal(marker.code, 'M01'); assert.equal(marker.markerLabelRaw, '8');
  const legacy = waterReferenceTitle(normalizeWaterMarkers(input).accepted[0]);
  assert.match(legacy, /source label 8/); assert.doesNotMatch(legacy, /8 reported/);
  const geometry = createWaterReferenceMarker(marker);
  assert.equal(geometry.userData.reportedCount, 8); assert.equal(geometry.userData.physicalAsset, false);
  dispose(geometry);
});
