/**
 * 节点：按 intent 决定是否拉 page.list（barcode_third / supplement_third_sku）
 */

const BARCODE_INTENTS = new Set([
  "print",
  "third_party_add",
  "third_party_query",
  "scan_fail",
]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function wantsSupplementList(intentType: string, topic: string, customerIntent: string): boolean {
  if (intentType === "third_party_add" && /缺第三方|待办.*三方|补.*三方|缺码清单/.test(`${topic} ${customerIntent}`)) {
    return true;
  }
  return /缺第三方商品条码|缺三方码清单|待办缺第三方/.test(`${topic} ${customerIntent}`);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intentType = str(params.intentType).toLowerCase() || "general";
  const skuCode = str(params.skuCode);
  const skuCodeThird = str(params.skuCodeThird);
  const topic = str(params.normalizedTopic) || str(params.topic);
  const customerIntent = str(params.customerIntent);

  if (wantsSupplementList(intentType, topic, customerIntent) && !skuCode) {
    return {
      shouldFetch: true,
      fetchProfile: "supplement_third_sku",
      skipApi: false,
      skuCode: "",
      skuCodeThird,
      intentType,
    };
  }

  if (BARCODE_INTENTS.has(intentType) && skuCode) {
    return {
      shouldFetch: true,
      fetchProfile: "barcode_third",
      skipApi: false,
      skuCode,
      skuCodeThird,
      intentType,
    };
  }

  // delete / general / no sku — 不拉 API
  return {
    shouldFetch: false,
    fetchProfile: "",
    skipApi: true,
    skuCode,
    skuCodeThird,
    intentType,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-barcode-fetch")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
