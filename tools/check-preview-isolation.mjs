/* Preview builds and server runtimes must use an isolated backend and dormant integrations.
   Read the process environment, not .env: Vite's local dotenv fallback must
   never silently bind a hosted preview to the production database. This
   checks configuration only; deployment acceptance must verify backend access. */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCTION_SUPABASE_REF = "kbhsghodquchkgfdzckc";
export const PREVIEW_BLOCKED_SECRETS = Object.freeze([
  "CRON_SECRET",
  "VOICE_SECRET",
  "STRIPE_SECRET_KEY",
  "ANTHROPIC_API_KEY",
  "ELEVENLABS_API_KEY",
  "UNIFI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
]);

export function assertPreviewIsolation(env = process.env) {
  if (env.VERCEL_ENV !== "preview") return { checked: false };

  const failures = [];
  let projectRef;
  const rawUrl = env.VITE_SUPABASE_URL;
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    failures.push("VITE_SUPABASE_URL must be set explicitly in the preview environment");
  } else {
    try {
      const url = new URL(rawUrl);
      const project = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
      if (url.protocol !== "https:" || !project || url.username || url.password ||
          url.port || url.search || url.hash || url.pathname !== "/") {
        failures.push("VITE_SUPABASE_URL must be the HTTPS origin of an isolated Supabase project");
      } else {
        projectRef = project[1];
        if (projectRef === PRODUCTION_SUPABASE_REF)
          failures.push("VITE_SUPABASE_URL points to the production OTB database");
      }
    } catch {
      failures.push("VITE_SUPABASE_URL must be a valid isolated Supabase project URL");
    }
  }

  const key = env.VITE_SUPABASE_ANON_KEY;
  if (typeof key !== "string" || !key.trim()) {
    failures.push("VITE_SUPABASE_ANON_KEY must be set explicitly in the preview environment");
  } else if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    // Legacy anon JWTs identify their project and role. Their signature is
    // verified by Supabase at runtime; this only catches configuration errors.
    try {
      const parts = key.split(".");
      if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.role !== "anon") throw new Error();
      if (!projectRef || payload.ref !== projectRef)
        failures.push("VITE_SUPABASE_ANON_KEY must belong to the isolated preview project");
    } catch {
      failures.push("VITE_SUPABASE_ANON_KEY must be a publishable key or legacy anon key; privileged keys are forbidden");
    }
  }

  for (const name of PREVIEW_BLOCKED_SECRETS) {
    if (env[name] !== undefined && env[name] !== null && env[name] !== "")
      failures.push(`${name} must be absent or empty in the isolated preview`);
  }

  if (failures.length) {
    // Report variable names and remedies, never credential values.
    throw new Error("Preview isolation check failed:\n- " + failures.join("\n- "));
  }
  return { checked: true, projectRef };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = assertPreviewIsolation();
    process.stdout.write(result.checked ? "Preview isolation configuration passed.\n" : "Not a Vercel preview; configuration unchanged.\n");
  } catch (error) {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  }
}
