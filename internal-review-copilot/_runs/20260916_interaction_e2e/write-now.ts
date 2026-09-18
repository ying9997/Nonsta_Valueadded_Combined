/**
 * 把本机 E2E 已生成的两单 SOP 真写入 OMS 审核信息（不审核通过）。
 */
import { resolve } from "node:path";
import { CaseStore } from "../../lib/case-store.ts";
import { loadEnvFiles } from "../../lib/env.ts";
import { asText } from "../../lib/oms-adapter.ts";
import { refreshTomCookies } from "../../lib/oms-tom-client.ts";
import { sceneCodeFromKey, writeDraft, type DraftWriteResult } from "../../lib/oms-draft-write.ts";
import type { LlmSopDraft } from "../../lib/types.ts";

const STORE = resolve(
  "D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260916_interaction_e2e\\case-store.json",
);
const ORDERS = ["VASC000000370947", "VASC000000370932"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function writeOne(store: CaseStore, vascNo: string): Promise<DraftWriteResult> {
  const rec = store.get(vascNo);
  if (!rec) throw new Error(`store 没有 ${vascNo}`);
  const sop = rec.llmSop as LlmSopDraft | undefined;
  const match = asRecord(rec.matchResult);
  const sceneKey = asText(match.sceneKey);
  return writeDraft({
    orderNo: vascNo,
    sceneOverviewCode: sceneCodeFromKey(sceneKey),
    sop: sop?.warehouseSop || rec.aiGeneratedText,
    aiRequirementDescription: sop?.requirementDescription,
    aiRequirementBackground: sop?.requirementBackground,
    extractedWiNumbers: sop?.extractedWiNumbers || [],
    warehouseAction: {
      code: "DZ000025",
      name: "贴包裹标签",
      qty: 1,
      chargeCode: "3000313",
      chargeName: "增值-包裹标签粘贴/更改/清除",
      priceListId: 26262,
      revenueMode: "PRICE_LIST_CALC",
      dimension: "ORDER",
      calUnit: "VAS_ATTR_REL_VPC",
    },
    comparisonMeta: {
      sceneKey,
      sceneName: asText(match.scenarioName),
      degraded: Boolean(sop?.degraded),
      confidence: asText(match.confidence),
    },
    dryRun: false,
  });
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "1";
  const store = new CaseStore(STORE);
  for (const vascNo of ORDERS) {
    let result = await writeOne(store, vascNo);
    if (!result.success && /Cookie|cniam|#\/login|IAM|登录超时/i.test(result.error || "")) {
      const err = refreshTomCookies();
      console.log(`cookie_refresh ${vascNo} ${err || "ok"}`);
      result = await writeOne(store, vascNo);
    }
    console.log(JSON.stringify({ vascNo, ...result }, null, 2));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
