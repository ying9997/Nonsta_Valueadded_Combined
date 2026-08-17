/**
 * 演示：用户问「这个查件单怎么样了」——跑通 tracking-inquiry 全链路（Mock 插件 JSON，无需 Coze）。
 *
 * npx ts-node -P scripts/tsconfig.json -r dotenv/config scripts/demo-tracking-inquiry-user-query.ts
 */

import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

/** 与此前 TailTrace.getList 真实返回一致的简化片段（TA260506331 · CC） */
const MOCK_PLUGIN_JSON = JSON.stringify({
  content: [
    {
      serialNumber: "TA260506331",
      orderNo: "WO11339226543",
      trackingNo: "61290377724823899066",
      checkingStatus: "CC",
      checkingType: "OT",
      applicationTime: 1778045635000,
      acceptTime: 0,
      checkingResults: null,
      feedbackMsg: null,
      noteMsg: "没有物流信息",
    },
  ],
});

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const expertDir = findExpertDir(projectRoot, "tracking-inquiry");
  if (!expertDir) {
    console.error("Expert tracking-inquiry not found");
    process.exit(1);
  }
  const resolved = path.resolve(projectRoot, expertDir);

  const result = await runExpert({
    expertDir: resolved,
    initialParams: {
      query: "这个查件单怎么样了",
      customerIntent: "跟进查件进度",
      inquiryIds: ["TA260506331"],
      winitOpenapiData: MOCK_PLUGIN_JSON,
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
