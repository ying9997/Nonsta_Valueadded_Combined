/**
 * 节点：validate-input — 校验入参并按是否有万邑通出库单号（WO…）分流
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 一致。
 *
 * 【输出】branch：`export`（有出库单号，可走 exportOutboundPod）| `guidance`（仅跟踪号或缺单号，不调用 OpenAPI）
 * 归一化规则与 delivery-status 一致：WO 开头归 outbound；WO 末尾 A/a 剥离；其余归 trackingIds。
 */

function stripTrailingAForWoOrder(s: string): string {
  const t = s.trim();
  if (!/^WO/i.test(t)) return t;
  if (/[Aa]$/.test(t)) return t.slice(0, -1);
  return t;
}

function partitionIdentifiers(rawList: string[]): { trackingIds: string[]; outboundOrderNos: string[] } {
  const trackingIds: string[] = [];
  const outboundOrderNos: string[] = [];
  const seenT = new Set<string>();
  const seenO = new Set<string>();

  for (const raw of rawList) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (/^WO/i.test(s)) {
      const normalized = stripTrailingAForWoOrder(s);
      const u = normalized.toUpperCase();
      if (seenO.has(u)) continue;
      seenO.add(u);
      outboundOrderNos.push(normalized);
    } else {
      const u = s.toUpperCase();
      if (seenT.has(u)) continue;
      seenT.add(u);
      trackingIds.push(s);
    }
  }
  return { trackingIds, outboundOrderNos };
}

function passthroughEnrichedContext(ec: unknown): Record<string, unknown> {
  if (ec !== undefined && ec !== null && typeof ec === "object" && !Array.isArray(ec)) {
    return { ...(ec as Record<string, unknown>) };
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const fromTracking = ((params.trackingIds as string[]) ?? []).map((t) => String(t ?? "").trim()).filter(Boolean);
  const fromOrders = ((params.outboundOrderNos as string[]) ?? []).map((o) => String(o ?? "").trim()).filter(Boolean);
  const merged = [...fromTracking, ...fromOrders];
  const { trackingIds, outboundOrderNos } = partitionIdentifiers(merged);

  const query = String(params.query ?? "").trim();
  const customerIntent = String(params.customerIntent ?? "").trim();
  const enrichedContext = passthroughEnrichedContext(params.enrichedContext);
  const inputContext =
    params.inputContext !== undefined && params.inputContext !== null && typeof params.inputContext === "object"
      ? (params.inputContext as Record<string, unknown>)
      : {};

  const hasOrder = outboundOrderNos.length > 0;
  const hasTracking = trackingIds.length > 0;
  const hasTextIntent = query.length > 0 || customerIntent.length > 0;
  const hasEnriched =
    Object.keys(enrichedContext).length > 0 &&
    Object.keys(enrichedContext).some((k) => k !== "analysisClock");

  const valid = hasOrder || hasTracking || hasTextIntent || hasEnriched;
  const error = valid ? "" : "请至少提供 trackingIds、outboundOrderNos、query、customerIntent 或 enrichedContext 之一";

  const branch = valid && hasOrder ? "export" : "guidance";

  return {
    valid,
    branch,
    error,
    query,
    trackingIds,
    outboundOrderNos,
    customerIntent: valid ? customerIntent : `[输入校验] ${error}`,
    enrichedContext,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
