import qrcode from '../vendor/qrcode.mjs';

const assetPattern = /^pa_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assetTwinLink(base, assetId) {
  if (!assetPattern.test(String(assetId))) throw new Error('Save a permanent asset record before creating a link.');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS application address without credentials.');
  url.search = ''; url.hash = 'twin';
  url.searchParams.set('asset', assetId);
  return url.href;
}
export function readAssetTwinLink(href) {
  const url = new URL(href);
  const assetId = url.searchParams.get('asset');
  // A-3 links (#twin) and legacy A-2 overlay links (?view=twin) both count.
  return { open: url.hash === '#twin' || url.searchParams.get('view') === 'twin', assetId: assetPattern.test(assetId || '') ? assetId : null };
}
// An explicit sheet link wins over a previous visit's selection. Asset and
// water deep links remain more specific than a general layout request.
export function assetTwinOpenIntent(href, remembered = {}) {
  const url = new URL(href);
  const waterId = url.searchParams.get('water');
  const assetId = readAssetTwinLink(href).assetId;
  const layout = url.searchParams.get('layout');
  if (waterId) return { kind: 'water', id: waterId };
  if (assetId) return { kind: 'asset', id: assetId };
  if (['interior', 'exterior'].includes(layout)) return { kind: 'layout', id: layout };
  if (remembered.waterId || remembered.tab === 'water') return { kind: 'water', id: remembered.waterId || 'all' };
  if (remembered.assetId) return { kind: 'asset', id: remembered.assetId };
  return null;
}
// Legacy ?view=twin links: only a fresh shared asset link (QR tag, pasted URL)
// is forwarded to the A-3 sheet; a reload or back/forward drops the twin state.
export function shouldAutoOpenTwin(href, navigationType = 'navigate') {
  const link = readAssetTwinLink(href);
  return link.open && !!link.assetId && navigationType !== 'reload' && navigationType !== 'back_forward';
}
export function assetQrSvg(link) {
  const url = new URL(link);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid tag address.');
  const qr = qrcode(0, 'M'); qr.addData(url.href); qr.make();
  return qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true, alt: 'Open permanent asset record' });
}
export function latestLocatedBinding(asset) {
  return [...(asset?.bindings || [])].filter(b => Array.isArray(b.metadata?.position) && b.metadata.position.length === 3 && b.metadata.position.every(Number.isFinite))
    .sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}
export function sourceObjectForAsset(asset, columns) {
  const ids = new Set(columns.map(c => c.id));
  return [...(asset?.bindings || [])].sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).find(b => ids.has(b.object_id))?.object_id || null;
}
