/**
 * 节点：加载到仓状态 KB 片段（与 prompts/*.md 同步）
 */

const PEWC_RULES = `# PEWC 等待规则

| 验货类型 | 典型等待期（工作日）| 说明 |
|----------|-------------------|------|
| 客户自验 | 约 2 日 | 等待客户确认或系统对接 |
| 国内标准验 | 约 3 日 | 国内验货完成后转海外流程 |
| 海外验 | 约 5 日 | 海外验货可达数个工作日，属常见现象 |

**不设固定 48h 告警**。needsAttention 由代码节点根据验货类型 + 实际停留工作日综合判定。

PEWC 含义：货物已到海外仓，处于验货/待确认阶段，尚未完成验收转 EWC。
`;

const EWC_TRANSITION_GUIDE = `# PEWC → EWC 转换条件

1. 仓库完成卸货/签收扫描（可能出现 awhDate）
2. 验货流程完成（自验确认 / 国内验 / 海外验结果录入）
3. OMS 状态由 PEWC 更新为 EWC

EWC 含义：验收完成，进入上架排期阶段（上架进度见 inbound-putaway-status 专家）。
`;

const POD_GUIDE = `# POD / 签收证明解读

| 字段 | 含义 |
|------|------|
| podTime | 签收/卸货时间 |
| podQty | 签收包裹数量 |
| actualOrderPackageQty | 实收包裹数 |

POD 可用判定：podTime 非空或 podQty > 0。

注意：
- UPS 官网「妥投」可能为站点装柜时间，非实际派送日
- POD 扫描件附件可能不在 getOrderDetail 响应中（Gap）
- 直发场景客户无法提供 POD 时，需联系货代或仓库运营核实
`;

const DIRECT_SHIPMENT_GUIDE = `# 直发少包裹确认流程

1. 确认签收地址是否为万邑通直发收货地址
2. 对比 orderPackageQty（预约/预报）与 actualOrderPackageQty（实收）
3. discrepancy > 0 时：收集 WI 号、快递单号、承运商、POD 截图
4. 查区域云仓 → POD 卸货记录 / 卸货包裹记录
5. 无法定位时建议转 inbound-exception-check 专家

不输出索赔建议；需人工时说明「可联系仓库运营核实」。
`;

const TRAJECTORY_GUIDE = `# 入库轨迹节点对照

| 节点/状态 | 中文含义 |
|-----------|----------|
| TS | 已发运/国际在途 |
| PEWC | 预计到仓期/已到仓验货中 |
| EWC | 验收完成/待上架或上架中 |
| SHD | 已入库存可用 |

轨迹被剪枝时须说明 isTruncated，不臆断缺失节点。
`;

async function main() {
  return {
    pewcRules: PEWC_RULES,
    ewcTransitionGuide: EWC_TRANSITION_GUIDE,
    podGuide: POD_GUIDE,
    directShipmentGuide: DIRECT_SHIPMENT_GUIDE,
    trajectoryGuide: TRAJECTORY_GUIDE,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-arrival-kb")) {
  main().then((r) => process.stdout.write(JSON.stringify(r)));
}
