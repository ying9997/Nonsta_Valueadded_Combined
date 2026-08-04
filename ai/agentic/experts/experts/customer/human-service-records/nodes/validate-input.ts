/**
 * 节点：validate-input
 * 校验框架顶层身份字段。身份缺失时后续 fetch 节点会短路，禁止用 customerName 单独查询。
 */

interface HumanServiceIdentity {
  username: string;
  customerCode: string;
  customerName: string;
  language: string;
}

interface HumanServiceValidation {
  validationStatus: "ok" | "need_identity";
  canQuery: boolean;
  identity: HumanServiceIdentity;
  missingFields: string[];
  warnings: string[];
}

function stringParam(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

async function main({ params }: { params: Record<string, unknown> }) {
  const identity: HumanServiceIdentity = {
    username: stringParam(params, "username"),
    customerCode: stringParam(params, "customerCode"),
    customerName: stringParam(params, "customerName"),
    language: stringParam(params, "language") || "zh-CN",
  };

  const missingFields: string[] = [];
  if (!identity.username) missingFields.push("username");

  const warnings: string[] = [];
  if (!identity.customerCode) {
    warnings.push("customerCode_missing_for_diagnostics_only");
  }
  if (!identity.customerName) {
    warnings.push("customerName_missing_for_diagnostics_only");
  }

  const canQuery = missingFields.length === 0;
  const validation: HumanServiceValidation = {
    validationStatus: canQuery ? "ok" : "need_identity",
    canQuery,
    identity,
    missingFields,
    warnings,
  };

  return {
    validation,
    validationStatus: validation.validationStatus,
    canQuery: validation.canQuery,
    identity: validation.identity,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
