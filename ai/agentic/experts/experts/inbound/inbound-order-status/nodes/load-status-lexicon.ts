/**
 * 节点：加载入库状态词典与字段指南（与 prompts/*.md 同步）
 */

const STATUS_LEXICON = `# 入库单状态词典

| 状态码 | 中文含义 | 实物流位置 | 解读要点 |
|--------|----------|------------|----------|
| DR | 草稿/已创建 | — | 尚未确认发货 |
| OD | 已确认/待发货 | 国内待交付 | 等待客户发货或交运 |
| RE | 国内仓已收货 | 国内仓 | 国内验货/集货阶段 |
| TS | 已发运/在途 | 国际运输 | 头程运输中 |
| PEWC | 预计在仓期 | 海外已到仓/验货中 | 到仓后验货或等待确认 |
| EWC | 已完全上架前在仓 | 海外仓 | 已到仓，可能待上架完成 |
| SHD | 已入库存 | 库存可用 | 上架完成可售 |
| STOP | 已终止 | — | 流程中止 |
| Void | 已作废 | — | 单据作废 |

## 状态流转（简化）

OD → TS → PEWC → EWC → SHD

国内验货路径可能含 RE；直发/海外验路径 PEWC 停留时间较长属常见现象。
`;

const FIELD_GUIDE = `# 入库单 JSON 字段解读

| 字段 | 含义 |
|------|------|
| orderNo / inboundOrderNum | 万邑通入库单号（WI 前缀） |
| status | 状态码 |
| winitProductCode | PSC 产品编码 |
| winitProductName | PSC 产品名称 |
| destWhCode | 目的仓编码 |
| inspectionType | 验货类型（自验/海外验等） |
| entryWhType | 入库方式（DI/DW/SD 等） |
| trajectoryList | 轨迹里程碑 |
| trackingList | 轨迹列表（来自 queryOrderTracking；getOrderDetail 不含轨迹） |
| isAbnormal | 是否异常标记 |
| dicDate | 到仓时间 |
| shelveCompletedDate | 上架完成时间 |
| orderMerchandiseQty / actualOrderMerchandiseQty | 预报/实收商品件数 |
| orderPackageQty / actualOrderPackageQty | 预报/实收包裹数 |

## 剪枝说明
- _pruneMeta.orders[].originalTrajectoryCount / retainedTrajectoryCount：轨迹剪枝元信息
- _trajectoryTruncated=true 表示轨迹被截断，分析时须说明 isTruncated
`;

const ERROR_CODE_KB = `# 常见入库报错码（KB 摘要）

| 报错码/关键词 | 含义 | 常见触发 |
|---------------|------|----------|
| ERR_STOCK_MISMATCH | 库存/商品信息不匹配 | SKU 未注册或信息不一致 |
| 商品不存在 | SKU 未在系统注册 | 需先注册发布商品 |
| 逾期账单 | 账户欠费 | 账单未结清限制下单 |
| 额度不足 | CBM/SKU 额度用尽 | 库容或 SKU 额度不足 |

纯 KB 路径：无单号仅有 errorCode 时，据此解读，不调用 API。
`;

async function main({ params }: { params: Record<string, unknown> }) {
  return {
    statusLexicon: STATUS_LEXICON,
    fieldGuide: FIELD_GUIDE,
    errorCodeKb: ERROR_CODE_KB,
    errorCode: String(params.errorCode ?? "").trim(),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-status-lexicon")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
