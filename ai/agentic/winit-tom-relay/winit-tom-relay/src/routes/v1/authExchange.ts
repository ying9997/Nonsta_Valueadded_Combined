import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isExchangeEnabled } from "../../config/exchangeEnabled.js";
import { getRuntimeState } from "../../config/runtimeState.js";
import { performPasswordExchange } from "../../services/performPasswordExchange.js";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  tenantId: z.string().min(1).optional(),
});

export async function registerV1AuthExchange(app: FastifyInstance): Promise<void> {
  await app.register(
    async (scope) => {
      await scope.register(rateLimit, {
        max: Number(process.env.RELAY_EXCHANGE_RATE_MAX ?? "20"),
        timeWindow: Number(process.env.RELAY_EXCHANGE_RATE_TIME_WINDOW_MS ?? "60000"),
        keyGenerator: (req) => req.ip,
        nameSpace: "relay_exch_",
      });
      scope.post("/auth/exchange", async (req, reply) => {
        if (!isExchangeEnabled()) {
          return reply.status(404).send({
            requestId: req.id,
            error: { code: "NOT_FOUND", message: "Password exchange is not enabled." },
          });
        }
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({
            requestId: req.id,
            error: { code: "INVALID_BODY", message: parsed.error.message },
          });
        }
        const st = getRuntimeState();
        if (st.kind === "multi" && !parsed.data.tenantId?.trim()) {
          return reply.status(400).send({
            requestId: req.id,
            error: { code: "INVALID_BODY", message: "tenantId is required in multi-tenant mode." },
          });
        }
        try {
          const out = await performPasswordExchange({
            username: parsed.data.username,
            password: parsed.data.password,
            tenantId: parsed.data.tenantId?.trim(),
          });
          return {
            requestId: req.id,
            data: {
              access_token: out.accessToken,
              expires_in: out.expiresIn,
              token_type: "Bearer",
            },
          };
        } catch {
          return reply.status(401).send({
            requestId: req.id,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Login failed.",
            },
          });
        }
      });
    },
    { prefix: "/v1" },
  );
}
