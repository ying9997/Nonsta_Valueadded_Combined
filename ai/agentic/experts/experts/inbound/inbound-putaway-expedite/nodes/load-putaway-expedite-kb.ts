/**
 * 节点：按 SLA 事实加载催促/升级 KB 片段
 */

const SLA_GUIDE = `# 上架 SLA 矩阵（内部判断，对客说「X 个工作日」）

来源：咨询入库单上架时间及催上架处理流程.md

到仓计时：dicDate（验收完成/到仓确认），PEWC 阶段 SLA 未开始。

美国/非美国矩阵与 inbound-putaway-status 共享；最少 1 工作日，最多 5 工作日。
不对客说「24 小时」固定时效。
`;

const ESCALATION_GUIDE = `# 超 SLA 升级 SOP

触发：已到仓（非 PEWC）、未完成上架、workingDaysElapsed > slaWorkingDays。

步骤：
1. 致歉并说明已超标准 X 工作日时效
2. 建议通过万邑联平台客服入口提交催架工单
3. 工单需附：WI 单号、到仓时间、SKU/包裹明细（如有）
4. 安排专人跟进并同步结果

canRush 本期为 null（库存 API 未接入）：如需加急请工单说明 SKU 与活动节点。
`;

const PUTAWAY_PROGRESS_GUIDE = `# 时效内安抚话术

- 仓库按收货情况排期，会在标准 SLA（X 工作日）内完成
- 节假日不计入工作日
- 仍在 PEWC：说明验收中，上架 SLA 尚未开始
- 已完成上架：直接告知 shelveCompletedDate，不做无效催促
`;

const RUSH_CONDITIONS_GUIDE = `# 加急上架条件（下期 inventory API）

确定性规则（代码计算，LLM 不推断 canRush）：
- 须已到仓且未完成上架
- 目的仓 SKU qtyAvailable <= 0 → 缺货，符合加急
- qtyAvailable > 0 且 < safetyThreshold（默认 10）→ 濒临缺货
- 全部 SKU 库存充足 → 不符合加急

本期 v1：canRush=null，canRushReason=inventory_check_not_available。
`;

async function main({ params }: { params: Record<string, unknown> }) {
  const slaFacts = (params.slaFacts ?? {}) as Record<string, unknown>;
  const slaBreached = slaFacts.slaBreached === true;
  const alreadyPutaway = slaFacts.alreadyPutaway === true;

  let escalationGuide = ESCALATION_GUIDE;
  if (alreadyPutaway) {
    escalationGuide = "已完成上架，无需升级催促。";
  } else if (!slaBreached) {
    escalationGuide = "未超 SLA，优先使用时效内安抚话术；客户坚持可引导工单说明特殊情形。";
  }

  return {
    slaGuide: SLA_GUIDE,
    escalationGuide,
    putawayProgressGuide: PUTAWAY_PROGRESS_GUIDE,
    rushConditionsGuide: RUSH_CONDITIONS_GUIDE,
    branch: alreadyPutaway ? "completed" : slaBreached ? "escalation" : "comfort",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-putaway-expedite-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
