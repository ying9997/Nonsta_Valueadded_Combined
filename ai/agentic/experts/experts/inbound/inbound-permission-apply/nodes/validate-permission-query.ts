/**
 * 节点：validate-permission-query — 规范化 intent 与 permissionType
 * FaaS 单文件闭环，无外部 import。
 */

type PermissionIntent = "apply" | "progress" | "renew" | "general";
type PermissionType = "self_inspection" | "overseas_inspection" | "cbm_quota" | "general";

const VALID_INTENTS = new Set<PermissionIntent>(["apply", "progress", "renew", "general"]);
const VALID_TYPES = new Set<PermissionType>([
  "self_inspection",
  "overseas_inspection",
  "cbm_quota",
  "general",
]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeIntent(raw: unknown): PermissionIntent {
  const s = str(raw).toLowerCase();
  if (VALID_INTENTS.has(s as PermissionIntent)) return s as PermissionIntent;
  if (/申请|提交|开通|apply/i.test(s)) return "apply";
  if (/进度|审核|查询|progress/i.test(s)) return "progress";
  if (/续期|续费|renew/i.test(s)) return "renew";
  return "general";
}

function normalizePermissionType(raw: unknown): PermissionType {
  const s = str(raw).toLowerCase();
  if (VALID_TYPES.has(s as PermissionType)) return s as PermissionType;
  if (/自验|self/i.test(s)) return "self_inspection";
  if (/海外验|overseas/i.test(s)) return "overseas_inspection";
  if (/cbm|额度|quota/i.test(s)) return "cbm_quota";
  return "general";
}

function extractPscSnapshot(inputContext: unknown): {
  enabledProducts: string[];
  hasSelfInspection: boolean;
  hasOverseasInspection: boolean;
} {
  const empty = { enabledProducts: [] as string[], hasSelfInspection: false, hasOverseasInspection: false };
  if (!inputContext || typeof inputContext !== "object" || Array.isArray(inputContext)) return empty;
  const prev = (inputContext as Record<string, unknown>).previousOutput;
  if (!prev || typeof prev !== "object" || Array.isArray(prev)) return empty;
  const structured = (prev as Record<string, unknown>).structured;
  if (!structured || typeof structured !== "object") return empty;
  const s = structured as Record<string, unknown>;
  const enabledProducts = Array.isArray(s.enabledProducts) ? s.enabledProducts.map(String) : [];
  return {
    enabledProducts,
    hasSelfInspection: s.hasSelfInspection === true || enabledProducts.some((p) => /^OW0102[12]$/i.test(p)),
    hasOverseasInspection: s.hasOverseasInspection === true || enabledProducts.some((p) => /^OW0103[12]$/i.test(p)),
  };
}

function checkAlreadyEnabled(permissionType: PermissionType, snapshot: ReturnType<typeof extractPscSnapshot>): boolean {
  if (permissionType === "self_inspection") return snapshot.hasSelfInspection;
  if (permissionType === "overseas_inspection") return snapshot.hasOverseasInspection;
  return false;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = normalizeIntent(params.intent);
  const permissionType = normalizePermissionType(params.permissionType);
  const warehouseCode = str(params.warehouseCode).toUpperCase();
  const applicationId = str(params.applicationId);
  const customerIntent = str(params.customerIntent);
  const inputContext = params.inputContext ?? {};
  const snapshot = extractPscSnapshot(inputContext);
  const alreadyEnabled = checkAlreadyEnabled(permissionType, snapshot);

  const validationOk = permissionType.length > 0;

  return {
    validationOk,
    intent,
    permissionType,
    warehouseCode,
    applicationId,
    customerIntent,
    inputContext,
    alreadyEnabled,
    enabledProducts: snapshot.enabledProducts,
    targetPscCodes:
      permissionType === "self_inspection"
        ? ["OW01021", "OW01022"]
        : permissionType === "overseas_inspection"
          ? ["OW01031", "OW01032"]
          : [],
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-permission-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
