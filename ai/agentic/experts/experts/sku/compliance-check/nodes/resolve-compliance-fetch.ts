/**
 * 节点：按 intent 决定是否拉 page.list facts_compliance
 */

const FETCH_INTENTS = new Set([
  "certificates",
  "weee",
  "unban_deep",
  "declaration",
  "restricted",
]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function hasProfileSnapshot(snap: Record<string, unknown>): boolean {
  return Array.isArray(snap.skus) && snap.skus.length > 0;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intentType = str(params.intentType).toLowerCase() || "general";
  const skuCode = str(params.skuCode);
  const importCountryCode = str(params.importCountryCode).toUpperCase();
  const profileSnapshot = asRecord(params.profileSnapshot);

  if (!skuCode) {
    return {
      shouldFetch: false,
      fetchProfile: "",
      skipApi: true,
      skuCode: "",
      importCountryCode,
      intentType,
      reuseProfileSnapshot: false,
    };
  }

  if (hasProfileSnapshot(profileSnapshot) && FETCH_INTENTS.has(intentType)) {
    return {
      shouldFetch: false,
      fetchProfile: "facts_compliance",
      skipApi: true,
      skuCode,
      importCountryCode,
      intentType,
      reuseProfileSnapshot: true,
    };
  }

  if (FETCH_INTENTS.has(intentType)) {
    return {
      shouldFetch: true,
      fetchProfile: "facts_compliance",
      skipApi: false,
      skuCode,
      importCountryCode,
      intentType,
      reuseProfileSnapshot: false,
    };
  }

  // carriability_deep / ecommerce / brand / general — 默认不拉（链接向）
  return {
    shouldFetch: false,
    fetchProfile: "",
    skipApi: true,
    skuCode,
    importCountryCode,
    intentType,
    reuseProfileSnapshot: hasProfileSnapshot(profileSnapshot),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-compliance-fetch")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
