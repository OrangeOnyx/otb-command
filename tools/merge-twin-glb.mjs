/* Merge embedded GLB2 documents without exporting/rebuilding their geometry.
   Source vertices, node extras, IDs, transforms and material values are retained.
   Unknown extensions/external dependencies fail closed rather than lose indices. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;
const collections = ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers','cameras','skins','animations'];
const clone = value => JSON.parse(JSON.stringify(value));
const align4 = n => Math.ceil(n / 4) * 4;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

export function parseGlb(bytes) {
  const b = Buffer.from(bytes);
  if (b.length < 20 || b.toString('ascii',0,4) !== 'glTF' || b.readUInt32LE(4) !== 2 || b.readUInt32LE(8) !== b.length)
    throw new Error('Invalid GLB2 header or declared length');
  let json, bin;
  for (let p = 12; p < b.length;) {
    if (p + 8 > b.length) throw new Error('Truncated GLB chunk header');
    const length = b.readUInt32LE(p), type = b.readUInt32LE(p + 4);
    if (length % 4 || p + 8 + length > b.length) throw new Error('Invalid GLB chunk length');
    const chunk = b.subarray(p + 8, p + 8 + length);
    if (type === JSON_CHUNK && !json) json = JSON.parse(chunk.toString('utf8').trim());
    else if (type === BIN_CHUNK && bin === undefined) bin = chunk;
    else throw new Error('Duplicate or unsupported GLB chunk');
    p += 8 + length;
  }
  if (!json || bin === undefined || json.asset?.version !== '2.0') throw new Error('Embedded glTF2 JSON and BIN chunks are required');
  if (json.buffers?.length !== 1 || json.buffers[0].uri) throw new Error('Exactly one embedded buffer is supported per source');
  if (!Number.isInteger(json.buffers[0].byteLength) || json.buffers[0].byteLength > bin.length || bin.length - json.buffers[0].byteLength > 3)
    throw new Error('GLB buffer length does not match BIN chunk');
  const rejectExtensions = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'extras') continue;
      if (key === 'extensions' && Object.keys(child || {}).length) throw new Error('Source extensions require explicit index-remapping support');
      rejectExtensions(child);
    }
  };
  rejectExtensions(json);
  if (json.extensionsRequired?.length || json.extensionsUsed?.length) throw new Error('Source extension declarations are unsupported');
  for (const image of json.images || []) if (image.uri && !image.uri.startsWith('data:')) throw new Error('External image dependencies are unsupported');
  return { json, bin: bin.subarray(0, json.buffers[0].byteLength) };
}

export function writeGlb(json, binary) {
  const text = Buffer.from(JSON.stringify(json));
  const j = Buffer.alloc(align4(text.length), 0x20); text.copy(j);
  const bin = Buffer.alloc(align4(binary.length)); Buffer.from(binary).copy(bin);
  const out = Buffer.alloc(12 + 8 + j.length + 8 + bin.length);
  out.write('glTF'); out.writeUInt32LE(2,4); out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(j.length,12); out.writeUInt32LE(JSON_CHUNK,16); j.copy(out,20);
  const offset = 20 + j.length;
  out.writeUInt32LE(bin.length,offset); out.writeUInt32LE(BIN_CHUNK,offset + 4); bin.copy(out,offset + 8);
  return out;
}

function remapSource(source, offsets, binaryOffset) {
  const d = clone(source);
  const bump = (obj,key,offset) => { if (obj?.[key] !== undefined) obj[key] += offset; };
  for (const view of d.bufferViews || []) { view.buffer = 0; view.byteOffset = (view.byteOffset || 0) + binaryOffset; }
  for (const accessor of d.accessors || []) {
    bump(accessor,'bufferView',offsets.bufferViews);
    bump(accessor.sparse?.indices,'bufferView',offsets.bufferViews);
    bump(accessor.sparse?.values,'bufferView',offsets.bufferViews);
  }
  for (const mesh of d.meshes || []) for (const p of mesh.primitives) {
    for (const key of Object.keys(p.attributes)) p.attributes[key] += offsets.accessors;
    bump(p,'indices',offsets.accessors); bump(p,'material',offsets.materials);
    for (const target of p.targets || []) for (const key of Object.keys(target)) target[key] += offsets.accessors;
  }
  for (const node of d.nodes || []) {
    if (node.children) node.children = node.children.map(n => n + offsets.nodes);
    bump(node,'mesh',offsets.meshes); bump(node,'camera',offsets.cameras); bump(node,'skin',offsets.skins);
  }
  for (const skin of d.skins || []) {
    skin.joints = skin.joints.map(n => n + offsets.nodes);
    bump(skin,'skeleton',offsets.nodes); bump(skin,'inverseBindMatrices',offsets.accessors);
  }
  for (const animation of d.animations || []) {
    for (const sampler of animation.samplers) { bump(sampler,'input',offsets.accessors); bump(sampler,'output',offsets.accessors); }
    for (const channel of animation.channels) bump(channel.target,'node',offsets.nodes);
  }
  for (const image of d.images || []) bump(image,'bufferView',offsets.bufferViews);
  for (const texture of d.textures || []) { bump(texture,'source',offsets.images); bump(texture,'sampler',offsets.samplers); }
  for (const material of d.materials || []) for (const texture of [
    material.pbrMetallicRoughness?.baseColorTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture,
    material.normalTexture, material.occlusionTexture, material.emissiveTexture,
  ]) bump(texture,'index',offsets.textures);
  for (const scene of d.scenes || []) scene.nodes = (scene.nodes || []).map(n => n + offsets.nodes);
  return d;
}

export function validateGlb(document) {
  const {json:j,bin} = document;
  const index = (i, list, label) => { if (!Number.isInteger(i) || i < 0 || i >= (list?.length || 0)) throw new Error(`Invalid ${label} index ${i}`); };
  for (const s of j.scenes || []) for (const n of s.nodes || []) index(n,j.nodes,'scene node');
  if (j.scene !== undefined) index(j.scene,j.scenes,'default scene');
  for (const n of j.nodes || []) {
    for (const c of n.children || []) index(c,j.nodes,'child');
    for (const [key,arr] of [['mesh',j.meshes],['camera',j.cameras],['skin',j.skins]]) if (n[key] !== undefined) index(n[key],arr,key);
  }
  for (const view of j.bufferViews || []) {
    if (view.buffer !== 0 || !Number.isInteger(view.byteLength) || view.byteLength < 0 || (view.byteOffset || 0) < 0 || (view.byteOffset || 0) + view.byteLength > bin.length)
      throw new Error('Invalid buffer view byte range');
  }
  const components = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
  const sizes = {5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  for (const a of j.accessors || []) {
    const size = sizes[a.componentType], count = components[a.type];
    if (!size || !count || !Number.isInteger(a.count) || a.count < 1) throw new Error('Invalid accessor shape');
    if (a.bufferView !== undefined) {
      index(a.bufferView,j.bufferViews,'accessor bufferView');
      const view = j.bufferViews[a.bufferView];
      const element = a.type.startsWith('MAT') ? Number(a.type.slice(-1)) * align4(Number(a.type.slice(-1)) * size) : count * size;
      const end = (a.byteOffset || 0) + (a.count - 1) * (view.byteStride || element) + element;
      if (end > view.byteLength || (a.byteOffset || 0) < 0) throw new Error('Accessor exceeds its buffer view');
    }
    if (a.sparse) { index(a.sparse.indices.bufferView,j.bufferViews,'sparse indices'); index(a.sparse.values.bufferView,j.bufferViews,'sparse values'); }
  }
  for (const m of j.meshes || []) for (const p of m.primitives) {
    for (const i of Object.values(p.attributes)) index(i,j.accessors,'primitive attribute');
    if (p.indices !== undefined) index(p.indices,j.accessors,'primitive indices');
    if (p.material !== undefined) index(p.material,j.materials,'primitive material');
    for (const t of p.targets || []) for (const i of Object.values(t)) index(i,j.accessors,'morph attribute');
  }
  return true;
}

export function mergeGlbs(sources) {
  if (sources.length < 2) throw new Error('At least two GLB sources are required');
  const first = parseGlb(sources[0].bytes);
  const out = {asset:{...clone(first.json.asset),generator:'OTB lossless source GLB merger'},scene:0,
    scenes:[{name:'On The Boulevard · Complete source model',nodes:[],extras:{allSourceLevelsIncluded:true}}]};
  for (const key of collections) out[key] = [];
  const binaryParts = [], provenance = [];
  let binaryLength = 0;
  for (const source of sources) {
    const parsed = parseGlb(source.bytes); validateGlb(parsed);
    const offsets = Object.fromEntries(collections.map(k => [k,out[k].length]));
    const padding = align4(binaryLength) - binaryLength;
    if (padding) binaryParts.push(Buffer.alloc(padding));
    binaryLength += padding;
    const mapped = remapSource(parsed.json,offsets,binaryLength);
    for (const key of collections) out[key].push(...mapped[key] || []);
    out.scenes.push(...mapped.scenes || []);
    const defaultScene = mapped.scenes?.[mapped.scene || 0];
    if (!defaultScene) throw new Error(`Source ${source.name} has no default scene`);
    const group = out.nodes.length;
    out.nodes.push({name:source.groupName || `source-${path.basename(source.name,'.glb')}`,children:defaultScene.nodes || [],
      extras:{sourceFile:source.name,sourceSha256:hash(source.bytes),sourceAsset:clone(parsed.json.asset),
        sourceScene:clone(parsed.json.scenes[parsed.json.scene || 0]),sourceDocumentExtras:clone(parsed.json.extras || {}),
        coordinateTransform:'unchanged; sources already share local meters and Y-up',allGeometryIncluded:true}});
    out.scenes[0].nodes.push(group);
    provenance.push({file:source.name,sha256:hash(source.bytes),nodes:parsed.json.nodes?.length || 0,
      meshes:parsed.json.meshes?.length || 0,sourceGroupNode:group,binaryOffset:binaryLength,binaryBytes:parsed.bin.length});
    binaryParts.push(parsed.bin); binaryLength += parsed.bin.length;
  }
  for (const key of collections) if (!out[key].length) delete out[key];
  out.buffers = [{byteLength:binaryLength}];
  out.extras = {sourceDocuments:provenance,units:'meters',geometryStatus:'source-derived; field verification pending',
    visibility:'All source groups are in the default scene. Source defaultVisible extras are retained as metadata and do not hide glTF nodes.'};
  const bytes = writeGlb(out,Buffer.concat(binaryParts)); validateGlb(parseGlb(bytes));
  return {bytes,report:{bytes:bytes.length,sha256:hash(bytes),sourceDocuments:provenance,nodes:out.nodes.length,meshes:out.meshes.length,
    primitives:out.meshes.reduce((n,m)=>n+m.primitives.length,0),accessors:out.accessors.length,bufferViews:out.bufferViews.length}};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [base='public/twin/model.glb',upper='public/twin/upper-floors.glb',output='public/twin/complete-model.glb',fixtures='public/twin/fixtures.glb',siteContext='public/twin/site-context.glb'] = process.argv.slice(2);
  const {bytes,report} = mergeGlbs([
    {name:path.basename(base),groupName:'source-ground-floor',bytes:fs.readFileSync(base)},
    {name:path.basename(upper),groupName:'source-upper-floors',bytes:fs.readFileSync(upper)},
    {name:path.basename(fixtures),groupName:'source-walkway-fixtures',bytes:fs.readFileSync(fixtures)},
    {name:path.basename(siteContext),groupName:'source-site-context',bytes:fs.readFileSync(siteContext)},
  ]);
  fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,bytes);
  console.log(JSON.stringify(report,null,2));
}
