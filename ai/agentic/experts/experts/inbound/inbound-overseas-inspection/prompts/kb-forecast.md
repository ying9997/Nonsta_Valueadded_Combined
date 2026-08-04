# 海外验 - 预报模式（OW01032）

## 模式说明

- PSC：**OW01032**（海外验-预报/无箱单）
- 客户仅提交预报信息（SKU/数量），无完整箱单
- 仓库按预报与到货实物进行验货核对

## 与有箱单模式差异

| 维度 | 有箱单 OW01031 | 预报 OW01032 |
|------|---------------|--------------|
| 装箱单 | 完整箱单 | 仅预报 |
| 验货启动 | 较快 | 可能需实物核对 |
| 典型耗时 | 3-5 工作日 | 5-7 工作日 |
| 进度可见性 | OMS PEWC/EWC | 同左 |

## 状态机

- TS → not_arrived
- PEWC → awaiting_inspection / in_progress
- EWC 或 dicDate → completed
- isAbnormal → blocked

## 预报单进度查看

1. 确认入库单状态（PEWC = 验货中，EWC = 完成）
2. 查看 awhDate（到仓时间）与 dicDate（验货完成时间）
3. 关注 inspectionStatus 字段（Pending/InProgress/Completed，若返回）

## 对客约束

- 预报模式无 WMS 细粒度开箱进度
- 不承诺验货完成时间
- 数量差异可能触发异常单，见 inbound-exception-check 专家
