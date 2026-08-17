/**
 * 节点：page.list / profile 快照 → complianceSnapshotText
 */
import {
  PAGE_LIST_ACTION,
  coercePageList,
  mapItemToProfile,
} from "../../../../shared/sku-item-page-list";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
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

function formatFromMapped(mapped: Record<string, unknown>, skuCode: string): string {
  const parts: string[] = [];
  const code = str(mapped.skuCode) || skuCode;
  if (code) parts.push(`SKU ${code}`);
  const ps = str(mapped.publishStatus);
  if (ps) parts.push(`发布态：${ps}`);
  if (mapped.prohibitInbound === true) parts.push("禁止入库：是");
  const flags = asRecord(mapped.specialFlags);
  const attrs: string[] = [];
  if (flags.isBattery) attrs.push("带电");
  if (flags.isWithLiquid) attrs.push("液体");
  if (flags.isDangerous) attrs.push("危险品(dg)");
  if (attrs.length) parts.push(`特殊属性：${attrs.join("/")}`);
  if (mapped.dg === true) parts.push("目的国危险品标记：是");
  const hs = str(mapped.hsCode);
  if (hs) parts.push(`HS：${hs}`);
  const declareName = str(mapped.declareName);
  if (declareName) parts.push(`申报名：${declareName}`);
  const src = str(mapped.prohibitSource);
  if (src) parts.push(`禁限来源：${src}`);
  return parts.join("；");
}

function fromProfileSnapshot(
  snapshot: Record<string, unknown>,
  skuCode: string
): { complianceSnapshot: Record<string, unknown>; complianceSnapshotText: string } {
  const skus = Array.isArray(snapshot.skus) ? snapshot.skus : [];
  const hit =
    (skus.find((s) => str(asRecord(s).skuCode).toUpperCase() === skuCode.toUpperCase()) as
      | Record<string, unknown>
      | undefined) ?? (skus[0] as Record<string, unknown> | undefined);
  if (!hit) {
    return { complianceSnapshot: {}, complianceSnapshotText: "" };
  }
  const text = formatFromMapped(hit, skuCode);
  return { complianceSnapshot: hit, complianceSnapshotText: text };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skuCode = str(params.skuCode);
  const importCountryCode = str(params.importCountryCode);
  const skipApi = params.skipApi === true;
  const reuseProfileSnapshot = params.reuseProfileSnapshot === true;
  const profileSnapshot = asRecord(params.profileSnapshot);

  if (reuseProfileSnapshot && skuCode) {
    const fromSnap = fromProfileSnapshot(profileSnapshot, skuCode);
    return { ...fromSnap, skipFetch: true, dataSource: "profile_snapshot" };
  }

  if (skipApi || !skuCode) {
    return {
      complianceSnapshot: {},
      complianceSnapshotText: "",
      skipFetch: true,
    };
  }

  const outputList = (Array.isArray(params.winitPluginOutputList)
    ? params.winitPluginOutputList
    : []) as Array<{ data?: unknown }>;

  let list: Record<string, unknown>[] = [];
  for (const item of outputList) {
    const { list: rows } = coercePageList(parseCozeWorkflowDataField(item?.data));
    list.push(...rows);
  }

  const key = skuCode.toUpperCase();
  const raw =
    list.find((r) => str(r.skuCode).toUpperCase() === key) ?? (list.length === 1 ? list[0] : null);

  if (!raw) {
    return {
      complianceSnapshot: { skuCode, missing: true },
      complianceSnapshotText: `SKU ${skuCode}：未查到合规相关档案字段，请核实编码或转人工。`,
      skipFetch: false,
      dataSource: "api_miss",
      fetchSource: PAGE_LIST_ACTION,
    };
  }

  const mapped = mapItemToProfile(raw, {
    fetchProfile: "facts_compliance",
    importCountryCode: importCountryCode || undefined,
    requestedSkuCode: skuCode,
  });

  return {
    complianceSnapshot: mapped,
    complianceSnapshotText: formatFromMapped(mapped, skuCode),
    skipFetch: false,
    dataSource: "api",
    fetchSource: PAGE_LIST_ACTION,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-compliance-snapshot")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
