/**
 * 节点：规范化入库单查询标识
 * FaaS 单文件闭环，无外部 import。
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

  const wiSeen = new Set<string>();
  const refSeen = new Set<string>();
  const wiOrderNos: string[] = [];
  const customerRefNos: string[] = [];

  for (const token of raw) {
    if (isWiOrderToken(token)) {
      const normalized = normalizeWiOrderNum(token);
      if (!wiSeen.has(normalized)) {
        wiSeen.add(normalized);
        wiOrderNos.push(normalized);
      }
    } else {
      const normalized = token.trim();
      if (!refSeen.has(normalized)) {
        refSeen.add(normalized);
        customerRefNos.push(normalized);
      }
    }
  }

  const hasOrders = wiOrderNos.length > 0 || customerRefNos.length > 0;

  return {
    wiOrderNos,
    customerRefNos,
    inboundOrderNos: [...wiOrderNos, ...customerRefNos],
    skipApi: !hasOrders,
    lookupMeta: { hasOrders, wiCount: wiOrderNos.length, refCount: customerRefNos.length },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-inbound-lookup")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
