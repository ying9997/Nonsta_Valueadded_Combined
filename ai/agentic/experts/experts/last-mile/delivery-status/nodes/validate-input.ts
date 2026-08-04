/**
 * 节点：校验输入并分流
 * Coze 代码节点格式：`main({ params })`；与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | trackingIds | string[] | 轨迹/运单号列表 |
 * | outboundOrderNos | string[] | 出库单号列表 |
 * | trajectoryText | string \| undefined | 用户粘贴的轨迹文本 |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | valid | boolean | 是否至少提供上述三者之一 |
 * | branch | string | `"identifiers"`（有单号，走 OpenAPI 链）\| `"text"`（仅粘贴轨迹，直达 merge） |
 * | error | string（可选） | 仅当 valid===false：错误说明 |
 * | trackingIds | unknown | 回传或为清理后的数组（与入参同源处理） |
 * | outboundOrderNos | unknown | 同上 |
 * | trajectoryText | unknown | 同上 |
 *
 * 【归一化】模型常把出库单与轨迹号填反，本节点对「结构化单号」统一纠偏后再输出：
 * - 以 `WO` 开头（大小写不敏感）的一律视为出库单，不会留在 `trackingIds`。
 * - 出库单若以 `A`/`a` 结尾，去掉末尾该字母再查询（如 `WO…A` → `WO…`）。
 * - 非 `WO` 开头的一律视为承运商轨迹号，归入 `trackingIds`。
 * - `trackingIds` 与 `outboundOrderNos` 入参会合并后按上规则拆分并各自去重（保留先出现的写法）。
 */

function stripTrailingAForWoOrder(s: string): string {
  const t = s.trim();
  if (!/^WO/i.test(t)) return t;
  if (/[Aa]$/.test(t)) return t.slice(0, -1);
  return t;
}

function partitionIdentifiers(rawList: string[]): { trackingIds: string[]; outboundOrderNos: string[] } {
  const trackingIds: string[] = [];
  const outboundOrderNos: string[] = [];
  const seenT = new Set<string>();
  const seenO = new Set<string>();

  for (const raw of rawList) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (/^WO/i.test(s)) {
      const normalized = stripTrailingAForWoOrder(s);
      const u = normalized.toUpperCase();
      if (seenO.has(u)) continue;
      seenO.add(u);
      outboundOrderNos.push(normalized);
    } else {
      const u = s.toUpperCase();
      if (seenT.has(u)) continue;
      seenT.add(u);
      trackingIds.push(s);
    }
  }
  return { trackingIds, outboundOrderNos };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const fromTracking = ((params.trackingIds as string[]) ?? []).map((t) => String(t ?? "").trim()).filter(Boolean);
  const fromOrders = ((params.outboundOrderNos as string[]) ?? []).map((o) => String(o ?? "").trim()).filter(Boolean);
  const merged = [...fromTracking, ...fromOrders];
  const { trackingIds, outboundOrderNos } = partitionIdentifiers(merged);
  const trajectoryText = (params.trajectoryText as string)?.trim();

  const hasTracking = trackingIds.length > 0;
  const hasOrder = outboundOrderNos.length > 0;
  const hasText = !!trajectoryText;

  const hasIdentifiers = hasTracking || hasOrder;
  const ret = !hasIdentifiers && !hasText
    ? {
        "valid": false,
        "branch": "text",
        "error": "至少提供 trackingIds、outboundOrderNos 或 trajectoryText 其一",
        "trackingIds": trackingIds,
        "outboundOrderNos": outboundOrderNos,
        "trajectoryText": trajectoryText ?? params.trajectoryText,
      }
    : {
        "valid": true,
        "branch": hasIdentifiers ? "identifiers" : "text",
        "trackingIds": trackingIds,
        "outboundOrderNos": outboundOrderNos,
        "trajectoryText": trajectoryText ?? params.trajectoryText,
      };
  return ret;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
