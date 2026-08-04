import type { FastifyReply, FastifyRequest } from "fastify";

export function parseApiKeySetFromEnv(): Set<string> {
  const raw = process.env.RELAY_API_KEYS?.trim() ?? "";
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

export function extractClientApiKey(req: FastifyRequest): string | undefined {
  const auth = req.headers.authorization;
  const xKey = req.headers["x-api-key"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const k = auth.slice(7).trim();
    if (k) return k;
  }
  if (typeof xKey === "string" && xKey.trim() !== "") {
    return xKey.trim();
  }
  return undefined;
}

export function createApiKeyPreHandler(allowedApiKeys: Set<string>) {
  if (allowedApiKeys.size === 0) {
    return async function relayMisconfig(_req: FastifyRequest, reply: FastifyReply) {
      return reply.status(503).send({
        requestId: _req.id,
        error: {
          code: "RELAY_MISCONFIG",
          message: "RELAY_API_KEYS is not set or empty.",
        },
      });
    };
  }
  return async function apiKeyPreHandler(req: FastifyRequest, reply: FastifyReply) {
    const key = extractClientApiKey(req);
    if (!key || !allowedApiKeys.has(key)) {
      return reply.status(401).send({
        requestId: req.id,
        error: {
          code: "UNAUTHORIZED",
          message: !key ? "Missing API key." : "Invalid API key.",
        },
      });
    }
  };
}
