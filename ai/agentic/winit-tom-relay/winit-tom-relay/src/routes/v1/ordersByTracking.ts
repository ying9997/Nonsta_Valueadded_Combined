import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { relayAccessPreHandler } from "../../auth/relayAccess.js";
import { RelayReauthRequiredError } from "../../errors/RelayReauthRequiredError.js";
import { recordHttpRequest } from "../../metrics/prometheus.js";
import { tomOrderByExchangeSession } from "../../services/exchangeTomOrder.js";
import { tomOrderByTracking } from "../../services/tomOrderByTracking.js";
import { tomOrderByTrackingForTenant } from "../../services/tenantTomOrder.js";

const bodySchema = z.object({
  trackingNos: z.array(z.string().min(1)).min(1),
});

export async function registerV1Routes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (scope) => {
      scope.addHook("preHandler", relayAccessPreHandler);
      await scope.register(rateLimit, {
        max: Number(process.env.RELAY_TENANT_RATE_MAX ?? "120"),
        timeWindow: Number(process.env.RELAY_TENANT_RATE_TIME_WINDOW_MS ?? "60000"),
        keyGenerator: (req) => {
          const r = req.relay;
          if (!r) return "unknown";
          if (r.mode === "multi") return `t:${r.tenantId}`;
          if (r.mode === "exchange") return `ex:${r.tenantIdLog}`;
          return "single";
        },
        nameSpace: "relay_v1_",
      });
      scope.addHook("onResponse", (req, _res, done) => {
        const r = req.relay;
        const tenantLabel =
          r?.mode === "multi" || r?.mode === "exchange" ? r.tenantIdLog : r ? "single" : "none";
        recordHttpRequest(req.routeOptions?.url ?? req.url, tenantLabel);
        done();
      });
      scope.post("/orders/by-tracking", async (req, reply) => {
        const ctx = req.relay;
        if (!ctx) {
          return reply.status(500).send({
            requestId: req.id,
            error: { code: "INTERNAL", message: "Missing relay context." },
          });
        }
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({
            requestId: req.id,
            error: {
              code: "INVALID_BODY",
              message: parsed.error.message,
            },
          });
        }
        try {
          const data =
            ctx.mode === "exchange"
              ? await tomOrderByExchangeSession(
                  ctx.accessToken,
                  ctx.sessionPayload,
                  parsed.data.trackingNos,
                )
              : ctx.mode === "single"
                ? await tomOrderByTracking(parsed.data.trackingNos)
                : await tomOrderByTrackingForTenant(
                    ctx.tenantId,
                    ctx.credentials,
                    parsed.data.trackingNos,
                    req.log,
                  );
          return { requestId: req.id, data };
        } catch (e) {
          if (e instanceof RelayReauthRequiredError) {
            return reply.status(401).send({
              requestId: req.id,
              error: {
                code: RelayReauthRequiredError.code,
                message: e.message,
              },
            });
          }
          const message = e instanceof Error ? e.message : String(e);
          return reply.status(502).send({
            requestId: req.id,
            error: { code: "TOM_ERROR", message },
          });
        }
      });
    },
    { prefix: "/v1" },
  );
}
