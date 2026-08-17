/**
 * 节点：validate-input — 校验服务配置最小入参。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function latestContext(enrichedContext: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = enrichedContext[key];
  if (Array.isArray(value)) return asRecord(value[value.length - 1]);
  return asRecord(value);
}

function isSubmittedVasOrderNo(value: string): boolean {
  return /^VASC0+\d+$/i.test(value);
}

function isStatusQuery(...parts: string[]): boolean {
  const text = parts.filter(Boolean).join(" ");
  return (
    text.includes("已提交") ||
    text.includes("处理到哪") ||
    text.includes("处理进度") ||
    text.includes("状态") ||
    text.includes("进度") ||
    text.toUpperCase().includes("VALUE_ADD_ORDER_STATUS")
  );
}

async function main({ params }: { params: Record<string, unknown> }) {
  const enrichedContext = asRecord(params.enrichedContext);
  const recommendationContext = latestContext(enrichedContext, "value-add/value-add-product-recommendation");
  const handoff = {
    ...asRecord(recommendationContext.handoffToServiceConfig),
    ...asRecord(params.handoffToServiceConfig),
  };
  const vasc = asRecord(handoff.vasc);
  const scenarioConditions = asRecord(params.scenarioConditions);
  const directVascCode = asText(params.vascCode);
  const directVascName = asText(params.vascName);
  const handoffVascCode = asText(handoff.vascCode) || asText(vasc.vascCode) || asText(vasc.code);
  const handoffVascName = asText(handoff.vascName) || asText(vasc.vascName) || asText(vasc.name);
  const vascCode = handoffVascCode || directVascCode;
  const vascName = handoffVascName || directVascName;
  const vasOrderNo = asText(scenarioConditions.vasOrderNo) || asText(params.vasOrderNo);
  const statusQuery = isStatusQuery(asText(params.query), asText(params.serviceIntent), asText(params.customerIntent)) || isSubmittedVasOrderNo(vasOrderNo);
  const hasConflict = Boolean(
    handoffVascCode &&
      directVascCode &&
      handoffVascCode.toUpperCase() !== directVascCode.toUpperCase()
  );
  const missingConfirmations = hasConflict
    ? [
        {
          field: "vascConflict",
          reason: "直接入参与上游推荐 handoff 的 VASC 不一致，默认以上游 handoff 为准，并需要确认是否改用页面选择",
          source: "handoff_priority",
          blockingMissing: false,
        },
      ]
    : [];
  const outputPath = statusQuery ? "escalated" : hasConflict ? "conditional" : "";

  return {
    rawServiceConfigInput: {
      vascCode,
      vascName,
      serviceIntent:
        asText(params.serviceIntent) ||
        asText(handoff.customerActionIntent) ||
        asText(handoff.customerActionNormalized) ||
        asText(params.customerIntent) ||
        asText(params.query),
      scenarioConditions: {
        ...scenarioConditions,
        limitations: Array.isArray(handoff.limitations) ? handoff.limitations : [],
      },
      handoffToServiceConfig: handoff,
      directVascCode,
      directVascName,
      conflictWarnings: hasConflict ? ["vascCode"] : [],
      missingConfirmations,
      ...(outputPath ? { outputPath } : {}),
      ...(statusQuery ? { handoffExpertId: "value-add-order-status", vasOrderNo } : {}),
      enrichedContext,
    },
    validationResult: {
      ok: statusQuery ? false : Boolean(vascCode || vascName),
      outputPath,
      handoffExpertId: statusQuery ? "value-add-order-status" : "",
      missingConfirmations,
      missingEvidence: statusQuery || vascCode || vascName ? [] : ["vascCode_or_vascName"],
    },
    inputContext: asRecord(params.inputContext),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "validate-input failed");
      process.exit(1);
    });
}
