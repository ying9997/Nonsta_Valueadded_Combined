/**
 * 节点：fetch-prepayment-list — 解析 getPrepaymentList 插件响应。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMaybeJson(value: unknown): unknown {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { __malformedJson: true };
  }
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function asList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const obj = asRecord(value);
  if (Array.isArray(obj.list)) return obj.list.map(asRecord);
  if (Array.isArray(obj.records)) return obj.records.map(asRecord);
  if (Array.isArray(obj.rows)) return obj.rows.map(asRecord);
  return [];
}

function coerceEnvelope(raw: unknown): {
  fetchStatus: "ok" | "api_error" | "malformed" | "not_fetched";
  data: Record<string, unknown>;
  errorMessage: string;
} {
  if (raw === undefined) return { fetchStatus: "not_fetched", data: {}, errorMessage: "prepaymentApiResult_missing" };
  const result = asRecord(raw);
  if (result.__malformedJson) return { fetchStatus: "malformed", data: {}, errorMessage: "prepaymentApiResult_malformed_json" };
  if (hasOwn(result, "code")) {
    const code = String(result.code ?? "");
    if (code !== "0") {
      return {
        fetchStatus: "api_error",
        data: {},
        errorMessage: asText(result.msg) || asText(result.message) || `prepayment_api_error_${code}`,
      };
    }
    return { fetchStatus: "ok", data: asRecord(result.data ?? result.result), errorMessage: "" };
  }
  return { fetchStatus: "ok", data: asRecord(result.data || result.result || raw), errorMessage: "" };
}

function pickAmount(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const actionPlan = asRecord(params.prepaymentActionPlan);
  if (actionPlan.skip === true) {
    return {
      prepaymentFacts: {
        fetchStatus: "skipped",
        prepaymentSummary: null,
        optionalFetchFailures: [],
      },
    };
  }
  const raw = parseMaybeJson(params.prepaymentApiResult);
  const envelope = coerceEnvelope(raw);
  const data = envelope.data;
  const records = asList(data.list ?? data.records ?? data.rows ?? data);
  const failure = envelope.fetchStatus === "ok" ? "" : envelope.errorMessage;

  return {
    prepaymentFacts: {
      fetchStatus: envelope.fetchStatus,
      prepaymentSummary:
        envelope.fetchStatus === "ok"
          ? {
              recordCount: records.length,
              estimatedReceivableAmount: pickAmount(data, [
                "estimatedReceivableAmount",
                "prepaymentAmount",
                "totalReceivableAmount",
              ]),
              estimatedCostAmount: pickAmount(data, ["estimatedCostAmount", "prepaymentCost", "totalCostAmount"]),
              records: records.slice(0, 20).map((item) => ({
                atomCode: asText(item.atomCode) || asText(item.vaAtomCode),
                atomName: asText(item.atomName) || asText(item.vaAtomName),
                receivableAmount: pickAmount(item, ["receivableAmount", "estimatedReceivableAmount", "amount"]),
                costAmount: pickAmount(item, ["costAmount", "estimatedCostAmount"]),
                currency: asText(item.currency) || asText(item.currencyCode),
              })),
            }
          : null,
      optionalFetchFailures: failure ? [failure] : [],
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-prepayment-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-prepayment-list failed");
      process.exit(1);
    });
}
