import { z } from "zod";
import type { ExchangeSessionPayloadV1 } from "../exchange/sessionTypes.js";
import type { SessionStore } from "../sessionStore/types.js";

/** 换票条目的逻辑键前缀（仅用于生成稳定逻辑键，落盘时由 store 哈希）。 */
export const EXCHANGE_SESSION_KEY_PREFIX = "winit-tom-relay:exch:" as const;

export function exchangeTokenLogicalKey(token: string): string {
  return `${EXCHANGE_SESSION_KEY_PREFIX}${token}`;
}

const payloadV1 = z.object({
  v: z.literal(1),
  jar: z.object({ v: z.literal(1), hosts: z.record(z.string(), z.record(z.string(), z.string())) }),
  tenantId: z.string().optional(),
  cnomstomBase: z.string().optional(),
  ordersPage: z.string().optional(),
  ordersReferer: z.string().optional(),
});

export function parseExchangePayload(raw: string): ExchangeSessionPayloadV1 {
  return payloadV1.parse(JSON.parse(raw) as unknown);
}

export async function getExchangeSession(
  store: SessionStore,
  accessToken: string,
): Promise<ExchangeSessionPayloadV1 | null> {
  const s = await store.get(exchangeTokenLogicalKey(accessToken));
  if (!s) return null;
  try {
    return parseExchangePayload(s);
  } catch {
    return null;
  }
}

export async function saveExchangeSession(
  store: SessionStore,
  accessToken: string,
  payload: ExchangeSessionPayloadV1,
  ttlSec: number,
): Promise<void> {
  await store.setWithTtl(exchangeTokenLogicalKey(accessToken), JSON.stringify(payload), ttlSec);
}

export async function deleteExchangeSession(store: SessionStore, accessToken: string): Promise<void> {
  await store.del(exchangeTokenLogicalKey(accessToken));
}

export function getExchangeTokenTtlSec(): number {
  return Number(process.env.RELAY_EXCHANGE_TOKEN_TTL_SEC ?? "3600");
}
