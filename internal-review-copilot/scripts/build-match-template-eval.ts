/**
 * Build match-template eval set (≥30) from demo / 183 / 16 / smoke / derived.
 * Writes eval/golden/match-template-eval.jsonl
 *
 * Usage: npx tsx internal-review-copilot/scripts/build-match-template-eval.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { bindContext } from "../lib/context-bind.ts";
import { checkRequirement } from "../lib/check-requirement.ts";
import { buildAgentInput } from "../lib/oms-adapter.ts";
import type { ContextFacts, MatchDecision } from "../lib/types.ts";

interface EvalCase {
  id: string;
  vascNo: string;
  normalizedRequirement: string;
  expectedDecision: MatchDecision;
  expectedSceneKey: string;
  goldStatus: "gold" | "shadow" | "derived";
  source: string;
  notes: string;
  hardCase?: boolean;
  context?: Partial<ContextFacts>;
}

function emptyContext(overrides: Partial<ContextFacts> = {}): ContextFacts {
  return {
    orderNo: overrides.orderNo || "EVAL",
    customerCode: "",
    customerName: "",
    warehouseCode: "",
    warehouseName: "",
    eventNo: overrides.eventNo || "",
    businessOrderNo: overrides.businessOrderNo || "",
    allEventNos: overrides.allEventNos || (overrides.eventNo ? [overrides.eventNo] : []),
    allBusinessOrderNos:
      overrides.allBusinessOrderNos || (overrides.businessOrderNo ? [overrides.businessOrderNo] : []),
    vaSource: "",
    businessType: "",
    businessTypeDesc: "",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    serviceAtom: "OW01V1602",
    attachmentStatus: overrides.attachmentStatus || {},
    providedFields: overrides.providedFields || {},
    boundKeys: [],
    ...overrides,
  };
}

function loadDetailsMap(path: string): Map<string, Record<string, unknown>> {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const map = new Map<string, Record<string, unknown>>();
  for (const d of details) {
    const orderNo = asText(d.orderNo);
    if (orderNo) map.set(orderNo, d);
  }
  return map;
}

function requirementFromDetail(detail: Record<string, unknown>): { text: string; context: ContextFacts } {
  const built = buildAgentInput(detail);
  if (!built) throw new Error(`buildAgentInput failed for ${asText(detail.orderNo)}`);
  const { contextFacts } = bindContext(built.input);
  const req = checkRequirement(built.input.customerIntent, contextFacts);
  return { text: req.normalizedRequirement || built.input.customerIntent, context: contextFacts };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  const demo = loadDetailsMap(resolve(root, "_runs/20260904_demo_cases/demo_all.details.json"));
  const hist = loadDetailsMap(resolve(root, "_runs/20260901_oms_facts/details.json"));
  const daily = loadDetailsMap(resolve(root, "_runs/20260902_ow01v1602_review_orders/details.json"));

  const cases: EvalCase[] = [];
  const used = new Set<string>();

  function push(c: EvalCase) {
    if (used.has(c.id)) return;
    used.add(c.id);
    cases.push(c);
  }

  function fromPool(
    map: Map<string, Record<string, unknown>>,
    orderNo: string,
    expectedDecision: MatchDecision,
    expectedSceneKey: string,
    goldStatus: EvalCase["goldStatus"],
    source: string,
    notes: string,
    hardCase = false,
  ) {
    const detail = map.get(orderNo);
    if (!detail) return;
    const { text, context } = requirementFromDetail(detail);
    push({
      id: `${goldStatus}-${orderNo}`,
      vascNo: orderNo,
      normalizedRequirement: text,
      expectedDecision,
      expectedSceneKey,
      goldStatus,
      source,
      notes,
      hardCase,
      context: {
        orderNo: context.orderNo,
        eventNo: context.eventNo,
        businessOrderNo: context.businessOrderNo,
        allEventNos: context.allEventNos,
        allBusinessOrderNos: context.allBusinessOrderNos,
        serviceAtom: context.serviceAtom,
        attachmentStatus: context.attachmentStatus,
        providedFields: context.providedFields,
      },
    });
  }

  // --- gold supported (≥10): demo L3/L4 + CASEBOOK completes + hist clear supported ---
  for (const orderNo of [
    "VASC000000343821",
    "VASC000000333147",
    "VASC000000326061",
    "VASC000000143515",
    "VASC000000080416",
  ]) {
    fromPool(demo, orderNo, "supported", "inbound_label_identify", "gold", "demo-7", "demo F-001 supported");
  }
  for (const orderNo of [
    "VASC000000193236",
    "VASC000000190569",
    "VASC000000332778",
    "VASC000000317712",
    "VASC000000297120",
    "VASC000000333237",
  ]) {
    fromPool(hist, orderNo, "supported", "inbound_label_identify", "gold", "183-pool", "规则侧已 supported 的 F-001");
  }

  // --- gold/derived ambiguous (≥5) ---
  fromPool(demo, "VASC000000344421", "ambiguous", "", "gold", "demo-7", "demo L2 ambiguous");
  push({
    id: "derived-boundary-f001-a",
    vascNo: "",
    normalizedRequirement: "到仓商品需要换商品标签并上架到新入库单 WI99990001",
    expectedDecision: "ambiguous",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "casebook-boundary",
    notes: "F-001 vs A：只有换标+上架、无辨识/包裹类异常",
    context: emptyContext({ businessOrderNo: "WI99990001", allBusinessOrderNos: ["WI99990001"] }),
  });
  push({
    id: "derived-boundary-photo-unclear",
    vascNo: "",
    normalizedRequirement: "请对异常包裹内指定商品拍照核实外观",
    expectedDecision: "ambiguous",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "smoke-photo-destination-unclear",
    notes: "有拍照无暂存/客户确认 → 不得强行 B",
  });
  push({
    id: "derived-boundary-f001-b",
    vascNo: "",
    normalizedRequirement: "上架异常那个单，这10个都贴了同一个SKU。如果拆开看里边产品，你们可以拍照吗",
    expectedDecision: "ambiguous",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "eval-v0.1-candidates",
    notes: "拍照意图但无暂存去向",
  });

  push({
    id: "derived-boundary-relabel-only",
    vascNo: "",
    normalizedRequirement: "请帮这批货换标上架，具体怎么辨识还没定",
    expectedDecision: "ambiguous",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "casebook-group7-style",
    notes: "换标上架但辨识办法未定 → ambiguous",
  });
  fromPool(hist, "VASC000000327915", "ambiguous", "", "gold", "183-pool", "置信不足，期望保持 ambiguous");

  // hardCase: 业务倾向 F-001 supported，当前常判 ambiguous（易判错）≥5
  for (const orderNo of ["VASC000000323364", "VASC000000332922", "VASC000000342681", "VASC000000328776", "VASC000000327963"]) {
    fromPool(
      hist,
      orderNo,
      "supported",
      "inbound_label_identify",
      "gold",
      "183-error-analysis-hard",
      "CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错）",
      true,
    );
  }

  // --- unsupported (≥10): derived smoke + hist + daily shadow ---
  push({
    id: "derived-intercept-hold",
    vascNo: "",
    normalizedRequirement: "这个入库单所有包裹需要拦截不上架，先放在一边",
    expectedDecision: "unsupported",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "smoke-intercept",
    notes: "拦截不上架",
  });
  push({
    id: "derived-direct-scan",
    vascNo: "",
    normalizedRequirement: "入库单晚推送导致扫描包裹条码无法识别。请直接扫描上架到 WI88880002，第三方箱唛已关联",
    expectedDecision: "unsupported",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "smoke-direct-shelve",
    notes: "直接扫描上架非换标",
    context: emptyContext({ businessOrderNo: "WI88880002", allBusinessOrderNos: ["WI88880002"] }),
  });
  push({
    id: "derived-inhouse-photo-done",
    vascNo: "",
    normalizedRequirement: "库内开箱拍照已经做完了，当时选的是拍照暂存。现在确认没问题，要按原SKU直接上架",
    expectedDecision: "unsupported",
    expectedSceneKey: "",
    goldStatus: "derived",
    source: "eval-v0.1-candidates",
    notes: "库内后续上架，不自动支持三场景",
  });
  for (const orderNo of [
    "VASC000000335325",
    "VASC000000334098",
    "VASC000000324960",
    "VASC000000323808",
    "VASC000000313455",
  ]) {
    fromPool(hist, orderNo, "unsupported", "", "gold", "183-pool", "历史池规则 unsupported");
  }

  // 16 daily → shadow（至少若干条拦截 + 直接上架 + F-001 边界）
  fromPool(daily, "VASC000000348495", "unsupported", "", "shadow", "16-daily", "直接扫描上架");
  fromPool(daily, "VASC000000348477", "supported", "inbound_label_identify", "shadow", "16-daily", "当日 F-001 命中");
  for (const orderNo of [
    "VASC000000347559",
    "VASC000000347556",
    "VASC000000347553",
    "VASC000000347550",
    "VASC000000347547",
  ]) {
    fromPool(daily, orderNo, "unsupported", "", "shadow", "16-daily", "拦截不上架同文");
  }

  // more derived supported for A/B top recognition (decision supported but not auto-run completeness)
  push({
    id: "derived-a-positive",
    vascNo: "",
    normalizedRequirement: "包裹类异常，包裹条码正常但商品条码异常，请换商品标签后上架到新入库单 WI_A_101",
    expectedDecision: "supported",
    expectedSceneKey: "inbound_package_exception_relabel_shelving",
    goldStatus: "derived",
    source: "smoke-a-positive",
    notes: "A 正例：top 可为 A；card=candidate",
    context: emptyContext({ businessOrderNo: "WI_A_101", allBusinessOrderNos: ["WI_A_101"] }),
  });
  push({
    id: "derived-b-positive",
    vascNo: "",
    normalizedRequirement: "指定商品需要拍照，拍照后放入暂存区，等客户确认后再处理",
    expectedDecision: "supported",
    expectedSceneKey: "inbound_photo_hold",
    goldStatus: "derived",
    source: "smoke-b-positive",
    notes: "B 正例",
  });
  push({
    id: "derived-f001-positive-text",
    vascNo: "",
    normalizedRequirement: "到仓后请按尺重和标签辨识，换标后上架到新入库单 WI12345678",
    expectedDecision: "supported",
    expectedSceneKey: "inbound_label_identify",
    goldStatus: "derived",
    source: "smoke-f001-positive",
    notes: "F-001 文案正例",
    context: emptyContext({ businessOrderNo: "WI12345678", allBusinessOrderNos: ["WI12345678"] }),
  });

  const outPath = resolve(here, "../eval/golden/match-template-eval.jsonl");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, cases.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf8");

  const counts = {
    total: cases.length,
    supported: cases.filter((c) => c.expectedDecision === "supported").length,
    unsupported: cases.filter((c) => c.expectedDecision === "unsupported").length,
    ambiguous: cases.filter((c) => c.expectedDecision === "ambiguous").length,
    hardCase: cases.filter((c) => c.hardCase).length,
    gold: cases.filter((c) => c.goldStatus === "gold").length,
    shadow: cases.filter((c) => c.goldStatus === "shadow").length,
    derived: cases.filter((c) => c.goldStatus === "derived").length,
  };
  console.log(JSON.stringify(counts, null, 2));
  console.log(`wrote ${outPath}`);
  if (counts.total < 30) throw new Error(`need ≥30, got ${counts.total}`);
  if (counts.supported < 10) throw new Error(`need ≥10 supported`);
  if (counts.unsupported < 10) throw new Error(`need ≥10 unsupported`);
  if (counts.ambiguous < 5) throw new Error(`need ≥5 ambiguous`);
  if (counts.hardCase < 5) throw new Error(`need ≥5 hardCase`);
}

main();
