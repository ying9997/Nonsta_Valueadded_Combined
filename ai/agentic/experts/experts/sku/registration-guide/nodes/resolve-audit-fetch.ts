/**
 * 节点：按 intent 决定是否拉 page.list 及 fetchProfile
 */

import { buildSafeRegistrationProfileSnapshot } from "../../../../shared/sku-registration-profile-reuse";

const AUDIT_INTENTS = new Set(["expedite", "audit_status", "resubmit"]);
const FACTS_INTENTS = new Set(["blocked_inbound", "unban", "direct_shipment", "attribute_change"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intentType = str(params.intentType).toLowerCase() || "general";
  const skuCode = str(params.skuCode);
  const customerCode = str(params.customerCode);
  const importCountryCode = str(params.importCountryCode).toUpperCase();
  const skipAudit = params.skipAudit === true || !skuCode;
  const profileSnapshot = buildSafeRegistrationProfileSnapshot(
    params.profileSnapshot,
    skuCode,
    customerCode,
    importCountryCode,
    intentType
  );

  if (skipAudit || !skuCode) {
    return {
      shouldFetch: false,
      fetchProfile: "",
      skipApi: true,
      skuCode,
      customerCode,
      importCountryCode,
      intentType,
      reuseProfileSnapshot: false,
      profileSnapshot,
    };
  }

  if (AUDIT_INTENTS.has(intentType)) {
    return {
      shouldFetch: true,
      fetchProfile: "audit_status",
      skipApi: false,
      skuCode,
      customerCode,
      importCountryCode,
      intentType,
      reuseProfileSnapshot: false,
      profileSnapshot,
    };
  }

  if (FACTS_INTENTS.has(intentType)) {
    if (Array.isArray(profileSnapshot.skus) && profileSnapshot.skus.length > 0) {
      return {
        shouldFetch: false,
        fetchProfile: "facts_core",
        skipApi: true,
        skuCode,
        customerCode,
        importCountryCode,
        intentType,
        reuseProfileSnapshot: true,
        profileSnapshot,
      };
    }
    return {
      shouldFetch: true,
      fetchProfile: "facts_core",
      skipApi: false,
      skuCode,
      customerCode,
      importCountryCode,
      intentType,
      reuseProfileSnapshot: false,
      profileSnapshot,
    };
  }

  // register / carriability / modify / inactive / general — 不拉 API
  return {
    shouldFetch: false,
    fetchProfile: "",
    skipApi: true,
    skuCode,
    customerCode,
    importCountryCode,
    intentType,
    reuseProfileSnapshot: false,
    profileSnapshot,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-audit-fetch")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
