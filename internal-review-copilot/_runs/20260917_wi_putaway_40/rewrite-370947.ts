/**
 * 用新 pipeline 改写 VASC000000370947 的 OMS 审核信息（不上架审核通过）。
 * 上架入库单号改为新单 WI52674454。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { writePipelineDraft } from "../../lib/auto-oms-write.ts";
import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { refreshTomCookies } from "../../lib/oms-tom-client.ts";
import { runPipeline } from "../../lib/run-pipeline.ts";
import type { JsonRecord } from "../../lib/types.ts";

const ORDER = "VASC000000370947";
const DETAILS = resolve(
  "D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260916_interaction_e2e\\details.json",
);
const OUT = resolve(
  "D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260917_wi_putaway_40",
);

function loadDetail(): JsonRecord {
  const raw = JSON.parse(readFileSync(DETAILS, "utf8")) as unknown;
  const rows = asArray(raw).map(asRecord);
  const hit = rows.find((item) => asText(item.orderNo) === ORDER);
  if (!hit) throw new Error(`details.json 没有 ${ORDER}`);
  return hit;
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "1";
  mkdirSync(OUT, { recursive: true });
  const detail = loadDetail();
  const result = await runPipeline(detail, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!result) throw new Error("pipeline 返回空");
  writeFileSync(resolve(OUT, "pipeline.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  let write = await writePipelineDraft(result);
  if (!write.success && /Cookie|cniam|#\/login|IAM|登录超时/i.test(write.error || "")) {
    const err = refreshTomCookies();
    console.log(`cookie_refresh ${err || "ok"}`);
    write = await writePipelineDraft(result);
  }
  writeFileSync(resolve(OUT, "write.json"), `${JSON.stringify(write, null, 2)}\n`, "utf8");
  const wi = result.llm?.sop?.extractedWiNumbers || [];
  console.log(
    JSON.stringify(
      {
        orderNo: ORDER,
        outputPath: result.outputPath,
        sceneKey: result.matchResult?.sceneKey,
        extractedWiNumbers: wi,
        writeSuccess: write.success,
        dryRun: write.dryRun,
        written: write.written,
        skipped: write.skipped,
        nweon: write.readBack?.nweon,
        error: write.error || "",
      },
      null,
      2,
    ),
  );
  if (!write.success) process.exit(1);
}

if (!existsSync(DETAILS)) throw new Error(`缺少 ${DETAILS}`);
main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
