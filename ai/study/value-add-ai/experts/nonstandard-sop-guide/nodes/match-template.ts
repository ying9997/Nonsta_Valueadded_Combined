/**
 * match-template — 用客户意图匹配 kb-template-index，判断 B/C 分类。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

interface ScenarioEntry {
  id: number;
  name: string;
  category: "B" | "C";
  keywords: string[];
}

const SCENARIO_INDEX: ScenarioEntry[] = [
  { id: 1, name: "良品/不良品检测", category: "B", keywords: ["检测", "品质检测", "质检", "QC", "良品检测", "不良品检测"] },
  { id: 2, name: "拆分SKU", category: "B", keywords: ["拆分", "拆SKU", "分SKU", "拆开"] },
  { id: 3, name: "商品组合", category: "B", keywords: ["组合", "套装", "捆绑", "配套", "combo"] },
  { id: 4, name: "拍摄照片/视频", category: "B", keywords: ["拍照", "拍摄", "照片", "视频", "拍图", "photo"] },
  { id: 5, name: "商品尺重测量辨识", category: "B", keywords: ["尺重", "测量", "量尺", "称重", "长宽高"] },
  { id: 6, name: "指定单品/库位商品更换标签上架", category: "B", keywords: ["换标", "更换标签", "换SKU标签", "换标上架", "标签替换"] },
  { id: 7, name: "库存冻结/解冻", category: "B", keywords: ["冻结", "解冻", "冻结库存", "解冻库存", "freeze"] },
  { id: 8, name: "自提单取消出库", category: "B", keywords: ["自提", "取消出库", "自提取消"] },
  { id: 9, name: "异常重新拍照", category: "B", keywords: ["重新拍照", "补拍", "异常拍照", "再拍"] },
  { id: 10, name: "异常商品转不良品上架", category: "B", keywords: ["异常转不良", "转不良品", "异常上架不良"] },
  { id: 11, name: "商品外观辨识+贴标上架", category: "B", keywords: ["外观辨识", "辨识贴标", "辨识上架", "辨别外观"] },
  { id: 12, name: "更换客制包装", category: "B", keywords: ["客制包装", "换包装", "定制包装", "更换包装"] },
  { id: 13, name: "更换商品生产日期标签", category: "B", keywords: ["生产日期", "日期标签", "换日期", "更新日期"] },
  { id: 14, name: "不良品转良品", category: "B", keywords: ["不良转良", "转良品", "不良品转良"] },
  { id: 15, name: "更换SKU做不良品上架", category: "B", keywords: ["换SKU不良", "更换SKU上架", "换SKU做不良品"] },
  { id: 16, name: "A+包裹更换标签上架", category: "B", keywords: ["A+", "A+包裹", "A+换标", "A+标签"] },
  { id: 17, name: "指定位置贴标", category: "B", keywords: ["指定位置", "贴标位置", "定位贴标"] },
  { id: 18, name: "包装破损商品更换包材重新上架", category: "B", keywords: ["包装破损", "换包材", "破损换包", "重新包装上架"] },
  { id: 19, name: "SN采集+管理方式变更+重新上架", category: "B", keywords: ["SN采集", "SN变更", "管理方式变更", "SN重新上架"] },
  { id: 20, name: "库内仓间调拨", category: "B", keywords: ["仓间调拨", "调拨", "库内调拨", "转仓"] },
  { id: 21, name: "良品转不良品上架", category: "B", keywords: ["良品转不良", "良品转为不良", "良转不良", "转不良品上架", "转为不良品上架", "良品变不良"] },
  { id: 22, name: "异常单：自提单取消出库", category: "B", keywords: ["异常单自提", "异常取消出库", "自提异常"] },
  { id: 23, name: "WINIT标准包材线下寄件出库", category: "B", keywords: ["线下寄件", "包材寄件", "标准包材出库", "线下出库"] },
  { id: 24, name: "非标收费", category: "C", keywords: ["非标收费", "特殊收费"] },
  { id: 25, name: "辨识拍照后销毁", category: "C", keywords: ["辨识销毁", "拍照销毁", "辨识后销毁"] },
  { id: 26, name: "商品改制重新上架", category: "C", keywords: ["改制", "商品改制", "改制上架"] },
  { id: 27, name: "库内库存销毁（非DG类）", category: "C", keywords: ["库存销毁", "非DG销毁", "库内销毁"] },
  { id: 28, name: "采集SN码", category: "C", keywords: ["采集SN", "SN码采集", "录SN"] },
  { id: 29, name: "拆箱辨识后重新更换SKU上架", category: "C", keywords: ["拆箱辨识", "辨识换SKU", "拆箱换SKU"] },
  { id: 30, name: "库内辨识+辨识后重新贴标上架", category: "C", keywords: ["库内辨识贴标", "辨识贴标上架"] },
  { id: 31, name: "商品贴指令性标签+拍照", category: "C", keywords: ["指令性标签", "警示标签", "指令标签拍照"] },
  { id: 32, name: "打包完成后作废出库单", category: "C", keywords: ["作废出库", "打包作废", "作废出库单"] },
  { id: 33, name: "库内加固", category: "C", keywords: ["加固", "库内加固", "包装加固"] },
  { id: 34, name: "商品拆箱加/减配件", category: "C", keywords: ["加配件", "减配件", "拆箱配件"] },
  { id: 35, name: "箱转单一", category: "C", keywords: ["箱转单一", "箱转单"] },
  { id: 36, name: "剪轧带/剪绑带", category: "C", keywords: ["剪轧带", "剪绑带", "剪带"] },
  { id: 37, name: "单品化管理的SN处理场景", category: "C", keywords: ["单品化SN", "SN处理", "单品化管理"] },
  { id: 38, name: "单品（S码或SN码）二次上架", category: "C", keywords: ["二次上架", "S码上架", "SN码二次"] },
];

function scoreMatch(intent: string, entry: ScenarioEntry): number {
  const lower = intent.toLowerCase();
  let score = 0;
  for (const kw of entry.keywords) {
    if (lower.includes(kw.toLowerCase())) score += 1;
  }
  if (lower.includes(entry.name.toLowerCase())) score += 3;
  return score;
}

export async function main({ params }: { params: Record<string, unknown> }) {
  const sopInput = asRecord(params.sopInput);
  const validationResult = asRecord(params.validationResult);

  if (!validationResult.ok) {
    return {
      matchResult: { matched: false, reason: "validation_failed" },
      sopInput,
    };
  }

  const intent = asText(sopInput.customerIntent);
  const exceptionName = asText(sopInput.exceptionName);
  const searchText = `${intent} ${exceptionName}`;

  const scored = SCENARIO_INDEX.map((entry) => ({
    entry,
    score: scoreMatch(searchText, entry),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      matchResult: {
        matched: false,
        category: "C",
        reason: "no_keyword_match",
        candidateScenarios: [],
      },
      sopInput,
    };
  }

  const best = scored[0];
  const candidates = scored.slice(0, 3).map((s) => ({
    id: s.entry.id,
    name: s.entry.name,
    category: s.entry.category,
    score: s.score,
  }));

  return {
    matchResult: {
      matched: true,
      category: best.entry.category,
      scenarioId: best.entry.id,
      scenarioName: best.entry.name,
      confidence: best.score >= 3 ? "high" : best.score >= 2 ? "medium" : "low",
      candidateScenarios: candidates,
    },
    sopInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("match-template")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "match-template failed");
      process.exit(1);
    });
}
