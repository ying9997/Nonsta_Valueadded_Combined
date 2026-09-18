import type { ContextFacts, RequirementCheck } from "./types.ts";

/**
 * L1 pre-match fallback — only blocks blank / tiny intent.
 *
 * Three-slot regexes are still extracted for trace, but they no longer
 * decide `complete`. Scene-level completeness is L2.5
 * (`check-scene-completeness.ts`).
 *
 * Authority for full SOP columns:
 * workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md
 */

export const MIN_REQUIREMENT_LENGTH = 5;
/** 短于此时长且无 WI/EB，按「需求完全不清晰」拦住。 */
export const UNINTELLIGIBLE_LENGTH = 20;

/** SOP: 业务单据 / 商品SKU / 商品 / 包裹 / 箱 / 库位 / 附件上下文 */
const OBJECT_RE =
  /(SKU|skc|商品|条码|SN|箱唛|箱|包裹|货物|实物|标签|物料|配件|入库单|异常单|库位|附件|WI\d{6,}|EB\d{6,})/i;

/** SOP: 操作目的 / 操作步骤中的动作 */
const ACTION_RE =
  /(换标|贴标|补贴|更换|辨识|识别|测量|称重|拍照|拍摄|检测|拦截|不上架|上架|扫描|销毁|冻结|解冻|拆分|组合|加固|改制|采集|打包|暂存|放一边|先放)/i;

/** SOP: 需求背景 / 操作目的 / 处理后的去向。有其一即可，不是三件都要。 */
const PURPOSE_OR_DESTINATION_RE =
  /(因|因为|导致|为了|目的|背景|需要你们|需要仓库|不上架|上架|入库单|新单|原单|暂存|放一边|先放|拦截|销毁|退回|转不良|转良|转人工|关联|WI\d{6,}|EB\d{6,})/i;

const MISSING_BLANK = "需求描述为空或过短";
const BLANK_PROMPT = "请填写增值需求描述，说明需要仓库做什么操作。";

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
 * L1: pass any non-empty intent through to match-template.
 * Quantity / mapping / attachments are never hard-missing here.
 */
export function checkRequirement(customerIntent: string, context: ContextFacts): RequirementCheck {
  const normalized = customerIntent.replace(/\s+/g, " ").trim();

  const objectExec = OBJECT_RE.exec(normalized);
  const actionExec = ACTION_RE.exec(normalized);
  const purposeExec = PURPOSE_OR_DESTINATION_RE.exec(normalized);
  const objectBoundBypass = hasBoundObject(context);
  const purposeBoundBypass = hasBoundPurposeOrDestination(context);

  const hasDocNo =
    /WI\d{8,}|EB\d{6,}/i.test(normalized) || objectBoundBypass || purposeBoundBypass;
  if (normalized.length < MIN_REQUIREMENT_LENGTH || (normalized.length < UNINTELLIGIBLE_LENGTH && !hasDocNo)) {
    return {
      complete: false,
      missingRequirementItems: [MISSING_BLANK],
      clarificationPrompts: [BLANK_PROMPT],
      normalizedRequirement: normalized,
      objectMatch: objectExec?.[0] ?? null,
      objectBoundBypass,
      actionMatch: actionExec?.[0] ?? null,
      purposeMatch: purposeExec?.[0] ?? null,
      purposeBoundBypass,
    };
  }

  return {
    complete: true,
    missingRequirementItems: [],
    clarificationPrompts: [],
    normalizedRequirement: normalized,
    objectMatch: objectExec?.[0] ?? null,
    objectBoundBypass,
    actionMatch: actionExec?.[0] ?? null,
    purposeMatch: purposeExec?.[0] ?? null,
    purposeBoundBypass,
  };
}
