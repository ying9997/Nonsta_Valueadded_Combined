/**
 * One-shot: 本机事件总线被 40 占用时，用同一套 searchSceneByKeyword 发卡。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../../internal-review-copilot/lib/case-store.ts";
import { envText, loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { sendCardMessage } from "../../internal-review-copilot/lib/feishu-bot.ts";
import {
  buildSceneSearchMultiCard,
  buildSceneSearchSingleCard,
} from "../../internal-review-copilot/lib/feishu-card.ts";
import { asArray, asRecord } from "../../internal-review-copilot/lib/oms-adapter.ts";
import { resolvePersonnelFromDetail } from "../../internal-review-copilot/lib/personnel.ts";
import { searchSceneByKeyword } from "../../internal-review-copilot/lib/scenario-cards.ts";

const here = resolve("d:/DA/Nonsta_Valueadded_Combined/_runs/20260914_vasc366561_bot_search");
const vascNo = "VASC000000366561";
const keyword = "帮我找更换客制包装";

async function main(): Promise<void> {
  loadEnvFiles();
  const store = new CaseStore(resolve(here, "case-store.json"));
  const rec = store.get(vascNo);
  if (!rec?.feishuThreadId) throw new Error("missing thread");
  const details = asArray(asRecord(JSON.parse(readFileSync(resolve(here, "listen-inputs.json"), "utf8"))).details).map(
    asRecord,
  );
  const people = resolvePersonnelFromDetail(details[0]);
  const matched = searchSceneByKeyword(keyword, { category: "instock" });
  if (!matched.length) throw new Error(`no scene for ${keyword}`);
  const card =
    matched.length === 1
      ? buildSceneSearchSingleCard({ vascNo, scene: matched[0], personnel: people })
      : buildSceneSearchMultiCard({ vascNo, scenes: matched, personnel: people });
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  const sent = await sendCardMessage(chatId, card, rec.feishuThreadId);
  store.upsert({ vascNo, lastCard: card, feishuMessageId: sent.messageId, notifyChannel: "card" });
  console.log(
    JSON.stringify(
      {
        keyword,
        hits: matched.map((item) => `${item.sceneKey}:${item.sceneName}`),
        messageId: sent.messageId,
        threadId: rec.feishuThreadId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
