import type { ContextFacts, RequirementCheck } from "./types.ts";

/**
 * Pre-match routability check — not a full SOP completeness validator.
 *
 * Authority: workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md
 * Mapping: internal-review-copilot/knowledge/requirement-completeness.md
 *
 * Full SOP columns (scene overview, customer, documents, SKU, background,
 * purpose, scope, steps, key outputs, exceptions, attachments) are checked
 * later by scenario card + check-completeness + llm-generate-sop.
 * These three slots are only the minimum needed to enter match-template.
 */

/** SOP: 业务单据 / 商品SKU / 商品 / 包裹 / 箱 / 库位 / 附件上下文 */
const OBJECT_RE =
  /(SKU|skc|商品|条码|SN|箱唛|箱|包裹|货物|实物|标签|物料|配件|入库单|异常单|库位|附件|WI\d{6,}|EB\d{6,})/i;

/** SOP: 操作目的 / 操作步骤中的动作 */
const ACTION_RE =
  /(换标|贴标|补贴|更换|辨识|识别|测量|称重|拍照|拍摄|检测|拦截|不上架|上架|扫描|销毁|冻结|解冻|拆分|组合|加固|改制|采集|打包|暂存|放一边|先放)/i;

/** SOP: 需求背景 / 操作目的 / 处理后的去向。有其一即可，不是三件都要。 */
const PURPOSE_OR_DESTINATION_RE =
  /(因|因为|导致|为了|目的|背景|需要你们|需要仓库|不上架|上架|入库单|新单|原单|暂存|放一边|先放|拦截|销毁|退回|转不良|转良|转人工|关联|WI\d{6,}|EB\d{6,})/i;

const MISSING_OBJECT = "操作对象不清";
const MISSING_ACTION = "操作动作不清";
const MISSING_PURPOSE_OR_DESTINATION = "需求背景/操作目的/处理去向不清";

const PROMPTS: Record<string, string> = {
  [MISSING_OBJECT]: "需求里看不出要处理的业务单据、SKU、商品、包裹、箱、库位或附件上下文，请补充处理对象。",
  [MISSING_ACTION]: "需求里看不出要做什么操作，请补充处理动作。",
  [MISSING_PURPOSE_OR_DESTINATION]:
    "需求里看不出需求背景、操作目的或处理后的去向，请补充为什么做、做到什么结果、或处理后去哪里。",
};

function hasBoundObject(context: ContextFacts): boolean {
  return Boolean(
    context.eventNo ||
      context.businessOrderNo ||
      context.allEventNos.length ||
      context.allBusinessOrderNos.length,
  );
}

function hasBoundPurposeOrDestination(context: ContextFacts): boolean {
  return (
    context.allBusinessOrderNos.length > 0 ||
    Boolean(context.providedFields.VAS_ATTR_REL_NWEON) ||
    Boolean(context.eventNo)
  );
}

/**
 * Pre-match routability: can we understand the job enough to route?
 *
 * Quantity, scope, materials, tools, attachments, key outputs, exceptions,
 * and label/SKU mapping are never hard missing items here.
 * If the text is only “帮我处理一下”, emit 操作对象不清 / 操作动作不清 —
 * never “数量或范围” or “对象对应关系”.
 */
export function checkRequirement(customerIntent: string, context: ContextFacts): RequirementCheck {
  const normalized = customerIntent.replace(/\s+/g, " ").trim();
  const missing: string[] = [];

  const objectExec = OBJECT_RE.exec(normalized);
  const objectBoundBypass = hasBoundObject(context);
  const objectOk = Boolean(objectExec) || objectBoundBypass;

  const actionExec = ACTION_RE.exec(normalized);
  const actionOk = Boolean(actionExec);

  const purposeExec = PURPOSE_OR_DESTINATION_RE.exec(normalized);
  const purposeBoundBypass = hasBoundPurposeOrDestination(context);
  const purposeOrDestinationOk = Boolean(purposeExec) || purposeBoundBypass;

  if (!objectOk) missing.push(MISSING_OBJECT);
  if (!actionOk) missing.push(MISSING_ACTION);
  if (!purposeOrDestinationOk) missing.push(MISSING_PURPOSE_OR_DESTINATION);

  return {
    complete: missing.length === 0,
    missingRequirementItems: missing,
    clarificationPrompts: missing.map((item) => PROMPTS[item] || `请补充${item}。`),
    normalizedRequirement: normalized,
    objectMatch: objectExec?.[0] ?? null,
    objectBoundBypass,
    actionMatch: actionExec?.[0] ?? null,
    purposeMatch: purposeExec?.[0] ?? null,
    purposeBoundBypass,
  };
}
