import { defineConfig } from "vite";

/* Private review evidence is read server-side on demand and never enters
   Vite's client module graph or public directory. The production API has its
   own membership gate. */
export default defineConfig(({ command, mode }) => {
  const review = command === "serve" && mode !== "production" && process.env.VITE_LOCAL_REVIEW === "1";
  return {
    ...(review ? { server: { host: "127.0.0.1", port: 5174, strictPort: true } } : {}),
    plugins: [{
      name: "otb-local-review-evidence",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = (req.url || "").split("?")[0];
          if (pathname !== "/__review/evidence") return next();
          res.setHeader("Cache-Control", "private, no-store");
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("X-Content-Type-Options", "nosniff");
          const host = req.headers.host || "";
          const address = req.socket.remoteAddress;
          const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
          if (!review || !local || !/^(?:127\.0\.0\.1|localhost|\[::1\]):5174$/.test(host)) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "review evidence unavailable" }));
          }
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.setHeader("Allow", "GET");
            return res.end(JSON.stringify({ error: "GET only" }));
          }
          /* Browser cross-origin access must not disclose local records. */
          const origin = req.headers.origin;
          if (origin && origin !== "http://" + host) {
            res.statusCode = 403;
            return res.end(JSON.stringify({ error: "same-origin review required" }));
          }
          try {
            const { loadCommandEvidence } = await import("./tools/command-evidence-data.mjs");
            res.end(JSON.stringify(await loadCommandEvidence()));
          } catch {
            res.statusCode = 503;
            res.end(JSON.stringify({ error: "source evidence unavailable" }));
          }
        });
      },
    }],
  };
});
