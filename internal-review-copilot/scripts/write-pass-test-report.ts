/**
 * Build per-case MD + pass-test-report.md from skip-feishu historical batch output.
 *
 *   npx tsx internal-review-copilot/scripts/write-pass-test-report.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { projectDir } from "../lib/env.ts";
import type { JsonRecord } from "../lib/types.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function mdCell(value: string): string {
  return String(value || "").replace(/\|/g, "/").replace(/\n/g, " ");
}

function gateLabel(outputPath: string, node: string): string {
  if (outputPath === "sop_generated") return "L4";
  if (outputPath === "needs_field_clarification") return "L2.5";
  if (outputPath === "needs_requirement_clarification") return "L1";
  if (outputPath === "transfer_human") return "L2";
  return node || outputPath || "未知";
}

function misBlockReason(rec: JsonRecord, expected: string): string {
  const actual = asText(asRecord(rec.final).outputPath) || asText(rec.outcome);
  if (expected !== "sop_generated") return "";
  if (actual === "sop_generated" || asText(rec.outcome) === "l4_direct" || asText(rec.outcome) === "sop_after_rounds") {
    return "";
  }
  const missingAtt = asArray(asRecord(rec.final).missingAttachments).map(asText).filter(Boolean);
  const missingInfo = asArray(asRecord(rec.final).missingRequirementItems).map(asText).filter(Boolean);
  const uploaded = asArray(asRecord(rec.final).uploadedAttachments).map(asText);
  if (actual === "transfer_human" || asText(asRecord(rec.final).failureGate) === "match-template") {
    return "场景匹配";
  }
  if (missingAtt.length) return "附件规则过严（样本少定的必填实际不必填）";
  if (missingInfo.length && uploaded.length) return "信息在附件里 LLM 看不到";
  if (missingInfo.length) return "requiredInfoFields 过严";
  return "其他";
}

function reachedL4(rec: JsonRecord): boolean {
  const actual = asText(asRecord(rec.final).outputPath);
  const outcome = asText(rec.outcome);
  return actual === "sop_generated" || outcome === "l4_direct" || outcome === "sop_after_rounds";
}

function mark(ok: boolean): string {
  return ok ? "✓" : "✗";
}

function main(): void {
  const root = projectDir();
  const setDir = resolve(root, arg("set", "_runs/20260915_pass_test"));
  const resultsDir = resolve(root, arg("results", "_runs/20260915_pass_test/results"));
  const testSet = JSON.parse(readFileSync(resolve(setDir, "test-set.json"), "utf8")) as Array<JsonRecord>;
  const details = JSON.parse(readFileSync(resolve(setDir, "details.json"), "utf8")) as JsonRecord[];
  const results = JSON.parse(readFileSync(resolve(resultsDir, "results.json"), "utf8")) as JsonRecord[];
  const byResult = new Map(results.map((r) => [asText(r.orderNo), r]));
  const byDetail = new Map(details.map((d) => [asText(d.orderNo), d]));

  mkdirSync(resolve(resultsDir, "per-case"), { recursive: true });

  const rows: Array<{
    orderNo: string;
    expected: string;
    actual: string;
    misblocked: boolean;
    reason: string;
    sceneMatch: boolean;
    stopAt: string;
  }> = [];

  for (const item of testSet) {
    const orderNo = asText(item.orderNo);
    const rec = byResult.get(orderNo) || {};
    const detail = byDetail.get(orderNo) || {};
    const sample = asRecord(detail._sample);
    const final = asRecord(rec.final);
    const expected = asText(item.expectedPath) || "sop_generated";
    const actual = asText(final.outputPath) || asText(rec.outcome) || "未跑";
    const omsScene = asText(sample.sceneName) || asText(item.sceneName);
    const aiScene = asText(final.sceneName) || asText(final.sceneKey);
    const sceneMatch = Boolean(aiScene) && (aiScene.includes(asText(item.sceneKey)) || asText(item.sceneName).includes(aiScene) || asText(final.sceneKey) === asText(item.sceneKey));
    const infoChecks = asArray(final.infoChecks).map(asRecord);
    const uploaded = asArray(final.uploadedAttachments).map(asText);
    const files = asArray(final.uploadedFiles).map(asRecord);
    const missingAtt = asArray(final.missingAttachments).map(asText);
    const missingInfo = asArray(final.missingRequirementItems).map(asText);
    const l4 = reachedL4(rec);
    const misblocked = expected === "sop_generated" && !l4;
    const reason = misBlockReason(rec, expected);
    const stopAt = gateLabel(actual, asText(final.node));
    rows.push({
      orderNo,
      expected,
      actual,
      misblocked,
      reason,
      sceneMatch,
      stopAt,
    });

    const atom = asRecord(asArray(detail.atoms)[0]);
    const rd = asText(final.customerIntent) || asText(sample.rdPreview);
    const ebs = asArray(detail.events).map((ev) => asText(asRecord(ev).eventNo)).filter(Boolean);
    const infoLines = infoChecks.length
      ? infoChecks.map((c) => `  - ${asText(c.field)}：${c.present ? "✓" : "✗"} ${asText(c.evidence) || ""}`)
      : ["  - （未跑信息检查或无必填信息项）"];
    const attLines = ["标签文件", "包裹和标签的对应关系", "商品和标签的对应关系", "操作说明附件", "视频拍摄SOP（中文+英文）"].map(
      (label) => `- ${label} ${uploaded.includes(label) ? "✓" : "✗"}`,
    );
    if (files.length) {
      attLines.push(`- 文件名：${files.map((f) => asText(f.fileName) || asText(f.label)).filter(Boolean).join("、")}`);
    }

    const md = [
      `# ${orderNo} — 跑批结果`,
      "",
      "## 基本信息",
      `- 场景（OMS 审核员选的）：${omsScene}`,
      `- 仓库：${asText(asRecord(detail.listHeader).warehouseName)}`,
      `- 异常单：${ebs.join("、") || "无"}`,
      `- 审核状态：已完成 ✓`,
      "",
      "## 客户原始需求",
      `> ${rd || "（空）"}`,
      "",
      "## 已上传附件",
      ...attLines,
      "",
      "## Pipeline 结果",
      "",
      `### L1 需求检查 → ${asText(final.requirementLength) && Number(final.requirementLength) > 5 ? "通过 ✓" : mark(asText(final.failureGate) !== "check-requirement")}`,
      `- 需求描述 ${asText(final.requirementLength) || "?"} 字`,
      "",
      `### L2 场景匹配 → ${aiScene || "（未命中）"}（置信度：${asText(final.confidence) || "-"}）${sceneMatch ? " ✓" : " ✗"}`,
      `- AI 判断场景和审核员${sceneMatch ? "一致 ✓" : `不一致（OMS=${omsScene} / AI=${aiScene || "无"}）`}`,
      "",
      `### L2.5 场景完整性 → ${l4 || actual === "needs_field_clarification" ? (l4 ? "通过 ✓" : "未过 ✗") : stopAt}`,
      "- 需求信息检查：",
      ...infoLines,
      "- 附件检查：",
      ...missingAtt.map((a) => `  - ${a}：✗ 未上传`),
      ...(missingAtt.length ? [] : ["  - 当前必填附件规则已通过（或无必填）"]),
      `- 结论：complete=${l4 && !missingInfo.length && !missingAtt.length ? "true" : "false"}`,
      "",
      "### L4 SOP 生成 → " + (l4 ? "✓" : "未到"),
      l4 ? `> ${(asText(final.llmText) || asText(final.analysis) || "").slice(0, 400)}` : "",
      "",
      "## 判定",
      `- 预期出口：${expected === "sop_generated" ? "sop_generated（已审核通过且 OMS 必填附件齐）" : expected}`,
      `- 实际出口：${actual}`,
      `- **是否误拦：${misblocked ? "是" : "否"}**${reason ? `（${reason}）` : ""}`,
      atom ? `- OMS 场景码：${asText(atom.sceneOverviewCode)} ${asText(atom.sceneOverviewName)}` : "",
    ]
      .filter((line) => line !== "")
      .join("\n");
    writeFileSync(resolve(resultsDir, "per-case", `${orderNo}.md`), `${md}\n`, "utf8");
  }

  const n = rows.length;
  const l4n = rows.filter((r) => reachedL4(byResult.get(r.orderNo) || {})).length;
  const expectedL4 = rows.filter((r) => r.expected === "sop_generated");
  const misn = rows.filter((r) => r.misblocked).length;
  const sceneOk = rows.filter((r) => r.sceneMatch).length;
  const reasonCount = new Map<string, number>();
  for (const r of rows.filter((x) => x.misblocked)) {
    reasonCount.set(r.reason || "其他", (reasonCount.get(r.reason || "其他") || 0) + 1);
  }
  const misRate = expectedL4.length ? misn / expectedL4.length : 0;
  const pass = misRate <= 0.1;

  const report = [
    "# 已审核通过单跑批验证报告",
    "",
    "## 统计",
    "",
    `- 测试集：${n} 条已审核通过的增值单`,
    "- Pipeline 配置：sceneLlmVersion=2, RAG=off, `--skip-feishu`, OMS_WRITE=0",
    "",
    "## 核心指标",
    "",
    "| 指标 | 值 | 目标 |",
    "|------|---|------|",
    `| L4 到达率 | ${l4n}/${n} (${((l4n / Math.max(n, 1)) * 100).toFixed(1)}%) | ≥ 70% |`,
    `| 误拦率（预期 L4 却未到） | ${misn}/${expectedL4.length} (${(misRate * 100).toFixed(1)}%) | ≤ 10% |`,
    `| 场景匹配准确率 | ${sceneOk}/${n} (${((sceneOk / Math.max(n, 1)) * 100).toFixed(1)}%) | — |`,
    "",
    "## 误拦明细",
    "",
    rows.filter((r) => r.misblocked).length
      ? [
          "| VASC | 预期出口 | 实际出口 | 停在哪 | 误拦原因 |",
          "|------|---------|---------|--------|---------|",
          ...rows
            .filter((r) => r.misblocked)
            .map((r) => `| ${r.orderNo} | ${r.expected} | ${r.actual} | ${r.stopAt} | ${mdCell(r.reason)} |`),
        ].join("\n")
      : "无误拦。",
    "",
    "## 误拦原因分布",
    "",
    "| 原因 | 次数 | 占比 |",
    "|------|-----:|-----:|",
    ...(reasonCount.size
      ? [...reasonCount.entries()].map(
          ([k, v]) => `| ${mdCell(k)} | ${v} | ${((v / Math.max(misn, 1)) * 100).toFixed(1)}% |`,
        )
      : ["| （无） | 0 | 0% |"]),
    "",
    "## 结论",
    "",
    pass
      ? `- 误拦率 ${(misRate * 100).toFixed(1)}% ≤ 10% → **可以部署**（仍须你明确说「可以部署 40」）`
      : `- 误拦率 ${(misRate * 100).toFixed(1)}% > 10% → **不能部署**，先看误拦明细再修对应场景卡/规则`,
    "",
  ].join("\n");
  writeFileSync(resolve(resultsDir, "pass-test-report.md"), `${report}\n`, "utf8");
  console.log(`wrote ${n} per-case md; L4=${l4n}/${n} misblock=${misn}/${expectedL4.length} → ${resultsDir}/pass-test-report.md`);
}

main();
