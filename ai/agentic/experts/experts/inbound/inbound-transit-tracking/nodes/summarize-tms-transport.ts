/**
 * 节点：规范化 TMS TransportOrderVo 摘要
 */

type TmsTransportRecord = {
  transportOrderNo: string;
  customerOrderNo: string;
  status: string;
  winitProductCode: string;
  estimateVolume: number | null;
  estimatePackageQty: number | null;
  containerNo: string;
  cartonType: string;
  sendPortType: string;
  cutoffCabinetDate: string;
  importDeclarationRuleCode: string;
  importerCode: string;
  exportDeclarationType: string;
  isWaitDataFile: string;
  isWaitPackageList: string;
  logisticsPlanId: string;
  source: string;
};

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function obj(v: unknown): Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function normalizeRow(raw: unknown): TmsTransportRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const transportOrderNo = str(o.orderNo);
  if (!transportOrderNo && !o.customerOrderNo && !o.status) return null;

  const send = obj(o.sendPortInfoVo);
  const imported = obj(o.importedInfoVo);
  const exported = obj(o.exportedInfoVo);
  const logistics = obj(o.logisticsInfoVo);

  return {
    transportOrderNo,
    customerOrderNo: str(o.customerOrderNo),
    status: str(o.status),
    winitProductCode: str(o.winitProductCode),
    estimateVolume: numOrNull(o.estimateVolume),
    estimatePackageQty: numOrNull(o.estimatePackageQty),
    containerNo: str(send.containerNo),
    cartonType: str(send.cartonType),
    sendPortType: str(send.sendPortType),
    cutoffCabinetDate: str(send.cutoffCabinetDate),
    importDeclarationRuleCode: str(imported.importDeclarationRuleCode),
    importerCode: str(imported.importerCode),
    exportDeclarationType: str(exported.exportDeclarationType),
    isWaitDataFile: str(o.isWaitDataFile),
    isWaitPackageList: str(o.isWaitPackageList),
    logisticsPlanId: str(logistics.estimateLogisticsPlanId),
    source: "tms_query_page",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawList = Array.isArray(params.tmsRawList) ? params.tmsRawList : [];
  const seen = new Set<string>();
  const records: TmsTransportRecord[] = [];

  for (const raw of rawList) {
    const row = normalizeRow(raw);
    if (!row || !row.transportOrderNo) continue;
    if (seen.has(row.transportOrderNo)) continue;
    seen.add(row.transportOrderNo);
    records.push(row);
  }

  const primary = records[0] ?? null;
  const dataQuality = records.length > 0 ? "tms_api" : params.skipTms === true ? "skipped" : "missing";

  return {
    tmsTransportSummary: {
      records,
      recordCount: records.length,
      dataQuality,
      primary,
      trackingNote:
        records.length > 0
          ? "运输单表头可查；离港/到港里程碑须 tms.transportorder.queryTrackingList（本期未接入）"
          : "未查到运输单；请确认 TO 号或 WI↔TO 关联 keywordType",
    },
    tmsTransportRecords: records,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("summarize-tms-transport")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
