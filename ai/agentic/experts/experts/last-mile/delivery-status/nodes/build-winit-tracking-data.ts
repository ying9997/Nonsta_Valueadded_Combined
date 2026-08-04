/**
 * 节点：拼装万邑通 OpenAPI id/56 `tracking.getOrderVerdorTracking` 的请求体 JSON 字符串
 * 供 Coze 插件 `data` 入参拉线；与 `workflow.json` 本节点 inputs/outputs 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | trackingIds | string[] | 跟踪号列表 |
 * | outboundOrderNos | string[] | 出库单/万邑通订单号（与跟踪号一并写入 trackingnos） |
 * | language | string | 调用顶层 `language`；经 coze inputBindings 从 start 拉线 |
 *
 * 【输出】
 * | winitRequestData | string | `JSON.stringify({ trackingnos, language })`，**首批最多 30 个**（与接口上限一致） |
 * | queryKeys | string[] | 去重后的全部查询键，供 fetch-trajectories 分批与兜底 |
 */

const MAX_TRACKINGNOS_PER_REQUEST = 30;

function mapWinitLanguage(lang: unknown): string {
  const t = String(lang ?? "")
    .trim()
    .toLowerCase();
  if (t.startsWith("zh_tw") || t === "zh-tw" || t === "zh-hant") return "zh_TW";
  if (t.startsWith("zh")) return "zh_CN";
  if (t.startsWith("en")) return "en_US";
  return "zh_CN";
}

function mergeQueryKeys(trackingIds: unknown, outboundOrderNos: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      const s = String(x ?? "").trim();
      if (!s) continue;
      const u = s.toUpperCase();
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(s);
    }
  };
  add(trackingIds);
  add(outboundOrderNos);
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const queryKeys = mergeQueryKeys(params.trackingIds, params.outboundOrderNos);
  // const language = mapWinitLanguage(params.language); // 文档有误，这里不能传language
  const batch = queryKeys.slice(0, MAX_TRACKINGNOS_PER_REQUEST);
  const winitRequestData = JSON.stringify({
    trackingnos: batch.join(",")
  });
  return { winitRequestData, queryKeys };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-tracking-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
