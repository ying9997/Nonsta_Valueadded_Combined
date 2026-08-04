/**
 * 节点：load-permission-kb — 按 intent 分支加载 KB
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type PermissionIntent = "apply" | "progress" | "renew" | "general";
type PermissionType = "self_inspection" | "overseas_inspection" | "cbm_quota" | "general";

const MATERIAL_CHECKLISTS: Record<string, string[]> = {
  self_inspection: ["公司名称", "联系人邮箱", "联系电话", "营业执照（如需）", "验货能力说明"],
  overseas_inspection: ["公司名称", "联系人邮箱", "目的仓", "业务说明"],
  cbm_quota: ["公司名称", "联系人邮箱", "目标仓库", "申请扩容 CBM 数量", "业务理由"],
  general: ["权限类型说明", "联系人信息"],
};

const REVIEW_TIME = "通常 3–5 个工作日（KB 参考，不承诺）";

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const intent = (str(params.intent) || "apply") as PermissionIntent;
  const permissionType = (str(params.permissionType) || "general") as PermissionType;
  const kbApply = str(params.kbPermissionApply);
  const kbProgress = str(params.kbPermissionProgress);
  const warehouseCode = str(params.warehouseCode);
  const alreadyEnabled = params.alreadyEnabled === true;

  if (!validationOk) {
    return { kbContent: "", kbScope: "invalid", materialChecklist: [], applySteps: [] };
  }

  let kbContent = "";
  let kbScope = "";

  if (intent === "progress") {
    kbContent = kbProgress;
    kbScope = "progress";
  } else if (intent === "renew") {
    kbContent = `${kbApply}\n\n---\n\n## 续期说明\n权限续期流程与初次申请类似，请提前 30 天提交续期申请。`;
    kbScope = "renew";
  } else {
    kbContent = kbApply;
    kbScope = intent === "apply" ? "apply" : "general";
  }

  const materialChecklist = MATERIAL_CHECKLISTS[permissionType] ?? MATERIAL_CHECKLISTS.general;

  const applySteps = alreadyEnabled
    ? ["权限已开通，无需重复申请"]
    : [
        "确认所需权限类型与目标仓库",
        "准备材料清单所列文件/信息",
        "登录万邑联 → 个人中心 → 产品权限/服务设置提交申请",
        "等待审核（预计 3–5 个工作日）",
        "审核通过后 PSC 自动开通",
      ];

  return {
    kbContent,
    kbScope,
    intent,
    permissionType,
    warehouseCode,
    materialChecklist,
    applySteps,
    estimatedReviewTime: REVIEW_TIME,
    alreadyEnabled,
    targetPscCodes: Array.isArray(params.targetPscCodes) ? params.targetPscCodes : [],
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-permission-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
