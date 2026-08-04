/**
 * 节点：build-resolved-basic-info-request — businessNo 唯一定位后补查 basicInfo。
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

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const basicInfoFacts = asRecord(params.basicInfoFacts);
  const vasListFacts = asRecord(params.vasListFacts);
  const isBusinessNoLookup = asText(orderStatusInput.outputPath) === "query_by_business_no";
  const candidateOrderNos = asArray(vasListFacts.candidateOrderNos)
    .map(asText)
    .filter((item) => item.length > 0);
  const resolvedOrderNo = isBusinessNoLookup && candidateOrderNos.length === 1 ? candidateOrderNos[0] : "";
  const alreadyFetched = asText(basicInfoFacts.fetchStatus) === "ok";
  const skip = alreadyFetched || !resolvedOrderNo;
  const data = skip ? {} : { orderNo: resolvedOrderNo };

  return {
    resolvedBasicInfoRequestData: skip ? "" : JSON.stringify(data),
    resolvedBasicInfoActionPlan: {
      action: "wh.va.order.basicInfo",
      data,
      skip,
      reason: alreadyFetched
        ? "basicInfo_already_fetched"
        : resolvedOrderNo
          ? ""
          : isBusinessNoLookup
            ? "businessNo_not_unique"
            : "not_businessNo_lookup",
    },
    orderStatusInput,
    basicInfoFacts,
    vasListFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-resolved-basic-info-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-resolved-basic-info-request failed");
      process.exit(1);
    });
}
