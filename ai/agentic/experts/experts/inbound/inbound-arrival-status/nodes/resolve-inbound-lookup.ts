/**
 * 节点：规范化入库单查询标识
 * - WI 前缀 → wiOrderNos（用 orderNo 查 getOrderDetail）
 * - 其他 → customerRefNos（用 customerOrderNo 查）
 * - 仅有 errorCode 且无单号 → skipApi=true
 */

function isWiOrderToken(raw: string): boolean {
  return /^WI/i.test(raw.trim());
}

function normalizeWiOrderNum(raw: string): string {
  return raw.trim().toUpperCase();
}

async function main({ params }: { params: Record<string, unknown> }) {
  const raw = ((params.inboundOrderNos as string[]) ?? [])
    .map((o) => String(o ?? "").trim())
    .filter(Boolean);

  const errorCode = String(params.errorCode ?? "").trim();
  const wiSeen = new Set<string>();
  const refSeen = new Set<string>();
  const wiOrderNos: string[] = [];
  const customerRefNos: string[] = [];
  const entries: Array<{ input: string; normalized: string; kind: "wi" | "customerRef" }> = [];

  for (const token of raw) {
    if (isWiOrderToken(token)) {
      const normalized = normalizeWiOrderNum(token);
      entries.push({ input: token, normalized, kind: "wi" });
      if (!wiSeen.has(normalized)) {
        wiSeen.add(normalized);
        wiOrderNos.push(normalized);
      }
    } else {
      const normalized = token.trim();
      entries.push({ input: token, normalized, kind: "customerRef" });
      if (!refSeen.has(normalized)) {
        refSeen.add(normalized);
        customerRefNos.push(normalized);
      }
    }
  }

  const hasOrders = wiOrderNos.length > 0 || customerRefNos.length > 0;
  const skipApi = !hasOrders && errorCode.length > 0;

  return {
    wiOrderNos,
    customerRefNos,
    inboundOrderNos: [...wiOrderNos, ...customerRefNos],
    errorCode,
    skipApi,
    lookupMeta: { entries, hasOrders, skipApi },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-inbound-lookup")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
