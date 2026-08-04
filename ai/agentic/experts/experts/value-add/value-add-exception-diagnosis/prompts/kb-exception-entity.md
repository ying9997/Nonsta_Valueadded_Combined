# 入库异常实体层

本文件为 `value-add-exception-diagnosis` 提供异常归一依据。它只回答“这是什么异常、对象是什么、阻断哪个流程阶段、是否需要客户动作”，不推荐 VASC。

---

## 使用规则

- 优先按 `exceptionCode` 精确命中；未命中时再按异常名称/描述归一。
- `candidateEvidenceLevel=exception_mapping_exists` 只表示存在异常到增值产品的关系线索，不表示可下单或应选择某个 VASC。
- `requiresCustomerAction=conditional` 表示通常需要客户补充处理意图或材料，但仍需结合上游异常事实。
- 库内、出库、自提关联异常可以解释为 value-add candidate 线索，但入库链路中不得跨阶段套用。

---

## 异常实体表

当前运行时切片覆盖 35 个真实异常编码。

| exceptionCode | exceptionName | exceptionCategory | exceptionNode | sgCode | objectLevel | blockedStage | requiresCustomerAction | candidateEvidenceLevel |
|---|---|---|---|---|---|---|---|---|
| `B0102E08` | 商品包装异常 | `packaging_quality` | `IN_WAREHOUSE` | `B04,B05,B06` | `product` | `storage` | `conditional` | `exception_mapping_exists` |
| `B0102E21` | 包裹条码异常(需客户处理) | `barcode_package` | `IN_BOUND` | `B01` | `package` | `putaway` | `true` | `exception_mapping_exists` |
| `B0102E23` | A+包裹质量异常 | `packaging_quality` | `IN_BOUND` | `B01,B04` | `package` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B0102E27` | 商品裸装 | `packaging_quality` | `IN_BOUND` | `B01,B04` | `product` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B01E01` | 入库单状态异常 | `order_status` | `IN_BOUND` | `B01` | `order` | `putaway` | `conditional` | `exception_mapping_exists` |
| `B01E1314` | 商品质量异常(影响销售) | `packaging_quality` | `IN_BOUND` | `B01,B04` | `product` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B01E1315` | 商品条码异常(需客户处理) | `barcode_product` | `IN_BOUND` | `B01,B04` | `product` | `putaway` | `true` | `exception_mapping_exists` |
| `B01E1316` | 商品有条码但系统无法识别 | `barcode_product` | `IN_BOUND` | `B01,B04` | `product` | `inspection` | `true` | `exception_mapping_exists` |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | `batch_attribute` | `IN_BOUND` | `B01,B02,B04` | `package` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B01E1381` | 商品实物无批次信息或批次信息不全 | `batch_attribute` | `IN_BOUND` | `B01,B02,B04,B05,B08` | `product` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B01E1470` | 订单状态被终止无法上架 | `order_status` | `IN_BOUND` | `B01` | `order` | `putaway` | `true` | `exception_mapping_exists` |
| `B01E1514` | 订单状态已上架需拦截 | `order_status` | `IN_BOUND` | `B01,B02,B03,B04` | `order` | `putaway` | `true` | `exception_mapping_exists` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `wrong_item_mispack` | `IN_BOUND` | `B01,B02,B03,B04` | `package` | `inspection` | `true` | `exception_mapping_exists` |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | `quantity_discrepancy` | `IN_BOUND` | `B01,B02,B03,B04` | `package` | `inspection` | `true` | `exception_mapping_exists` |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `barcode_package` | `IN_BOUND` | `B01` | `package` | `inspection` | `conditional` | `exception_mapping_exists` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `barcode_package` | `IN_BOUND` | `B01` | `package` | `putaway` | `true` | `exception_mapping_exists` |
| `B01E49` | 客户直发包裹串仓 | `wrong_warehouse` | `IN_BOUND` | `B01` | `package` | `unload` | `true` | `exception_mapping_exists` |
| `B03E03` | 包裹内出现订单外商品 | `wrong_item_mispack` | `IN_BOUND` | `B03` | `package` | `inspection` | `true` | `exception_mapping_exists` |
| `B05E012` | 单品外包装破损 | `packaging_quality` | `IN_WAREHOUSE` | `B05` | `item` | `storage` | `conditional` | `exception_mapping_exists` |
| `B05E013` | 包裹内商品错装 | `wrong_item_mispack` | `IN_WAREHOUSE` | `B05` | `package` | `storage` | `conditional` | `exception_mapping_exists` |
| `B05E014` | 单品质量异常 | `packaging_quality` | `IN_WAREHOUSE` | `B05` | `item` | `storage` | `conditional` | `exception_mapping_exists` |
| `B05E1382` | 库存批次号错误 | `batch_attribute` | `IN_WAREHOUSE` | `B05,B06,B08` | `item` | `storage` | `conditional` | `exception_mapping_exists` |
| `B05E1383` | 计划外批次 | `batch_attribute` | `IN_WAREHOUSE` | `B05,B06,B08` | `item` | `storage` | `conditional` | `exception_mapping_exists` |
| `B05E1586` | 单品条码无法扫描(需客户处理） | `barcode_product` | `IN_WAREHOUSE` | `B05` | `item` | `storage` | `true` | `exception_mapping_exists` |
| `B06E1369` | 2B箱内商品条码异常 | `barcode_product` | `IN_WAREHOUSE` | `B06` | `package` | `storage` | `conditional` | `exception_mapping_exists` |
| `B06E1370` | 2B箱内多单品 | `quantity_discrepancy` | `IN_WAREHOUSE` | `B06` | `package` | `storage` | `conditional` | `exception_mapping_exists` |
| `B06E1371` | 2B箱内少单品 | `quantity_discrepancy` | `IN_WAREHOUSE` | `B06` | `package` | `storage` | `conditional` | `exception_mapping_exists` |
| `B06E1613` | A+包裹条码无法扫描 | `barcode_package` | `IN_WAREHOUSE` | `B06,B12` | `package` | `storage` | `conditional` | `exception_mapping_exists` |
| `B06E1628` | DG商品包装不符合标准 | `packaging_quality` | `IN_WAREHOUSE` | `B06` | `product` | `storage` | `conditional` | `exception_mapping_exists` |
| `B06E1735` | 打包完成后作废出库单（有商品增值） | `outbound_related` | `IN_WAREHOUSE` | `B06` | `order` | `storage` | `conditional` | `exception_mapping_exists` |
| `B07E1339` | 自提单取消出库（需要客户下入库单） | `outbound_related` | `IN_WAREHOUSE` | `B07` | `order` | `storage` | `true` | `exception_mapping_exists` |
| `B07E1616` | 自提出库单分批提货 | `outbound_related` | `OUT_BOUND` | `B07` | `order` | `outbound` | `conditional` | `exception_mapping_exists` |
| `B0809E03` | 库内商品包装破损 | `packaging_quality` | `IN_WAREHOUSE` | `B08` | `product` | `storage` | `conditional` | `exception_mapping_exists` |
| `B0809E05` | 库内单品条码异常--人工不可识别 | `barcode_product` | `IN_WAREHOUSE` | `B08` | `item` | `storage` | `conditional` | `exception_mapping_exists` |
| `B12E1784` | SN码缺失无法采集 | `batch_attribute` | `OUT_BOUND` | `B12` | `item` | `outbound` | `conditional` | `exception_mapping_exists` |

---

## 未命中时的归一规则

| 名称/描述线索 | 归一类别 | 对象层级倾向 | 注意事项 |
|---|---|---|---|
| 包裹条码、箱唛、外箱标签、包商品条码对应关系 | `barcode_package` | `package` | 只归一异常，不给 VASC |
| 商品条码、SKU 条码、单品条码、人工不可识别 | `barcode_product` | `product` / `item` | 需区分商品级和单品级 |
| 包装异常、破损、裸装、质量异常、DG 包装 | `packaging_quality` | `package` / `product` / `item` | 可能是入库或库内阶段 |
| 批次、SN、属性、计划外批次 | `batch_attribute` | `product` / `item` | 不反推具体处理动作 |
| 多单品、少单品、数量大于验货数量 | `quantity_discrepancy` | `package` / `item` | 无核实结果时优先 `needs_upstream_check` |
| 串仓、目的仓错误、调拨 | `wrong_warehouse` | `package` / `order` | 多为非标或人工确认 |
| 错装、订单外商品、子包裹错装 | `wrong_item_mispack` | `package` / `product` | 需先确认实物归属 |
| 自提单、出库单、打包后作废、分批提货 | `outbound_related` | `order` | 入库链路中需提示跨阶段边界 |

- 无法稳定归一时输出 `unknown`，不得编造异常编码。
- 只有数量差异口述但没有异常单或差异核实事实时，输出 `needs_upstream_check`。
