/**
 * 节点：validate-input — 查件专家入参校验与分流
 * FaaS 单文件闭环。与 `workflow.json` 一致。
 *
 * 【输出】branch：`query`（具备 inquiryIds / trackingIds / outboundOrderNos 至少其一）| `guidance`（仅有文本意图）| `skip`
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
    note: "参考时钟为服务端 UTC。",
  };
}

function stripTrailingAForWoOrder(s: string): string {
  const t = s.trim();
  if (!/^WO/i.test(t)) return t;
  if (/[Aa]$/.test(t)) return t.slice(0, -1);
  return t;
}

function partitionWoAndTracking(rawList: string[]): { trackingIds: string[]; outboundOrderNos: string[] } {
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

function normalizeInquiryIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    const u = s.toUpperCase();
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(s);
  }
  return out;
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
  const inquiryIds = normalizeInquiryIds(params.inquiryIds);

  const fromTracking = ((params.trackingIds as string[]) ?? []).map((t) => String(t ?? "").trim()).filter(Boolean);
  const fromOrders = ((params.outboundOrderNos as string[]) ?? []).map((o) => String(o ?? "").trim()).filter(Boolean);
  const merged = [...fromTracking, ...fromOrders];
  const { trackingIds, outboundOrderNos } = partitionWoAndTracking(merged);

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

  const hasQueryKeys = inquiryIds.length > 0 || outboundOrderNos.length > 0 || trackingIds.length > 0;
  const hasText = query.length > 0 || customerIntent.length > 0;
  const valid = hasQueryKeys || hasText || hasEnriched;
  const error = valid ? "" : "请至少提供 inquiryIds、trackingIds、outboundOrderNos、query、customerIntent 或 enrichedContext 之一";

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
    inquiryIds,
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
