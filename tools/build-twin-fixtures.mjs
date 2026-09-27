import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFixtureModel, disposeFixtureModel, projectFixtureToWalkway, FIXTURE_MODEL_VERSION } from '../src/lib/asset-twin-fixture-models.js';
import { parseGlb, writeGlb, validateGlb } from './merge-twin-glb.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const serializable = value => JSON.parse(JSON.stringify(value));

/** Export fixture meshes directly; no browser, canvas, texture or FileReader needed. */
export function encodeFixtureGlb(root) {
  const json = {
    asset: { version: '2.0', generator: FIXTURE_MODEL_VERSION }, scene: 0,
    scenes: [{ name: 'On The Boulevard · benches and trash cans', nodes: [0] }],
    nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [],
  };
  const chunks = [], geometryCache = new Map(), materialCache = new Map();
  let binaryLength = 0;
  function accessor(array, itemSize, target, position = false) {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padding = (4 - binaryLength % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); binaryLength += padding; }
    const view = json.bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: bytes.length, target }) - 1;
    chunks.push(bytes); binaryLength += bytes.length;
    const componentType = array instanceof Float32Array ? 5126 : array instanceof Uint16Array ? 5123 : 5125;
    const entry = { bufferView: view, componentType, count: array.length / itemSize, type: itemSize === 3 ? 'VEC3' : 'SCALAR' };
    if (position) {
      entry.min = Array(itemSize).fill(Infinity); entry.max = Array(itemSize).fill(-Infinity);
      for (let i = 0; i < array.length; i++) {
        const axis = i % itemSize;
        entry.min[axis] = Math.min(entry.min[axis], array[i]); entry.max[axis] = Math.max(entry.max[axis], array[i]);
      }
    }
    return json.accessors.push(entry) - 1;
  }
  function surface(material) {
    const entry = { name: material.userData.fixtureBaseColor, pbrMetallicRoughness: {
      baseColorFactor: [material.color.r, material.color.g, material.color.b, material.opacity],
      metallicFactor: material.metalness, roughnessFactor: material.roughness,
    } };
    const key = JSON.stringify(entry);
    if (!materialCache.has(key)) materialCache.set(key, json.materials.push(entry) - 1);
    return materialCache.get(key);
  }
  function mesh(object) {
    const geometry = object.geometry, position = geometry.getAttribute('position').array, normal = geometry.getAttribute('normal').array;
    const indices = geometry.getIndex()?.array;
    const material = surface(object.material);
    const key = `${sha256(Buffer.from(position.buffer, position.byteOffset, position.byteLength))}:${sha256(Buffer.from(normal.buffer, normal.byteOffset, normal.byteLength))}:${indices ? sha256(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength)) : ''}:${material}`;
    if (!geometryCache.has(key)) {
      const primitive = { attributes: { POSITION: accessor(position, 3, 34962, true), NORMAL: accessor(normal, 3, 34962) }, material };
      if (indices) primitive.indices = accessor(indices, 1, 34963);
      geometryCache.set(key, json.meshes.push({ name: object.userData.fixturePart, primitives: [primitive] }) - 1);
    }
    return geometryCache.get(key);
  }
  function node(object) {
    const entry = { name: object.name, extras: serializable(object.userData) };
    if (object.position.lengthSq()) entry.translation = object.position.toArray();
    if (!object.quaternion.equals(new THREE.Quaternion())) entry.rotation = object.quaternion.toArray();
    if (!object.scale.equals(new THREE.Vector3(1, 1, 1))) entry.scale = object.scale.toArray();
    const index = json.nodes.push(entry) - 1;
    if (object.isMesh) entry.mesh = mesh(object);
    if (object.children.length) entry.children = object.children.map(node);
    return index;
  }
  node(root);
  json.buffers.push({ byteLength: binaryLength });
  const output = writeGlb(json, Buffer.concat(chunks));
  validateGlb(parseGlb(output));
  return output;
}

export async function buildFixtureArtifacts({
  inventoryPath = path.join(ROOT, 'src/data/twin-site-fixtures.json'),
  baseModelPath = path.join(ROOT, 'public/twin/model.glb'),
  outputPath = path.join(ROOT, 'public/twin/fixtures.glb'),
  reportPath = path.join(ROOT, 'public/twin/fixture-models.json'),
} = {}) {
  const inventoryBytes = fs.readFileSync(inventoryPath), inventory = JSON.parse(inventoryBytes);
  const items = inventory.items.filter(item => ['bench', 'waste_bin'].includes(item.kind));
  if (new Set(items.map(item => item.sourceKey)).size !== items.length) throw new Error('Fixture source keys must be unique');
  const modelBytes = fs.readFileSync(baseModelPath);
  const gltf = await new GLTFLoader().parseAsync(modelBytes.buffer.slice(modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength), '');
  const walkway = gltf.scene.getObjectByName('walkway') ?? (() => {
    let found;
    gltf.scene.traverse(object => { if (!found && object.userData.category === 'walkway') found = object; });
    return found;
  })();
  if (!walkway) throw new Error('Ground model is missing its walkway category; fixture support cannot be checked');
  const root = new THREE.Group();
  root.name = 'fixtures';
  root.userData = { category: 'fixtures', modelVersion: FIXTURE_MODEL_VERSION, physicalVerification: 'unverified' };
  const report = {
    schemaVersion: 1, modelVersion: FIXTURE_MODEL_VERSION, units: 'meters', upAxis: 'Y',
    count: items.length, counts: { benches: items.filter(item => item.kind === 'bench').length, trashCans: items.filter(item => item.kind === 'waste_bin').length },
    sourceInventorySha256: sha256(inventoryBytes), groundModelSha256: sha256(modelBytes),
    sourceRegistration: { rmsMeters: inventory.registration.planToNative.rmsMeters, maxResidualMeters: inventory.registration.planToNative.maxResidualMeters },
    physicalVerification: 'unverified',
    limitations: [
      'Source identities and registered plan locations are retained. Positions have not been field verified.',
      'Representative appearance is informed by the supplied marketing photographs. Exact manufacturer, construction, finish and individual matches are unverified.',
      'Bench envelope 1.8 × 0.65 × 0.90 m and trash-can envelope 0.55 × 0.55 × 0.85 m are presentation assumptions, not measurements.',
      'Orientation follows the nearer walkway run as a visual assumption, facing the parking area.',
      'Presentation base elevations are raycast onto the current model walkway where available. Source ground-reference points are retained separately.',
    ],
    items: [],
  };
  for (const item of items) {
    const support = projectFixtureToWalkway(item.modelPositionMeters, walkway);
    const group = createFixtureModel({ kind: item.kind, sourceKey: item.sourceKey, fixtureId: item.id, label: item.label,
      position: support.position, sourcePositionMeters: support.sourcePositionMeters, placementMethod: support.method });
    root.add(group);
    report.items.push({ id: item.id, sourceKey: item.sourceKey, kind: item.kind, label: item.label,
      position: support.position, ...serializable(group.userData) });
  }
  const bytes = encodeFixtureGlb(root);
  report.glbSha256 = sha256(bytes); report.glbBytes = bytes.length;
  report.groundedOnWalkwayCount = report.items.filter(item => item.placementMethod === 'raycast_to_model_walkway').length;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const child of [...root.children]) disposeFixtureModel(child);
  gltf.scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
  });
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildFixtureArtifacts();
  process.stdout.write(`${JSON.stringify({ count: report.count, ...report.counts, groundedOnWalkway: report.groundedOnWalkwayCount, bytes: report.glbBytes })}\n`);
}
