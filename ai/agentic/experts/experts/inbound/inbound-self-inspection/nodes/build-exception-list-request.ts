/**
 * 节点：抽验相关异常单查询（wh.inboundOrder.queryExceptionList）
 * FaaS 单文件闭环，无 external import。
 */

const ORDER_EXCEPTION_DETAIL_ACTION = "wh.inboundOrder.queryExceptionList";

async function main({ params }: { params: Record<string, unknown> }) {
  const skipOms = params.skipOms === true;
  const fetchExceptions = params.fetchExceptions === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const skipExceptionApi = skipOms || !fetchExceptions || wiOrderNos.length === 0;

  const actions = skipExceptionApi
    ? []
    : wiOrderNos.map((orderNo) => ({
        action: ORDER_EXCEPTION_DETAIL_ACTION,
        data: JSON.stringify({ orderNo }),
      }));

  return { actions, skipExceptionApi };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-exception-list-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
