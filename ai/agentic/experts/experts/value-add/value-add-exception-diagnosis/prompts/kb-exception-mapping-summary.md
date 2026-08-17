# 异常到 VASC 映射线索层

本文件只用于判断“异常是否存在进入 VASC 推荐的关系线索”，不用于直接推荐具体 VASC。不得从本文件输出 VASC 编码、VASC 名称或服务项。

---

## 覆盖统计

| 指标 | 数量 | 运行时含义 |
|---|---:|---|
| VASC 产品数 | 18 | 只证明映射覆盖范围，不在本专家输出候选 |
| 唯一异常编码数 | 35 | `kb-exception-entity.md` 已裁剪为实体表 |
| 去重异常到 VASC 关系数 | 168 | 用作 `candidateEvidence`，不直接推荐 |

---

## 异常级映射证据

| exceptionCode | exceptionName | relationCount | activeRelationCount | inactiveRelationCount | mappingEvidence |
|---|---|---:|---:|---:|---|
| `B0102E08` | 商品包装异常 | 6 | 6 | 0 | `candidate_relation_exists` |
| `B0102E21` | 包裹条码异常(需客户处理) | 7 | 7 | 0 | `candidate_relation_exists` |
| `B0102E23` | A+包裹质量异常 | 8 | 7 | 1 | `candidate_relation_exists_with_inactive` |
| `B0102E27` | 商品裸装 | 7 | 7 | 0 | `candidate_relation_exists` |
| `B01E01` | 入库单状态异常 | 7 | 7 | 0 | `candidate_relation_exists` |
| `B01E1314` | 商品质量异常(影响销售) | 9 | 8 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1315` | 商品条码异常(需客户处理) | 8 | 7 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1316` | 商品有条码但系统无法识别 | 8 | 7 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | 4 | 3 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1381` | 商品实物无批次信息或批次信息不全 | 2 | 2 | 0 | `candidate_relation_exists` |
| `B01E1470` | 订单状态被终止无法上架 | 5 | 5 | 0 | `candidate_relation_exists` |
| `B01E1514` | 订单状态已上架需拦截 | 6 | 6 | 0 | `candidate_relation_exists` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | 6 | 5 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | 4 | 3 | 1 | `candidate_relation_exists_with_inactive` |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | 5 | 5 | 0 | `candidate_relation_exists` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | 7 | 7 | 0 | `candidate_relation_exists` |
| `B01E49` | 客户直发包裹串仓 | 7 | 7 | 0 | `candidate_relation_exists` |
| `B03E03` | 包裹内出现订单外商品 | 8 | 7 | 1 | `candidate_relation_exists_with_inactive` |
| `B05E012` | 单品外包装破损 | 5 | 5 | 0 | `candidate_relation_exists` |
| `B05E013` | 包裹内商品错装 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B05E014` | 单品质量异常 | 6 | 6 | 0 | `candidate_relation_exists` |
| `B05E1382` | 库存批次号错误 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B05E1383` | 计划外批次 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B05E1586` | 单品条码无法扫描(需客户处理） | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1369` | 2B箱内商品条码异常 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1370` | 2B箱内多单品 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1371` | 2B箱内少单品 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1613` | A+包裹条码无法扫描 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1628` | DG商品包装不符合标准 | 4 | 4 | 0 | `candidate_relation_exists` |
| `B06E1735` | 打包完成后作废出库单（有商品增值） | 1 | 1 | 0 | `candidate_relation_exists` |
| `B07E1339` | 自提单取消出库（需要客户下入库单） | 1 | 1 | 0 | `candidate_relation_exists` |
| `B07E1616` | 自提出库单分批提货 | 1 | 1 | 0 | `candidate_relation_exists` |
| `B0809E03` | 库内商品包装破损 | 1 | 1 | 0 | `candidate_relation_exists` |
| `B0809E05` | 库内单品条码异常--人工不可识别 | 1 | 1 | 0 | `candidate_relation_exists` |
| `B12E1784` | SN码缺失无法采集 | 2 | 2 | 0 | `candidate_relation_exists` |

---

## 输出规则

- 命中 `candidate_relation_exists` 时，只能输出“存在映射关系线索，可交由推荐专家继续判断候选”。
- 命中 `candidate_relation_exists_with_inactive` 时，必须补充边界：“映射中存在 inactive 产品线索，下游仍需过滤启用态和适用限制”。
- 未命中异常编码时，不得反推不存在增值路径；输出 `unknown_exception` 或 `needs_upstream_check`。
- 数量差异类异常即使命中映射，也必须结合上游差异核实结果；缺核实时输出 `needs_upstream_check`。
- 本专家不得输出 VASC 编码、VASC 名称、服务项、原子、字段、附件或模板。
