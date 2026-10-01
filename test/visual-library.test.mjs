import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { ALL_VISUAL_FILES, CENTER_VIEWS, visualURL } from "../src/lib/visual-library.js";

test("every A-7 visual in the manifest ships in public/visuals", () => {
  for (const file of ALL_VISUAL_FILES) assert.ok(existsSync(new URL("../public/visuals/" + file, import.meta.url)), file);
});

test("A-7 view ids are unique per group and the center opens on golden hour", () => {
  assert.equal(new Set(CENTER_VIEWS.map(v => v.id)).size, CENTER_VIEWS.length);
  assert.equal(CENTER_VIEWS[0].id, "golden");
  assert.equal(visualURL("x.webp"), "/visuals/x.webp");
});
