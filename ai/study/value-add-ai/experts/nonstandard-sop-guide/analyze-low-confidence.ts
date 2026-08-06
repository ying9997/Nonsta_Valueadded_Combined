/**
 * analyze-low-confidence.ts — 分析低置信命中样本，找出客户真实用语。
 * 运行：npx tsx analyze-low-confidence.ts
 */

import { readFileSync } from "fs";
import { main as validateInput } from "./nodes/validate-input.js";
import { main as matchTemplate } from "./nodes/match-template.js";

interface Input { customerFirstIntent: string; sceneClassification: string; }

async function main() {
  const inputs: Input[] = JSON.parse(readFileSync("extracted-customer-inputs.json", "utf-8"));

  const lowConf: { id: number; name: string; input: string; scene: string }[] = [];
  const unmatched: { input: string; scene: string }[] = [];

  for (const item of inputs) {
    const s1 = await validateInput({
      params: {
        customerIntent: item.customerFirstIntent,
        exceptionCode: "", exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求", providedFields: {},
      },
    });
    if (!(s1.validationResult as any).ok) continue;

    const s2 = await matchTemplate({ params: { sopInput: s1.sopInput, validationResult: s1.validationResult } });
    const mr = s2.matchResult as any;

    if (mr.matched && mr.confidence === "low") {
      lowConf.push({ id: mr.scenarioId, name: mr.scenarioName, input: item.customerFirstIntent, scene: item.sceneClassification });
    } else if (!mr.matched) {
      unmatched.push({ input: item.customerFirstIntent, scene: item.sceneClassification });
    }
  }

  // 低置信按场景分组
  const grouped = new Map<number, typeof lowConf>();
  for (const r of lowConf) {
    const list = grouped.get(r.id) || [];
    list.push(r);
    grouped.set(r.id, list);
  }

  console.log("=".repeat(60));
  console.log("  低置信命中分析 — 找出需要补的关键词");
  console.log("=".repeat(60));

  const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [id, samples] of sorted.slice(0, 8)) {
    console.log(`\n--- 场景 ${id}: ${samples[0].name} (${samples.length} 条低置信) ---`);
    console.log("客户真实用语：");
    samples.slice(0, 8).forEach((s, i) => {
      const text = s.input.replace(/\n/g, " ").slice(0, 110);
      console.log(`  ${i + 1}. ${text}`);
    });
  }

  // 未匹配高频词分析
  console.log("\n" + "=".repeat(60));
  console.log("  未命中样本高频词（找覆盖gap）");
  console.log("=".repeat(60));

  const wordFreq = new Map<string, number>();
  const stopWords = new Set(["的", "是", "了", "我", "在", "有", "这", "个", "和", "不", "都", "也", "就", "要", "会", "到", "能", "可以", "请问", "你好", "好的", "谢谢", "一下", "一个", "还有", "可能", "需要", "麻烦", "帮忙", "怎么", "什么", "问题", "这个", "那个"]);
  const bizTerms = ["贴标", "换标", "上架", "包裹", "包装", "标签", "条码", "拍照", "销毁", "加固", "破损", "异常", "入库", "出库", "自提", "新单", "SKU", "sku", "SN", "A+", "商品", "仓库", "入库单", "出库单", "增值", "非标", "拆", "组合", "冻结", "调拨", "辨识", "测量", "尺寸", "重量"];

  for (const item of unmatched.slice(0, 200)) {
    for (const term of bizTerms) {
      if (item.input.includes(term)) {
        wordFreq.set(term, (wordFreq.get(term) || 0) + 1);
      }
    }
  }

  console.log("\n未命中样本中的高频业务词 (前 200 条):");
  [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([word, count]) => {
      console.log(`  ${count.toString().padStart(4)} | ${word}`);
    });
}

main();
