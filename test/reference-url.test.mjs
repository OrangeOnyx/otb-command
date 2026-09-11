import test from "node:test";
import assert from "node:assert/strict";
import { safeReferenceUrl } from "../src/lib/reference-url.js";

test("reference URLs preserve HTTPS sources and allowlisted same-origin files", () => {
  assert.equal(safeReferenceUrl("https://drive.google.com/file/d/source/view?x=1&y=2"), "https://drive.google.com/file/d/source/view?x=1&y=2");
  assert.equal(safeReferenceUrl("/plat-render.svg"), "/plat-render.svg");
  assert.equal(safeReferenceUrl("/floorplan-center.png"), "/floorplan-center.png");
  assert.equal(safeReferenceUrl("/references/plat.pdf#page=2"), "/references/plat.pdf#page=2");
});

test("stored reference links cannot execute scripts, escape origin or navigate private routes", () => {
  const rejected = [null, "", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "file:///C:/records.pdf", "blob:https://example.com/id",
    "//evil.test/a", "/\\evil.test/a", "https://user:pass@example.com/a", "http://example.com/a", "http://127.0.0.1:5174/a",
    "/api/seed", "/__review/evidence", "/references/../../api/seed", "/references/%2e%2e/api/seed", "/references/%2fsecret", "doc://private/file.pdf"];
  for (const link of rejected) assert.equal(safeReferenceUrl(link), null, String(link));
});
