/**
 * 节点：组装 tms.transportorder.queryPage 请求
 * 规格：docs/plan/inbound-tms-transportorder-queryPage.md
 */

const TMS_QUERY_PAGE_ACTION =
  (typeof process !== "undefined" && process.env?.COZE_WINIT_TMS_QUERY_PAGE_ACTION?.trim()) ||
  "tms.transportorder.queryPage";

const DEFAULT_WI_KEYWORD_TYPE =
  (typeof process !== "undefined" && process.env?.COZE_WINIT_TMS_KEYWORD_TYPE?.trim()) ||
  "inboundOrderNo";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isTransportOrderNo(token: string): boolean {
  return /^TO/i.test(token.trim());
}

function basePageData(extra: Record<string, unknown>): Record<string, unknown> {
  return { pageNo: 1, pageSize: 10, ...extra };
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true || params.skipTms === true) {
    return { actions: [], tmsActionName: TMS_QUERY_PAGE_ACTION, skipTms: true };
  }

  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).map((o) => str(o)).filter(Boolean);
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).map((o) => str(o)).filter(Boolean);
  const transportOrderNo = str(params.transportOrderNo);
  const containerNo = str(params.containerNo);

  const actions: Array<{ action: string; data: string }> = [];
  const seen = new Set<string>();

  const push = (keywordType: string, content: string) => {
    const key = `${keywordType}|${content}`;
    if (!content || seen.has(key)) return;
    seen.add(key);
    actions.push({
      action: TMS_QUERY_PAGE_ACTION,
      data: JSON.stringify(basePageData({ keywordType, content })),
    });
  };

  if (transportOrderNo) push("orderNo", transportOrderNo.toUpperCase());
  for (const token of [...wiOrderNos, ...customerRefNos]) {
    if (isTransportOrderNo(token)) push("orderNo", token.toUpperCase());
  }
  for (const wi of wiOrderNos) push(DEFAULT_WI_KEYWORD_TYPE, wi);
  for (const ref of customerRefNos) push("customerOrderNo", ref);
  if (containerNo) push("containerNo", containerNo);

  if (actions.length === 0) {
    return { actions: [], tmsActionName: TMS_QUERY_PAGE_ACTION, skipTms: true };
  }

  return { actions: actions, tmsActionName: TMS_QUERY_PAGE_ACTION, skipTms: false };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-tms-transport-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
