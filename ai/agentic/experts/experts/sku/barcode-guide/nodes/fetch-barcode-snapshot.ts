/**
 * 节点：page.list → barcodeSnapshot（短摘要，供 LLM）
 */
const PAGE_LIST_ACTION = "winit.item.page.list";

type BarcodeFetchProfile = "barcode_third" | "supplement_third_sku";

const SUPPLEMENT_PREVIEW = 10;
const SUPPLEMENT_HARD_MAX = 100;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function normalizeFetchProfile(v: unknown): BarcodeFetchProfile {
  return str(v) === "supplement_third_sku" ? "supplement_third_sku" : "barcode_third";
}

function numberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coercePageList(parsed: unknown): {
  list: Record<string, unknown>[];
  totalCount: number | null;
} {
  if (parsed == null) return { list: [], totalCount: null };
  if (Array.isArray(parsed)) {
    return {
      list: parsed.filter((item) => item && typeof item === "object") as Record<string, unknown>[],
      totalCount: parsed.length,
    };
  }
  if (typeof parsed !== "object") return { list: [], totalCount: null };
  const record = parsed as Record<string, unknown>;
  if (record.output != null) return coercePageList(record.output);
  if (record.code === "0" || record.code === 0) return coercePageList(record.data);
  if (Array.isArray(record.list)) {
    return {
      list: record.list.filter((item) => item && typeof item === "object") as Record<string, unknown>[],
      totalCount: numberOrNull(record.totalCount) ?? record.list.length,
    };
  }
  if (record.skuCode != null || record.code != null) return { list: [record], totalCount: 1 };
  return { list: [], totalCount: null };
}

function attributeValue(attrs: unknown, name: string): string {
  if (!Array.isArray(attrs)) return "";
  const rows = attrs
    .map(asRecord)
    .filter((row) => str(row.attributeName).toLowerCase() === name.toLowerCase());
  const selected =
    rows.find((row) => str(row.areaCode).toUpperCase() === "ALL") ??
    rows.find((row) => !str(row.areaCode));
  return selected ? str(selected.attributeValue) : "";
}

function booleanValue(v: unknown): boolean | null {
  const value = str(v).toUpperCase();
  if (value === "Y" || value === "TRUE" || value === "1") return true;
  if (value === "N" || value === "FALSE" || value === "0") return false;
  return null;
}

function mapBarcodeItem(raw: Record<string, unknown>, requestedSkuCode: string) {
  const supervisorMode = attributeValue(raw.attributes, "supervisorMode") || str(raw.supervisorMode) || null;
  const skuCodeThirds = Array.isArray(raw.skuCodeThirds)
    ? raw.skuCodeThirds.map(str).filter(Boolean)
    : [];
  return {
    skuCode: str(raw.skuCode) || requestedSkuCode,
    supervisorMode,
    skuCodeThirds,
    isSupportThirdSku: booleanValue(attributeValue(raw.attributes, "isSupportThirdSku")),
  };
}

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

function pluginError(parsed: unknown): string {
  const record = asRecord(parsed);
  if (Object.keys(record).length === 0) return "";
  if (str(record.skuCode)) return "";
  const explicit = str(record.$error ?? record.error);
  if (explicit) return explicit;
  if (record.output != null) return pluginError(parseCozeWorkflowDataField(record.output));
  const code = record.code;
  if (code != null && str(code) !== "0") {
    return str(record.msg ?? record.message) || `plugin_code_${str(code)}`;
  }
  if (record.data != null) return pluginError(parseCozeWorkflowDataField(record.data));
  return "";
}

function isRecognizedPageResponse(parsed: unknown): boolean {
  if (Array.isArray(parsed)) return true;
  const record = asRecord(parsed);
  if (Object.keys(record).length === 0) return false;
  if (record.output != null) {
    return isRecognizedPageResponse(parseCozeWorkflowDataField(record.output));
  }
  if (record.code === 0 || record.code === "0") return true;
  return Array.isArray(record.list) || str(record.skuCode) !== "";
}

function formatSnapshotText(snap: Record<string, unknown>): string {
  const parts: string[] = [];
  const sku = str(snap.skuCode);
  if (sku) parts.push(`SKU ${sku}`);
  const mode = str(snap.supervisorMode);
  if (mode) parts.push(`管理模式：${mode}`);
  const thirds = Array.isArray(snap.skuCodeThirds) ? snap.skuCodeThirds.map(String) : [];
  if (thirds.length > 0) parts.push(`已绑三方码：${thirds.join(", ")}`);
  else if (sku) parts.push("已绑三方码：无");
  if (snap.isSupportThirdSku === true) parts.push("支持三方码：是");
  if (snap.isSupportThirdSku === false) parts.push("支持三方码：否");
  const supplement = Array.isArray(snap.supplementSkuCodes)
    ? snap.supplementSkuCodes.map(String)
    : [];
  if (supplement.length > 0 || snap.supplementTotal != null) {
    const total = Number(snap.supplementTotal ?? supplement.length);
    const preview = supplement.slice(0, SUPPLEMENT_PREVIEW).join(", ");
    parts.push(
      `缺三方码待办共 ${total} 个${snap.truncated ? "（已截断）" : ""}；示例：${preview || "无"}`
    );
  }
  return parts.join("；");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skuCode = str(params.skuCode);
  const fetchProfile = normalizeFetchProfile(params.fetchProfile || "barcode_third");
  const skipApi = params.skipApi === true;

  if (skipApi) {
    return {
      barcodeSnapshot: {},
      barcodeSnapshotText: "",
      skipFetch: true,
    };
  }

  const outputList = (Array.isArray(params.winitPluginOutputList)
    ? params.winitPluginOutputList
    : []) as Array<{ data?: unknown; $error?: unknown; error?: unknown }>;

  let list: Record<string, unknown>[] = [];
  let totalCount: number | null = null;
  const fetchErrors: string[] = [];
  for (const item of outputList) {
    const outerError = pluginError(item);
    if (outerError) {
      fetchErrors.push(outerError);
      continue;
    }
    const parsed = parseCozeWorkflowDataField(item?.data ?? item);
    const error = pluginError(parsed);
    if (error) {
      fetchErrors.push(error);
      continue;
    }
    if (!isRecognizedPageResponse(parsed)) {
      fetchErrors.push("invalid_plugin_output");
      continue;
    }
    const coerced = coercePageList(parsed);
    list.push(...coerced.list);
    if (coerced.totalCount != null) totalCount = coerced.totalCount;
  }

  if (outputList.length === 0) fetchErrors.push("plugin_output_missing");
  if (fetchErrors.length > 0) {
    const fetchError = [...new Set(fetchErrors)].join(";");
    const snap = { skuCode, fetchError, fetchSource: PAGE_LIST_ACTION };
    return {
      barcodeSnapshot: snap,
      barcodeSnapshotText: skuCode
        ? `SKU ${skuCode}：商品档案查询失败，本次无法确认第三方码绑定状态。`
        : "商品档案查询失败，本次无法确认第三方码绑定状态。",
      skipFetch: false,
    };
  }

  if (fetchProfile === "supplement_third_sku") {
    const codes = list
      .map((r) => str(r.skuCode))
      .filter(Boolean)
      .slice(0, SUPPLEMENT_HARD_MAX);
    const total = totalCount ?? codes.length;
    const truncated = total > SUPPLEMENT_HARD_MAX || codes.length >= SUPPLEMENT_HARD_MAX;
    const snap = {
      supplementSkuCodes: codes.slice(0, SUPPLEMENT_PREVIEW),
      supplementTotal: total,
      truncated,
      fetchSource: PAGE_LIST_ACTION,
    };
    return {
      barcodeSnapshot: snap,
      barcodeSnapshotText: formatSnapshotText(snap),
      skipFetch: false,
    };
  }

  const key = skuCode.toUpperCase();
  const raw =
    list.find((r) => str(r.skuCode).toUpperCase() === key) ??
    (list.length === 1 && !str(list[0].skuCode) ? list[0] : null);

  if (!raw) {
    const snap = {
      skuCode,
      skuCodeThirds: [] as string[],
      supervisorMode: null as string | null,
      missing: true,
      fetchSource: PAGE_LIST_ACTION,
    };
    return {
      barcodeSnapshot: snap,
      barcodeSnapshotText: skuCode
        ? `SKU ${skuCode}：未查到商品档案，请核实编码后在万邑联查看三方码。`
        : "",
      skipFetch: false,
    };
  }

  const mapped = mapBarcodeItem(raw, skuCode);

  const snap = {
    skuCode: str(mapped.skuCode) || skuCode,
    supervisorMode: mapped.supervisorMode ?? null,
    skuCodeThirds: Array.isArray(mapped.skuCodeThirds) ? mapped.skuCodeThirds : [],
    isSupportThirdSku: mapped.isSupportThirdSku ?? null,
    fetchSource: PAGE_LIST_ACTION,
  };

  return {
    barcodeSnapshot: snap,
    barcodeSnapshotText: formatSnapshotText(snap),
    skipFetch: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-barcode-snapshot")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
