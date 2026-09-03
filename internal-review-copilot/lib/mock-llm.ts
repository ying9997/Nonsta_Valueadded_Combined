import type { ContextFacts, MatchResult, MockSop } from "./types.ts";

/**
 * Local dry-run mock. Uses only already-bound facts. Does not invent EB/WI/SKU/qty.
 */
export function mockGenerateSop(
  context: ContextFacts,
  matchResult: MatchResult,
  normalizedRequirement: string,
): MockSop {
  const eb = context.allEventNos.join("、") || "[待补充异常单号]";
  const wi = context.allBusinessOrderNos.join("、") || "[待补充入库单号]";
  const warehouse = context.warehouseName || context.warehouseCode || "[仓库已绑定]";
  const uploaded = Object.entries(context.attachmentStatus)
    .filter(([, status]) => status === "uploaded")
    .map(([name]) => name);

  const requirementBackground = [
    `客户就${warehouse}入库货物提交非标作业。`,
    context.eventNo ? `关联异常单 ${eb}。` : "",
    "需要仓库按客户已提交的辨识/换标要求处理后上架。",
  ]
    .filter(Boolean)
    .join("");

  const requirementDescription = [
    normalizedRequirement || "（需求描述见已提交字段）",
    context.eventNo ? `异常单：${eb}。` : "",
    wi !== "[待补充入库单号]" ? `上架入库单：${wi}。` : "",
    uploaded.length ? `已传附件：${uploaded.join("、")}。` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const warehouseSop = [
    `1. 按异常单 ${eb} 定位待处理货物。`,
    "2. 按客户已传的对应关系和标签文件辨识后换标，不得改写未提供的条码对应。",
    `3. 换标完成后上架到 ${wi}。`,
    "4. 操作完成后回传结果；本草稿仅供审核确认，确认不等于审核通过。",
  ].join("\n");

  const sopText = [`【需求背景】${requirementBackground}`, `【需求描述】${requirementDescription}`, `【仓库SOP】\n${warehouseSop}`].join(
    "\n\n",
  );

  return {
    requirementBackground,
    requirementDescription,
    warehouseSop,
    sopText,
    scenarioName: matchResult.scenarioName,
    fieldsUsed: uploaded,
    mocked: true,
  };
}
