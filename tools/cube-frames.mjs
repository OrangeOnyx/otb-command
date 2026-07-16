/* cube-frames.mjs — pull JPEG snapshots from the Blackjack Cube's DW Spectrum
   server over Tailscale (Phase C3 collector, v0).

   Usage:
     node tools/cube-frames.mjs                 # one frame per exterior camera
     node tools/cube-frames.mjs --loop 60       # sample every 60s until Ctrl-C
     node tools/cube-frames.mjs --out capture/  # output dir (default capture/)

   Credentials: a LOCAL DW Spectrum user (Viewer role is enough), read from
   env CUBE_USER / CUBE_PASS, or from the file %USERPROFILE%\.otb-cube.env
   (lines: CUBE_USER=..., CUBE_PASS=...). Never commit credentials.
   Host override: CUBE_HOST (default 100.73.185.15:7001 — the tailnet address).

   API: DW Spectrum REST v2 (Nx-based, protoVersion 5107 confirmed 2026-07-15):
     POST /rest/v2/login/sessions {username,password} → {token}
     GET  /rest/v2/devices/{id}/image  (Authorization: Bearer)
   Device ids = the dwViewId GUIDs in src/data/cameras.json (verified identical
   to /rest/v2/system/info device list). Self-signed TLS on the tailnet → the
   fetches below disable cert verification FOR THIS SCRIPT ONLY. */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // tailnet self-signed cert

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "src/data/cameras.json"), "utf8"));

const HOST = process.env.CUBE_HOST || "100.73.185.15:7001";
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = flag("out", join(root, "capture"));
const LOOP = +flag("loop", 0);

function creds() {
  let user = process.env.CUBE_USER, pass = process.env.CUBE_PASS;
  const f = join(homedir(), ".otb-cube.env");
  if ((!user || !pass) && existsSync(f)) {
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(CUBE_USER|CUBE_PASS)\s*=\s*(.+?)\s*$/);
      if (m) { if (m[1] === "CUBE_USER") user = m[2]; else pass = m[2]; }
    }
  }
  if (!user || !pass) {
    console.error(
      "No Cube credentials.\n" +
      "Create a LOCAL user in DW Spectrum (Users → New User, role Viewer),\n" +
      "then put it in " + f + " as:\n  CUBE_USER=<name>\n  CUBE_PASS=<password>\n" +
      "or set CUBE_USER/CUBE_PASS in the environment. Never commit these.");
    process.exit(2);
  }
  return { user, pass };
}

async function login() {
  const { user, pass } = creds();
  const r = await fetch(`https://${HOST}/rest/v2/login/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, setCookie: false }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status} ${await r.text()}`);
  return (await r.json()).token;
}

const stamp = d =>
  d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
  pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
const pad = n => String(n).padStart(2, "0");

async function pullOnce(token) {
  const when = new Date();
  const dir = join(OUT, when.toISOString().slice(0, 10));
  mkdirSync(dir, { recursive: true });
  const cams = registry.cameras.filter(c => !c.interior);
  let ok = 0, fail = 0;
  for (const cam of cams) {
    try {
      const r = await fetch(`https://${HOST}/rest/v2/devices/{${cam.dwViewId}}/image`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(join(dir, `${cam.id}-${stamp(when)}.jpg`), buf);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${cam.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`[${when.toLocaleTimeString()}] ${ok} frames → ${dir}` + (fail ? ` (${fail} failed)` : ""));
}

const token = await login();
console.log(`Authenticated to ${HOST} (system "Belle Reality") — ${registry.cameras.filter(c => !c.interior).length} exterior cameras`);
await pullOnce(token);
if (LOOP > 0) {
  console.log(`Sampling every ${LOOP}s — Ctrl-C to stop.`);
  setInterval(() => pullOnce(token).catch(async e => {
    // token expiry → re-login once
    console.error("pull failed (" + e.message + "), re-authenticating…");
    const t = await login();
    return pullOnce(t);
  }), LOOP * 1000);
}
