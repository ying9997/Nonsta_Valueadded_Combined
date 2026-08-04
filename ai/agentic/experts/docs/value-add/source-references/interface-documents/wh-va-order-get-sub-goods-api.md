# wh.va.order.getSubGoods

## 定位

查询已提交增值单的子货物、商品、条码、批次、尺重和附件明细，是 `value-add-order-status` 的 P2 增强接口。

## 关键入参

| 字段 | 说明 |
|---|---|
| `orderNo` | 增值订单号 |
| `parentId` | 父货物或父记录 ID |
| `pageVo` | 分页参数 |

## 边界

本接口只辅助解释已有增值单货物事实，不作为推荐链判断 VASC/原子适用性的依据。
