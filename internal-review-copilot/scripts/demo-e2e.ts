/**
 * D+2 end-to-end demo.
 *
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --send-feishu
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "标签对应关系见群图，操作说明稍后补"
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseStore } from "../lib/case-store.ts";
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
import { getTokenSource, resolveTestChatId, sendDedupedOrderMessage } from "../lib/feishu-bot.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import { summarizeReply } from "../lib/summarize-reply.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function step(n: number, title: string): void {
  console.log("");
  console.log(`======== 步骤 ${n}：${title} ========`);
}

function pathLabel(path: string): string {
  if (path === "needs_requirement_clarification") return "请补需求";
  if (path === "needs_field_clarification") return "请补资料";
  if (path === "sop_generated") return "生成 SOP 草稿，待人工确认";
  if (path === "transfer_human") return "转人工审核";
  return "输入异常，转人工处理";
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const orderNo = arg("order", "VASC000000348477");
  const inputPath = resolve(
    here,
    arg("input") || "../../_runs/20260902_ow01v1602_review_orders/details.json",
  );
  const outDir = resolve(projectDir(), arg("out") || "_runs/20260903_internal_review_demo");
  mkdirSync(outDir, { recursive: true });

  step(1, "选一条真实待审核单");
  if (!existsSync(inputPath)) throw new Error(`找不到输入：${inputPath}`);
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const detail = details.find((item) => asText(item.orderNo) === orderNo);
  if (!detail) throw new Error(`details.json 中没有 ${orderNo}`);
  const header = asRecord(detail.listHeader);
  const warehouse = asRecord(header.warehouse);
  console.log(
    `已选择 ${orderNo}（入库其他服务需求 / ${asText(warehouse.warehouseName) || "仓库未填写"}）`,
  );

  step(2, "AI 判定");
  const result = await runPipeline(detail, { skipLlm: hasFlag("skip-llm") });
  if (!result) throw new Error("管线无法识别该单");
  const review = result.structuredReview;
  console.log(`需求完整性：${review?.requirementComplete ? "通过" : `不通过 — 缺${review?.missingRequirements.join("、") || "必要信息"}`}`);
  console.log(
    `场景匹配：${
      result.matchResult?.supported
        ? `F-001 ${result.matchResult.scenarioName}`
        : review?.sceneMatch.topScene || "未命中"
    }（decision=${review?.sceneMatch.decision || "-"}，confidence=${review?.sceneMatch.confidence || "-"}）`,
  );
  console.log(
    `附件完整性：${review?.materialsComplete ? "通过" : `不通过 — 缺${review?.missingMaterials.join("、") || "必要资料"}`}`,
  );
  console.log(`结论：${result.outputPath} → ${pathLabel(result.outputPath)}`);
  writeFileSync(resolve(outDir, `${orderNo}.review.json`), `${JSON.stringify(review, null, 2)}\n`, "utf8");
  if (result.llm?.error) console.warn(`警告：LLM 失败，已降级转人工：${result.llm.error}`);

  const store = new CaseStore(resolve(outDir, "case-store.json"));
  store.upsert({
    vascNo: orderNo,
    status: "first_assessed",
    customer: result.contextFacts?.customerName || "",
    warehouse: result.contextFacts?.warehouseName || "",
    omsAuditStatus: asText(asRecord(detail.listHeader).statusDesc),
    aiOutputPath: result.outputPath,
    aiGeneratedText: result.llm?.text || "",
    matchResult: result.matchResult || {},
    missingFields: result.missing,
    ruleOutputPath: result.ruleOutputPath,
    llmError: result.llm?.error || null,
    riskFlags: result.riskFlags,
  });

  const needsAsk =
    result.outputPath === "needs_requirement_clarification" ||
    result.outputPath === "needs_field_clarification";
  const shouldNotify = needsAsk || result.outputPath === "transfer_human";

  step(3, shouldNotify ? "发飞书群消息" : "无需通知，跳过发群");
  if (shouldNotify) {
    const suffix =
      result.outputPath === "needs_requirement_clarification"
        ? "缺需求"
        : result.outputPath === "needs_field_clarification"
          ? "缺资料"
          : "转人工";
    const title = `增值单 ${orderNo} ${suffix}`;
    console.log(`标题：${title}`);
    console.log(result.llm?.text || result.analysis || "");
    if (hasFlag("send-feishu")) {
      try {
        const sent = await sendDedupedOrderMessage({
          chatId: resolveTestChatId(),
          orderNo,
          title,
          body: result.llm?.text || result.analysis || "",
          mention: envText("FEISHU_TEST_USER_ID")
            ? { userId: envText("FEISHU_TEST_USER_ID"), name: envText("FEISHU_TEST_USER_NAME") || "审核协作" }
            : undefined,
        });
        store.upsert({
          vascNo: orderNo,
          status: needsAsk ? "awaiting_reply" : "transferred",
          feishuThreadId: sent.threadId,
          clarificationSentAt: new Date().toISOString(),
        });
        console.log(
          sent.skipped
            ? `已去重跳过：${sent.reason || orderNo}`
            : `已发送到测试群（${getTokenSource()}），话题 ID：${sent.topicId || "未返回"}，根消息 ID：${sent.threadId}`,
        );
      } catch (err) {
        console.warn(`警告：飞书发送失败，继续后续步骤：${err instanceof Error ? err.message : err}`);
      }
    } else {
      console.log("未加 --send-feishu，本步只展示话术，不发群。");
    }
  }

  step(4, "等待回复");
  const simulated = arg("simulate-reply");
  const replies = simulated
    ? [{ speaker: "销售（演示）", text: simulated }]
    : [];
  if (simulated) {
    console.log(`（模拟回复：${simulated}）`);
    store.upsert({ vascNo: orderNo, status: "reply_received", replyReceivedAt: new Date().toISOString() });
  } else {
    console.log("未提供 --simulate-reply。演示时可在飞书话题回复后，再跑 summarize / poll。");
  }

  step(5, "AI 总结回复");
  const remark = await summarizeReply({
    firstAssess: result,
    replies,
  });
  console.log(remark);
  writeFileSync(resolve(outDir, `${orderNo}.review-remark.txt`), `${remark}\n`, "utf8");
  store.upsert({ vascNo: orderNo, status: "reassessed", reviewRemark: remark });

  step(6, "SOP 草稿");
  if (result.ruleOutputPath === "sop_generated" && result.llm?.text) {
    console.log(result.llm.text);
    store.upsert({ vascNo: orderNo, status: "sop_ready" });
  } else {
    console.log(`当前不是 sop_generated（rule=${result.ruleOutputPath}），不输出仓库 SOP。`);
  }

  console.log("");
  console.log("======== 完成 ========");
  console.log(`结构化审核结果：${resolve(outDir, `${orderNo}.review.json`)}`);
  console.log(`审核员可复制备注：${resolve(outDir, `${orderNo}.review-remark.txt`)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
