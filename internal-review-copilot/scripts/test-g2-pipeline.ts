/**
 * G-2: L1 blank-only gate + L2.5 scene completeness (attachments without LLM).
 *
 *   npx tsx internal-review-copilot/scripts/test-g2-pipeline.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRequirement, MIN_REQUIREMENT_LENGTH } from "../lib/check-requirement.ts";
import {
  buildClarificationPrompts,
  buildInfoPrompt,
  checkSceneCompleteness,
  parseInfoLlmResponse,
} from "../lib/check-scene-completeness.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { renderTrace } from "./trace-case.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import type { ContextFacts, JsonRecord, MatchResult } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function emptyContext(over: Partial<ContextFacts> = {}): ContextFacts {
  return {
    orderNo: "SMOKE_G2",
    customerCode: "",
    customerName: "",
    warehouseCode: "",
    warehouseName: "",
    eventNo: "",
    businessOrderNo: "",
    allEventNos: [],
    allBusinessOrderNos: [],
    vaSource: "",
    businessType: "INBOUND",
    businessTypeDesc: "入库订单",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    serviceAtom: "OW01V1602",
    attachmentStatus: {},
    providedFields: {},
    boundKeys: [],
    ...over,
  };
}

function detail(rd: string, files: string[] = [], wi = ""): JsonRecord {
  return {
    orderNo: "SMOKE_G2_001",
    listHeader: {
      orderNo: "SMOKE_G2_001",
      businessType: "INBOUND",
      businessTypeDesc: "入库订单",
      vasc: { productCode: "VASC202411192246131", productName: "入库非标增值（特批）" },
      businessOrder: { businessNo: wi },
    },
    atoms: [
      {
        serviceCode: "OW01V1602",
        serviceName: "入库其他服务需求",
        vaAtomAttrs: [
          {
            attributeKey: "VAS_ATTR_REL_RD",
            attributeName: "需求描述",
            attributeValue: rd,
            attributeValueOriginal: rd,
          },
          ...(wi
            ? [
                {
                  attributeKey: "VAS_ATTR_REL_NWEON",
                  attributeName: "上架入库单号",
                  attributeValue: wi,
                  attributeValueOriginal: wi,
                },
              ]
            : []),
        ],
        vaAtomFiles: files.map((fileType) => ({ fileType, fileName: `${fileType}.pdf` })),
      },
    ],
    events: [],
    errors: [],
  };
}

async function main(): Promise<void> {
  const ctx = emptyContext();
  const blank = checkRequirement("  hi  ", ctx);
  assert(!blank.complete, "too short should block");
  assert(blank.missingRequirementItems[0]?.includes("过短") || blank.normalizedRequirement.length < MIN_REQUIREMENT_LENGTH, "blank item");

  const thin = checkRequirement("EB0126091400001 请处理", ctx);
  assert(thin.complete, "short but non-empty intent must pass L1");
  assert(thin.objectMatch, "OBJECT_RE still extracted for trace");
  assert(!thin.actionMatch, "ACTION_RE may miss; must not block");

  const parsed = parseInfoLlmResponse(
    JSON.stringify({
      checks: [
        { field: "处理范围", present: true, evidence: "264箱" },
        { field: "辨识方法", present: false, evidence: "" },
      ],
      missing: ["辨识方法未说明"],
    }),
    [
      { field: "处理范围", description: "件数", examples: ["264箱"], required: true },
      { field: "辨识方法", description: "怎么认", examples: ["看外箱"], required: true },
    ],
  );
  assert(parsed.missing.includes("辨识方法未说明"), "missing from checks");
  assert(parsed.checks[0]?.evidence === "264箱", "evidence kept");

  const infoPrompt = buildInfoPrompt(
    "整单处理，按附件对应关系换标",
    [
      { field: "处理范围", description: "件数或整单", examples: ["整单处理"], required: true },
      { field: "商品标签数量", description: "要贴多少", examples: ["30"], required: true },
    ],
    { 包裹和标签的对应关系: "uploaded", 标签文件: "missing" },
  );
  assert(infoPrompt.includes("已上传以下附件"), "L2.5 prompt lists uploaded attachments");
  assert(infoPrompt.includes("包裹和标签的对应关系"), "uploaded mapping file named in prompt");
  assert(infoPrompt.includes("可以合理推断"), "L2.5 prompt allows inference");
  assert(infoPrompt.includes("宁可判为「有」"), "L2.5 prompt prefers present over over-asking");

  const factsPrompt = buildInfoPrompt(
    "货物实际是DG品，需要转回DG仓上架到WI50892274",
    [{ field: "当前所在仓库", description: "发到了哪个仓", examples: ["DEBR2"], required: true }],
    { 标签文件: "uploaded" },
    emptyContext({ warehouseName: "DEBR2 Warehouse", warehouseCode: "DEBR2", eventNo: "EB1" }),
  );
  assert(factsPrompt.includes("当前单据仓库"), "L2.5 prompt injects OMS warehouse");
  assert(factsPrompt.includes("Winit订单号"), "L2.5 prompt treats WI aliases as inbound order");
  assert(factsPrompt.includes("漏气"), "L2.5 prompt treats appearance cues as identify method");

  const prompts = buildClarificationPrompts(
    ["处理范围未说明"],
    ["标签文件"],
    [],
    { sceneName: "【入库】包裹条码批量异常辨识后补贴包裹标签上架" } as never,
  );
  assert(prompts.some((p) => p.includes("本场景") && p.includes("处理范围")), "info prompt has scene");
  assert(prompts.some((p) => p.includes("请上传") && p.includes("标签文件")), "attachment prompt");

  const match = {
    supported: true,
    sceneKey: "inbound_photo_hold",
    scenarioName: "【入库】指定商品拍照暂存",
  } as MatchResult;
  const photoHold = await checkSceneCompleteness(
    "指定商品拍照后放入暂存区等客户确认",
    emptyContext({
      attachmentStatus: { 标签文件: "missing" },
      allBusinessOrderNos: ["WI1"],
      providedFields: { VAS_ATTR_REL_NWEON: "WI1" },
    }),
    match,
    { skipInfoLlm: true },
  );
  assert(photoHold.complete, "empty requiredFieldKeys + skipInfoLlm → complete");
  assert(photoHold.infoCheckSkipped, "skipInfoLlm recorded");

  const thinPipe = await runPipeline(detail("EB0126091400001 请处理"), { skipLlm: true });
  assert(thinPipe, "pipeline returned");
  assert(thinPipe!.outputPath !== "needs_requirement_clarification", "L1 no longer blocks thin intent");
  assert(thinPipe!.nodesHit.includes("match-template"), "thin intent reached L2");

  const f001Missing = await runPipeline(
    detail("到仓后请按尺重和标签辨识，换标后上架到新入库单 WI50734175", [], "WI50734175"),
    { skipLlm: true, overrideScene: "inbound_label_identify" },
  );
  assert(f001Missing?.outputPath === "sop_generated", "F-001 missing label file still generates SOP");
  assert(f001Missing?.missingAttachments.includes("标签文件"), "label file listed as placeholder");
  assert(f001Missing?.nodesHit.includes("check-scene-completeness"), "L2.5 node hit");

  const f001Skip = await runPipeline(
    detail("到仓后请按尺重和标签辨识，换标后上架到新入库单 WI50734175", [], "WI50734175"),
    { skipLlm: true, overrideScene: "inbound_label_identify", skipCompleteness: true },
  );
  assert(f001Skip?.outputPath === "sop_generated", "auditor skip L2.5 → L4 even if label file missing");

  const f001Ok = await runPipeline(
    detail("到仓后请按尺重和标签辨识，换标后上架到新入库单 WI50734175", ["VAS_ATTR_REL_LF"], "WI50734175"),
    { skipLlm: true, overrideScene: "inbound_label_identify" },
  );
  assert(f001Ok?.outputPath === "sop_generated", "info skip + attachments present → L4");

  const trace = renderTrace("SMOKE_G2_001", {}, f001Missing!);
  assert(trace.includes("check-scene-completeness"), "trace has L2.5 section");

  const here = dirname(fileURLToPath(import.meta.url));
  const demoDetails = resolve(here, "../../_runs/20260904_demo_cases/demo_all.details.json");
  if (existsSync(demoDetails)) {
    const raw = JSON.parse(readFileSync(demoDetails, "utf8"));
    const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
    const row = details.find((item) => asText(item.orderNo) === "VASC000000183069");
    assert(row, "demo details has VASC000000183069");
    const live = await runPipeline(row!, { skipLlm: true });
    assert(live, "183069 pipeline returned");
    if (live!.matchResult?.sceneKey) {
      assert(
        live!.outputPath === "sop_generated" || live!.outputPath === "needs_requirement_clarification",
        `183069 with scene should continue, got ${live!.outputPath}`,
      );
    } else {
      assert(live!.outputPath === "needs_requirement_clarification", "183069 no scene → 需求不清晰");
    }
  }

  console.log("test-g2-pipeline: ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
