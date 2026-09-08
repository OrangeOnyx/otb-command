/* Run the existing app in explicit, loopback-only review mode. Never mutate
   .env or reveal its values. The flag cannot disable production auth. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const child = spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", "5174", "--strictPort"], {
  cwd: root,
  env: { ...process.env, VITE_LOCAL_REVIEW: "1" },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", error => { process.stderr.write("Could not start local review: " + error.message + "\n"); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
