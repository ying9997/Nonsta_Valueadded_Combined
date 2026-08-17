/**
 * 节点：load-transit-kb — 拼接头程 KB 与本期范围说明
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const kbTransitMilestones = str(params.kbTransitMilestones);
  const tmsGapNotice = str(params.tmsGapNotice);
  const queryFocus = str(params.queryFocus) || "overall";

  const focusHint =
    queryFocus === "departure" || queryFocus === "arrival_port"
      ? "客户关注离港/到港：头程 TMS 细粒度不在本期，转 OMS 轨迹或客服"
      : queryFocus === "delivery_warehouse"
        ? "客户关注预计送仓（OMS expectedSendwarehouseTime + trackingList）"
        : "综合概述 TS 在途（仅 OMS 可述范围）";

  return {
    transitGuide: kbTransitMilestones,
    tmsGapNotice:
      tmsGapNotice ||
      "头程离港/到港细粒度不在本期交付范围；本专家本期不对客启用。",
    queryFocus,
    focusHint,
    phaseScope: "out_of_phase",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-transit-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
