/* USGS OTB LiDAR seam — hillshade overlay for the A-2 satellite lens.
   Binaries live in public/elevation/ after `node tools/fetch-otb-lidar.mjs`
   (gitignored; Release tag lidar-otb-v1). Missing file is a quiet no-op. */
import meta from "../data/elevation.json" with { type: "json" };

export const LIDAR_RELEASE = meta.release;
export const HILLSHADE_PATH = meta.image;
export const HILLSHADE_COORDINATES = meta.coordinates;
export const ELEVATION_AOI = meta.aoi;
export const LIDAR_FETCH_HINT = "OTB hillshade not local — run: node tools/fetch-otb-lidar.mjs";

export function hillshadeUrl(base = "/") {
  const root = String(base || "/").endsWith("/") ? String(base || "/") : base + "/";
  return root + meta.image.replace(/^\//, "");
}

/* Same presence gate as the Lens-B mesh probe: Vite's SPA fallback serves
   index.html for a missing public file, so a 200 is not enough. */
export function elevationPresent(res) {
  if (!res || !res.ok) return false;
  const ct = typeof res.headers?.get === "function"
    ? (res.headers.get("content-type") || "")
    : (res.contentType || "");
  return !/text\/html/i.test(ct);
}

export async function probeHillshade(fetchFn = fetch, base = "/") {
  const url = hillshadeUrl(base);
  try {
    const res = await fetchFn(url, { method: "HEAD" });
    return elevationPresent(res) ? url : null;
  } catch {
    return null;
  }
}
