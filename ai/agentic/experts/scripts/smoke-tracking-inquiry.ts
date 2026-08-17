/**
 * 本地验收：查件专家 + Mock 插件 JSON（避免强依赖外网）。
 * 运行：npm run smoke:tracking-inquiry
 */

import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

const MOCK_PLUGIN_JSON = JSON.stringify({
  content: [
    {
      serialNumber: "TA-DEMO-001",
      orderNo: "WO-DEMO-1",
      trackingNo: "1Z-DEMO",
      checkingStatus: "SSC",
      checkingType: "OT",
      applicationTime: 1711958400000,
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
      inquiryIds: ["TA-DEMO-001"],
      winitOpenapiData: MOCK_PLUGIN_JSON,
    },
  });
  const facts = result.tailTraceFacts as { listStatus?: string; records?: unknown[]; sopBranch?: string };
  if (facts?.listStatus !== "success" || !Array.isArray(facts.records) || facts.records.length < 1) {
    console.error("Smoke failed: expected listStatus success and >=1 record", JSON.stringify(facts, null, 2));
    process.exit(1);
  }
  if (facts.sopBranch !== "case3_supplier") {
    console.error("Smoke failed: expected sopBranch case3_supplier for SSC demo record", facts.sopBranch);
    process.exit(1);
  }
  const out = result.result as { structured?: { records?: Array<Record<string, unknown>> }; analysis?: string };
  if (!out?.structured?.records?.length) {
    console.error("Smoke failed: format-output missing structured.records", JSON.stringify(result.result, null, 2));
    process.exit(1);
  }
  const oc = result.outputContext as { expertId?: string };
  if (oc?.expertId !== "tracking-inquiry") {
    console.error("Smoke failed: outputContext.expertId", oc);
    process.exit(1);
  }
  console.log("smoke-tracking-inquiry: OK");
  console.log(JSON.stringify({ listStatus: facts.listStatus, sopBranch: facts.sopBranch, recordCount: facts.records.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
