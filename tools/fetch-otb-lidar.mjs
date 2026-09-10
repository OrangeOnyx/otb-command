#!/usr/bin/env node
/* Pull the USGS OTB LiDAR pack from GitHub Release tag lidar-otb-v1
   into public/elevation/ (gitignored). Maps by default; --with-laz for
   the ~67 MB point cloud (local/dev only — do not deploy to Vercel).
   Idempotent: skips a file whose size already matches the Release asset. */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TAG = "lidar-otb-v1";
export const REPO = "OrangeOnyx/otb-command";
export const MAP_ASSETS = [
  "METADATA.json",
  "README.md",
  "OTB-dem-1m.tif",
  "OTB-hillshade.png",
  "OTB-hillshade.png.aux.xml",
  "OTB-hillshade.tif",
];
export const LAZ_ASSETS = ["OTB-site.laz"];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function selectedAssets(argv = []) {
  const withLaz = argv.includes("--with-laz") || argv.includes("--all");
  return withLaz ? MAP_ASSETS.concat(LAZ_ASSETS) : MAP_ASSETS.slice();
}

export function destFor(name, root = ROOT) {
  return join(root, "public", "elevation", name);
}

export function shouldSkip(path, expectedBytes) {
  if (!existsSync(path)) return false;
  if (expectedBytes == null) return true;
  return statSync(path).size === expectedBytes;
}

function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers = {
    "User-Agent": "otb-command-fetch-lidar",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = "Bearer " + token;
  return { token, headers };
}

async function listReleaseAssets(headers) {
  const url = "https://api.github.com/repos/" + REPO + "/releases/tags/" + TAG;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error("GitHub release " + TAG + ": HTTP " + r.status + " " + (await r.text()).slice(0, 180));
  const json = await r.json();
  return json.assets || [];
}

async function download(asset, dest, token) {
  const headers = {
    "User-Agent": "otb-command-fetch-lidar",
    Accept: "application/octet-stream",
  };
  if (token) headers.Authorization = "Bearer " + token;
  const apiUrl = "https://api.github.com/repos/" + REPO + "/releases/assets/" + asset.id;
  const url = token ? apiUrl : asset.browser_download_url;
  const r = await fetch(url, { headers, redirect: "follow" });
  if (!r.ok || !r.body) throw new Error(asset.name + ": HTTP " + r.status);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  try {
    await pipeline(Readable.fromWeb(r.body), createWriteStream(tmp));
    renameSync(tmp, dest);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* leftover */ }
    throw err;
  }
}

export async function fetchLidar(argv = [], opts = {}) {
  const names = selectedAssets(argv);
  const root = opts.root || ROOT;
  const destDir = join(root, "public", "elevation");
  mkdirSync(destDir, { recursive: true });
  const { token, headers } = authHeaders();
  const assets = await listReleaseAssets(headers);
  const byName = Object.fromEntries(assets.map(a => [a.name, a]));
  const log = opts.log || console.log;
  let got = 0, skipped = 0;
  for (const name of names) {
    const dest = destFor(name, root);
    const asset = byName[name];
    const expected = asset ? asset.size : null;
    if (shouldSkip(dest, expected)) {
      log("skip  " + name + " (" + statSync(dest).size + " bytes)");
      skipped++;
      continue;
    }
    if (!asset) throw new Error("Release " + TAG + " has no asset " + name);
    log("get   " + name + " …");
    await download(asset, dest, token);
    log("wrote " + dest + " (" + statSync(dest).size + " bytes)");
    got++;
  }
  log("lidar " + TAG + ": " + got + " downloaded, " + skipped + " skipped → " + destDir);
  if (!argv.includes("--with-laz") && !argv.includes("--all")) {
    log("note  LAZ omitted (67 MB, local/dev only). Re-run with --with-laz for 3D-roof work.");
  }
  return { got, skipped, destDir, names };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchLidar(process.argv.slice(2)).catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
