/* Convert the trained Gaussian-splat PLY into web-grade .ksplat for Lens D.
   Re-runnable: node tools/convert-splat.mjs [src.ply] [shDegree]
   Writes public/OTB-splat.ksplat (gitignored; Vercel CLI still deploys it). */
import * as GS from "@mkkellogg/gaussian-splats-3d";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = process.argv[2] || "E:/OTB-CAPTURE/Drone-Footage-RAW-2026-07/OTB-splat-v1.ply";
const shDegree = Number(process.argv[3] ?? 1); // web default: SH1 (view-dependence without SH3 weight)
const out = fileURLToPath(new URL("../public/OTB-splat.ksplat", import.meta.url));

const b = readFileSync(src);
const plyBuf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const splatArray = GS.PlyParser.parseToUncompressedSplatArray(plyBuf, shDegree);
console.log("parsed", splatArray.splatCount, "splats @ SH", shDegree);

// alphaRemovalThreshold 5 drops near-invisible gaussians; compressionLevel 1 = 16-bit quantization
const gen = GS.SplatBufferGenerator.getStandardGenerator(5, 1);
const splatBuffer = gen.generateFromUncompressedSplatArray(splatArray);
writeFileSync(out, Buffer.from(splatBuffer.bufferData));
console.log("wrote", out, (statSync(out).size / 1048576).toFixed(1) + " MB");
