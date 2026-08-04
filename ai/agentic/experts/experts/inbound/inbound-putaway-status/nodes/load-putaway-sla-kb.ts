/**
 * 节点：加载上架 SLA 矩阵与数量对照 KB（与 prompts/*.md 同步）
 */

const SLA_GUIDE = `# 上架 SLA 矩阵（工作日，不含节假日）

## 到仓时间取值

| 送仓方式 | 计时起点 |
|----------|----------|
| 快递 | 快递单号妥投时间；无单号取实际卸货时间 |
| 散货 | 预约单实际到仓时间 |
| 整柜 LIVE | 预约单实际到仓时间 |
| 整柜 DROP | 预约单预约卸货时间 |

字段优先：dicDate，其次 awhDate。

## 美国仓

| 入库单类型 | 头程产品 | SLA |
|-----------|----------|:---:|
| 标准海外仓 | 空运/FedEx | 1 |
| 标准海外仓 | 美森/以星散货 | 2 |
| 标准海外仓 | 其他散货/整柜 | 3 |
| 标准海外仓 | UPS/无单号 | 4 |
| 直发国内验 | 空卡/DHL | 1 |
| 直发国内验 | 其他 | 4 |
| 直发海外验 | 空卡/DHL | 2 |
| 直发海外验 | 其他 | 5 |

## 非美国仓（英/德/澳/加）

| 入库单类型 | 头程产品 | SLA |
|-----------|----------|:---:|
| 标准 | 空运/快递 | 1 |
| 标准 | 海运/铁路 | 3 |
| 直发国内验 | 空卡 | 1 |
| 直发国内验 | 快递 | 2 |
| 直发国内验 | 海运整柜/海卡 | 3 |
| 直发国内验 | 空派/海派 | 4 |
| 直发海外验 | 空卡 | 2 |
| 直发海外验 | 快递 | 3 |
| 直发海外验 | 海运整柜/海卡 | 4 |
| 直发海外验 | 空派/海派 | 5 |

PEWC 阶段上架 SLA 尚未开始计时。本专家仅标注 slaBreached，不主动催促。
`;

const QTY_COMPARISON_GUIDE = `# 数量字段对照

| 字段 | 含义 |
|------|------|
| orderMerchandiseQty | 预报商品件数 |
| actualOrderMerchandiseQty | 实收/上架相关件数 |
| orderPackageQty / actualOrderPackageQty | 包裹数对比 |

差异话术：「实际上架 N 件，预报 M 件，差异 X 件」——不做责任判定。

升级提示：discrepancy 超过 5% 或绝对值 ≥ 10 件时，建议联系客服提交差异核实（→ inbound-exception-check）。
`;

async function main() {
  return {
    slaGuide: SLA_GUIDE,
    qtyComparisonGuide: QTY_COMPARISON_GUIDE,
    slaTier: "inbound-putaway-matrix-v1",
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-putaway-sla-kb")) {
  main().then((r) => process.stdout.write(JSON.stringify(r)));
}
