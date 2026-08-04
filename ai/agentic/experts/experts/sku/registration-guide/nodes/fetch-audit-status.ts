/**
 * 节点：fetch-audit-status — 解析 page.list 插件输出为审核事实。
 *
 * 保持 Coze 单文件闭环，不 import shared，避免导出后代码膨胀导致节点加载失败。
 */

const PAGE_LIST_ACTION = "winit.item.page.list";

function str(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function parseJsonField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed) as unknown;
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return value;
  }
}

function pluginPayloadHasError(value: unknown, depth = 0): boolean {
  if (depth > 4) return false;
  const payload = obj(parseJsonField(value));
  if (Object.keys(payload).length === 0) return false;
  if (str(payload.skuCode)) return false;
  if (payload.success === false) return true;
  const code = str(payload.code);
  if (code && code !== "0") return true;
  if (str(payload.error)) return true;
  const message = str(payload.msg ?? payload.message);
  if (message && /错误|异常|失败|不可用|error|fail|invalid|timeout/i.test(message)) return true;
  return ["output", "data"].some(
    (key) => payload[key] != null && pluginPayloadHasError(payload[key], depth + 1)
  );
}

function coerceList(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4) return [];
  const parsed = parseJsonField(value);
  if (Array.isArray(parsed)) return parsed.map(obj).filter((row) => Object.keys(row).length > 0);
  const payload = obj(parsed);
  if (str(payload.skuCode)) return [payload];
  if (Array.isArray(payload.list)) return payload.list.map(obj).filter((row) => Object.keys(row).length > 0);
  for (const key of ["output", "data", "result"]) {
    if (payload[key] == null) continue;
    const rows = coerceList(payload[key], depth + 1);
    if (rows.length > 0) return rows;
  }
  return [];
}

function statusNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = str(value);
  return /^\d+$/.test(text) ? Number(text) : null;
}

function publishStatus(value: unknown): string {
  switch (statusNumber(value)) {
    case 1:
    case 2:
      return "draft";
    case 3:
      return "auditing";
    case 4:
      return "published";
    case 5:
      return "returned";
    case 6:
      return "inactive";
    default: {
      const active = str(value).toUpperCase();
      if (active === "Y") return "published";
      if (active === "N") return "inactive";
      return "";
    }
  }
}

function attributeValue(
  attributes: unknown,
  name: string,
  country: string
): string {
  const rows = (Array.isArray(attributes) ? attributes : []).map(obj);
  const candidates = rows.filter(
    (row) => str(row.attributeName).toLowerCase() === name.toLowerCase()
  );
  const normalizedCountry = country.toUpperCase();
  const matched =
    candidates.find((row) => str(row.areaCode).toUpperCase() === normalizedCountry) ??
    candidates.find((row) => str(row.areaCode).toUpperCase() === "ALL") ??
    candidates.find((row) => !str(row.areaCode));
  return str(matched?.attributeValue);
}

function declarationForCountry(declarations: unknown, country: string): Record<string, unknown> {
  const rows = (Array.isArray(declarations) ? declarations : []).map(obj);
  const normalizedCountry = country.toUpperCase();
  return (
    rows.find((row) => str(row.countryCode).toUpperCase() === normalizedCountry) ??
    rows.find((row) => str(row.countryCode).toUpperCase() === "ALL") ??
    rows.find((row) => !str(row.countryCode)) ??
    {}
  );
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const normalized = str(value).toUpperCase();
  if (["Y", "TRUE", "1"].includes(normalized)) return true;
  if (["N", "FALSE", "0"].includes(normalized)) return false;
  return null;
}

function auditProfileFromApi(
  raw: Record<string, unknown>,
  skuCode: string,
  country: string
): Record<string, unknown> {
  const status = publishStatus(hasOwn(raw, "status") ? raw.status : raw.isActive);
  const declaration = declarationForCountry(raw.declarations, country);
  const itemStatus = statusNumber(raw.status);
  const returned =
    itemStatus === 5 ||
    (itemStatus === 4 && statusNumber(declaration.changeStatus) === 5);
  const estimateAuditDate = attributeValue(raw.attributes, "estimateAuditDate", country);
  const isUrgent = booleanValue(attributeValue(raw.attributes, "isUrgent", country));
  return {
    skuCode: str(raw.skuCode) || skuCode,
    publishStatus: status,
    estimateAuditDate,
    isUrgent,
    rejectReason: returned ? str(declaration.returnReason) : "",
    standardScript: returned ? str(declaration.standardScript) : "",
  };
}

function hasAuditFact(profile: Record<string, unknown>): boolean {
  return Boolean(
    str(profile.publishStatus) ||
      str(profile.estimateAuditDate) ||
      typeof profile.isUrgent === "boolean" ||
      str(profile.rejectReason) ||
      str(profile.standardScript)
  );
}

function scopeCompatible(
  row: Record<string, unknown>,
  customerCode: string,
  country: string
): boolean {
  const scope = obj(row.scope);
  const sourceCustomer = str(scope.customerCode).toUpperCase();
  if (!customerCode || sourceCustomer !== customerCode.toUpperCase()) return false;
  const sourceCountry = str(scope.importCountryCode).toUpperCase();
  return country
    ? sourceCountry === country.toUpperCase() || sourceCountry === "ALL"
    : !sourceCountry || sourceCountry === "ALL";
}

function hasScopeFailure(
  snapshot: Record<string, unknown>,
  row: Record<string, unknown>,
  skuCode: string
): boolean {
  const suffix = `:${skuCode.toUpperCase()}`;
  const facts = [
    ...(Array.isArray(snapshot.missingFacts) ? snapshot.missingFacts : []),
    ...(Array.isArray(row._missingFacts) ? row._missingFacts : []),
  ].map(str);
  return facts.some((fact) => {
    const normalized = fact.toUpperCase();
    return (
      normalized.endsWith(suffix) &&
      (normalized.startsWith("SCOPE_MISMATCH:") || normalized.startsWith("SCOPE_UNKNOWN:"))
    );
  });
}

function profileFromSnapshot(
  snapshot: Record<string, unknown>,
  skuCode: string,
  customerCode: string,
  country: string
): Record<string, unknown> | null {
  const row = (Array.isArray(snapshot.skus) ? snapshot.skus : [])
    .map(obj)
    .find((candidate) => str(candidate.skuCode).toUpperCase() === skuCode.toUpperCase());
  if (
    !row ||
    str(row.dataSource).toLowerCase() !== "api" ||
    hasScopeFailure(snapshot, row, skuCode) ||
    !scopeCompatible(row, customerCode, country) ||
    !hasAuditFact(row)
  ) {
    return null;
  }
  return row;
}

function truncate(value: unknown, maxLength: number): string {
  const text = str(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…（详见万邑联）`;
}

function auditHint(profile: Record<string, unknown>, skuCode: string): string {
  const parts = [`SKU ${str(profile.skuCode) || skuCode}`];
  const status = str(profile.publishStatus);
  if (status) parts.push(`发布态：${status}`);
  const estimate = str(profile.estimateAuditDate);
  parts.push(
    estimate
      ? `应维护完成时间：${estimate}`
      : "应维护完成时间：暂无（请在万邑联商品维护任务中核实）"
  );
  if (profile.isUrgent === true) parts.push("已加急：是");
  if (profile.isUrgent === false) parts.push("已加急：否");
  const rejectReason = str(profile.rejectReason);
  const standardScript = truncate(profile.standardScript, 500);
  if (rejectReason) parts.push(`退回原因：${rejectReason}`);
  if (standardScript) parts.push(`退回说明：${standardScript}`);
  return parts.join("；");
}

function fallbackHint(skuCode: string, country: string): string {
  return country
    ? `当前未取得实时审核事实。请在万邑联「商品维护任务」中查看 SKU ${skuCode}（进口国 ${country}）的应维护完成时间与状态。`
    : `当前未取得实时审核事实。请在万邑联「商品维护任务」中查看 SKU ${skuCode} 的应维护完成时间与状态。`;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skuCode = str(params.skuCode);
  const customerCode = str(params.customerCode);
  const country = str(params.importCountryCode).toUpperCase();

  if (!skuCode) {
    return {
      auditStatusHint: "",
      auditFactStatus: "",
      rejectReason: "",
      estimateAuditDate: "",
      skipAudit: true,
      dataSource: "skipped",
      fetchSource: "",
    };
  }

  if (params.reuseProfileSnapshot === true) {
    const profile = profileFromSnapshot(
      obj(params.profileSnapshot),
      skuCode,
      customerCode,
      country
    );
    return {
      auditStatusHint: profile ? auditHint(profile, skuCode) : "",
      auditFactStatus: profile ? "has_fact" : "not_found",
      rejectReason: profile ? str(profile.rejectReason) : "",
      estimateAuditDate: profile ? str(profile.estimateAuditDate) : "",
      skipAudit: false,
      dataSource: profile ? "profile_snapshot" : "profile_snapshot_rejected",
      fetchSource: "profile_snapshot",
    };
  }

  if (params.skipApi === true) {
    return {
      auditStatusHint: "",
      auditFactStatus: "",
      rejectReason: "",
      estimateAuditDate: "",
      skipAudit: true,
      dataSource: "skipped",
      fetchSource: "",
    };
  }

  const outputList = (Array.isArray(params.winitPluginOutputList)
    ? params.winitPluginOutputList
    : []) as Array<{ code?: unknown; data?: unknown; msg?: unknown }>;
  const rows: Record<string, unknown>[] = [];
  for (const item of outputList) {
    if (pluginPayloadHasError(item)) {
      return {
        auditStatusHint: "实时审核接口暂不可用，请稍后重试；如仍失败请联系人工客服核实。",
        auditFactStatus: "error",
        rejectReason: "",
        estimateAuditDate: "",
        skipAudit: false,
        dataSource: "api_error",
        fetchSource: PAGE_LIST_ACTION,
      };
    }
    // Coze plugin batch may return either a wrapper with `data` or the business row itself.
    rows.push(...coerceList(item));
  }

  const raw = rows.find((row) => str(row.skuCode).toUpperCase() === skuCode.toUpperCase());
  if (!raw) {
    return {
      auditStatusHint: fallbackHint(skuCode, country),
      auditFactStatus: "not_found",
      rejectReason: "",
      estimateAuditDate: "",
      skipAudit: false,
      dataSource: "fallback_self_serve",
      fetchSource: PAGE_LIST_ACTION,
    };
  }

  const profile = auditProfileFromApi(raw, skuCode, country);
  if (!hasAuditFact(profile)) {
    return {
      auditStatusHint: fallbackHint(skuCode, country),
      auditFactStatus: "not_found",
      rejectReason: "",
      estimateAuditDate: "",
      skipAudit: false,
      dataSource: "fallback_self_serve",
      fetchSource: PAGE_LIST_ACTION,
    };
  }

  const rejectReason = str(profile.rejectReason);
  const standardScript = truncate(profile.standardScript, 500);
  return {
    auditStatusHint: auditHint(profile, skuCode),
    auditFactStatus: "has_fact",
    rejectReason: rejectReason || (standardScript ? standardScript.slice(0, 200) : ""),
    estimateAuditDate: str(profile.estimateAuditDate),
    skipAudit: false,
    dataSource: "api",
    fetchSource: PAGE_LIST_ACTION,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-audit-status")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
