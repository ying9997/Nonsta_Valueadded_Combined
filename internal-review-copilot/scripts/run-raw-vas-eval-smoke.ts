/**
 * Smoke runner for scheme-A 10-row raw VAS candidates.
 *
 * Uses the same lib pipeline as dry-run. Does not change runtime nodes.
 * Accepts wide-table-shaped details (not only OW01V1602 atoms).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import { bindContext } from "../lib/context-bind.ts";
import { checkRequirement } from "../lib/check-requirement.ts";
import { checkCompleteness } from "../lib/check-completeness.ts";
import { formatOutput } from "../lib/format-output.ts";
import { matchTemplate } from "../lib/match-template.ts";
import { mockGenerateSop } from "../lib/mock-llm.ts";
import { asArray, asRecord, asText, attrMap, attachmentStatus } from "../lib/oms-adapter.ts";
import type {
  AgentInput,
  CompletenessResult,
  ContextFacts,
  MatchResult,
  MockSop,
  OutputPath,
  OwnerFacts,
  PipelineNode,
  RequirementCheck,
} from "../lib/types.ts";

interface DryRunResult {
  orderNo: string;
  outputPath: OutputPath;
  node: PipelineNode;
  nodesHit: PipelineNode[];
  failureGate: string;
  missingRequirementItems: string[];
  missingAttachments: string[];
  missingFields: string[];
  missing: string[];
  clarificationPrompts: string[];
  matchResult?: MatchResult;
  completenessResult?: CompletenessResult;
  requirementCheck?: RequirementCheck;
  contextFacts?: ContextFacts;
  ownerFacts?: OwnerFacts;
  mockSop?: MockSop;
  structured?: ReturnType<typeof formatOutput>["structured"];
  analysis?: string;
  validationMessage?: string;
  agentInput: AgentInput;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function extractNos(blob: string): { ebs: string[]; wis: string[] } {
  const upper = blob.toUpperCase();
  return {
    ebs: [...new Set(upper.match(/EB\d{6,}/g) || [])],
    wis: [...new Set(upper.match(/WI\d{6,}/g) || [])],
  };
}

function buildWideInput(detail: ReturnType<typeof asRecord>): { input: AgentInput } | null {
  const orderNo = asText(detail.orderNo) || asText(asRecord(detail.listHeader).orderNo);
  if (!orderNo) return null;
  const header = asRecord(detail.listHeader);
  const atom = asArray(detail.atoms).map(asRecord)[0] || {};
  const attrs = attrMap(atom);
  const desc =
    attrs.VAS_ATTR_REL_RD ||
    attrs["需求描述"] ||
    asText(detail.requirementDescription);
  const bg =
    attrs.BEOR ||
    attrs["需求背景说明"] ||
    asText(detail.requirementBackground);
  const customerIntent = [bg, desc].filter(Boolean).join("\n");
  const nos = extractNos([desc, bg, asText(atom.sop), JSON.stringify(detail.events || [])].join("\n"));
  const eventFromList = asArray(detail.events)
    .map(asRecord)
    .map((ev) => asText(ev.eventNo) || asText(ev.businessNo))
    .filter((no) => /^EB/i.test(no));
  const ebs = [...new Set([...nos.ebs, ...eventFromList])];
  const wis = nos.wis;
  const attachments = attachmentStatus(atom);
  const sceneName = asText(atom.sceneOverviewName);
  const serviceName = asText(atom.serviceName);
  const input: AgentInput = {
    mode: "internal_review_copilot",
    vascNo: orderNo,
    query: customerIntent || `待审核增值单 ${orderNo}`,
    customerIntent,
    serviceAtom: asText(atom.serviceCode) || "",
    sceneKey: "",
    sceneName,
    sceneCode: asText(atom.sceneOverviewCode),
    recommendedVasc: {
      vascCode: asText(asRecord(header.vasc).productCode),
      vascName: asText(asRecord(header.vasc).productName) || serviceName,
    },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: asText(header.vaSource),
      warehouseCode: asText(header.warehouseCode) || asText(asRecord(header.warehouse).warehouseCode),
      warehouseName: asText(header.warehouseName) || asText(asRecord(header.warehouse).warehouseName),
      customerCode: "",
      customerName: "",
      eventNo: ebs[0] || "",
      businessOrderNo: wis[0] || "",
      attachmentStatus: attachments,
    },
    providedFields: {
      BEOR: bg,
      VAS_ATTR_REL_RD: desc,
      VAS_ATTR_REL_NWEON: attrs.VAS_ATTR_REL_NWEON || wis[0] || "",
      NSVASTN: attrs.NSVASTN || ebs[0] || "",
    },
    omsFacts: {
      customerRequirementDescription: desc,
      requirementBackground: bg,
      fieldValues: {
        VAS_ATTR_REL_NWEON: attrs.VAS_ATTR_REL_NWEON || wis[0] || "",
        NSVASTN: attrs.NSVASTN || ebs[0] || "",
      },
      attachmentStatus: attachments,
      uploadedFiles: [],
    },
    responsiblePeople: {
      submittedBy: "",
      customerService: [],
      sales: [],
      reviewers: [],
    },
    conversationEvidence: [],
    enrichedContext: {
      orderNo,
      customerCode: "",
      customerName: "",
      warehouseCode: asText(header.warehouseCode) || asText(asRecord(header.warehouse).warehouseCode),
      warehouseName: asText(header.warehouseName) || asText(asRecord(header.warehouse).warehouseName),
      eventNo: ebs[0] || "",
      businessOrderNo: wis[0] || "",
      allEventNos: ebs,
      allBusinessOrderNos: wis,
      sceneName,
      sceneCode: asText(atom.sceneOverviewCode),
      serviceName,
    },
  };
  return { input };
}

async function runOne(detail: ReturnType<typeof asRecord>): Promise<DryRunResult | null> {
  const built = buildWideInput(detail);
  if (!built) return null;
  const nodesHit: PipelineNode[] = [];
  const orderNo = built.input.vascNo;

  nodesHit.push("validate-input");
  const validation = await validateInput({ params: built.input as unknown as Record<string, unknown> });
  const validationResult = asRecord(validation.validationResult);
  if (validationResult.ok === false && asText(validationResult.reason) !== "missing_intent") {
    return {
      orderNo,
      outputPath: "invalid_input",
      node: "validate-input",
      nodesHit,
      failureGate: "validate-input",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      validationMessage: asText(validationResult.message),
      agentInput: built.input,
    };
  }

  nodesHit.push("context-bind");
  const { contextFacts, ownerFacts } = bindContext(built.input);

  nodesHit.push("check-requirement");
  const requirement = checkRequirement(built.input.customerIntent, contextFacts);
  if (!requirement.complete) {
    const formatted = formatOutput({
      outputPath: "needs_requirement_clarification",
      node: "check-requirement",
      contextFacts,
      ownerFacts,
      requirement,
    });
    return {
      orderNo,
      outputPath: "needs_requirement_clarification",
      node: "check-requirement",
      nodesHit,
      failureGate: "check-requirement",
      missingRequirementItems: requirement.missingRequirementItems,
      missingAttachments: [],
      missingFields: [],
      missing: requirement.missingRequirementItems,
      clarificationPrompts: requirement.clarificationPrompts,
      requirementCheck: requirement,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("match-template");
  const matchResult = matchTemplate(requirement.normalizedRequirement, contextFacts);
  if (!matchResult.supported) {
    const formatted = formatOutput({
      outputPath: "transfer_human",
      node: "match-template",
      contextFacts,
      ownerFacts,
      requirement,
      matchResult,
    });
    return {
      orderNo,
      outputPath: "transfer_human",
      node: "match-template",
      nodesHit,
      failureGate: "match-template",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      requirementCheck: requirement,
      matchResult,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("check-completeness");
  const completeness = checkCompleteness(contextFacts, matchResult);
  if (!completeness.complete) {
    const formatted = formatOutput({
      outputPath: "needs_field_clarification",
      node: "check-completeness",
      contextFacts,
      ownerFacts,
      requirement,
      matchResult,
      completeness,
    });
    return {
      orderNo,
      outputPath: "needs_field_clarification",
      node: "check-completeness",
      nodesHit,
      failureGate: "check-completeness",
      missingRequirementItems: [],
      missingAttachments: completeness.missingAttachments,
      missingFields: completeness.missingFields.map((item) => item.field),
      missing: completeness.missingFields.map((item) => item.field),
      clarificationPrompts: completeness.missingFields.map((item) => item.clarificationPrompt),
      requirementCheck: requirement,
      matchResult,
      completenessResult: completeness,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("llm-generate-sop");
  const mockSop = mockGenerateSop(contextFacts, matchResult, requirement.normalizedRequirement);
  nodesHit.push("format-output");
  const formatted = formatOutput({
    outputPath: "sop_generated",
    node: "format-output",
    contextFacts,
    ownerFacts,
    requirement,
    matchResult,
    completeness,
    mockSop,
  });
  return {
    orderNo,
    outputPath: "sop_generated",
    node: "format-output",
    nodesHit,
    failureGate: "",
    missingRequirementItems: [],
    missingAttachments: [],
    missingFields: [],
    missing: [],
    clarificationPrompts: [],
    requirementCheck: requirement,
    matchResult,
    completenessResult: completeness,
    contextFacts,
    ownerFacts,
    mockSop,
    structured: formatted.structured,
    analysis: formatted.analysis,
    agentInput: built.input,
  };
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const inputPath = resolve(here, arg("input"));
  const outDir = resolve(here, arg("out"));
  if (!arg("input") || !arg("out")) {
    throw new Error("Usage: node --experimental-strip-types internal-review-copilot/scripts/run-raw-vas-eval-smoke.ts --input <details.json> --out <dir>");
  }
  if (!existsSync(inputPath)) {
    throw new Error(`输入不存在：${inputPath}`);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = Array.isArray(raw) ? raw : asArray(raw.details);
  const results: DryRunResult[] = [];
  for (const detail of details.map(asRecord)) {
    const result = await runOne(detail);
    if (result) results.push(result);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "agent-inputs.json"), `${JSON.stringify(results.map((r) => r.agentInput), null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "dryrun-results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");

  const summary = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.outputPath] = (acc[result.outputPath] || 0) + 1;
    return acc;
  }, {});
  writeFileSync(
    resolve(outDir, "summary.md"),
    [
      "# 原始增值单 10 条 smoke 干跑",
      "",
      `- 输入：\`${inputPath}\``,
      `- 样本数：${results.length}`,
      "- 候选态 smoke，不是正式 gold，不写入 eval-v0.1",
      "- SOP：本地 mock，未改运行时代码",
      "",
      "## 分流",
      "",
      "| outputPath | n |",
      "|---|---:|",
      ...Object.entries(summary).map(([k, v]) => `| ${k} | ${v} |`),
      "",
      "## 明细",
      "",
      "| orderNo | outputPath | node | top1 | decision | missing |",
      "|---|---|---|---|---|---|",
      ...results.map((result) => {
        const match = result.matchResult;
        const top1 = match?.topK?.[0]?.sceneKey || "-";
        const missing = [...new Set([...result.missingRequirementItems, ...result.missingAttachments, ...result.missingFields])].join("；") || "-";
        return `| ${result.orderNo} | ${result.outputPath} | ${result.node} | ${top1} | ${match?.decision || "-"} | ${missing} |`;
      }),
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`sample=${results.length}`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
