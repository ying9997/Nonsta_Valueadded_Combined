/**
 * 本地验收：代客索赔专家 + Mock 插件 JSON（避免 Windows shell 对引号的破坏）。
 * 运行：npx ts-node -P scripts/tsconfig.json scripts/smoke-substitute-claim.ts
 */

import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

const MOCK_PLUGIN_JSON = JSON.stringify({
  list: [
    {
      compensateApplyNo: "CLM-DEMO-001",
      businessNo: "WO-DEMO-1",
      trackingNo: "1Z-DEMO",
      compensateStatus: "SUBMITTED",
      compensateType: "LS",
      applyTime: "2025-04-01T10:00:00Z",
    },
  ],
});

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const expertDir = findExpertDir(projectRoot, "substitute-claim");
  if (!expertDir) {
    console.error("Expert substitute-claim not found");
    process.exit(1);
  }
  const resolved = path.resolve(projectRoot, expertDir);
  const result = await runExpert({
    expertDir: resolved,
    initialParams: {
      claimIds: ["CLM-DEMO-001"],
      winitOpenapiData: MOCK_PLUGIN_JSON,
    },
  });
  const facts = result.compensateListFacts as { listStatus?: string; records?: unknown[] };
  if (facts?.listStatus !== "success" || !Array.isArray(facts.records) || facts.records.length < 1) {
    console.error("Smoke failed: expected listStatus success and >=1 record", JSON.stringify(facts, null, 2));
    process.exit(1);
  }
  const out = result as { structured?: { records?: Array<Record<string, unknown>> } };
  if (!out?.structured?.records?.length) {
    console.error("Smoke failed: format-output missing structured.records", JSON.stringify(result, null, 2));
    process.exit(1);
  }
  const r0 = out.structured!.records![0]!;
  if (r0.compensateStatusLabel !== "已提交" || r0.compensateTypeLabel !== "丢失") {
    console.error("Smoke failed: expected enum labels on first record", JSON.stringify(r0, null, 2));
    process.exit(1);
  }
  console.log("smoke-substitute-claim: OK");
  console.log(JSON.stringify({ listStatus: facts.listStatus, recordCount: facts.records.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
