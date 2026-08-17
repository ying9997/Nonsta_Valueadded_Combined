/**
 * 节点：fetch-payment-list — 解析 getPaymentList 插件响应。
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
  if (raw === undefined) return { fetchStatus: "not_fetched", data: {}, errorMessage: "paymentApiResult_missing" };
  const result = asRecord(raw);
  if (result.__malformedJson) return { fetchStatus: "malformed", data: {}, errorMessage: "paymentApiResult_malformed_json" };
  if (hasOwn(result, "code")) {
    const code = String(result.code ?? "");
    if (code !== "0") {
      return {
        fetchStatus: "api_error",
        data: {},
        errorMessage: asText(result.msg) || asText(result.message) || `payment_api_error_${code}`,
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

function pickAmountWithType(obj: Record<string, unknown>): { amount: unknown; amountType: string } {
  const actualAmount = pickAmount(obj, ["amount", "actualAmount"]);
  if (actualAmount !== "") return { amount: actualAmount, amountType: "actual_amount" };
  const standardAmount = pickAmount(obj, ["standardAmount"]);
  if (standardAmount !== "") return { amount: standardAmount, amountType: "standard_amount" };
  return { amount: "", amountType: "unknown" };
}

function summarizeEvidenceType(totalActualAmount: unknown, totalStandardAmount: unknown, atomAmountTypes: string[]): string {
  if (totalActualAmount !== "") return "actual_amount";
  if (totalStandardAmount !== "") return "standard_amount";
  const concreteTypes = [...new Set(atomAmountTypes.filter((item) => item !== "unknown"))];
  if (concreteTypes.length === 1) return concreteTypes[0]!;
  if (concreteTypes.length > 1) return "mixed";
  return "unknown";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const actionPlan = asRecord(params.paymentActionPlan);
  if (actionPlan.skip === true) {
    return {
      paymentFacts: {
        fetchStatus: "skipped",
        paymentSummary: null,
        optionalFetchFailures: [],
      },
    };
  }
  const raw = parseMaybeJson(params.paymentApiResult);
  const envelope = coerceEnvelope(raw);
  const data = envelope.data;
  const atomFeeList = asList(data.atomFeeList);
  const failure = envelope.fetchStatus === "ok" ? "" : envelope.errorMessage;
  const normalizedAtomFeeList = atomFeeList.slice(0, 20).map((item) => {
    const picked = pickAmountWithType(item);
    return {
      atomCode: asText(item.atomCode) || asText(item.vaAtomCode) || asText(item.serviceCode),
      atomName: asText(item.atomName) || asText(item.vaAtomName) || asText(item.serviceName),
      amount: picked.amount,
      amountType: picked.amountType,
      currency: asText(item.currency) || asText(item.currencyCode),
    };
  });
  const totalStandardAmount = pickAmount(data, ["totalStandardAmount", "standardAmount", "totalAmount"]);
  const totalActualAmount = pickAmount(data, ["totalActualAmount", "actualAmount", "amount"]);

  return {
    paymentFacts: {
      fetchStatus: envelope.fetchStatus,
      paymentSummary:
        envelope.fetchStatus === "ok"
          ? {
              totalStandardAmount,
              totalActualAmount,
              amountEvidenceType: summarizeEvidenceType(
                totalActualAmount,
                totalStandardAmount,
                normalizedAtomFeeList.map((item) => item.amountType)
              ),
              atomFeeCount: atomFeeList.length,
              atomFeeList: normalizedAtomFeeList,
            }
          : null,
      optionalFetchFailures: failure ? [failure] : [],
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-payment-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-payment-list failed");
      process.exit(1);
    });
}
