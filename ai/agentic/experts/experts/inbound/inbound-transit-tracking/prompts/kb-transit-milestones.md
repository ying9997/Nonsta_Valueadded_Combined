# 头程运输里程碑与典型时效

## 本期范围

- **本专家（inbound-transit-tracking）本期不对客上线**
- 离港 / 到港 / 航班船名：依赖 TMS，**不在本期**
- 临时承接：OMS 状态与轨迹 → `inbound-order-status`；到仓 → `inbound-arrival-status`

## 头程阶段说明（产品概念）

| 阶段 | 含义 | 本期数据来源 |
|------|------|--------------|
| 离港 | 货物从起运港/机场发出 | **不在本期**（TMS） |
| 国际在途 TS | 货物在运输途中 | OMS `status` + `queryOrderTracking` |
| 到港 | 货物到达目的港/机场 | **不在本期**（TMS） |
| 预计送仓 | 预计送达海外仓 | OMS `expectedSendwarehouseTime` |

## 各渠道典型时效参考（仅供参考，非承诺）

| 渠道 | 典型时效 | 说明 |
|------|----------|------|
| 空运 + 快递 | 3–7 天 | 含清关与送仓 |
| 海运 LCL | 20–35 天 | 视航线 |
| 海运 FCL | 18–30 天 | 视航线 |
| 铁路/中欧班列 | 15–25 天 | 视口岸 |

## OMS 轨迹解读

- 状态码 `TS` = 头程运输中
- 轨迹来自 **`queryOrderTracking.trackingList`**（非 `getOrderDetail.trajectoryList`）
- `expectedSendwarehouseTime` 为系统预计，非承诺到仓日期

## 升级人工

- TS 长期无轨迹更新；客户追问离港/到港且 OMS 无答案
