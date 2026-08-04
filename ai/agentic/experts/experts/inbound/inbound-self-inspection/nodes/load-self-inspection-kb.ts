/**
 * 节点：load-self-inspection-kb — 按 intent/subTopic/phase + SI/QSI 拼接 KB
 * FaaS 单文件闭环，无外部 import。
 */

type InspectionProduct = "SI" | "QSI" | "unknown";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function firstOrderRow(rawOrderData: unknown): Record<string, unknown> | null {
  if (rawOrderData == null || typeof rawOrderData !== "object") return null;
  const list = (rawOrderData as { list?: unknown[] }).list;
  if (!Array.isArray(list) || list.length === 0) return null;
  const row = list[0];
  return row != null && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

function resolveInspectionProduct(rawOrderData: unknown, routePath: string): InspectionProduct {
  if (routePath === "kb_only") return "unknown";

  const row = firstOrderRow(rawOrderData);
  if (!row) return "unknown";

  const psc = str(row.winitProductCode) || str(row.productCode);
  const inspectionType = str(row.inspectionType);

  if (/OW01022/i.test(psc)) return "QSI";
  if (/OW01021/i.test(psc)) return "SI";
  if (/QSI|quick|快速|SelfInspectionPlanSKU/i.test(inspectionType)) return "QSI";
  if (/SI|classic|经典|旧自验/i.test(inspectionType)) return "SI";

  return "unknown";
}

function pickSubmitGuideKb(
  product: InspectionProduct,
  kbSubmitGuide: string,
  kbQsiGuide: string
): string {
  if (product === "QSI") return kbQsiGuide || kbSubmitGuide;
  if (product === "SI") return kbSubmitGuide;
  const parts = [kbSubmitGuide, kbQsiGuide].filter(Boolean);
  return parts.join("\n\n---\n\n");
}

function pickKbParts(
  intent: string,
  subTopic: string,
  phase: string,
  submitGuide: string,
  kbSamplingRules: string,
  kbExemptionConditions: string,
  product: InspectionProduct
): { parts: string[]; scope: string } {
  const productTag = product === "unknown" ? "" : `:${product}`;

  if (intent === "submit_guide" || subTopic === "submit_guide" || subTopic === "modify_guide") {
    return { parts: [submitGuide], scope: `pre_ship:submit${productTag}` };
  }
  if (subTopic === "exemption_check") {
    return { parts: [kbExemptionConditions, submitGuide], scope: `pre_ship:exemption${productTag}` };
  }
  if (intent === "progress" || phase === "post_arrival" || subTopic === "sampling_result") {
    return { parts: [kbSamplingRules, submitGuide], scope: `post_arrival:sampling${productTag}` };
  }
  if (intent === "status") {
    return { parts: [submitGuide, kbExemptionConditions], scope: `status${productTag}` };
  }
  return { parts: [submitGuide, kbSamplingRules, kbExemptionConditions], scope: `full${productTag}` };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) || "submit_guide";
  const subTopic = str(params.normalizedSubTopic) || str(params.subTopic);
  const phase = str(params.normalizedPhase);
  const routePath = str(params.routePath);

  const kbSubmitGuide = str(params.kbSubmitGuide);
  const kbQsiGuide = str(params.kbQsiGuide);
  const kbSamplingRules = str(params.kbSamplingRules);
  const kbExemptionConditions = str(params.kbExemptionConditions);

  const inspectionProduct = resolveInspectionProduct(params.rawOrderData, routePath);
  const submitGuide = pickSubmitGuideKb(inspectionProduct, kbSubmitGuide, kbQsiGuide);

  const { parts, scope } = pickKbParts(
    intent,
    subTopic,
    phase,
    submitGuide,
    kbSamplingRules,
    kbExemptionConditions,
    inspectionProduct
  );

  return {
    kbContent: parts.filter(Boolean).join("\n\n---\n\n"),
    kbScope: `${scope}:${routePath || "default"}`,
    inspectionProduct,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-self-inspection-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
