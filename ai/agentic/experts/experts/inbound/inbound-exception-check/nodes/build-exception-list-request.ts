/**
 * 节点：组装入库单异常查询请求
 * - 有单号：wh.inboundOrder.queryExceptionList（按单明细）
 * - 批量/列表：wh.inboundOrderException.list（分页总览）
 * FaaS 单文件闭环，无 external import。
 */

const EXCEPTION_LIST_ACTION = "wh.inboundOrderException.list";
const ORDER_EXCEPTION_DETAIL_ACTION = "wh.inboundOrder.queryExceptionList";
const PAGE_SIZE = 20;

async function main({ params }: { params: Record<string, unknown> }) {
  const useListMode = params.useListMode === true;
  const queryAllExceptions = params.queryAllExceptions === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const dateRange = (params.dateRange ?? {}) as Record<string, unknown>;

  const skipExceptionApi = !queryAllExceptions && wiOrderNos.length === 0 && !useListMode;

  let actions: Array<{ action: string; data: string }> = [];
  let exceptionActionPlans: Array<{ inputToken: string; queryBy: string; orderNo?: string }> = [];

  if (wiOrderNos.length > 0) {
    actions = wiOrderNos.map((orderNo) => ({
      action: ORDER_EXCEPTION_DETAIL_ACTION,
      data: JSON.stringify({ orderNo }),
    }));
    exceptionActionPlans = wiOrderNos.map((orderNo) => ({
      inputToken: orderNo,
      queryBy: "queryExceptionList",
      orderNo,
    }));
  } else if (queryAllExceptions || useListMode) {
    const data: Record<string, unknown> = {
      pageNo: 1,
      pageSize: PAGE_SIZE,
    };
    if (dateRange.from) data.orderDateStart = dateRange.from;
    if (dateRange.to) data.orderDateEnd = dateRange.to;
    actions = [{ action: EXCEPTION_LIST_ACTION, data: JSON.stringify(data) }];
    exceptionActionPlans = [{ inputToken: "all", queryBy: "inboundOrderException.list" }];
  }

  return {
    actions,
    exceptionActionPlans,
    exceptionActionName: wiOrderNos.length > 0 ? ORDER_EXCEPTION_DETAIL_ACTION : EXCEPTION_LIST_ACTION,
    skipExceptionApi,
    pageSize: PAGE_SIZE,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-exception-list-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
