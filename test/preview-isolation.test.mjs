import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPreviewIsolation, PREVIEW_BLOCKED_SECRETS, PRODUCTION_SUPABASE_REF } from "../tools/check-preview-isolation.mjs";

const previewRef = "abcdefghijklmnopqrst";
const valid = () => ({
  VERCEL_ENV: "preview",
  VITE_SUPABASE_URL: `https://${previewRef}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: "sb_publishable_test_preview_key",
});
const jwt = payload => ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify(payload)).toString("base64url"), "testsignature"].join(".");

test("local, review and production environments retain existing behavior", () => {
  for (const VERCEL_ENV of [undefined, "development", "production"]) {
    assert.deepEqual(assertPreviewIsolation({ VERCEL_ENV, VITE_LOCAL_REVIEW: "1", CRON_SECRET: "present" }), { checked: false });
  }
});

test("isolated preview accepts publishable and matching legacy anon keys", () => {
  assert.deepEqual(assertPreviewIsolation(valid()), { checked: true, projectRef: previewRef });
  assert.deepEqual(assertPreviewIsolation({ ...valid(), VITE_SUPABASE_ANON_KEY: jwt({ role: "anon", ref: previewRef }) }), { checked: true, projectRef: previewRef });
});

test("preview requires explicit URL and key rather than local dotenv fallback", () => {
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    for (const value of [undefined, "", "   "]) {
      assert.throws(() => assertPreviewIsolation({ ...valid(), [name]: value }), new RegExp(name));
    }
  }
});

test("production backend is rejected including normalized URL spellings", () => {
  for (const url of [
    `https://${PRODUCTION_SUPABASE_REF}.supabase.co`,
    `https://${PRODUCTION_SUPABASE_REF.toUpperCase()}.SUPABASE.CO/`,
    `https://${PRODUCTION_SUPABASE_REF}.supabase.co:443/`,
  ]) {
    assert.throws(() => assertPreviewIsolation({ ...valid(), VITE_SUPABASE_URL: url }), /production OTB database/);
  }
});

test("unverified domains, embedded credentials and malformed origins fail closed without leaking values", () => {
  for (const url of [
    "not-a-url-sensitive-value",
    `http://${previewRef}.supabase.co`,
    `https://${previewRef}.supabase.co.evil.example`,
    `https://sensitive-user:sensitive-pass@${previewRef}.supabase.co`,
    `https://${previewRef}.supabase.co/rest/v1`,
    `https://${previewRef}.supabase.co?secret=sensitive-query`,
    `https://${previewRef}.supabase.co#sensitive-fragment`,
    `https://${previewRef}.supabase.co:8443`,
  ]) {
    assert.throws(() => assertPreviewIsolation({ ...valid(), VITE_SUPABASE_URL: url }), error => {
      assert.match(error.message, /VITE_SUPABASE_URL/);
      assert.ok(!error.message.includes("sensitive"));
      return true;
    });
  }
});

test("privileged, malformed and different-project keys are rejected without leaking credentials", () => {
  for (const key of [
    "sb_secret_sensitive_private_key",
    "malformed-sensitive-key",
    jwt({ role: "service_role", ref: previewRef }),
    jwt({ role: "anon", ref: PRODUCTION_SUPABASE_REF }),
    jwt({ role: "anon" }),
  ]) {
    assert.throws(() => assertPreviewIsolation({ ...valid(), VITE_SUPABASE_ANON_KEY: key }), error => {
      assert.match(error.message, /VITE_SUPABASE_ANON_KEY/);
      assert.ok(!error.message.includes(key));
      return true;
    });
  }
});

test("every supported integration secret blocks preview; empty values disable integrations", () => {
  for (const name of PREVIEW_BLOCKED_SECRETS) {
    assert.throws(() => assertPreviewIsolation({ ...valid(), [name]: "sensitive-secret" }), error => {
      assert.match(error.message, new RegExp(name));
      assert.ok(!error.message.includes("sensitive-secret"));
      return true;
    });
    assert.equal(assertPreviewIsolation({ ...valid(), [name]: "" }).checked, true);
  }
});

test("actual Vite preview build rejects production configuration before output is generated", () => {
  // resolve through Node's module walk, not a hard-coded ../node_modules — a git
  // worktree has no node_modules of its own and borrows the main checkout's.
  // vite's exports map hides ./bin, so anchor on package.json and join.
  const vitePkg = createRequire(import.meta.url).resolve("vite/package.json");
  const vite = join(dirname(vitePkg), "bin", "vite.js");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const run = spawnSync(process.execPath, [vite, "build"], {
    cwd: root,
    env: { ...process.env, ...valid(), VITE_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co` },
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });
  assert.ifError(run.error);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr + run.stdout, /Preview isolation check failed/);
  assert.match(run.stderr + run.stdout, /production OTB database/);
  assert.ok(!(run.stderr + run.stdout).includes("modules transformed"));
});

function importServerRuntime(overrides = {}) {
  const env = { ...process.env, ...valid(), ...overrides };
  for (const name of PREVIEW_BLOCKED_SECRETS) {
    if (!Object.hasOwn(overrides, name)) delete env[name];
  }
  return spawnSync(process.execPath, ["--input-type=module", "--eval",
    'globalThis.fetch = () => { throw new Error("Unexpected network call"); }; const mod = await import(process.argv[1]); process.stdout.write("configured=" + mod.configured());',
    new URL("../api/_supa.mjs", import.meta.url).href,
  ], { env, encoding: "utf8", timeout: 10000, windowsHide: true });
}

test("server runtime import rejects unsafe preview configuration before any network request", () => {
  for (const overrides of [
    { VITE_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co` },
    { VITE_SUPABASE_ANON_KEY: "" },
    { CRON_SECRET: "sensitive-runtime-secret" },
  ]) {
    const run = importServerRuntime(overrides);
    assert.ifError(run.error);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Preview isolation check failed/);
    assert.ok(!run.stderr.includes("Unexpected network call"));
    assert.ok(!run.stderr.includes("sensitive-runtime-secret"));
  }
});

test("server runtime import accepts isolated preview and preserves production behavior without fetching", () => {
  for (const overrides of [
    {},
    { VERCEL_ENV: "production", VITE_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co`, CRON_SECRET: "test-production-secret" },
  ]) {
    const run = importServerRuntime(overrides);
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "configured=true");
  }
});
