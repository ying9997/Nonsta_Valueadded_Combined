import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { resolveTestChatId, sendCardInNewTopic } from "../../internal-review-copilot/lib/feishu-bot.ts";
import { demoTopicTitle, judgmentBasis, type FeishuCard } from "../../internal-review-copilot/lib/feishu-card.ts";
import type { PipelineResult } from "../../internal-review-copilot/lib/run-pipeline.ts";
import type { MatchResult } from "../../internal-review-copilot/lib/types.ts";

const ORDER = "VASC000000362139";
const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  loadEnvFiles();
  const store = JSON.parse(readFileSync(resolve(here, "case-store.json"), "utf8")) as {
    cases: Array<{ vascNo: string; lastCard?: FeishuCard; matchResult?: MatchResult }>;
  };
  const rec = store.cases.find((item) => item.vascNo === ORDER);
  if (!rec?.lastCard) {
    throw new Error(`store 里没有 ${ORDER} 的 lastCard`);
  }
  const basis = judgmentBasis({
    orderNo: ORDER,
    matchResult: rec.matchResult,
  } as PipelineResult);
  const card = structuredClone(rec.lastCard);
  for (const el of card.elements) {
    if (el.tag === "div" && el.text?.content?.includes("AI 判断依据")) {
      el.text.content = `📎 **AI 判断依据**\n${basis}`;
    }
  }
  const title = demoTopicTitle("sop_generated", ORDER);
  const sent = await sendCardInNewTopic(resolveTestChatId(), title, card);
  console.log(
    JSON.stringify(
      {
        order: ORDER,
        title,
        topicId: sent.topicId,
        root: sent.threadId,
        reason: basis
          .split("\n")
          .filter((line) => line.startsWith("✅") || line.startsWith("💡")),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
