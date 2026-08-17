# wh.va.order.getVasList

## 定位

分页查询已提交增值单的增值原子列表，是 `value-add-order-status` 的 P0 原子进度接口。

## 关键入参

| 字段 | 说明 |
|---|---|
| `orderNo` | 增值订单号 |
| `businessNo` | 业务单号，可用于辅助定位但可能不唯一 |
| `orderEntry` | 订单入口或业务入口 |
| `pageVo` | 分页参数 |

## 关键返回

| 字段 | 用途 |
|---|---|
| `list[].serviceCode` / `serviceName` | 原子服务编码和名称 |
| `list[].status` / `statusDesc` | 原子执行状态 |
| `list[].partCompleteReason` | 部分完成原因 |
| `list[].returnReason` | 退回原因 |
| `list[].completeTime` | 原子完成时间 |
| `list[].orderCount` / `handleCount` | 下单数量与实际完成数量 |
| `list[].vaAtomAttrs` | 已提交增值单上的执行属性，只能解释已下单事实 |
| `list[].vaAtomFiles` | 已提交增值单上的附件事实，不等于事前模板/上传要求全量来源 |
| `list[].vaAtomResults` | 原子执行结果 |

## 边界

本接口可以回答已提交增值单里填了什么、传了什么；不能作为事前字段、附件、模板配置的全量来源。
