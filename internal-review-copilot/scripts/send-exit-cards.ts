/**
 * 四个出口各开一个标注话题发卡，不往旧话题里续发。
 *
 *   npx tsx internal-review-copilot/scripts/send-exit-cards.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
import { resolveTestChatId, sendCardInNewTopic } from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  buildSopCard,
  demoTopicTitle,
  type DemoPersonnel,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { asRecord, asText } from "../lib/oms-adapter.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import type { PipelineResult } from "../lib/run-pipeline.ts";
import type { CaseStatus, LlmSopDraft } from "../lib/types.ts";

function loadPersonnel(path: string): DemoPersonnel {
  const raw = asRecord(JSON.parse(readFileSync(path, "utf8")));
  const out: DemoPersonnel = {};
  for (const role of Object.keys(raw)) {
    const rec = asRecord(raw[role]);
    out[role] = { name: asText(rec.name), openId: asText(rec.openId) || null };
  }
  return out;
}

function asLlmSop(partial: Partial<LlmSopDraft>): LlmSopDraft {
  return {
    requirementDescription: asText(partial.requirementDescription),
    requirementBackground: asText(partial.requirementBackground),
    warehouseSop: asText(partial.warehouseSop),
    sopText: asText(partial.sopText),
    scenarioName: asText(partial.scenarioName),
    fieldsUsed: Array.isArray(partial.fieldsUsed) ? partial.fieldsUsed : [],
    mocked: false,
    model: asText(partial.model) || "demo-identified",
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const chatId = envText("FEISHU_TEST_CHAT_ID") || resolveTestChatId();
  const personnelPath = resolve(projectDir(), "_runs/20260909_demo_e2e/demo-personnel.json");
  const outDir = resolve(projectDir(), "_runs/20260909_demo_e2e/card-test");
  const storePath = resolve(outDir, "case-store.json");
  mkdirSync(outDir, { recursive: true });
  const personnel = loadPersonnel(personnelPath);
  const store = new CaseStore(storePath);
  const recL4 = store.get("VASC000000360654");

  const l1 = {
    orderNo: "VASC000000319344",
    outputPath: "needs_requirement_clarification",
    missing: ["操作动作不清"],
    missingRequirementItems: ["操作动作不清"],
    clarificationPrompts: ["需求里看不出要做什么操作，请补充处理动作。"],
    contextFacts: {
      customerCode: "19673358",
      customerName: "上海肖恩供应链管理有限公司",
      warehouseName: "USWC5 Warehouse",
      eventNo: "EB0126071031172379",
      allEventNos: ["EB0126071031172379"],
      allBusinessOrderNos: ["WI51030515", "WI49842960"],
      providedFields: {
        VAS_ATTR_REL_RD:
          "EB0126071031172379 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新单WI51030515--实际贴的 WI49842960",
        BEOR: "可以根据贴的标签上的sku来判断是不是同一个wint号",
      },
    },
    llm: {
      sop: asLlmSop({
        requirementDescription:
          "异常单 EB0126071031172379 实际贴了入库单 WI49842960 的标签，需按新入库单 WI51030515 对应替换。",
        requirementBackground:
          "可依据外箱标签上的 SKU 判断是否同一 Winit 号；客户贴错单后要用新入库单替换。",
      }),
    },
  } as PipelineResult;

  const l2Match = {
    scenarioName: "",
    topK: [
      { sceneKey: "inbound_label_identify", sceneName: "尺重/标签辨识后换标上架", score: 0.6 },
      { sceneKey: "inbound_package_barcode_batch_relabel", sceneName: "包裹条码批量异常", score: 0.4 },
    ],
  };
  const l2 = {
    orderNo: "VASC000000326061",
    outputPath: "transfer_human",
    missing: [],
    matchResult: l2Match,
    contextFacts: {
      customerName: "××供应链有限公司（脱敏）",
      warehouseName: "USKY5 Warehouse",
      eventNo: "EB0326072531612017",
      allEventNos: ["EB0326072531612017"],
      allBusinessOrderNos: ["WI51383223", "WI51383191"],
      providedFields: {
        BEOR: "异常类型为包裹内出现订单外商品，第三方编码已关联，需补贴新单包裹标签后上架。",
      },
    },
    llm: {
      sop: asLlmSop({
        requirementDescription:
          "多个入库单（WI51383223、WI51383191）的商品需一起处理，标准流程只能填一个入库单号，无法走标准增值。",
        requirementBackground:
          "异常类型为包裹内出现订单外商品；涉及第三方编码已关联、补贴新单包裹标签后上架。",
      }),
    },
  } as PipelineResult;

  const l3 = {
    orderNo: "VASC000000298617",
    outputPath: "needs_field_clarification",
    missing: ["操作说明附件"],
    missingRequirementItems: [],
    clarificationPrompts: ["请上传「操作说明附件」后再生成 SOP。"],
    matchResult: {
      scenarioName: "【入库】指定商品拍照暂存",
      sceneKey: "inbound_photo_hold",
    },
    contextFacts: {
      customerName: "乐米电子商务有限公司",
      warehouseName: "USKY3 Warehouse",
      allEventNos: ["EB0326061230366501", "EB0326061230362709"],
      allBusinessOrderNos: [],
      providedFields: {
        BEOR: "需先拍照暂存，等客户根据照片辨识后再继续处理。",
      },
    },
    llm: {
      sop: asLlmSop({
        requirementDescription:
          "异常单 EB0326061230366501、EB0326061230362709 各随机抽 1 件拆包装，拍正面、后面、侧面三张实物照片后返回客户辨识。",
        requirementBackground: "需先拍照暂存，等客户根据照片辨识后再继续处理。",
      }),
    },
  } as PipelineResult;

  const l4 = {
    orderNo: "VASC000000360654",
    outputPath: "sop_generated",
    missing: [],
    llm: {
      text: recL4?.aiGeneratedText || "",
      sop: recL4?.llmSop || undefined,
    },
    contextFacts: {
      customerName: recL4?.customer || "RED NOW LIMITED",
      warehouseName: recL4?.warehouse || "USWC5 Warehouse",
      eventNo: "EB0126082832573118",
      allEventNos: ["EB0126082832573118"],
      allBusinessOrderNos: ["WI52512121", "WI51757326"],
    },
    matchResult: recL4?.matchResult,
  } as PipelineResult;

  const items: Array<{
    label: string;
    orderNo: string;
    status: CaseStatus;
    result: PipelineResult;
    card: FeishuCard;
  }> = [
    { label: "L1", orderNo: l1.orderNo, status: "awaiting_reply", result: l1, card: buildAskCard(l1, personnel) },
    {
      label: "L2",
      orderNo: l2.orderNo,
      status: "awaiting_scene_confirm",
      result: l2,
      card: buildSceneConfirmCard(l2, personnel, collectSceneCandidates(l2Match)),
    },
    { label: "L3", orderNo: l3.orderNo, status: "awaiting_reply", result: l3, card: buildAskCard(l3, personnel) },
    { label: "L4", orderNo: l4.orderNo, status: "sop_ready", result: l4, card: buildSopCard(l4, personnel) },
  ];

  for (const item of items) {
    const topic = demoTopicTitle(item.result.outputPath, item.orderNo);
    writeFileSync(resolve(outDir, `${item.orderNo}.card.json`), `${JSON.stringify(item.card, null, 2)}\n`, "utf8");
    const sent = await sendCardInNewTopic(chatId, topic, item.card);
    store.upsert({
      vascNo: item.orderNo,
      status: item.status,
      customer: item.result.contextFacts?.customerName || "",
      warehouse: item.result.contextFacts?.warehouseName || "",
      aiOutputPath: item.result.outputPath,
      llmSop: item.result.llm?.sop || null,
      aiGeneratedText: item.result.llm?.text || item.result.llm?.sop?.sopText || "",
      lastCard: item.card,
      feishuThreadId: sent.threadId,
      feishuMessageId: sent.messageId,
      notifyChannel: "card",
      clarificationSentAt: new Date().toISOString(),
      sopEditCount: item.label === "L4" ? 0 : undefined,
      lastSopEditInstruction: item.label === "L4" ? "" : undefined,
      sceneCandidateList: item.label === "L2" ? collectSceneCandidates(l2Match) : undefined,
      matchResult: item.result.matchResult || {},
    });
    writeFileSync(
      resolve(outDir, `${item.orderNo}.feishu.json`),
      `${JSON.stringify(
        { ...sent, label: item.label, topic, sentAt: new Date().toISOString() },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(
      `${item.label} ${item.orderNo} topic=${topic} color=${item.card.header.template} skipped=${sent.skipped} thread=${sent.threadId} messageId=${sent.messageId}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
