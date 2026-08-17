/**
 * 测试 llm-openai.ts：加载 .env，调用 runLlmNode
 */

import "dotenv/config";
import * as path from "path";
import { runLlmNode } from "./llm-openai";

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const expertDir = path.join(projectRoot, "experts", "outbound", "outbound-order-status");

  const params: Record<string, unknown> = {
    query: "根据出库单数据生成结构化状态解读与简要分析",
    outboundOrderNos: ["WO001"],
    customerIntent: "查状态",
    prunedOrderData: {
      list: [
        {
          outboundOrderNum: "WO001",
          status: "TSC",
          statusName: "暂存完成",
          packageList: [],
        },
      ],
      _pruneMeta: { originalPackageCount: 0, retainedPackageCount: 0, truncatedPackages: [] },
    },
    statusLexicon: "# 状态词典（测试用精简版）\n| TSC | 暂存完成 |",
    statusScenarios: "# 暂存场景：TSC 表示增值服务待补充或自提待取",
    jsonFieldGuide: "# 字段：status, statusName",
  };

  console.log("调用 runLlmNode...");
  const result = await runLlmNode(expertDir, params);
  console.log("结果:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("错误:", err);
  process.exit(1);
});
