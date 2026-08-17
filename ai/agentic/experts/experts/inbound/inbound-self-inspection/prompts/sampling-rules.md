# 抽验规则与费用

## 抽验背景

货物到海外仓（`PEWC`）后，Winit 对自验入库单执行**随机抽验**，核对客户发货前自验数据的准确性。自验链路无国内仓复检环节。

## 抽验类型（OW01V1266-68 系列）

| 增值编码 | 类型 | 说明 |
|----------|------|------|
| OW01V1266 | 错装抽验 | 核对装箱商品是否与验货商品一致 |
| OW01V1267 | 尺重抽验 | 核对实物尺重是否与验货尺重吻合 |
| OW01V1268 | 数量抽验 | 核对包裹内实物数量是否与验货数量一致 |

> 符合免验条件时可能跳过物理开箱核对（见 `exemption-conditions.md`）。

## 数据源

- OMS：`getOrderDetail.inspectionStatus`、`status`
- 异常单：`wh.inboundOrder.queryExceptionList` → `exceptionName`、`exceptionDesc`、`exceptionDetailList.merchandiseSerno`
- 抽验费**无独立字段依据**，从 `exceptionType` 或 `exceptionReason` 文本推断

## 费用说明

- 客观说明费用金额与计费依据，**不承诺退费**
- 尺重差异尤其容易触发异常处理费
- 费用争议且无明确字段时建议联系客服

## 权限回收预警

- Winit 每月 review 抽验准确率；持续偏低会**回收自验权限**，转为标准海外验
- 说明规则但不承诺审批结果

## 超容差差异

- 抽验数据与自验数据差异超出容差时，建议转 `inbound-exception-check` 聚合完整差异报告
- `status=EWC` 且客户非咨询抽验结果 → 引导至 `inbound-putaway-status` 查上架进度
