/* Harvest H2: process raw Asset Command table dumps (Supabase MCP execute_sql
   results saved to disk) into clean per-table archive JSONs under
   docs/harvest/ac-archive-<date>/ with a checksummed MANIFEST.json.

   Usage: node tools/ac-archive.mjs <dumpDir> <outDir> <dumpFile...>
   Each dump file is an MCP tool result whose payload sits between
   <untrusted-data-*> markers: [{"j": {"<table>": [rows...], ...}}].
   audit_log_1/audit_log_2 chunks are merged; users.passwordHash is stripped
   (credential material never enters the repo). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename } from "node:path";

const [dumpDir, outDir, ...files] = process.argv.slice(2);
if (!dumpDir || !outDir || !files.length) {
  console.error("usage: node tools/ac-archive.mjs <dumpDir> <outDir> <dumpFile...>");
  process.exit(1);
}

const tables = {};
for (const f of files) {
  let raw = readFileSync(join(dumpDir, f), "utf8");
  // Saved MCP results are {"result": "<wrapper text>"} — unwrap first when so.
  if (raw.startsWith('{"result"')) raw = JSON.parse(raw).result;
  // The wrapper prose mentions the marker before the real opening tag, so
  // anchor the capture to the payload's leading "[".
  const m = raw.match(/<untrusted-data-[0-9a-f-]+>\s*(\[[\s\S]*?)\s*<\/untrusted-data-[0-9a-f-]+>/);
  if (!m) throw new Error("no data block in " + basename(f));
  const j = JSON.parse(m[1])[0].j;
  for (const [k, v] of Object.entries(j)) {
    if (v == null) { tables[k] ||= []; continue; }
    tables[k] = (tables[k] || []).concat(v);
  }
}

tables.audit_log = (tables.audit_log_1 || []).concat(tables.audit_log_2 || []);
delete tables.audit_log_1;
delete tables.audit_log_2;

for (const u of tables.users || []) delete u.passwordHash;

mkdirSync(outDir, { recursive: true });
const manifest = {
  source: "asset-command-prod (pegmtfjexdzuupubgggv)",
  exported: "2026-08-29",
  via: "Supabase MCP execute_sql",
  note: "users.passwordHash stripped; auth_tokens excluded; tenant_access_tokens ids only (token values excluded).",
  tables: {},
};
for (const [k, v] of Object.entries(tables).sort()) {
  const body = JSON.stringify(v, null, 1);
  writeFileSync(join(outDir, k + ".json"), body);
  manifest.tables[k] = { rows: v.length, md5: createHash("md5").update(body).digest("hex") };
}
writeFileSync(join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
console.log(Object.entries(manifest.tables).map(([k, v]) => `${k}: ${v.rows}`).join("\n"));
