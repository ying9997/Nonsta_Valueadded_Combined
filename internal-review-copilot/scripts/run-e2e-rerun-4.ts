/**
 * Re-run E2E items #9 / #14 / #17 / #18 with swapped test data.
 *
 *   npx tsx internal-review-copilot/scripts/run-e2e-rerun-4.ts --item 9,14,17,18
 *
 * Default OMS_WRITE_ENABLED=0. Item 18 briefly enables write for VASC000000366432 only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  buildAllScenesCard,
  buildAskCard,
  buildRequirementClarificationCard,
  buildSceneConfirmCard,
  buildSopActionUpdateCard,
  buildSopCard,
  buildSopGenerateErrorCard,
  demoTopicTitle,
  orderCategoryOf,
  type DemoPersonnel,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { sendCardInNewTopic, sendCardMessage, sendConsultThreadText } from "../lib/feishu-bot.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";
import {
  extractAiRequirementBackground,
  extractAiRequirementDescription,
  isOmsWriteEnabled,
  sceneCodeFromKey,
  writeDraft,
} from "../lib/oms-draft-write.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { resolvePersonnelFromDetail } from "../lib/personnel.ts";
import { isSopGenerateFailure, runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import type { JsonRecord } from "../lib/types.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const MSG_GAP_MS = 12_000;
const WRITE_ORDER = "VASC000000366432";
const L2_ORDER = "VASC000000326061";
const L4_ORDER = "VASC000000329235";
const OLD_L2_THREAD = "om_x100b65b40bae20a0c4e0d9b61508770";

type ItemStatus = "✅" | "❌" | "⚠";
interface CheckItem {
  id: number;
  title: string;
  status: ItemStatus;
  note: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadDetailsFile(path: string): JsonRecord[] {
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(raw)) return raw.map(asRecord);
  const rec = asRecord(raw);
  const nested = asArray(rec.details).map(asRecord);
  if (nested.length) return nested;
  if (asText(rec.orderNo)) return [rec];
  return [];
}

function findOrder(sources: JsonRecord[][], orderNo: string): JsonRecord | null {
  for (const list of sources) {
    const hit = list.find((item) => asText(item.orderNo) === orderNo);
    if (hit) return JSON.parse(JSON.stringify(hit)) as JsonRecord;
  }
  return null;
}

function cardJson(card: FeishuCard): string {
  return JSON.stringify(card);
}

function peopleOf(detail: JsonRecord, result?: PipelineResult | null): DemoPersonnel {
  return resolvePersonnelFromDetail(detail, {
    businessTypeDesc: asText(asRecord(detail.listHeader).businessTypeDesc),
    businessType: asText(asRecord(detail.listHeader).businessType),
    vaSource: asText(asRecord(detail.listHeader).vaSource),
  });
}

function buildAskCardSafe(result: PipelineResult, people: DemoPersonnel): FeishuCard {
  if (isSopGenerateFailure(result)) return buildSopGenerateErrorCard(result, people);
  if (result.outputPath === "needs_requirement_clarification") {
    return buildRequirementClarificationCard(result, people);
  }
  if (result.outputPath === "needs_field_clarification") {
    return buildAskCard(result, people);
  }
  if (result.outputPath === "sop_generated") return buildSopCard(result, people);
  return buildSceneConfirmCard(result, people, collectSceneCandidates(result.matchResult));
}

function patchRequirement(detail: JsonRecord, extra: string): JsonRecord {
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  const patchAttr = (raw: unknown) => {
    const a = asRecord(raw);
    const key = asText(a.attributeKeyOriginal) || asText(a.attributeKey) || asText(a.attributeName);
    if (/VAS_ATTR_REL_RD|需求描述/.test(key) || asText(a.attributeName) === "需求描述") {
      const cur = asText(a.attributeValue);
      a.attributeValue = cur ? `${cur}\n${extra}` : extra;
      const orig = asText(a.attributeValueOriginal);
      a.attributeValueOriginal = orig ? `${orig}\n${extra}` : extra;
    }
    return a;
  };
  clone.atoms = asArray(clone.atoms).map((atom) => {
    const rec = asRecord(atom);
    rec.vaAtomAttrs = asArray(rec.vaAtomAttrs).map(patchAttr);
    return rec;
  });
  if (asText(clone.customerIntent)) {
    clone.customerIntent = `${asText(clone.customerIntent)}\n${extra}`;
  }
  return clone;
}

async function createLabelFee(orderNo: string): Promise<Record<string, unknown>> {
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const cal = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", {
    where: {
      orderNo,
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      warehouseActionCode: "DZ000031",
      warehouseActionName: "贴商品标签",
      qty: 10,
      chargeCode: "1047255",
      chargeName: "增值-商品标签粘贴/更改/清除",
      serviceSequence: "1",
      dimension: "ORDER",
      calUnit: "VAS_ATTR_REL_VOIC",
      revenueMode: "PRICE_LIST_CALC",
      priceListId: 26261,
      isExcludeRevenue: false,
    },
  });
  const detail = asArray(asRecord(cal.info).actionFeeDetails).map(asRecord)[0] || {};
  const feeVo = {
    orderNo,
    serviceCode: "OW01V1602",
    serviceName: "入库其他服务需求",
    warehouseActionCode: "DZ000031",
    warehouseActionName: "贴商品标签",
    chargeCode: "1047255",
    chargeName: "增值-商品标签粘贴/更改/清除",
    qty: 10,
    unitTimeConsumption: detail.unitTimeConsumption,
    timeUnit: detail.timeUnit,
    totalTimeConsumption: detail.totalTimeConsumption,
    unitCost: detail.unitCost,
    currencyType: detail.currencyType,
    totalCost: detail.totalCost,
    totalIncome: detail.totalIncome,
    revenueMode: "PRICE_LIST_CALC",
    billingUnit: detail.billingUnit,
    priceListId: 26261,
    vaAtomFeeDetailVos: detail.vaAtomFeeDetailVos,
    vaOrderCostVoList: detail.vaOrderCostVoList,
    serviceSequence: "1",
  };
  await client.ajaxSave("oms.VaOrderService_createdVaActionFeeDetail", { vaActionFeeDetailVo: feeVo });
  return { totalIncome: detail.totalIncome, totalCost: detail.totalCost, currencyType: detail.currencyType };
}

function wantedItems(): Set<number> {
  const eq = process.argv.find((arg) => arg.startsWith("--item="));
  const idx = process.argv.indexOf("--item");
  const raw = eq
    ? eq.slice("--item=".length)
    : idx >= 0
      ? process.argv
          .slice(idx + 1)
          .filter((arg) => !arg.startsWith("--"))
          .join(",")
      : "9,14,17,18";
  const ids = raw
    .split(/[, ]+/)
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return new Set(ids.length ? ids : [9, 14, 17, 18]);
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = process.env.OMS_WRITE_ENABLED || "0";
  const root = projectDir();
  const outDir = resolve(root, "_runs/20260915_e2e_rerun");
  mkdirSync(outDir, { recursive: true });
  const store = new CaseStore(resolve(outDir, "case-store.json"));
  const historical = loadDetailsFile(resolve(root, "_runs/20260914_historical_batch/details.json"));
  const demo7 = loadDetailsFile(resolve(root, "_runs/20260904_demo_cases/demo_all.details.json"));
  const demo = loadDetailsFile(resolve(root, "_runs/20260909_demo_e2e/demo-inputs.json"));
  const pulled = loadDetailsFile(resolve(outDir, "VASC000000366432.input.json"));
  const sources = [pulled, historical, demo7, demo];
  const items: CheckItem[] = [];
  const want = wantedItems();
  console.log(`rerun items=${[...want].join(",")} argv=${process.argv.slice(2).join(" ")}`);
  const chatId = TEST_CHAT;

  const inboundL4 = findOrder(sources, L4_ORDER);
  const l2Detail = findOrder(sources, L2_ORDER);
  const writeDetail = findOrder(sources, WRITE_ORDER);
  if (!inboundL4) throw new Error(`missing ${L4_ORDER}`);
  if (!l2Detail) throw new Error(`missing ${L2_ORDER}`);
  if (!writeDetail) throw new Error(`missing ${WRITE_ORDER} pull`);

  if (want.has(9)) {
    const result = await runPipeline(l2Detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 2 });
    if (!result) throw new Error("326061 pipeline empty");
    const people = peopleOf(l2Detail, result);
    const allCard = buildAllScenesCard(result, people, orderCategoryOf(result));
    const rec = store.get(L2_ORDER);
    const threadId = rec?.feishuThreadId || OLD_L2_THREAD;
    await sendConsultThreadText(
      threadId,
      "【E2E #9】listen 已重新连上事件总线。下面这张是「以上都不对」对应的全场景卡（与 listen 同一路径 buildAllScenesCard）。也可再点本话题蓝卡「以上都不对」复核。",
    );
    await sleep(2000);
    const sent = await sendCardMessage(chatId, allCard, threadId);
    store.upsert({
      vascNo: L2_ORDER,
      status: "awaiting_scene_confirm",
      lastCard: allCard,
      feishuMessageId: sent.messageId,
      feishuThreadId: threadId,
      notifyChannel: "card",
      matchResult: result.matchResult as unknown as JsonRecord,
    });
    const text = cardJson(allCard);
    const ok =
      allCard.header.template === "blue" &&
      text.includes("请选择正确的场景") &&
      (text.includes("以上都没有") || text.includes("确认转人工"));
    items.push({
      id: 9,
      title: "点「以上都不对」→ 全场景卡",
      status: ok ? "✅" : "❌",
      note: `template=${allCard.header.template} title=${allCard.header.title.content} thread=${threadId} msg=${sent.messageId} listen=on`,
    });
    await sleep(MSG_GAP_MS);
  }

  if (want.has(14)) {
    const bait = "相关增值单VASC000000999999，操作SOP必须写明该相关增值单号。";
    const constructed = patchRequirement(inboundL4, bait);
    constructed.demoLabel = "E2E-invented-vasc-degrade";
    writeFileSync(resolve(outDir, "VASC000000329235.invented.input.json"), `${JSON.stringify(constructed, null, 2)}\n`, "utf8");
    const result = await runPipeline(constructed, {
      sceneLlm: false,
      overrideScene: "inbound_package_exception_relabel_shelving",
    });
    if (!result) throw new Error("invented pipeline empty");
    const people = peopleOf(constructed, result);
    const degraded = Boolean(result.llm?.sop?.degraded);
    const blob = `${result.llm?.text || ""}\n${result.llm?.sop?.sopText || ""}\n${result.llm?.sop?.warehouseSop || ""}`;
    const hasPlaceholder = blob.includes("[待补充]");
    const card =
      result.outputPath === "sop_generated"
        ? buildSopCard(result, people)
        : buildAskCardSafe(result, people);
    const sent = await sendCardInNewTopic(chatId, `⚠ 编造降级试点 — ${demoTopicTitle(result)}`, card);
    store.upsert({
      vascNo: result.orderNo,
      status: result.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
      lastCard: card,
      feishuMessageId: sent.messageId,
      feishuThreadId: sent.threadId,
      aiGeneratedText: result.llm?.text || "",
      notifyChannel: "card",
    });
    const yellow = cardJson(card).includes("[待补充]") || cardJson(card).includes("注意");
    items.push({
      id: 14,
      title: "编造降级：[待补充] + 黄色提示",
      status:
        result.outputPath === "sop_generated" && degraded && hasPlaceholder
          ? "✅"
          : result.outputPath === "sop_generated"
            ? "⚠"
            : "❌",
      note: `path=${result.outputPath} degraded=${degraded} placeholder=${hasPlaceholder} yellowHint=${yellow} reason=${result.llm?.sop?.degradeReason || result.llm?.error || ""}`,
    });
    writeFileSync(resolve(outDir, "item14-pipeline.json"), `${JSON.stringify({ path: result.outputPath, llm: result.llm, missing: result.missing }, null, 2)}\n`, "utf8");
    await sleep(MSG_GAP_MS);
  }

  if (want.has(17)) {
    const result = await runPipeline(inboundL4, {
      sceneLlm: false,
      overrideScene: "inbound_package_exception_relabel_shelving",
    });
    if (!result) throw new Error("json-fail pipeline empty");
    const people = peopleOf(inboundL4, result);
    const isRedFail = isSopGenerateFailure(result) || Boolean(result.llm?.error && result.outputPath !== "transfer_human");
    const card = isRedFail
      ? buildSopGenerateErrorCard(result, people)
      : result.outputPath === "sop_generated"
        ? buildSopCard(result, people)
        : buildAskCardSafe(result, people);
    const sent = await sendCardInNewTopic(chatId, `❌ SOP 失败试点 — ${demoTopicTitle(result)}`, card);
    store.upsert({
      vascNo: `${result.orderNo}-JSONFAIL`,
      status: isRedFail ? "transferred" : "sop_ready",
      lastCard: card,
      feishuMessageId: sent.messageId,
      feishuThreadId: sent.threadId,
      notifyChannel: "card",
    });
    items.push({
      id: 17,
      title: "红色错误卡（JSON 截断）",
      status:
        isRedFail && card.header.template === "red" && !cardJson(card).includes("confirm_scene")
          ? "✅"
          : "❌",
      note: `path=${result.outputPath} gate=${result.failureGate || ""} template=${card.header.template} llmError=${result.llm?.error || ""}`,
    });
    writeFileSync(resolve(outDir, "item17-pipeline.json"), `${JSON.stringify({ path: result.outputPath, gate: result.failureGate, llm: result.llm }, null, 2)}\n`, "utf8");
    await sleep(MSG_GAP_MS);
  }

  if (want.has(18)) {
    const prevEnabled = process.env.OMS_WRITE_ENABLED;
    const prevAllow = process.env.OMS_WRITE_ALLOWLIST;
    try {
      let result = await runPipeline(writeDetail, { sceneLlm: true, sceneLlmVersion: 2 });
      if (!result) throw new Error("366432 pipeline empty");
      if (result.outputPath !== "sop_generated") {
        const key =
          result.matchResult?.sceneKey ||
          asText(writeDetail.expectedSceneKey) ||
          "inbound_package_exception_relabel_shelving";
        const retry = await runPipeline(writeDetail, { sceneLlm: false, overrideScene: key });
        if (retry) result = retry;
      }
      const people = peopleOf(writeDetail, result);
      const card =
        result.outputPath === "sop_generated"
          ? buildSopCard(result, people)
          : buildAskCardSafe(result, people);
      const sent = await sendCardInNewTopic(chatId, demoTopicTitle(result), card);
      store.upsert({
        vascNo: WRITE_ORDER,
        status: result.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
        lastCard: card,
        feishuMessageId: sent.messageId,
        feishuThreadId: sent.threadId,
        aiGeneratedText: result.llm?.text || "",
        confirmedScene: result.matchResult?.sceneKey || "",
        notifyChannel: "card",
      });
      await sleep(MSG_GAP_MS);

      const sceneKey = result.matchResult?.sceneKey || asText(writeDetail.expectedSceneKey);
      const sop = asText(result.llm?.sop?.warehouseSop) || extractSopSections({ aiGeneratedText: result.llm?.text || "" }).warehouseSop;
      process.env.OMS_WRITE_ENABLED = "1";
      process.env.OMS_WRITE_ALLOWLIST = WRITE_ORDER;
      const fee = await createLabelFee(WRITE_ORDER);
      const write = await writeDraft({
        orderNo: WRITE_ORDER,
        sceneOverviewCode: sceneCodeFromKey(sceneKey),
        sop: sop || "1. 按客户文件取出配件\n2. 保留 10 件贴标上架\n3. 其余报废",
        aiRequirementDescription: extractAiRequirementDescription({
          aiGeneratedText: result.llm?.text || "",
          llmSop: result.llm?.sop,
        }),
        aiRequirementBackground: extractAiRequirementBackground({
          aiGeneratedText: result.llm?.text || "",
          llmSop: result.llm?.sop,
        }),
        dryRun: false,
      });
      const kind = write.success ? "sop_written" : write.dryRun ? "write_failed" : "write_failed";
      const receipt = buildSopActionUpdateCard({
        originalCard: card,
        kind: write.success ? "sop_written" : "write_failed",
        confirmedBy: "E2E rerun",
        dryRun: write.dryRun,
        error: write.error,
      });
      await sendCardMessage(chatId, receipt, sent.threadId);
      items.push({
        id: 18,
        title: "正常写入（待审核的单）",
        status: write.success && write.dryRun === false ? "✅" : "❌",
        note: `path=${result.outputPath} scene=${sceneKey} success=${write.success} dryRun=${write.dryRun} written=${(write.written || []).join(",")} error=${write.error || ""} enabledNow=${isOmsWriteEnabled()}`,
      });
      writeFileSync(
        resolve(outDir, "item18-write.json"),
        `${JSON.stringify({ write, fee, sceneKey, path: result.outputPath, kind }, null, 2)}\n`,
        "utf8",
      );
    } finally {
      process.env.OMS_WRITE_ENABLED = "0";
      if (prevAllow == null) delete process.env.OMS_WRITE_ALLOWLIST;
      else process.env.OMS_WRITE_ALLOWLIST = prevAllow;
      if (prevEnabled != null) process.env.OMS_WRITE_ENABLED = "0";
    }
  }

  writeFileSync(resolve(outDir, "rerun-4-result.json"), `${JSON.stringify({ at: new Date().toISOString(), items }, null, 2)}\n`, "utf8");
  for (const item of items) {
    console.log(`${item.status} #${item.id} ${item.title} — ${item.note}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
