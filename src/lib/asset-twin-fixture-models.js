import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Indicative presentation geometry. These sizes are not field measurements.
export const FIXTURE_MODEL_VERSION = 'otb-fixtures-v1';
export const FIXTURE_DEFAULT_DIMENSIONS = Object.freeze({
  bench: Object.freeze({ width: 1.8, depth: .65, height: .9 }),
  waste_bin: Object.freeze({ width: .55, depth: .55, height: .85 }),
});

const POSITION_NOTE = 'Source-plan location is approximate; no field verification or clearance claim.';
const DIMENSION_NOTE = 'Indicative dimensions for presentation; replace with measured fixture dimensions.';

function positionArray(position) {
  if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) {
    throw new TypeError('Fixture position must contain three finite metre coordinates');
  }
  return [...position];
}

function segmentDistanceSquared(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
}

/** Assumed orientation parallel to the nearer frontage; local front is +Z. */
export function fixtureOrientation(position) {
  const [x, , z] = positionArray(position);
  const longDistance = segmentDistanceSquared(x, z, -68.6, 11.52, 95, 11.52);
  const shortDistance = segmentDistanceSquared(x, z, -68.6, -41, -68.6, 11.52);
  return {
    rotationY: shortDistance < longDistance ? Math.PI / 2 : Math.PI,
    frontage: shortDistance < longDistance ? 'short-building walkway' : 'long-building walkway',
    status: 'visual_assumption',
    basis: 'Aligned parallel to the nearer registered walkway run, facing the parking area; not a surveyed orientation.',
  };
}

export function fixtureRotationForItem(item) {
  return fixtureOrientation(item.modelPositionMeters ?? item.position).rotationY;
}

/** Raise presentation geometry onto the walkway without changing its source point. */
export function projectFixtureToWalkway(position, walkwayRoot) {
  const source = positionArray(position), placed = [...source];
  let method = 'source_ground_reference';
  if (walkwayRoot) {
    walkwayRoot.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(walkwayRoot);
    if (!bounds.isEmpty()) {
      const originY = Math.max(bounds.max.y + 1, source[1] + 1);
      const ray = new THREE.Raycaster(new THREE.Vector3(source[0], originY, source[2]), new THREE.Vector3(0, -1, 0), 0, originY - bounds.min.y + 1);
      const hit = ray.intersectObject(walkwayRoot, true).find(item => item.object.isMesh);
      if (hit) { placed[1] = hit.point.y; method = 'raycast_to_model_walkway'; }
    }
  }
  return { position: placed, sourcePositionMeters: source, presentationBaseElevationMeters: placed[1], method,
    metadata: { sourcePositionMeters: source, presentationBaseElevationMeters: placed[1], placementMethod: method } };
}

function obstacleCategory(object) {
  for (let item = object; item; item = item.parent) if (item.userData?.category) return item.userData.category;
  return null;
}

/**
 * Find an eye-level fixture view that does not put the camera inside a column or
 * aim through source walls/columns. A failed search is explicit (clear:false).
 * Raycasts run in both directions so single-sided wall back faces cannot hide
 * an obstruction. Materials and visibility are never changed during the search.
 */
export function chooseFixtureView(modelGroup, obstacles = []) {
  if (!modelGroup?.isObject3D) throw new TypeError('A fixture Object3D is required');
  modelGroup.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(modelGroup);
  if (box.isEmpty()) return null;
  const meshes = [], seen = new Set();
  for (const root of obstacles) root?.traverse(object => {
    if (object.isMesh && !seen.has(object)) { object.updateWorldMatrix(true, false); seen.add(object); meshes.push(object); }
  });
  const columnBoxes = meshes.filter(mesh => obstacleCategory(mesh) === 'columns')
    .map(mesh => new THREE.Box3().setFromObject(mesh).expandByScalar(.12));
  const base = modelGroup.getWorldPosition(new THREE.Vector3());
  const rotation = modelGroup.getWorldQuaternion(new THREE.Quaternion());
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation); front.y = 0; front.normalize();
  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation); side.y = 0; side.normalize();
  const target = box.getCenter(new THREE.Vector3());
  const width = modelGroup.userData.dimensionsMeters?.width ?? Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const height = box.max.y - box.min.y;
  const samples = [target, target.clone().addScaledVector(side, width * .32), target.clone().addScaledVector(side, -width * .32),
    target.clone().setY(box.min.y + height * .2), target.clone().setY(box.min.y + height * .85)];
  const ray = new THREE.Raycaster();
  const sightlineClear = (origin, aim) => {
    const distance = origin.distanceTo(aim);
    if (distance <= .1) return false;
    ray.near = .025; ray.far = distance - .035;
    ray.set(origin, aim.clone().sub(origin).normalize());
    if (ray.intersectObjects(meshes, false).length) return false;
    ray.set(aim, origin.clone().sub(aim).normalize());
    return ray.intersectObjects(meshes, false).length === 0;
  };
  let best = null, checkedCandidates = 0;
  for (const eyeHeight of [1.8, 2.3]) for (const distance of [3.3, 4.5, 6]) for (const lateral of [1.3, -1.3, 0, 2.3, -2.3]) {
    const position = base.clone().addScaledVector(front, distance).addScaledVector(side, lateral);
    position.y = base.y + eyeHeight;
    checkedCandidates++;
    if (columnBoxes.some(bounds => bounds.containsPoint(position))) continue;
    const clear = sightlineClear(position, target);
    const visibleSamples = clear ? samples.filter(sample => sightlineClear(position, sample)).length : 0;
    const candidate = { position: position.toArray(), target: target.toArray(), clear,
      visibleSamples, totalSamples: samples.length, fallback: !clear, checkedCandidates,
      reason: clear ? 'Unobstructed source-model sightline' : 'No unobstructed candidate fixture view was found' };
    if (!best || Number(clear) > Number(best.clear) || (clear === best.clear && visibleSamples > best.visibleSamples)) best = candidate;
    if (clear && visibleSamples === samples.length) return candidate;
  }
  if (best) return { ...best, checkedCandidates };
  const position = base.clone().addScaledVector(front, 6); position.y = base.y + 2.3;
  return { position: position.toArray(), target: target.toArray(), clear: false, fallback: true,
    visibleSamples: 0, totalSamples: samples.length, checkedCandidates, reason: 'Every candidate camera position intersects a source column' };
}

function material(color, roughness = .78, metalness = .12) {
  const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  result.userData.fixtureBaseColor = `#${result.color.getHexString()}`;
  return result;
}

function addBox(parts, size, center) {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.translate(...center);
  parts.push(geometry);
}

function addMergedPart(group, name, geometries, surface, metadata) {
  const geometry = mergeGeometries(geometries, false);
  for (const source of geometries) source.dispose();
  if (!geometry) throw new Error(`Could not build ${name} geometry`);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.name = `${group.name}/${name}`;
  mesh.userData = { ...metadata, fixturePart: name };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildBench(group, dimensions, metadata) {
  const { width: w, depth: d, height: h } = dimensions;
  const metal = [], slats = [];
  const seatY = h * .51, slatHeight = h * .043;
  // Separate seat and back slats keep the silhouette legible at walkway eye level.
  for (let i = 0; i < 5; i++) {
    const depth = d * .106;
    addBox(slats, [w * .94, slatHeight, depth], [0, seatY, -d * .18 + i * d * .135]);
  }
  addBox(slats, [w * .94, h * .055, d * .075], [0, h * .61, -d * .405]);
  const backCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-w * .47, h * .91, -d * .405),
    new THREE.Vector3(-w * .23, h * .935, -d * .405),
    new THREE.Vector3(0, h * .978, -d * .405),
    new THREE.Vector3(w * .23, h * .935, -d * .405),
    new THREE.Vector3(w * .47, h * .91, -d * .405),
  ]);
  slats.push(new THREE.TubeGeometry(backCurve, 16, h * .022, 6, false));
  for (const side of [-1, 1]) addBox(slats, [w * .024, h * .29, d * .075], [side * w * .47, h * .758, -d * .405]);
  // Simplified dark ornamental infill evokes the photographed back panel.
  // It is intentionally not represented as an exact manufacturer's pattern.
  addBox(metal, [w * .91, h * .024, d * .035], [0, h * .7, -d * .405]);
  for (let i = 0; i < 7; i++) {
    const x = w * (-.36 + .12 * i);
    addBox(metal, [w * .009, h * .225, d * .027], [x, h * .773, -d * .405]);
    const scroll = new THREE.TorusGeometry(h * .072, h * .0075, 4, 12);
    scroll.scale(1, 1.22, 1);
    scroll.translate(x, h * .795, -d * .405);
    metal.push(scroll);
  }
  for (const side of [-1, 1]) {
    const x = side * w * .39;
    for (const z of [-d * .32, d * .32]) {
      addBox(metal, [w * .034, seatY, d * .07], [x, seatY / 2, z]);
      addBox(metal, [w * .09, h * .025, d * .14], [x, h * .0125, z]);
    }
    addBox(metal, [w * .036, h * .86, d * .06], [x, h * .43, -d * .4]);
    addBox(metal, [w * .038, h * .05, d * .82], [x, seatY - h * .04, 0]);
    addBox(metal, [w * .033, h * .22, d * .055], [x, h * .62, d * .28]);
    addBox(metal, [w * .055, h * .045, d * .84], [x, h * .745, -d * .055]);
  }
  addBox(metal, [w * .78, h * .045, d * .055], [0, h * .27, -d * .28]);
  // End caps establish the indicated overall width without an invisible hit box.
  for (const side of [-1, 1]) addBox(metal, [w * .025, h * .05, d * .8], [side * w * .4875, seatY - h * .005, 0]);
  addMergedPart(group, 'frame', metal, material('#343d39', .73, .45), metadata);
  addMergedPart(group, 'slats', slats, material('#ac895d', .88, .02), metadata);
}

function buildWasteBin(group, dimensions, metadata) {
  const { width: w, depth: d, height: h } = dimensions;
  const frame = [], slats = [], inner = [];
  // The supplied storefront photo shows a square, tan slatted cabinet and dark hood.
  // The opening and panel construction below are a simplified visual interpretation.
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    addBox(frame, [w * .065, h, d * .065], [x * w * .4675, h / 2, z * d * .4675]);
  }
  addBox(frame, [w, h * .055, d], [0, h * .0275, 0]);
  addBox(frame, [w, h * .055, d], [0, h * .9725, 0]);
  for (const side of [-1, 1]) {
    addBox(frame, [w, h * .042, d * .04], [0, h * .72, side * d * .48]);
    addBox(frame, [w * .04, h * .22, d], [side * w * .48, h * .85, 0]);
    for (let i = 0; i < 7; i++) {
      const t = -.385 + i * .1283;
      addBox(slats, [w * .108, h * .65, d * .035], [w * t, h * .386, side * d * .458]);
      addBox(slats, [w * .035, h * .65, d * .108], [side * w * .458, h * .386, d * t]);
    }
  }
  // Recessed liner is visible through the front/back disposal slots below the hood.
  addBox(inner, [w * .79, h * .78, d * .72], [0, h * .41, 0]);
  addMergedPart(group, 'frame-and-hood', frame, material('#343b38', .69, .48), metadata);
  addMergedPart(group, 'vertical-slats', slats, material('#ac895d', .9, .015), metadata);
  addMergedPart(group, 'recessed-liner', inner, material('#171d1a', .98, 0), metadata);
}

/**
 * One selectable fixture. Position is the base in model metres, not its centre.
 * The caller may adjust group.position.y to a resolved walkway surface.
 * Each instance owns its geometry/materials so highlight and disposal are isolated.
 */
export function createFixtureModel({
  kind, sourceKey, fixtureId = sourceKey, label = fixtureId,
  position = [0, 0, 0], rotationY, dimensions, sourcePositionMeters = position,
  placementMethod = 'source_ground_reference',
} = {}) {
  if (!Object.hasOwn(FIXTURE_DEFAULT_DIMENSIONS, kind)) throw new TypeError(`Unsupported fixture kind: ${kind}`);
  if (typeof sourceKey !== 'string' || !sourceKey.trim()) throw new TypeError('A stable fixture sourceKey is required');
  const base = positionArray(position);
  const size = { ...FIXTURE_DEFAULT_DIMENSIONS[kind], ...dimensions };
  for (const axis of ['width', 'depth', 'height']) {
    if (!Number.isFinite(size[axis]) || size[axis] <= 0 || size[axis] > 10) throw new RangeError(`Invalid fixture ${axis}`);
  }
  const orientation = fixtureOrientation(base);
  if (rotationY !== undefined && !Number.isFinite(rotationY)) throw new TypeError('Fixture rotation must be finite radians');
  const metadata = {
    sourceKey, fixtureId, label, assetKind: kind, category: 'fixtures',
    modelVersion: FIXTURE_MODEL_VERSION, physicalVerification: 'unverified',
    dimensionsMeters: { ...size }, fixtureDimensionsMeters: [size.width, size.height, size.depth],
    dimensionStatus: 'assumed', dimensionNote: DIMENSION_NOTE,
    positionStatus: 'approximate_source_registered', positionNote: POSITION_NOTE,
    sourcePositionMeters: positionArray(sourcePositionMeters),
    presentationBaseElevationMeters: base[1], placementMethod,
    rotationY: rotationY ?? orientation.rotationY,
    orientationStatus: 'visual_assumption', orientationBasis: orientation.basis,
    appearanceStatus: 'indicative_photo_informed',
    appearanceNote: kind === 'waste_bin'
      ? 'Square tan slats and dark frame/hood informed by the supplied storefront photograph. Individual bin matches and details are unverified.'
      : 'Tan seat/trim and dark ornamental back informed by the supplied marketing photographs; simplified pattern, individual matches and finish are unverified.',
  };
  const group = new THREE.Group();
  group.name = String(fixtureId);
  group.position.fromArray(base);
  group.rotation.y = metadata.rotationY;
  group.userData = metadata;
  if (kind === 'bench') buildBench(group, size, metadata);
  else buildWasteBin(group, size, metadata);
  const localBounds = new THREE.Box3();
  for (const child of group.children) localBounds.union(child.geometry.boundingBox);
  const actualSize = localBounds.getSize(new THREE.Vector3()), localCenter = localBounds.getCenter(new THREE.Vector3());
  for (const child of group.children) {
    child.geometry.translate(-localCenter.x, -localBounds.min.y, -localCenter.z);
    child.geometry.scale(size.width / actualSize.x, size.height / actualSize.y, size.depth / actualSize.z);
    child.geometry.computeBoundingBox();
    child.geometry.computeBoundingSphere();
  }
  group.updateMatrixWorld(true);
  return group;
}

export function disposeFixtureModel(group) {
  if (!group) return;
  const geometries = new Set(), materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const item of Array.isArray(object.material) ? object.material : [object.material]) if (item) materials.add(item);
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
  group.removeFromParent();
}
