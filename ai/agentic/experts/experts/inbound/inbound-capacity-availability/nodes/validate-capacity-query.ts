/**
 * 节点：validate-capacity-query — 校验 warehouseCode 与 checkType
 * FaaS 单文件闭环，无外部 import。
 */

type CheckType = "cbm" | "sku" | "slots" | "overall";

const VALID_CHECK_TYPES = new Set<CheckType>(["cbm", "sku", "slots", "overall"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeCheckType(raw: unknown): CheckType {
  const s = str(raw).toLowerCase();
  if (VALID_CHECK_TYPES.has(s as CheckType)) return s as CheckType;
  return "overall";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const warehouseCode = str(params.warehouseCode).toUpperCase();
  const checkType = normalizeCheckType(params.checkType);
  const customerIntent = str(params.customerIntent);
  const inputContext = params.inputContext ?? {};
  const cargoProfile = params.cargoProfile ?? null;

  const validationOk = warehouseCode.length > 0;

  return validationOk
    ? {
        validationOk: true,
        warehouseCode,
        checkType,
        customerIntent,
        inputContext,
        cargoProfile,
      }
    : {
        validationOk: false,
        error: "warehouseCode 为必填项",
        warehouseCode,
        checkType,
        customerIntent,
        inputContext,
        cargoProfile,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-capacity-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
