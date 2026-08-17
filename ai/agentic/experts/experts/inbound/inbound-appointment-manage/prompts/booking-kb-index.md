# 预约送仓 KB 索引（维护用）

> 不对客引用文件名。`_kb` 路径相对于仓库外知识库根目录。

## 优先级 1

| 文档 | 映射 prompt |
|------|-------------|
| `inbound-integration-solution/business/inbound/booking-overview.md` | booking-api-reference、booking-sop、booking-rules |
| `直发预约送仓（常见问题）.md` | booking-sop、booking-rules |
| `直发散货预约常见问题.md` | booking-sop、penalty-rules |
| `直发预约违规费常见问题.md` | penalty-rules |
| `一、背景说明.md` | split-shipment |
| `增值预约送仓常见问题.md` | premium-booking、booking-rules |

## 优先级 2

| 文档 | 映射 prompt |
|------|-------------|
| `直发快递入仓常见问题.md` | booking-sop §Express |
| `直发整柜Drop卸货异常退费流程.md` | booking-sop §FCL、升级人工 |
| `直发整柜DROP通知提空柜后跑空.md` | booking-sop §FCL |
| `docs/inbound/flows/06-appointment-and-delivery.md` | 全量 SOP 汇总 |

## 本专家 intent → KB 片段

| intent | 加载片段 |
|--------|----------|
| `create_guide` | booking-sop（按 LCL/FCL/Express 过滤）+ booking-api-reference §链路/合并/FCL 必填 |
| `modify_guide` | booking-rules §修改 |
| `cancel_guide` | booking-rules §取消 + penalty-rules §未到仓 |
| `split_shipment` | split-shipment |
| `penalty` | penalty-rules + premium-booking（若问增值） |
| `query` | booking-api-reference §状态码 + booking-rules + booking-sop 摘要 |
| `pod_guide` | pod-download-guide + booking-api-reference §POD/状态码 |
