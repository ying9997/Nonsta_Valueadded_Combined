/**
 * 节点：fetch-sub-goods — 解析 getSubGoods 插件响应。
 * FaaS 单文件闭环，无外部 import。
 */

import { signFmsUrlDeep } from "../../../../shared/fms-token-url";

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
  if (raw === undefined) return { fetchStatus: "not_fetched", data: {}, errorMessage: "subGoodsApiResult_missing" };
  const result = asRecord(raw);
  if (result.__malformedJson) return { fetchStatus: "malformed", data: {}, errorMessage: "subGoodsApiResult_malformed_json" };
  if (hasOwn(result, "code")) {
    const code = String(result.code ?? "");
    if (code !== "0") {
      return {
        fetchStatus: "api_error",
        data: {},
        errorMessage: asText(result.msg) || asText(result.message) || `subGoods_api_error_${code}`,
      };
    }
    return { fetchStatus: "ok", data: asRecord(result.data ?? result.result), errorMessage: "" };
  }
  return { fetchStatus: "ok", data: asRecord(result.data || result.result || raw), errorMessage: "" };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const actionPlan = asRecord(params.subGoodsActionPlan);
  if (actionPlan.skip === true) {
    return {
      goodsFacts: {
        fetchStatus: "skipped",
        goodsSummary: null,
        optionalFetchFailures: [],
      },
    };
  }
  const raw = parseMaybeJson(params.subGoodsApiResult);
  const envelope = coerceEnvelope(raw);
  const data = envelope.data;
  const records = asList(data.list ?? data.records ?? data.rows ?? data);
  const failure = envelope.fetchStatus === "ok" ? "" : envelope.errorMessage;

  return {
    goodsFacts: {
      fetchStatus: envelope.fetchStatus,
      goodsSummary:
        envelope.fetchStatus === "ok"
          ? {
              recordCount: records.length,
              goods: records.slice(0, 20).map((item) => ({
                goodsId: item.goodsId ?? item.id ?? "",
                parentId: item.parentId ?? "",
                skuCode: asText(item.skuCode) || asText(item.merchandiseCode),
                skuName: asText(item.skuName) || asText(item.merchandiseName),
                barcode: asText(item.barcode) || asText(item.productBarcode),
                batchNo: asText(item.batchNo),
                quantity: item.quantity ?? item.qty ?? "",
                weight: item.weight ?? "",
                length: item.length ?? "",
                width: item.width ?? "",
                height: item.height ?? "",
                attachmentUrlList: signFmsUrlDeep(item.attachmentUrlList ?? []),
              })),
            }
          : null,
      optionalFetchFailures: failure ? [failure] : [],
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-sub-goods")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-sub-goods failed");
      process.exit(1);
    });
}
