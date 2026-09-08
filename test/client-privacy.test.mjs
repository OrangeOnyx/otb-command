import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const privateData = new Set(["units.json", "contacts-info.json", "lease-links.json", "floorplan-links.json", "vendors.json"]);

/* Follow the actual browser entry graph, including re-exports, dynamic
   imports and new URL assets. Testing only units.public.json missed a later
   lease-panel import that reintroduced the full rent roll into production. */
test("browser entry graph cannot import confidential source files or server archives", () => {
  const seen = new Set();
  const visit = path => {
    if (seen.has(path)) return;
    seen.add(path);
    const name = relative(root, path).replaceAll("\\", "/");
    const leaf = name.split("/").at(-1);
    assert.ok(!(name.startsWith("src/data/") && privateData.has(leaf)), "private browser dependency: " + name);
    assert.ok(!name.startsWith("api/") && !name.startsWith("docs/") && !name.startsWith("tools/"), "server/archive browser dependency: " + name);
    if (!/\.(?:js|mjs)$/.test(path)) return;
    const source = readFileSync(path, "utf8");
    const imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bnew\s+URL\(\s*)["']([^"']+)["']/g;
    for (const [, spec] of source.matchAll(imports)) {
      if (!spec.startsWith(".")) continue;
      const target = resolve(dirname(path), spec.split("?")[0]);
      if (existsSync(target)) visit(target);
    }
  };
  visit(resolve(root, "src/main.js"));
  assert.ok([...seen].some(p => p.endsWith("leaseUI.js")), "lease panel is included in regression graph");
  assert.ok([...seen].some(p => p.endsWith("units.public.json")), "shared public skeleton is included");
});
