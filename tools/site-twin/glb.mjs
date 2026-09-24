/* Minimal, dependency-free glTF 2.0 -> GLB writer for the OTB site twin, plus a
   structural validator (header/chunk lengths, view bounds, finite floats, refs).
   Deterministic: output depends only on call order and inputs. */

const ARRAY_BUFFER = 34962, ELEMENT_ARRAY_BUFFER = 34963;
const FLOAT = 5126, UINT32 = 5125;

export class GltfBuilder {
  constructor(generator = "Cypress Command Platform · OTB site twin") {
    this.json = { asset: { version: "2.0", generator }, scene: 0, scenes: [], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [] };
    this.chunks = []; this.byteLength = 0;
  }
  material(name, { color = [0.8, 0.8, 0.8], metallic = 0, roughness = 0.9, alpha = 1, doubleSided = true } = {}) {
    const m = { name, pbrMetallicRoughness: { baseColorFactor: [...color.map(round6), round6(alpha)], metallicFactor: metallic, roughnessFactor: roughness }, doubleSided };
    if (alpha < 1) m.alphaMode = "BLEND";
    this.json.materials.push(m); return this.json.materials.length - 1;
  }
  _view(typed, target) {
    const pad = (4 - (this.byteLength % 4)) % 4;
    if (pad) { this.chunks.push(Buffer.alloc(pad)); this.byteLength += pad; }
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.byteLength, byteLength: buf.length, target });
    this.chunks.push(buf); this.byteLength += buf.length;
    return this.json.bufferViews.length - 1;
  }
  _accessor(view, componentType, count, type, extra = {}) {
    this.json.accessors.push({ bufferView: view, componentType, count, type, ...extra });
    return this.json.accessors.length - 1;
  }
  _primitive({ positions, normals, indices }, material) {
    const n = positions.length / 3, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) { const k = i % 3; if (positions[i] < min[k]) min[k] = positions[i]; if (positions[i] > max[k]) max[k] = positions[i]; }
    const pos = this._accessor(this._view(positions, ARRAY_BUFFER), FLOAT, n, "VEC3", { min: min.map(round6), max: max.map(round6) });
    const nor = this._accessor(this._view(normals, ARRAY_BUFFER), FLOAT, n, "VEC3");
    const idx = this._accessor(this._view(indices, ELEMENT_ARRAY_BUFFER), UINT32, indices.length, "SCALAR");
    return { attributes: { POSITION: pos, NORMAL: nor }, indices: idx, material };
  }
  mesh(name, data, material) { return this.meshParts(name, [{ data, material }]); }
  /* one mesh, several primitives (e.g. unit walls + TPO roof) — one pickable node */
  meshParts(name, parts) {
    this.json.meshes.push({ name, primitives: parts.map(p => this._primitive(p.data, p.material)) });
    return this.json.meshes.length - 1;
  }
  node({ name, mesh, children, extras }) {
    const nd = { name };
    if (mesh !== undefined) nd.mesh = mesh;
    if (children && children.length) nd.children = children;
    if (extras) nd.extras = extras;
    this.json.nodes.push(nd); return this.json.nodes.length - 1;
  }
  scene(nodes, name = "OTB site twin") { this.json.scenes.push({ name, nodes }); }
  toGlb() {
    const pad = (4 - (this.byteLength % 4)) % 4;
    const bin = Buffer.concat([...this.chunks, Buffer.alloc(pad)]);
    const json = { ...this.json, buffers: [{ byteLength: bin.length }] };
    for (const k of ["materials", "meshes", "accessors", "bufferViews"]) if (!json[k].length) delete json[k];
    let js = Buffer.from(JSON.stringify(json), "utf8");
    js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
    const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
    const total = 12 + 8 + js.length + 8 + bin.length;
    header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
    jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
    bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
    return Buffer.concat([header, jh, js, bh, bin]);
  }
}
const round6 = v => Math.round(v * 1e6) / 1e6;

export function validateGlb(glb) {
  const errors = [];
  if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length) errors.push("bad GLB header");
  const jl = glb.readUInt32LE(12);
  if (glb.readUInt32LE(16) !== 0x4e4f534a) errors.push("first chunk is not JSON");
  const json = JSON.parse(glb.subarray(20, 20 + jl).toString("utf8"));
  const bstart = 20 + jl + 8, blen = glb.readUInt32LE(20 + jl);
  if (glb.readUInt32LE(20 + jl + 4) !== 0x004e4942) errors.push("second chunk is not BIN");
  if (json.buffers?.[0]?.byteLength !== blen) errors.push("buffer length mismatch");
  let triangles = 0;
  for (const [i, v] of (json.bufferViews || []).entries()) if (v.byteOffset + v.byteLength > blen || v.byteOffset % 4) errors.push(`view ${i} out of bounds / unaligned`);
  for (const [i, a] of (json.accessors || []).entries()) {
    const v = json.bufferViews[a.bufferView], comps = a.type === "VEC3" ? 3 : 1;
    if (!v || v.byteLength !== a.count * comps * 4) { errors.push(`accessor ${i} size`); continue; }
    if (a.componentType === FLOAT) for (let n = 0; n < v.byteLength; n += 4) if (!Number.isFinite(glb.readFloatLE(bstart + v.byteOffset + n))) { errors.push(`accessor ${i} non-finite`); break; }
    if (a.componentType === UINT32) triangles += a.count / 3;
  }
  const nNodes = json.nodes.length, nMeshes = (json.meshes || []).length, nMats = (json.materials || []).length;
  for (const [i, nd] of json.nodes.entries()) {
    if (nd.mesh !== undefined && !(nd.mesh >= 0 && nd.mesh < nMeshes)) errors.push(`node ${i} mesh ref`);
    for (const c of nd.children || []) if (!(c >= 0 && c < nNodes)) errors.push(`node ${i} child ref`);
  }
  for (const [i, m] of (json.meshes || []).entries()) for (const p of m.primitives) if (!(p.material >= 0 && p.material < nMats)) errors.push(`mesh ${i} material ref`);
  return { ok: errors.length === 0, errors, json, nodes: nNodes, meshes: nMeshes, triangles };
}
