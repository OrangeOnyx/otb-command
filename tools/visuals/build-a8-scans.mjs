/* A-8 scan layer (2026-10-06, operator option 2): fit the twin frame
   (EPSG:6344 + NAVD88 local, GLB axes x=E y=Up z=-N) to A-8's plan-true frame
   from register items carrying both coordinates, then shrink each registered
   Polycam scan for the web (draco + 2048 webp textures + simplify).
   Inputs (gitignored): export/twin-pack/OTB_Twin_Pack/data/assets-twin-frame.csv,
   export/polycam-twin/OTB-polycam-*-twin.glb. Outputs: src/data/a8-scans.json
   (fit + check points + scan list) and export/a8-scans/*.glb.
   Usage: node tools/visuals/build-a8-scans.mjs [--fit-only] */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planToWorld } from "../../src/lib/styled-twin-plan.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const csvPath = path.join(root, "export/twin-pack/OTB_Twin_Pack/data/assets-twin-frame.csv");
const reg = JSON.parse(readFileSync(path.join(root, "src/data/site-register.json"), "utf8")).items;
const rows = readFileSync(csvPath, "utf8").trim().split(/\r?\n/).slice(1).map(l => l.match(/("[^"]*"|[^,]+)/g));
const twin = Object.fromEntries(rows.map(r => [r[0], { E: +r[4], N: +r[5], H: +r[6], cat: r[1] }]));

// 2D similarity (Umeyama) from GLB (x, z) = (E, -N) to A-8 (X, Z).
const CATS = new Set(["column", "bench", "can", "tree", "bollard", "transformer", "meter-cluster", "ada"]);
const pairs = reg.filter(i => i.point && twin[i.id] && CATS.has(i.cat)).map(i => ({ id: i.id, src: [twin[i.id].E, -twin[i.id].N], dst: planToWorld(i.point) }));
const n = pairs.length, mean = a => [a.reduce((s, p) => s + p[0], 0) / n, a.reduce((s, p) => s + p[1], 0) / n];
const ms = mean(pairs.map(p => p.src)), md = mean(pairs.map(p => p.dst));
let A = 0, B = 0, SS = 0;
for (const p of pairs) { const x = p.src[0] - ms[0], y = p.src[1] - ms[1], u = p.dst[0] - md[0], v = p.dst[1] - md[1]; A += x * u + y * v; B += x * v - y * u; SS += x * x + y * y; }
const theta = Math.atan2(B, A), scale = Math.hypot(A, B) / SS, c = Math.cos(theta), s = Math.sin(theta);
const tx = md[0] - scale * (c * ms[0] - s * ms[1]), tz = md[1] - scale * (s * ms[0] + c * ms[1]);
const apply = ([x, z]) => [scale * (c * x - s * z) + tx, scale * (s * x + c * z) + tz];
const res = pairs.map(p => { const q = apply(p.src); return Math.hypot(q[0] - p.dst[0], q[1] - p.dst[1]); });
const groundH = twin["ada-1"]?.H ?? 10.2;
const checks = ["col-03", "col-20", "bench-01", "tree-01"].filter(id => twin[id]).map(id => ({ id, glb: [twin[id].E, twin[id].H, -twin[id].N] }));

const outDir = path.join(root, "export/a8-scans");
mkdirSync(outDir, { recursive: true });
const srcDir = path.join(root, "export/polycam-twin");
const scans = readdirSync(srcDir).filter(f => /^OTB-polycam-.*-twin\.glb$/.test(f)).sort().map(f => {
  const id = f.replace(/^OTB-polycam-/, "").replace(/-twin\.glb$/, "");
  const out = path.join(outDir, "scan-" + id + ".glb");
  if (!process.argv.includes("--fit-only") && !existsSync(out)) {
    execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["-y", "@gltf-transform/cli@4", "optimize", path.join(srcDir, f), out,
      "--compress", "draco", "--texture-compress", "webp", "--texture-size", "2048", "--simplify-ratio", "0.35", "--simplify-error", "0.002"], { stdio: "ignore", shell: process.platform === "win32" });
  }
  return { id, file: "scan-" + id + ".glb", night: /night/.test(id), bytes: existsSync(out) ? statSync(out).size : null };
});

const data = {
  _comment: "A-8 scan layer. GLB twin frame (x=E, y=Up NAVD88, z=-N, local origin E 591000 N 3341600) → A-8 world: X,Z = scale·R(theta)·(x,z) + (tx,tz); Y = scale·(y − groundH). Fit from register items present in both frames. Regenerate with tools/visuals/build-a8-scans.mjs.",
  fit: { n, thetaRad: theta, scale, tx, tz, groundH, rmsM: Math.sqrt(res.reduce((a, r) => a + r * r, 0) / n), maxM: Math.max(...res) },
  // GLBs ship only after the operator rules on committing derived scan assets (CLAUDE.md: LFS exception list).
  published: false,
  checks, scans
};
writeFileSync(path.join(root, "src/data/a8-scans.json"), JSON.stringify(data, null, 2) + "\n");
console.log(`fit n=${n} rms=${data.fit.rmsM.toFixed(3)} m max=${data.fit.maxM.toFixed(3)} m · ${scans.length} scans`);
for (const sc of scans) console.log(" ", sc.file, sc.bytes ? (sc.bytes / 1e6).toFixed(1) + " MB" : "missing");
