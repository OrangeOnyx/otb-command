/* /tour microsite media (2026-09-18) — the PUBLIC `tour` bucket: 360°
   panoramas (equirectangular JPEG, Insta360 export) + one hero still per
   vacant suite, and the manifest.json the microsite reads. Public read is the
   point (it is the marketing site); writes are operator-only by RLS.
   Hosted-only — there is no local fallback for a public site. Path convention
   <unit>/<kind>__<id>__<name> so kind rides in the filename like assets.js. */
import { REMOTE, sb } from "./remote.js";
import { newId as mkId, sanitizeName } from "./bucketstore.js";
import { tourManifest } from "./marketing.js";

const BUCKET = "tour";
export const TOUR_KINDS = [["pano", "360° panorama"], ["hero", "Hero still"]];
export const MAX_TOUR_BYTES = 50 * 1024 * 1024;

export const tourAvailable = () => REMOTE;
export const publicUrl = path => (REMOTE ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : "");
export const manifestUrl = () => publicUrl("manifest.json");

export async function addTourMedia(file, { unit, kind = "pano", name } = {}) {
  if (!REMOTE) throw new Error("hosted backend required");
  if (!unit) throw new Error("suite required");
  if (file.size > MAX_TOUR_BYTES) throw new Error("File exceeds the 50 MB limit");
  const path = `${unit}/${kind}__${mkId("t")}__${sanitizeName(name || file.name || kind)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function listTourMedia(unit) {
  if (!REMOTE) return [];
  const { data, error } = await sb.storage.from(BUCKET).list(unit, { limit: 200, sortBy: { column: "created_at", order: "asc" } });
  if (error) { console.warn("tour list:", error.message); return []; }
  return (data || []).filter(f => f.id).map(f => {
    const parts = f.name.split("__");
    return { id: `${unit}/${f.name}`, unit, kind: parts[0] === "hero" ? "hero" : "pano",
      name: parts.slice(2).join("__") || f.name, addedAt: f.created_at || "", url: publicUrl(`${unit}/${f.name}`) };
  });
}

export async function removeTourMedia(path) {
  if (!REMOTE) return;
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/* rebuild + publish manifest.json from every suite folder (units = the
   vacant suites the microsite should show, plus any folder that exists) */
export async function publishManifest(units) {
  if (!REMOTE) throw new Error("hosted backend required");
  const entries = [];
  for (const unit of units) entries.push(...await listTourMedia(unit));
  const manifest = tourManifest(entries);
  const blob = new Blob([JSON.stringify(manifest, null, 1)], { type: "application/json" });
  const { error } = await sb.storage.from(BUCKET).upload("manifest.json", blob, { contentType: "application/json", upsert: true, cacheControl: "60" });
  if (error) throw error;
  return manifest;
}
