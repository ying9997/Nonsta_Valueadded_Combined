/**
 * 节点：fetch-resolved-basic-info — 解析 businessNo 唯一定位后的 basicInfo 响应。
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

function coerceWinitEnvelope(raw: unknown): {
  fetchStatus: "ok" | "not_found" | "api_error" | "malformed" | "not_fetched" | "skipped";
  data: Record<string, unknown>;
  errorMessage: string;
} {
  if (raw === undefined) {
    return { fetchStatus: "not_fetched", data: {}, errorMessage: "resolvedBasicInfoApiResult_missing" };
  }
  const result = asRecord(raw);
  if (result.__malformedJson) {
    return { fetchStatus: "malformed", data: {}, errorMessage: "resolvedBasicInfoApiResult_malformed_json" };
  }

  if (hasOwn(result, "code")) {
    const code = String(result.code ?? "");
    if (code !== "0") {
      return {
        fetchStatus: "api_error",
        data: {},
        errorMessage: asText(result.msg) || asText(result.message) || `resolvedBasicInfo_api_error_${code}`,
      };
    }
    const data = asRecord(result.data ?? result.result);
    if (Object.keys(data).length === 0) {
      return { fetchStatus: "not_found", data: {}, errorMessage: "resolvedBasicInfo_not_found" };
    }
    return { fetchStatus: "ok", data, errorMessage: "" };
  }

  const data = asRecord(result.data || result.result || raw);
  if (Object.keys(data).length === 0) {
    return { fetchStatus: "malformed", data: {}, errorMessage: "resolvedBasicInfoApiResult_malformed" };
  }
  return { fetchStatus: "ok", data, errorMessage: "" };
}

function whitelistBasicInfo(data: Record<string, unknown>): Record<string, unknown> {
  const businessOrder = asRecord(data.businessOrder);
  const warehouse = asRecord(data.warehouse);
  const vasc = asRecord(data.vasc);
  const control = asRecord(data.control);
  const raw = {
    orderNo: asText(data.orderNo),
    businessNo: asText(data.businessNo) || asText(businessOrder.businessNo),
    status: asText(data.status),
    statusDesc: asText(data.statusDesc) || asText(data.statusName),
    orderDate: asText(data.orderDate) || asText(data.createTime),
    estimateCompleteTime: asText(data.estimateCompleteTime),
    estimateCompleteTimeLocal: asText(data.estimateCompleteTimeStr),
    actualCompleteTime:
      asText(data.actualCompleteTime) || asText(data.completeTime) || asText(data.finishTime),
    cancelReason: asText(data.cancelReason),
    failReason: asText(data.failReason),
    supportCancel: asText(data.supportCancel),
    businessOrder: {
      businessNo: asText(businessOrder.businessNo),
      businessNode: asText(businessOrder.businessNode),
      businessType: asText(businessOrder.businessType),
    },
    warehouse: {
      warehouseCode: asText(warehouse.warehouseCode),
      warehouseName: asText(warehouse.warehouseName),
      countryCode: asText(warehouse.countryCode),
      countryName: asText(warehouse.countryName),
    },
    vasc: {
      productCode: asText(vasc.productCode) || asText(data.vascCode),
      productName: asText(vasc.productName) || asText(data.vascName),
      sla: vasc.sla ?? "",
      slaUnit: asText(vasc.slaUnit),
      slaUnitCode: asText(vasc.slaUnitCode),
      isAudit: asText(vasc.isAudit),
      isNeedConfirm: asText(vasc.isNeedConfirm),
      vasType: asText(vasc.vasType),
      vasTypeName: asText(vasc.vasTypeName),
    },
    control: {
      vasObjectType: asText(control.vasObjectType),
    },
    orderEntry: asText(data.orderEntry),
    vaOrderGoodsListUrl: asText(data.vaOrderGoodsListUrl),
    unusualFiles: Array.isArray(data.unusualFiles) ? data.unusualFiles : [],
  };
  return signFmsUrlDeep(raw) as Record<string, unknown>;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const basicInfoFacts = asRecord(params.basicInfoFacts);
  const vasListFacts = asRecord(params.vasListFacts);
  const raw = parseMaybeJson(params.resolvedBasicInfoApiResult);
  const alreadyFetched = asText(basicInfoFacts.fetchStatus) === "ok";
  const envelope = coerceWinitEnvelope(raw);
  const fetchStatus = alreadyFetched || raw === undefined ? "skipped" : envelope.fetchStatus;
  const data = envelope.data;
  const rawWhitelisted = fetchStatus === "ok" ? whitelistBasicInfo(data) : {};
  const businessOrder = asRecord(rawWhitelisted.businessOrder);
  const warehouse = asRecord(rawWhitelisted.warehouse);
  const vasc = asRecord(rawWhitelisted.vasc);
  const control = asRecord(rawWhitelisted.control);
  const failure = fetchStatus === "ok" || fetchStatus === "skipped" ? "" : envelope.errorMessage;

  return {
    resolvedBasicInfoFacts: {
      fetchStatus,
      raw: rawWhitelisted,
      orderNo: asText(data.orderNo),
      businessNo:
        asText(rawWhitelisted.businessNo) || asText(orderStatusInput.businessNo),
      status: asText(data.status),
      statusDesc: asText(data.statusDesc) || asText(data.statusName),
      orderDate: asText(rawWhitelisted.orderDate),
      estimateCompleteTime: asText(rawWhitelisted.estimateCompleteTime),
      estimateCompleteTimeLocal: asText(rawWhitelisted.estimateCompleteTimeLocal),
      actualCompleteTime: asText(rawWhitelisted.actualCompleteTime),
      cancelReason: asText(rawWhitelisted.cancelReason),
      failReason: asText(rawWhitelisted.failReason),
      supportCancel: asText(rawWhitelisted.supportCancel),
      businessOrder,
      warehouse,
      vasc,
      control,
      vascCode: asText(vasc.productCode),
      vascName: asText(vasc.productName),
      errorMessage: failure,
      optionalFetchFailures: failure ? [failure] : [],
    },
    orderStatusInput,
    basicInfoFacts,
    vasListFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-resolved-basic-info")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-resolved-basic-info failed");
      process.exit(1);
    });
}
