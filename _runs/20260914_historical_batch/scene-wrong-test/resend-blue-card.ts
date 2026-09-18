import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../../../internal-review-copilot/lib/env.ts";
import { sendCardMessage } from "../../../internal-review-copilot/lib/feishu-bot.ts";
import { buildSceneConfirmCard } from "../../../internal-review-copilot/lib/feishu-card.ts";
import { asText } from "../../../internal-review-copilot/lib/oms-adapter.ts";
import { collectSceneCandidates } from "../../../internal-review-copilot/lib/parse-scene-reply.ts";
import { resolvePersonnelFromDetail } from "../../../internal-review-copilot/lib/personnel.ts";
import { runPipeline } from "../../../internal-review-copilot/lib/run-pipeline.ts";
import type { JsonRecord } from "../../../internal-review-copilot/lib/types.ts";

const ORDER = "VASC000000318543";
const CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const THREAD = "om_x100b654dac0944bcc287e32991e53b7";

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const details = JSON.parse(
    readFileSync(resolve(projectDir(), "_runs/20260914_historical_batch/details.json"), "utf8"),
  ) as JsonRecord[];
  const detail = details.find((item) => asText(item.orderNo) === ORDER);
  if (!detail) throw new Error(`missing ${ORDER}`);
  const preview = await runPipeline(detail, { skipLlm: true, sceneLlm: false });
  if (!preview) throw new Error("empty pipeline");
  const people = resolvePersonnelFromDetail(detail, preview.contextFacts);
  const card = buildSceneConfirmCard(preview, people, collectSceneCandidates(preview.matchResult));
  const labels = JSON.stringify(card).match(/【(?:入库|库内|出库)】/g) || [];
  const sent = await sendCardMessage(CHAT, card, THREAD);
  console.log(`resent_blue messageId=${sent.messageId} prefixHits=${labels.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
