import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFixtureModel, disposeFixtureModel, fixtureOrientation, projectFixtureToWalkway, chooseFixtureView } from '../src/lib/asset-twin-fixture-models.js';
import { parseGlb, validateGlb } from '../tools/merge-twin-glb.mjs';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url));
const inventory = JSON.parse(read('../src/data/twin-site-fixtures.json'));
const items = inventory.items.filter(item => ['bench', 'waste_bin'].includes(item.kind));
const report = JSON.parse(read('../public/twin/fixture-models.json'));
const exportBytes = read('../public/twin/fixtures.glb');
const exported = parseGlb(exportBytes);
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
async function load(bytes) {
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

test('fixture factories require a stable identity and finite, positive geometry inputs', () => {
  assert.throws(() => createFixtureModel({ kind: 'bench' }), /sourceKey/);
  assert.throws(() => createFixtureModel({ kind: 'column', sourceKey: 'test' }), /Unsupported/);
  assert.throws(() => createFixtureModel({ kind: 'bench', sourceKey: 'test', position: [0, NaN, 1] }), /finite/);
  assert.throws(() => createFixtureModel({ kind: 'bench', sourceKey: 'test', dimensions: { width: 0 } }), /width/);
  assert.throws(() => createFixtureModel({ kind: 'bench', sourceKey: 'test', rotationY: Infinity }), /finite/);
});

test('both fixture models stand on their requested base with bounded assumed dimensions', () => {
  for (const kind of ['bench', 'waste_bin']) {
    const group = createFixtureModel({ kind, sourceKey: `test:${kind}`, position: [4, .1271, 8], rotationY: 0 });
    const box = new THREE.Box3().setFromObject(group), dimensions = group.userData.dimensionsMeters;
    close(box.min.y, .1271); close(box.max.y, .1271 + dimensions.height);
    close(box.max.x - box.min.x, dimensions.width); close(box.max.z - box.min.z, dimensions.depth);
    close((box.max.x + box.min.x) / 2, 4); close((box.max.z + box.min.z) / 2, 8);
    assert.equal(group.userData.physicalVerification, 'unverified');
    assert.equal(group.userData.dimensionStatus, 'assumed');
    assert.deepEqual(group.userData.fixtureDimensionsMeters, [dimensions.width, dimensions.height, dimensions.depth]);
    for (const child of group.children) {
      assert.equal(child.userData.sourceKey, group.userData.sourceKey);
      assert.equal(child.userData.assetKind, kind);
      assert.match(child.material.userData.fixtureBaseColor, /^#[a-f0-9]{6}$/i);
      assert.ok(child.geometry.getAttribute('normal').array.every(Number.isFinite));
    }
    disposeFixtureModel(group);
  }
});

test('bin disposal opening is real empty geometry and bench seating can be hit by a ray', () => {
  const bin = createFixtureModel({ kind: 'waste_bin', sourceKey: 'test:bin', rotationY: 0 });
  const openingRay = new THREE.Raycaster(new THREE.Vector3(0, .74, 1), new THREE.Vector3(0, 0, -1), 0, 2);
  assert.equal(openingRay.intersectObject(bin, true).length, 0, 'The disposal slot should be open below the hood');
  const bodyRay = new THREE.Raycaster(new THREE.Vector3(0, .3, 1), new THREE.Vector3(0, 0, -1), 0, 2);
  assert.ok(bodyRay.intersectObject(bin, true).length > 0);
  const bench = createFixtureModel({ kind: 'bench', sourceKey: 'test:bench', rotationY: 0 });
  const seatRay = new THREE.Raycaster(new THREE.Vector3(0, 2, .07), new THREE.Vector3(0, -1, 0), 0, 3);
  const hit = seatRay.intersectObject(bench, true)[0];
  assert.ok(hit && hit.point.y > .35 && hit.point.y < .55);
  disposeFixtureModel(bin); disposeFixtureModel(bench);
});

test('highlight or disposal on one fixture cannot change another fixture', () => {
  const first = createFixtureModel({ kind: 'bench', sourceKey: 'test:first' });
  const second = createFixtureModel({ kind: 'bench', sourceKey: 'test:second' });
  const original = second.children[0].material.color.getHex();
  assert.notEqual(first.children[0].geometry, second.children[0].geometry);
  assert.notEqual(first.children[0].material, second.children[0].material);
  first.children[0].material.color.set('#ff5500');
  disposeFixtureModel(first);
  assert.equal(second.children[0].material.color.getHex(), original);
  disposeFixtureModel(second);
});

test('frontage orientation is deterministic and distinguishes the two walkway runs', () => {
  close(fixtureOrientation([30, 0, 11.52]).rotationY, Math.PI);
  close(fixtureOrientation([-68.7, 0, -9]).rotationY, Math.PI / 2);
  const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), fixtureOrientation([-68.7, 0, -9]).rotationY);
  close(front.x, 1); close(front.z, 0);
  assert.equal(fixtureOrientation([30, 0, 11.52]).status, 'visual_assumption');
});

test('walkway grounding changes only presentation elevation and retains source coordinates', () => {
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(10, .1271, 10), new THREE.MeshBasicMaterial());
  walkway.position.y = .1271 / 2;
  const input = [1, 0, -2], support = projectFixtureToWalkway(input, walkway);
  assert.deepEqual(input, [1, 0, -2]); assert.deepEqual(support.sourcePositionMeters, input);
  close(support.position[0], 1); close(support.position[2], -2); close(support.position[1], .1271);
  assert.equal(support.method, 'raycast_to_model_walkway');
  assert.equal(support.metadata.placementMethod, support.method);
  assert.deepEqual(projectFixtureToWalkway([50, 0, 50], walkway).position, [50, 0, 50]);
  assert.deepEqual(projectFixtureToWalkway(input, null).position, input);
  walkway.geometry.dispose(); walkway.material.dispose();
});

test('export preserves exactly ten bench and twenty bin source identities without columns or new physical IDs', () => {
  const fixtures = exported.json.nodes.filter(node => node.extras?.sourceKey && node.children?.length);
  assert.equal(fixtures.length, 30);
  assert.equal(fixtures.filter(node => node.extras.assetKind === 'bench').length, 10);
  assert.equal(fixtures.filter(node => node.extras.assetKind === 'waste_bin').length, 20);
  assert.deepEqual(fixtures.map(node => node.extras.sourceKey).sort(), items.map(item => item.sourceKey).sort());
  for (const node of fixtures) {
    const item = items.find(item => item.sourceKey === node.extras.sourceKey);
    assert.equal(node.name, item.id); assert.equal(node.extras.fixtureId, item.id);
    assert.equal(node.extras.assetId, undefined);
    assert.deepEqual(node.extras.sourcePositionMeters, item.modelPositionMeters);
    close(node.translation[0], item.modelPositionMeters[0]); close(node.translation[2], item.modelPositionMeters[2]);
    assert.equal(node.extras.physicalVerification, 'unverified');
  }
});

test('export and runtime factory resolve identical support and geometry for every existing fixture', async () => {
  const ground = await load(read('../public/twin/model.glb')), loaded = await load(exportBytes);
  let walkway;
  ground.scene.traverse(object => { if (!walkway && object.userData.category === 'walkway') walkway = object; });
  assert.ok(walkway);
  for (const item of items) {
    const support = projectFixtureToWalkway(item.modelPositionMeters, walkway);
    assert.equal(support.method, 'raycast_to_model_walkway', item.id);
    const runtime = createFixtureModel({ kind: item.kind, sourceKey: item.sourceKey, position: support.position });
    const persisted = loaded.scene.getObjectByName(item.id);
    assert.ok(persisted, item.id);
    const actual = new THREE.Box3().setFromObject(runtime), expected = new THREE.Box3().setFromObject(persisted);
    for (const axis of ['x', 'y', 'z']) { close(actual.min[axis], expected.min[axis]); close(actual.max[axis], expected.max[axis]); }
    disposeFixtureModel(runtime);
  }
});

test('checked-in GLB is structurally valid and its provenance report matches actual bytes', () => {
  assert.equal(validateGlb(exported), true);
  assert.equal(report.glbBytes, exportBytes.length);
  assert.equal(report.glbSha256, crypto.createHash('sha256').update(exportBytes).digest('hex'));
  assert.equal(report.groundedOnWalkwayCount, 30);
  assert.equal(report.count, report.items.length);
  assert.equal(report.counts.benches, 10); assert.equal(report.counts.trashCans, 20);
  assert.ok(exported.json.meshes.length <= 5, 'Repeated fixtures should share exported mesh prototypes');
});

test('all thirty fixtures focus outside real columns with unobstructed source-model views', async () => {
  const ground = await load(read('../public/twin/model.glb'));
  const obstacles = [], columnBounds = [];
  ground.scene.traverse(object => {
    if (!object.isMesh || !['walls', 'columns'].includes(object.userData.category)) return;
    obstacles.push(object);
    if (object.userData.category === 'columns') columnBounds.push(new THREE.Box3().setFromObject(object));
  });
  const walkway = ground.scene.getObjectByName('walkway'), ray = new THREE.Raycaster();
  for (const item of items) {
    const support = projectFixtureToWalkway(item.modelPositionMeters, walkway);
    const model = createFixtureModel({ kind: item.kind, sourceKey: item.sourceKey, position: support.position });
    const view = chooseFixtureView(model, obstacles);
    assert.equal(view.clear, true, item.id); assert.equal(view.fallback, false, item.id);
    assert.equal(view.visibleSamples, 5, item.id);
    const camera = new THREE.Vector3(...view.position), target = new THREE.Vector3(...view.target);
    assert.equal(columnBounds.some(bounds => bounds.clone().expandByScalar(.12).containsPoint(camera)), false, item.id);
    const previousSides = new Map();
    for (const object of obstacles) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!previousSides.has(material)) { previousSides.set(material, material.side); material.side = THREE.DoubleSide; }
    }
    ray.set(camera, target.clone().sub(camera).normalize()); ray.near = .025; ray.far = camera.distanceTo(target) - .035;
    assert.equal(ray.intersectObjects(obstacles, false).length, 0, `${item.id}: independent double-sided ray check`);
    for (const [material, side] of previousSides) material.side = side;
    if (['bench-01', 'bench-05'].includes(item.id)) {
      const oldPosition = new THREE.Vector3(...support.position).add(new THREE.Vector3(-1.3, 1.8, -3.3));
      assert.ok(columnBounds.some(bounds => bounds.containsPoint(oldPosition)), `${item.id}: regression recreates old camera inside column`);
      assert.ok(view.checkedCandidates > 1);
    }
    disposeFixtureModel(model);
  }
});

test('fixture view search sees single-sided wall back faces and labels an impossible view honestly', () => {
  const model = createFixtureModel({ kind: 'bench', sourceKey: 'test:blocked', rotationY: 0 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
  wall.position.z = 1; wall.rotation.y = Math.PI; wall.userData.category = 'walls'; wall.updateMatrixWorld(true);
  const material = wall.material, beforeSide = material.side;
  const view = chooseFixtureView(model, [wall]);
  assert.equal(view.clear, false); assert.equal(view.fallback, true);
  assert.match(view.reason, /No unobstructed/);
  assert.equal(material.side, beforeSide, 'Search does not mutate rendering materials');
  const column = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial());
  column.userData.category = 'columns';
  const surrounded = chooseFixtureView(model, [column]);
  assert.equal(surrounded.clear, false); assert.equal(surrounded.fallback, true);
  assert.match(surrounded.reason, /Every candidate camera position/);
  disposeFixtureModel(model); wall.geometry.dispose(); wall.material.dispose(); column.geometry.dispose(); column.material.dispose();
});
