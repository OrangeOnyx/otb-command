/* GLB (site-twin output: POSITION + NORMAL + indices, flat PBR colours, no node transforms) -> COLLADA 1.4.1
   for Google Earth Pro. Vertices are baked into a local East-North-Up frame (metres, Z_UP) by a caller-supplied
   toENU(X, Y, Z) so the KML <Model> needs only a <Location> and heading 0. Normals go through the inverse-transpose
   of toENU's horizontal Jacobian; winding flips only if the full 3-D map is a reflection. Google Earth Pro only — the web
   client does not render KML models. */

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = v => (Math.abs(v) < 5e-7 ? 0 : +v.toFixed(4));

export function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  const accessor = i => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = COMP[a.componentType], n = NCOMP[a.type];
    if (v.byteStride && v.byteStride !== n * T.BYTES_PER_ELEMENT) throw new Error('interleaved accessors not supported');
    const off = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
    return { n, data: new T(bin.buffer.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT)) };
  };
  return { json, accessor };
}

export function glbToCollada(buf, toENU, { title = 'model' } = {}) {
  const { json, accessor } = parseGlb(buf);
  // horizontal Jacobian of (X, Z) -> (E, N) by finite differences at the model origin
  const o = toENU(0, 0, 0), dX = toENU(1, 0, 0), dZ = toENU(0, 0, 1);
  const J = [[dX[0] - o[0], dZ[0] - o[0]], [dX[1] - o[1], dZ[1] - o[1]]];
  const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  const invT = [[J[1][1] / det, -J[1][0] / det], [-J[0][1] / det, J[0][0] / det]];
  // full 3-D map (X,Y,Z) -> (E,N,U) sends Y to U, i.e. a column swap: det3 = −det(J). Flip winding only if det3 < 0.
  const flip = -det < 0;

  const mats = (json.materials || []).map((m, i) => {
    const c = m.pbrMetallicRoughness?.baseColorFactor || [0.8, 0.8, 0.8, 1];
    // glTF factors are linear; COLLADA viewers treat colours as sRGB
    const s = c.slice(0, 3).map(v => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
    return { id: `m${i}`, name: m.name || `material ${i}`, rgb: s, a: c[3] ?? 1 };
  });
  const effects = mats.map(m => `<effect id="${m.id}-fx"><profile_COMMON><technique sid="common"><lambert>` +
    `<diffuse><color>${m.rgb.map(f).join(' ')} 1</color></diffuse>` +
    (m.a < 1 ? `<transparent opaque="A_ONE"><color>0 0 0 ${f(m.a)}</color></transparent><transparency><float>1</float></transparency>` : '') +
    `</lambert></technique></profile_COMMON><extra><technique profile="GOOGLEEARTH"><double_sided>1</double_sided></technique></extra></effect>`);
  const materials = mats.map(m => `<material id="${m.id}" name="${esc(m.name)}"><instance_effect url="#${m.id}-fx"/></material>`);

  const geoms = [], nodes = [];
  let tris = 0, verts = 0;
  const nodeIdx = new Map();
  (json.nodes || []).forEach(n => { if (n.mesh != null && !nodeIdx.has(n.mesh)) nodeIdx.set(n.mesh, n); });
  json.meshes.forEach((mesh, mi) => {
    const node = nodeIdx.get(mi);
    const binds = [];
    mesh.primitives.forEach((p, pi) => {
      if ((p.mode ?? 4) !== 4) return;
      const P = accessor(p.attributes.POSITION).data, Nn = p.attributes.NORMAL != null ? accessor(p.attributes.NORMAL).data : null;
      const I = p.indices != null ? accessor(p.indices).data : Uint32Array.from({ length: P.length / 3 }, (_, k) => k);
      const pos = [], nrm = [];
      for (let k = 0; k < P.length; k += 3) {
        const e = toENU(P[k], P[k + 1], P[k + 2]);
        pos.push(f(e[0] - o[0]), f(e[1] - o[1]), f(e[2]));
        if (Nn) {
          const nx = Nn[k], ny = Nn[k + 1], nz = Nn[k + 2];
          let ex = invT[0][0] * nx + invT[0][1] * nz, ey = invT[1][0] * nx + invT[1][1] * nz, ez = ny;
          const L = Math.hypot(ex, ey, ez) || 1;
          nrm.push(f(ex / L), f(ey / L), f(ez / L));
        }
      }
      const idx = [];
      for (let k = 0; k < I.length; k += 3) idx.push(...(flip ? [I[k], I[k + 2], I[k + 1]] : [I[k], I[k + 1], I[k + 2]]));
      const gid = `g${mi}_${pi}`, nv = P.length / 3, mat = mats[p.material ?? 0]?.id || 'm0';
      tris += I.length / 3; verts += nv;
      geoms.push(`<geometry id="${gid}" name="${esc(mesh.name || gid)}"><mesh>` +
        `<source id="${gid}-p"><float_array id="${gid}-pa" count="${pos.length}">${pos.join(' ')}</float_array>` +
        `<technique_common><accessor source="#${gid}-pa" count="${nv}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` +
        (Nn ? `<source id="${gid}-n"><float_array id="${gid}-na" count="${nrm.length}">${nrm.join(' ')}</float_array>` +
          `<technique_common><accessor source="#${gid}-na" count="${nv}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` : '') +
        `<vertices id="${gid}-v"><input semantic="POSITION" source="#${gid}-p"/>${Nn ? `<input semantic="NORMAL" source="#${gid}-n"/>` : ''}</vertices>` +
        `<triangles material="${mat}" count="${I.length / 3}"><input semantic="VERTEX" source="#${gid}-v" offset="0"/><p>${idx.join(' ')}</p></triangles>` +
        `</mesh></geometry>`);
      binds.push(`<instance_geometry url="#${gid}"><bind_material><technique_common><instance_material symbol="${mat}" target="#${mat}"/></technique_common></bind_material></instance_geometry>`);
    });
    if (binds.length) nodes.push(`<node id="n${mi}" name="${esc(node?.name || mesh.name || `mesh ${mi}`)}">${binds.join('')}</node>`);
  });

  const dae = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
<asset><contributor><authoring_tool>Cypress Command Platform · tools/site-twin/collada.mjs</authoring_tool></contributor><created>${new Date().toISOString()}</created><modified>${new Date().toISOString()}</modified><title>${esc(title)}</title><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset>
<library_effects>${effects.join('')}</library_effects>
<library_materials>${materials.join('')}</library_materials>
<library_geometries>${geoms.join('\n')}</library_geometries>
<library_visual_scenes><visual_scene id="scene" name="${esc(title)}">${nodes.join('\n')}</visual_scene></library_visual_scenes>
<scene><instance_visual_scene url="#scene"/></scene>
</COLLADA>`;
  return { dae, stats: { meshes: json.meshes.length, triangles: tris, vertices: verts, materials: mats.length, reflected: flip, jacobian: J } };
}
