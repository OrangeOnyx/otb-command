import * as THREE from 'three';

export const SITE_CONTEXT_VERSION = 'otb-site-context-v1';
export const SITE_CONTEXT_CATEGORIES = Object.freeze([
  { id: 'parking', label: 'Parking & access' },
  { id: 'landscape', label: 'Grass & planting areas' },
  { id: 'sidewalk', label: 'Sidewalks' },
  { id: 'service', label: 'Service & common areas' },
  { id: 'roads', label: 'Road references' },
  { id: 'off-parcel', label: 'Excluded parcel reference' },
]);

export function planPointToModel(point, matrix, elevation = 0) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) ||
      !Array.isArray(matrix) || matrix.length !== 3 || matrix.some(row => !Array.isArray(row) || row.length !== 2 || !row.every(Number.isFinite)) || !Number.isFinite(elevation)) {
    throw new TypeError('A finite plan point, 3 by 2 registration matrix and elevation are required');
  }
  const [x, y] = point;
  return [x * matrix[0][0] + y * matrix[1][0] + matrix[2][0], elevation,
    x * matrix[0][1] + y * matrix[1][1] + matrix[2][1]];
}

export function pointInSiteZone(point, zone) {
  const polygon = zone?.polygonMeters;
  if (!Array.isArray(point) || !Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, , zi] = polygon[i], [xj, , zj] = polygon[j];
    if ((zi > point[2]) !== (zj > point[2]) && point[0] < (xj - xi) * (point[2] - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Presentation surfaces only: no terrain grade, curb height, ownership or survey inference. */
export function createSiteContextModel(catalog) {
  if (!catalog?.zones?.length || catalog.modelVersion !== SITE_CONTEXT_VERSION) throw new TypeError('A site context catalog is required');
  const root = new THREE.Group(); root.name = 'site-context';
  root.userData = { category: 'site-context', modelVersion: SITE_CONTEXT_VERSION, physicalVerification: 'unverified' };
  for (const zone of catalog.zones) {
    const group = new THREE.Group(); group.name = `site-zone-${zone.id}`;
    const metadata = { category: 'site-context', siteCategory: zone.kind, siteZoneId: zone.id, label: zone.label,
      sourceKey: `site-area:${zone.id}`, physicalVerification: 'unverified', geometryStatus: zone.geometryStatus,
      contextOnly: zone.contextOnly === true, presentationElevationOnly: true };
    group.userData = metadata;
    const points = zone.polygonMeters;
    if (!Array.isArray(points) || points.length < 3 || points.some(p => p.length !== 3 || !p.every(Number.isFinite))) throw new TypeError(`Invalid polygon: ${zone.id}`);
    // ShapeGeometry lies in XY; negate source Z and rotate to Y-up to preserve upward normals.
    const shape = new THREE.Shape(points.map(([x, , z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, points[0][1], 0);
    const material = new THREE.MeshStandardMaterial({ color: zone.color, roughness: 1, metalness: 0 });
    material.userData.fixtureBaseColor = zone.color;
    const surface = new THREE.Mesh(geometry, material); surface.name = `${group.name}/surface`;
    surface.userData = { ...metadata, surfacePart: 'surface' }; surface.receiveShadow = true; group.add(surface);
    if (zone.linesMeters?.length) {
      const verts = [];
      for (const [a, b] of zone.linesMeters) {
        const length = Math.hypot(b[0] - a[0], b[2] - a[2]); if (length < 1e-8) continue;
        const dx = -(b[2] - a[2]) / length * .055, dz = (b[0] - a[0]) / length * .055;
        const p = [[a[0]+dx,a[1],a[2]+dz],[a[0]-dx,a[1],a[2]-dz],[b[0]-dx,b[1],b[2]-dz],[b[0]+dx,b[1],b[2]+dz]];
        for (const index of [0,2,1,0,3,2]) verts.push(...p[index]);
      }
      if (verts.length) {
        const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); lineGeometry.computeVertexNormals();
        const lineMaterial = new THREE.MeshStandardMaterial({ color: '#e8e7d9', roughness: 1, metalness: 0, side: THREE.DoubleSide });
        lineMaterial.userData.fixtureBaseColor = '#e8e7d9';
        const mesh = new THREE.Mesh(lineGeometry, lineMaterial); mesh.name = `${group.name}/source-striping`;
        mesh.userData = { ...metadata, surfacePart: 'source-striping', stripeWidthStatus: 'presentation-assumption' }; group.add(mesh);
      }
    }
    root.add(group);
  }
  return root;
}
