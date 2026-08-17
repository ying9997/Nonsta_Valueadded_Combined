/**
 * 节点：归一化退货单查询批处理结果，严格区分成功、成功空数据、业务失败和分页不完整。
 * FaaS 单文件闭环，无 import。
 */

type FetchStatus = "success" | "no_data" | "service_error";

type ReturnActionPlan = {
  outboundOrderNo: string;
};

type ReturnOrderFact = {
  returnGoodsOrderNo: string;
  outboundOrderNo: string;
  returnType?: string;
  retrunReason?: string;
  returnReasonName?: string;
  status?: string;
  statusName?: string;
  warehouseCode?: string;
  createDate?: string;
  completeTime?: string;
  qtyItemNum?: number;
  orderGoodsCount: number;
  shelveGoodsCount: number;
  source: "rma.returnGoodsOrder.queryReturnOderList";
};

type ReturnLookupResult = {
  outboundOrderNo: string;
  fetchStatus: FetchStatus;
  businessCode: string;
  returnedCount: number;
  exactMatchCount: number;
  partial: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMaybeJson(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 4 && typeof current === "string"; depth += 1) {
    const text = current.trim();
    if (!text) return "";
    try {
      current = JSON.parse(text) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

function textValue(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeOutboundOrderNo(value: unknown): string {
  const text = String(value ?? "").trim();
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(text);
  return match ? `WO${match[1]}` : text.toUpperCase();
}

function extractData(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(parseMaybeJson(raw));
  if (!root) return null;
  return asRecord(parseMaybeJson(root.data)) ?? root;
}

function statusName(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const names: Record<string, string> = {
    PD: "草稿",
    OD: "已下单",
    LC: "已抓单",
    PC: "已揽收",
    RE: "仓库已收货",
    RC: "仓库已收货",
    WP: "客户待处理",
    HI: "仓库处理中",
    OC: "已完成",
    CP: "已完成",
    CD: "已取消",
    VO: "已作废",
    VD: "已作废",
    STOP: "已终止",
  };
  return names[status.toUpperCase()];
}

function reasonName(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  const normalized = reason.toUpperCase();
  if (normalized === "DF") return "派送失败";
  if (normalized === "BR") return "客户退货";
  return reason;
}

function buildFact(row: Record<string, unknown>): ReturnOrderFact | null {
  const returnGoodsOrderNo = textValue(row.returnGoodsOrderNo);
  const outboundOrderNo = normalizeOutboundOrderNo(row.outboundOrderNo);
  if (!returnGoodsOrderNo || !outboundOrderNo) return null;

  const status = textValue(row.status);
  const retrunReason = textValue(row.retrunReason);
  const fact: ReturnOrderFact = {
    returnGoodsOrderNo,
    outboundOrderNo,
    orderGoodsCount: Array.isArray(row.orderGoodsList) ? row.orderGoodsList.length : 0,
    shelveGoodsCount: Array.isArray(row.shelveGoodsList) ? row.shelveGoodsList.length : 0,
    source: "rma.returnGoodsOrder.queryReturnOderList",
  };
  const optional: Array<[keyof ReturnOrderFact, unknown]> = [
    ["returnType", row.returnType],
    ["retrunReason", retrunReason],
    ["returnReasonName", reasonName(retrunReason)],
    ["status", status],
    ["statusName", statusName(status)],
    ["warehouseCode", row.warehouseCode],
    ["createDate", row.createDate],
    ["completeTime", row.completeTime],
  ];
  for (const [key, raw] of optional) {
    const value = textValue(raw);
    if (value) (fact as Record<string, unknown>)[key] = value;
  }
  const qtyItemNum = numberValue(row.qtyItemNum);
  if (qtyItemNum !== undefined) fact.qtyItemNum = qtyItemNum;
  return fact;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const plans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ReturnActionPlan[];
  const outputs = Array.isArray(params.winitPluginOutputList)
    ? params.winitPluginOutputList
    : [];
  const returnOrderFacts: ReturnOrderFact[] = [];
  const returnLookupResults: ReturnLookupResult[] = [];

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index]!;
    const output = asRecord(outputs[index]);
    const businessCode = String(output?.code ?? "").trim();
    if (!output || businessCode !== "0") {
      returnLookupResults.push({
        outboundOrderNo: plan.outboundOrderNo,
        fetchStatus: "service_error",
        businessCode: businessCode || "missing_output",
        returnedCount: 0,
        exactMatchCount: 0,
        partial: false,
      });
      continue;
    }

    const data = extractData(output.data);
    const list = data && Array.isArray(data.list)
      ? data.list.map(asRecord).filter((row): row is Record<string, unknown> => row !== null)
      : [];
    const exactRows = list.filter(
      (row) => normalizeOutboundOrderNo(row.outboundOrderNo) === plan.outboundOrderNo
    );
    const pageParams = data ? asRecord(data.pageParams) : null;
    const totalCount = numberValue(pageParams?.totalCount) ?? list.length;
    const partial = totalCount > list.length;
    const facts = exactRows.map(buildFact).filter((fact): fact is ReturnOrderFact => fact !== null);
    returnOrderFacts.push(...facts);
    returnLookupResults.push({
      outboundOrderNo: plan.outboundOrderNo,
      fetchStatus: facts.length > 0 ? "success" : "no_data",
      businessCode,
      returnedCount: list.length,
      exactMatchCount: facts.length,
      partial,
    });
  }

  return {
    returnOrderFacts,
    returnLookupResults,
    returnLookupMeta: params.returnLookupMeta ?? {},
    returnLookupResolvedCount: returnLookupResults.filter((item) => item.fetchStatus === "success").length,
    returnLookupNoDataCount: returnLookupResults.filter((item) => item.fetchStatus === "no_data").length,
    returnLookupFailedCount: returnLookupResults.filter((item) => item.fetchStatus === "service_error").length,
    returnLookupPartialCount: returnLookupResults.filter((item) => item.partial).length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-outbound-return-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

