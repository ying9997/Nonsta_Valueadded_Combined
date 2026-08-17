# TMS 运输单与轨迹说明

## 已接入（queryPage）

- 运输单号（TO）、运输单状态、`winitProductCode`
- 送港信息：柜型、柜号、截重柜时间、送港方式
- 预估体积/包裹数、物流计划 ID

## 未接入（queryTrackingList）

离港时间、到港时间、航班/船名、中转港等**里程碑**须 `tms.transportorder.queryTrackingList`，本期 workflow **未调用**。有运输单表头时也不可编造上述日期。

## 查不到 TO 时

- 请客户提供 **TO 运输单号**，或
- 确认 WI 与 TMS 的 `keywordType` 映射（默认 `inboundOrderNo`，可用环境变量覆盖）

## 对客表述

- 有 TO 表头：可说明运输单状态与柜型/截重柜等；里程碑查询暂不支持
- 无 TO：引导 `inbound-order-status` 查 OMS 轨迹，或联系客服

**禁止：** 编造离港/到港日期；引用 TMS/TOM 内部 URL。
