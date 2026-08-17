/**
 * 节点：规范化查询标识（不发起 OpenAPI 调用）
 * - WO 主单号：规范为 WO 主单（去掉子单尾缀字母）
 * - 非 WO：保留原值，交由下游 build 节点分别按 trackingNo / sellerOrderNo 组装 list 查询动作
 */

type LookupEntry = {
  input: string;
  normalized: string;
  kind: "outboundOrderNum" | "ambiguous";
};

/** WO + 数字；末尾连续字母为子单/子包裹后缀 */
function normalizeWoMainOrderNum(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

function isWoOutboundToken(raw: string): boolean {
  return /^WO\d+/i.test(raw.trim());
}

async function main({ params }: { params: Record<string, unknown> }) {
  const raw = ((params.outboundOrderNos as string[]) ?? []).map((o) => String(o ?? "").trim()).filter(Boolean);

  const seen = new Set<string>();
  const outboundOrderNos: string[] = [];
  const entries: LookupEntry[] = [];

  for (const token of raw) {
    const normalized = isWoOutboundToken(token) ? normalizeWoMainOrderNum(token) : token;
    if (!normalized) continue;
    entries.push({
      input: token,
      normalized,
      kind: isWoOutboundToken(token) ? "outboundOrderNum" : "ambiguous",
    });
    if (!seen.has(normalized)) {
      seen.add(normalized);
      outboundOrderNos.push(normalized);
    }
  }

  return {
    outboundOrderNos,
    lookupMeta: { entries },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-outbound-lookup")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
