/**
 * 节点：TMS 可用性 — queryPage 表头 + queryTrackingList 里程碑 Gap
 */

const TRACKING_GAP =
  "离港/到港/航班船名等里程碑须 tms.transportorder.queryTrackingList，本期 workflow 未接入；勿编造日期。";

const NO_TO_NOTE =
  "未查到关联运输单（TO）；请客户提供 TO 号，或确认 WI 与 TMS keywordType 映射。";

function summaryFromParams(params: Record<string, unknown>) {
  return (params.tmsTransportSummary ?? {}) as Record<string, unknown>;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const summary = summaryFromParams(params);
  const recordCount = Number(summary.recordCount ?? 0);
  const hasTms = recordCount > 0;
  const dataQuality = String(summary.dataQuality ?? "missing");

  let phaseScope = "tms_not_found";
  let gapNote = NO_TO_NOTE;

  if (hasTms) {
    phaseScope = "tms_header_only";
    gapNote = String(summary.trackingNote ?? TRACKING_GAP);
  } else if (dataQuality === "skipped") {
    phaseScope = "no_lookup";
    gapNote = "未提供可查询的单号，跳过 TMS。";
  }

  return {
    tmsAvailable: hasTms,
    tmsDataAvailable: hasTms,
    phaseScope,
    gapNote,
    tmsGapNotice: gapNote,
    tmsTransportSummary: summary,
    departureTime: null,
    arrivalPortTime: null,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("check-tms-gap")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
