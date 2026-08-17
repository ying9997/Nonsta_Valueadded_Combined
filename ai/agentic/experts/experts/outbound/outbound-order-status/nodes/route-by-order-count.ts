/**
 * 节点：根据出库单号数量决定调用单个/批量 API
 * Coze：`main({ params })`。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | outboundOrderNos | string[] | 出库单号列表 |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | routeType | string | `"single"`：0～1 单；`"batch"`：多单 |
 * | outboundOrderNos | string[] | 过滤空白并规范后的单号列表（WO 主单：去掉子单尾缀字母，见下） |
 *
 * **单号规范**：万邑通出库单为 `WO` + 数字；若输入为 `WO123456A`（末尾字母表示子包裹等），下游 OpenAPI 仅使用主单号 `WO123456`。
 */

/** WO + 数字；末尾连续字母为子单后缀，调用万邑通前剥离 */
function normalizeWoMainOrderNumForRoute(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const raw = ((params.outboundOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const outboundOrderNos = raw.map((o) => normalizeWoMainOrderNumForRoute(o!));
  const routeType = outboundOrderNos.length <= 1 ? "single" : "batch";

  const ret = {
    "routeType": routeType,
    "outboundOrderNos": outboundOrderNos,
  };
  return ret;
}

// 仅当以本文件为入口运行时执行，Coze 不会触发
if (typeof process !== "undefined" && process.argv[1]?.includes("route-by-order-count")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
