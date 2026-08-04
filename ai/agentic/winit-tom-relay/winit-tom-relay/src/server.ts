import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { loadEnv } from "winit-tom-adapter";
import { initRuntimeFromEnv } from "./config/initRuntime.js";
import { getMetricsText } from "./metrics/prometheus.js";
import { registerHealth } from "./routes/health.js";
import { registerV1AuthExchange } from "./routes/v1/authExchange.js";
import { registerV1Routes } from "./routes/v1/ordersByTracking.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")) as {
  version: string;
};

loadEnv();

async function main(): Promise<void> {
  await initRuntimeFromEnv();

  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    genReqId: (req) => {
      const h = req.headers["x-request-id"];
      return typeof h === "string" && h.trim() !== "" ? h.trim() : randomUUID();
    },
  });

  app.setErrorHandler((err, req, reply) => {
    if (reply.sent) return;
    req.log.error(err);
    reply.status(500).send({
      requestId: req.id,
      error: { code: "INTERNAL", message: "Internal server error." },
    });
  });

  const host = process.env.RELAY_LISTEN_HOST ?? "0.0.0.0";
  const port = Number(process.env.RELAY_PORT ?? "8787");

  app.get("/metrics", async (_req, reply) => {
    reply.type("text/plain; version=0.0.4; charset=utf-8");
    return getMetricsText();
  });

  await registerHealth(app, packageJson.version);
  await registerV1AuthExchange(app);
  await registerV1Routes(app);

  await app.listen({ host, port });
  app.log.info({ host, port }, "winit-tom-relay listening");

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      void (async () => {
        await app.close();
        process.exit(0);
      })();
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
