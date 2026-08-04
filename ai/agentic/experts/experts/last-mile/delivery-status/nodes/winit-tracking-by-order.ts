/**
 * 节点：根据出库单号获取关联跟踪号
 * FaaS 单文件闭环，无外部 import。（本文件可作为扩展节点：`main` 约定如下。）
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | orderNos | string[] | 出库单号列表 |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | trackingIds | string[] | 所有子单跟踪号去重列表 |
 * | orderToTrackings | Record<string, string[]> | 出库单号 → 该单下跟踪号数组 |
 */

// ========== 配置（本文件内闭环） ==========
const CONFIG = {
  baseUrl: (typeof process !== "undefined" && process.env?.WINIT_API_BASE_URL) || "https://api.winit.example.com",
  token: (typeof process !== "undefined" && process.env?.WINIT_API_TOKEN) || "YOUR_TOKEN_HERE",
  timeout: 10000,
};

// ========== 主逻辑 ==========
async function fetchTrackingByOrderNos(orderNos: string[]): Promise<Record<string, string[]>> {
  const unique = [...new Set(orderNos.filter(Boolean))];
  if (unique.length === 0) return {};

  // TODO: 替换为实际 WINIT API 调用
  // 可能：GET /v1/orders/{orderNo}/trackings 或 getOrderDetails 响应中已含 trackingNos
  // const res = await fetch(`${CONFIG.baseUrl}/v1/orders/trackings`, {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${CONFIG.token}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ orderNos: unique }),
  // });
  // const data = await res.json();
  // return data.orderToTrackings ?? {};

  console.warn("[winit-tracking-by-order] 占位实现，请对接 WINIT 接口。orderNos:", unique);
  const result: Record<string, string[]> = {};
  for (const no of unique) result[no] = [];
  return result;
}

/** Coze 入口：params.orderNos -> trackingIds, orderToTrackings */
async function main({ params }: { params: Record<string, unknown> }) {
  const orderNos = (params.orderNos as string[]) ?? [];
  const orderToTrackings = await fetchTrackingByOrderNos(orderNos);
  const trackingIds = [...new Set(Object.values(orderToTrackings).flat().filter(Boolean))];
  const ret = { "trackingIds": trackingIds, "orderToTrackings": orderToTrackings };
  return ret;
}
