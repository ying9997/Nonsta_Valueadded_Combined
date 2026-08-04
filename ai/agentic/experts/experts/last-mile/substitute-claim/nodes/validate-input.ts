/**
 * 节点：validate-input — 代客索赔专家入参校验与分流
 * FaaS 单文件闭环。与 `workflow.json` 一致。
 *
 * 【输出】branch：`query`（具备至少一类查询键，可调用 pageList）| `guidance`（仅有文本意图/上下文，无单号）| `skip`（无效）
 * `trackingIds` / `outboundOrderNos` 归一：WO 开头归出库单号；WO 末尾 A/a 剥离；其余归 trackingIds。
 */

interface AnalysisClock {
  utcIso: string;
  timezoneLabel: string;
  note: string;
}

function buildAnalysisClock(): AnalysisClock {
  return {
    utcIso: new Date().toISOString(),
    timezoneLabel: "UTC",
    note: "参考时钟为服务端 UTC。与轨迹/业务日期比较时请显式区分时区。",
  };
}

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

function withAnalysisClock(ec: unknown): Record<string, unknown> {
  const base =
    ec !== undefined && ec !== null && typeof ec === "object" && !Array.isArray(ec)
      ? { ...(ec as Record<string, unknown>) }
      : {};
  base.analysisClock = buildAnalysisClock();
  return base;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const claimIds = Array.isArray(params.claimIds)
    ? (params.claimIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const fromTracking = ((params.trackingIds as string[]) ?? []).map((t) => String(t ?? "").trim()).filter(Boolean);
  const fromOrders = ((params.outboundOrderNos as string[]) ?? []).map((o) => String(o ?? "").trim()).filter(Boolean);
  const merged = [...fromTracking, ...fromOrders];
  const { trackingIds, outboundOrderNos } = partitionIdentifiers(merged);

  const query = String(params.query ?? "").trim();
  const customerIntent = String(params.customerIntent ?? "").trim();
  const enrichedContext = withAnalysisClock(params.enrichedContext);
  const inputContext =
    params.inputContext !== undefined && params.inputContext !== null && typeof params.inputContext === "object"
      ? (params.inputContext as Record<string, unknown>)
      : {};

  const hasEnriched =
    Object.keys(enrichedContext).length > 0 &&
    Object.keys(enrichedContext).some((k) => k !== "analysisClock");

  const hasQueryKeys = claimIds.length > 0 || outboundOrderNos.length > 0 || trackingIds.length > 0;
  const hasText = query.length > 0 || customerIntent.length > 0;
  const valid = hasQueryKeys || hasText || hasEnriched;
  const error = valid ? "" : "请至少提供 claimIds、trackingIds、outboundOrderNos、query、customerIntent 或 enrichedContext 之一";

  let branch = "skip";
  if (valid) {
    branch = hasQueryKeys ? "query" : "guidance";
  }

  return {
    valid,
    branch,
    error,
    query,
    trackingIds,
    outboundOrderNos,
    claimIds,
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
