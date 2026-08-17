/**
 * 节点：fetch-vas-list — 解析 getVasList 插件响应。
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
  if (Array.isArray(value)) return value;
  const obj = asRecord(value);
  if (Array.isArray(obj.list)) return obj.list;
  if (Array.isArray(obj.records)) return obj.records;
  if (Array.isArray(obj.rows)) return obj.rows;
  if (Array.isArray(obj.pageData)) return obj.pageData;
  return [];
}

function hasListContainer(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  const obj = asRecord(value);
  return Array.isArray(obj.list) || Array.isArray(obj.records) || Array.isArray(obj.rows) || Array.isArray(obj.pageData);
}

function coerceWinitListEnvelope(raw: unknown): {
  fetchStatus: "ok" | "api_error" | "malformed" | "not_fetched" | "skipped";
  list: Record<string, unknown>[];
  errorMessage: string;
} {
  if (raw === undefined) {
    return { fetchStatus: "not_fetched", list: [], errorMessage: "vasListApiResult_missing" };
  }
  const result = asRecord(raw);
  if (result.__malformedJson) {
    return { fetchStatus: "malformed", list: [], errorMessage: "vasListApiResult_malformed_json" };
  }

  if (hasOwn(result, "code")) {
    const code = String(result.code ?? "");
    if (code !== "0") {
      return {
        fetchStatus: "api_error",
        list: [],
        errorMessage: asText(result.msg) || asText(result.message) || `vasList_api_error_${code}`,
      };
    }
    const data = result.data ?? result.result ?? [];
    if (!hasListContainer(data)) {
      return { fetchStatus: "malformed", list: [], errorMessage: "vasListApiResult_missing_list" };
    }
    return { fetchStatus: "ok", list: asList(data), errorMessage: "" };
  }

  const data = result.data ?? result.result ?? raw;
  if (!hasListContainer(data)) {
    return { fetchStatus: "malformed", list: [], errorMessage: "vasListApiResult_missing_list" };
  }
  return { fetchStatus: "ok", list: asList(data), errorMessage: "" };
}

function sanitizeAttr(attr: unknown): Record<string, unknown> {
  const obj = asRecord(attr);
  return {
    name:
      asText(obj.attributeName) ||
      asText(obj.name) ||
      asText(obj.attrName) ||
      asText(obj.attributeKey),
    value:
      asText(obj.attributeValue) ||
      asText(obj.value) ||
      asText(obj.attrValue) ||
      asText(obj.attributeValueOriginal),
    key: asText(obj.attributeKeyOriginal) || asText(obj.attributeKey),
  };
}

function sanitizeFile(file: unknown): Record<string, unknown> {
  const obj = asRecord(file);
  return signFmsUrlDeep({
    name: asText(obj.name) || asText(obj.fileName),
    type: asText(obj.type) || asText(obj.fileType),
    url: asText(obj.url) || asText(obj.fileUrl),
  }) as Record<string, unknown>;
}

function sanitizeAtom(atom: Record<string, unknown>): Record<string, unknown> {
  const serviceCode =
    asText(atom.serviceCode) || asText(atom.atomCode) || asText(atom.vaAtomCode);
  const serviceName =
    asText(atom.serviceName) || asText(atom.atomName) || asText(atom.vaAtomName);
  const orderCount = atom.orderCount ?? atom.planQty ?? atom.quantity ?? "";
  const handleCount =
    atom.handleCount ?? atom.completeQty ?? atom.completedQty ?? atom.finishQty ?? "";
  const returnReason = asText(atom.returnReason) || asText(atom.rejectReason);
  const partCompleteReason =
    asText(atom.partCompleteReason) || asText(atom.partialReason);
  return {
    orderNo: asText(atom.orderNo),
    businessNo: asText(atom.businessNo),
    serviceCode,
    serviceName,
    atomCode: serviceCode,
    atomName: serviceName,
    status: asText(atom.status),
    statusDesc: asText(atom.statusDesc) || asText(atom.statusName),
    completeTime: asText(atom.completeTime) || asText(atom.finishTime),
    orderCount,
    handleCount,
    planQty: orderCount,
    completeQty: handleCount,
    returnReason,
    partCompleteReason,
    rejectReason: returnReason,
    partialReason: partCompleteReason,
    serviceObject: asText(atom.serviceObject),
    serviceSequence: asText(atom.serviceSequence),
    vaAtomAttrs: Array.isArray(atom.vaAtomAttrs) ? atom.vaAtomAttrs.map(sanitizeAttr) : [],
    vaAtomFiles: Array.isArray(atom.vaAtomFiles) ? atom.vaAtomFiles.map(sanitizeFile) : [],
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const basicInfoFacts = asRecord(params.basicInfoFacts);
  const vasListActionPlan = asRecord(params.vasListActionPlan);
  const raw = parseMaybeJson(params.vasListApiResult);
  const skipped = vasListActionPlan.skip === true || (orderStatusInput.includeAtoms === false && raw === undefined);
  const envelope = coerceWinitListEnvelope(raw);
  const fetchStatus = skipped ? "skipped" : envelope.fetchStatus;
  const list = envelope.list.map(sanitizeAtom);
  const failure = fetchStatus === "ok" || fetchStatus === "skipped" ? "" : envelope.errorMessage;
  const candidateOrderNos = Array.from(
    new Set(list.map((item) => asText(item.orderNo)).filter((item) => item.length > 0))
  );

  return {
    vasListFacts: {
      fetchStatus,
      atomProgress: list,
      candidateOrderNos,
      candidateCount: candidateOrderNos.length,
      errorMessage: failure,
      optionalFetchFailures: failure ? [failure] : [],
    },
    orderStatusInput,
    basicInfoFacts,
    vasListActionPlan,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-vas-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-vas-list failed");
      process.exit(1);
    });
}
