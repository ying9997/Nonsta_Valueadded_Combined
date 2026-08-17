/**
 * 节点：TMS 清关 — queryPage 进口商/报关规则 + queryTrackingList 节点 Gap
 */

const TRACKING_GAP =
  "清关申报/放行等细粒度节点须 tms.transportorder.queryTrackingList，本期未接入；仅可陈述运输单表头进口商与报关规则。";

const NO_TO_NOTE = "未查到关联运输单；清关进度仅能参考 OMS 入库单状态与轨迹关键词。";

function summaryFromParams(params: Record<string, unknown>) {
  return (params.tmsTransportSummary ?? {}) as Record<string, unknown>;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const summary = summaryFromParams(params);
  const recordCount = Number(summary.recordCount ?? 0);
  const hasTms = recordCount > 0;
  const dataQuality = String(summary.dataQuality ?? "missing");

  let gapNote = NO_TO_NOTE;
  if (hasTms) gapNote = String(summary.trackingNote ?? TRACKING_GAP);
  else if (dataQuality === "skipped") gapNote = "包税/无单号路径，跳过 TMS 查询。";

  return {
    tmsAvailable: hasTms,
    tmsDataAvailable: hasTms,
    gapNote,
    tmsTransportSummary: summary,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("check-tms-gap")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
