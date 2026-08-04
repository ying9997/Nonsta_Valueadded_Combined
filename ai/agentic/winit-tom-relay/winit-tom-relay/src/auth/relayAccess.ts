import type { FastifyReply, FastifyRequest } from "fastify";
import { getExchangeSessionStoreIfAvailable } from "../config/getSessionStore.js";
import { getRuntimeState } from "../config/runtimeState.js";
import { getExchangeSession } from "../services/exchangeSessionStore.js";
import { tenantIdForLog } from "../tenants/tenantIdLog.js";
import type { RelayContext } from "../tenants/types.js";
import { extractClientApiKey } from "./apiKey.js";

/**
 * 1) 换票 access token（会话存储中的 `winit-tom-relay:exch:*` 逻辑键）  
 * 2) 多租户静态 Key + 凭据文件  
 * 3) 单租户 `RELAY_API_KEYS`
 */
export async function relayAccessPreHandler(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const key = extractClientApiKey(req);
  if (!key) {
    return reply.status(401).send({
      requestId: req.id,
      error: { code: "UNAUTHORIZED", message: "Missing API key." },
    });
  }
  const exStore = getExchangeSessionStoreIfAvailable();
  if (exStore) {
    const sess = await getExchangeSession(exStore, key);
    if (sess) {
      const tid = sess.tenantId;
      const ctx: RelayContext = {
        mode: "exchange",
        accessToken: key,
        sessionPayload: sess,
        tenantIdLog: tid ? tenantIdForLog(tid) : "single",
      };
      req.relay = ctx;
      return;
    }
  }
  const st = getRuntimeState();
  if (st.kind === "multi") {
    const tenantId = st.keyToTenant.get(key);
    if (!tenantId) {
      return reply.status(401).send({
        requestId: req.id,
        error: { code: "UNAUTHORIZED", message: "Invalid API key." },
      });
    }
    const credentials = st.tenants.get(tenantId);
    if (!credentials) {
      return reply.status(503).send({
        requestId: req.id,
        error: { code: "RELAY_MISCONFIG", message: `No credentials for tenant: ${tenantId}` },
      });
    }
    const ctx: RelayContext = {
      mode: "multi",
      tenantId,
      credentials,
      tenantIdLog: tenantIdForLog(tenantId),
    };
    req.relay = ctx;
    return;
  }
  const keys = new Set(
    (process.env.RELAY_API_KEYS ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
  if (keys.size === 0) {
    return reply.status(503).send({
      requestId: req.id,
      error: { code: "RELAY_MISCONFIG", message: "RELAY_API_KEYS is not set or empty." },
    });
  }
  if (!keys.has(key)) {
    return reply.status(401).send({
      requestId: req.id,
      error: { code: "UNAUTHORIZED", message: "Invalid API key." },
    });
  }
  req.relay = { mode: "single" };
}
