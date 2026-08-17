/**
 * 节点：识别“派送失败退回 / 关联退货单”事实查询意图，并按出库单生成退货单查询动作。
 * FaaS 单文件闭环，无 import。
 */

type ReturnActionPlan = {
  outboundOrderNo: string;
};

type ReturnLookupMeta = {
  intentMatched: boolean;
  candidateOrderCount: number;
  missingOutboundOrderNo: boolean;
  requiresNarrowing: boolean;
};

const RETURN_BATCH_MAX = 100;

function returnText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeReturnOutboundOrderNo(value: unknown): string {
  const text = returnText(value);
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(text);
  return match ? `WO${match[1]}` : "";
}

function isReturnFactIntent(query: unknown, customerIntent: unknown): boolean {
  const text = `${returnText(query)} ${returnText(customerIntent)}`.toLowerCase();
  if (!text.trim()) return false;

  const explicitFact =
    /(关联|绑定|对应|是否|有没有|哪一|哪个|查询|查看|查到|状态|进度|原因|单号|到仓|入仓|收货|完成|退到|退回).{0,16}(退货单|退回单|退件单|退货|退回|退仓)/i.test(text) ||
    /(退货单|退回单|退件单|退货|退回|退仓).{0,16}(关联|绑定|对应|是否|有没有|哪一|哪个|查询|查看|查到|状态|进度|原因|单号|到仓|入仓|收货|完成)/i.test(text) ||
    /(派送失败|投递失败|妥投失败|拒收|无法派送|delivery failed|undeliverable).{0,20}(退回|退货|退仓|return)/i.test(text) ||
    /(退回|退货|退仓|return).{0,20}(派送失败|投递失败|妥投失败|拒收|无法派送|delivery failed|undeliverable)/i.test(text) ||
    /(return order|return status|returned to (the )?warehouse|return(ed)? reason)/i.test(text);
  if (explicitFact) return true;

  const processOnly =
    /(如何|怎么|怎样|流程|政策|规则|申请|创建|下单|办理|操作).{0,12}(退货|退回|退货单)/i.test(text) ||
    /(退货|退回|退货单).{0,12}(如何|怎么|怎样|流程|政策|规则|申请|创建|下单|办理|操作)/i.test(text);
  if (processOnly) return false;

  return /(退货单|退回单|退件单|退仓|已退货|returned package)/i.test(text);
}

function orderRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>).list;
  return Array.isArray(list)
    ? list.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function collectOutboundOrderNos(rawOrderData: unknown, outboundOrderNos: unknown): string[] {
  const values: string[] = [];
  if (Array.isArray(outboundOrderNos)) {
    for (const value of outboundOrderNos) {
      const normalized = normalizeReturnOutboundOrderNo(value);
      if (normalized) values.push(normalized);
    }
  }
  for (const row of orderRows(rawOrderData)) {
    const normalized = normalizeReturnOutboundOrderNo(
      row.outboundOrderNum ?? row.documentNo ?? row.orderNo
    );
    if (normalized) values.push(normalized);
  }
  return Array.from(new Set(values.map((value) => value.toUpperCase())));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intentMatched = isReturnFactIntent(params.query, params.customerIntent);
  const outboundOrderNos = collectOutboundOrderNos(
    params.rawOrderData,
    params.outboundOrderNos
  );
  const requiresNarrowing = intentMatched && outboundOrderNos.length > RETURN_BATCH_MAX;
  const lookupMeta: ReturnLookupMeta = {
    intentMatched,
    candidateOrderCount: outboundOrderNos.length,
    missingOutboundOrderNo: intentMatched && outboundOrderNos.length === 0,
    requiresNarrowing,
  };

  if (!intentMatched || outboundOrderNos.length === 0 || requiresNarrowing) {
    return { actions: [], actionPlans: [], returnLookupMeta: lookupMeta };
  }

  const actionPlans: ReturnActionPlan[] = outboundOrderNos.map((outboundOrderNo) => ({
    outboundOrderNo,
  }));
  const actions = actionPlans.map((plan) => ({
    action: "rma.returnGoodsOrder.queryReturnOderList",
    data: JSON.stringify({
      outboundOrderNo: plan.outboundOrderNo,
      pageParams: { pageNo: 1, pageSize: 50 },
    }),
  }));

  return { actions, actionPlans, returnLookupMeta: lookupMeta };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-outbound-return-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

