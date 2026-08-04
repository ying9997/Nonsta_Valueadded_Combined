/**
 * 节点：merge-status-data — 合并增值单主状态和原子进度。
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function chooseBasicInfo(
  basicInfoFacts: Record<string, unknown>,
  resolvedBasicInfoFacts: Record<string, unknown>
): Record<string, unknown> {
  if (asText(resolvedBasicInfoFacts.fetchStatus) === "ok") return resolvedBasicInfoFacts;
  return basicInfoFacts;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const basicInfoFacts = asRecord(params.basicInfoFacts);
  const resolvedBasicInfoFacts = asRecord(params.resolvedBasicInfoFacts);
  const effectiveBasicInfoFacts = chooseBasicInfo(basicInfoFacts, resolvedBasicInfoFacts);
  const vasListFacts = asRecord(params.vasListFacts);
  const outputPath = asText(orderStatusInput.outputPath);
  const basicFailures = asArray(basicInfoFacts.optionalFetchFailures);
  const resolvedFailures = asArray(resolvedBasicInfoFacts.optionalFetchFailures);
  const vasFailures = asArray(vasListFacts.optionalFetchFailures);
  const basicStatus = asText(effectiveBasicInfoFacts.fetchStatus);
  const vasStatus = asText(vasListFacts.fetchStatus);
  const candidateOrderNos = asArray(vasListFacts.candidateOrderNos).map(asText).filter(Boolean);

  let finalOutputPath = outputPath;
  let validationMessage = asText(orderStatusInput.validationMessage);
  if (outputPath === "query_by_vas_order_no") {
    if (basicStatus === "ok") {
      finalOutputPath =
        vasStatus === "ok" || vasStatus === "skipped" ? "status_found" : "status_found_partial";
    } else if (basicStatus === "not_found") {
      finalOutputPath = "not_found";
    } else {
      finalOutputPath = "api_failed";
    }
  } else if (outputPath === "query_by_business_no") {
    if (vasStatus !== "ok") {
      finalOutputPath = "api_failed";
    } else if (candidateOrderNos.length !== 1) {
      finalOutputPath = "clarify_vas_order_no";
      validationMessage =
        candidateOrderNos.length === 0
          ? "该业务单号未定位到可用增值单，请补充增值单号。"
          : "该业务单号定位到多张增值单，请补充增值单号。";
    } else if (basicStatus === "ok") {
      finalOutputPath = "status_found";
    } else if (basicStatus === "not_found") {
      finalOutputPath = "not_found";
    } else {
      finalOutputPath = "api_failed";
    }
  }

  return {
    statusFacts: {
      outputPath: finalOutputPath,
      validationMessage,
      orderNo:
        effectiveBasicInfoFacts.orderNo ||
        candidateOrderNos[0] ||
        orderStatusInput.vasOrderNo ||
        "",
      businessNo: effectiveBasicInfoFacts.businessNo || orderStatusInput.businessNo || "",
      status: effectiveBasicInfoFacts.status || "",
      statusDesc: effectiveBasicInfoFacts.statusDesc || "",
      orderDate: effectiveBasicInfoFacts.orderDate || "",
      estimateCompleteTime: effectiveBasicInfoFacts.estimateCompleteTime || "",
      estimateCompleteTimeLocal: effectiveBasicInfoFacts.estimateCompleteTimeLocal || "",
      actualCompleteTime: effectiveBasicInfoFacts.actualCompleteTime || "",
      cancelReason: effectiveBasicInfoFacts.cancelReason || "",
      failReason: effectiveBasicInfoFacts.failReason || "",
      supportCancel: effectiveBasicInfoFacts.supportCancel || "",
      businessOrder: effectiveBasicInfoFacts.businessOrder ?? {},
      warehouse: effectiveBasicInfoFacts.warehouse ?? {},
      vasc: effectiveBasicInfoFacts.vasc ?? {},
      control: effectiveBasicInfoFacts.control ?? {},
      vascCode: effectiveBasicInfoFacts.vascCode || "",
      vascName: effectiveBasicInfoFacts.vascName || "",
      basicInfoRaw: effectiveBasicInfoFacts.raw ?? {},
      atomProgress: asArray(vasListFacts.atomProgress),
      candidateOrderNos,
      optionalFetchFailures: [
        ...basicFailures,
        ...resolvedFailures,
        ...vasFailures,
      ],
      missingEvidence:
        finalOutputPath === "status_found_partial"
          ? ["atomProgress"]
          : finalOutputPath === "clarify_vas_order_no"
            ? ["vasOrderNo"]
            : [],
      needsClarification: finalOutputPath === "clarify_vas_order_no" || finalOutputPath === "missing_vas_order_no",
      clarificationFields:
        finalOutputPath === "clarify_vas_order_no" || finalOutputPath === "missing_vas_order_no"
          ? ["vasOrderNo"]
          : [],
      apiBoundaryKb: asText(params.apiBoundaryKb),
    },
    orderStatusInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-status-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "merge-status-data failed");
      process.exit(1);
    });
}
