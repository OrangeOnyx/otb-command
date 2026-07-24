import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { deriveSeed } from "../tools/split-seed.mjs";
import { trimDossier } from "../tools/build-concierge-context.mjs";
import { CONTEXT } from "../api/_context.mjs";

/* Carry-forward problem #7: the split-seed / concierge-context generated files
   must be re-run after src/data edits — forgetting silently ships stale seed
   or stale AI grounding. These tests RE-DERIVE from the live sources and fail
   the suite if a committed generated file drifted. Fix = run the named script. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("units.public.json + api/_seed.json match a fresh split-seed derivation", () => {
  const { publicUnits, seed } = deriveSeed();
  assert.equal(
    readFileSync(join(root, "src/data/units.public.json"), "utf8"),
    JSON.stringify(publicUnits) + "\n",
    "STALE units.public.json — run `npm run split-seed`");
  assert.equal(
    readFileSync(join(root, "api/_seed.json"), "utf8"),
    JSON.stringify(seed) + "\n",
    "STALE api/_seed.json — run `npm run split-seed`");
});

test("api/_context.mjs matches a fresh dossier (dates normalized)", () => {
  // Regenerate the dossier into a scratch dir (never touches export/ snapshots).
  const scratch = mkdtempSync(join(tmpdir(), "otb-freshness-"));
  try {
    execFileSync(process.execPath, [join(root, "tools/export-package.mjs")],
      { env: { ...process.env, OTB_EXPORT_DIR: scratch }, stdio: "pipe" });
    const fresh = trimDossier(readFileSync(join(scratch, "OTB-Property-Dossier.md"), "utf8"));
    // The generation stamp is expected to differ — normalize it on both sides.
    const norm = s => s.replace(/Generated \d{1,2}\/\d{1,2}\/\d{4}/g, "Generated <DATE>");
    assert.equal(norm(CONTEXT), norm(fresh),
      "STALE api/_context.mjs — run `npm run concierge-context`");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
