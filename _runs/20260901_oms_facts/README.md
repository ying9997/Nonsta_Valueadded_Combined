# F-001 OMS 接口事实重拉

- 生成：2026-09-01（UTC 04:54）
- 场景：`【入库】尺重/标签辨识后换标上架` / `sceneOverviewCode=20250407004`
- 过滤：只按场景码；**未剔除**取消 / 异常终止 / 进行中
- 未覆盖旧表 `workspace/data/raw/全量_增值单接口口径事实补齐.xlsx`
- 脚本：`scripts/oms/pull_f001_oms_facts.py`（Cookie 走 `AI_EXPERT/TOM/共享认证`，不入库）

## 规模

| 项 | 数 |
|---|---|
| pageQuery | 183（与 8/31 直播池同规模） |
| getVasList 原子行 | 183 |
| getEventOrder 事件行 | 574 |
| 拉数失败 | 0 |

## 终态

| status | statusDesc | 条数 |
|---|---|---|
| PD | 已完成 | 147 |
| CD | 已取消 | 22 |
| ES | 异常终止 | 13 |
| OD | 已下单 | 1 |

- 官方 `eventNo`：123 / 183
- 官方 + 正文正则任一 EB：132 / 183
- 已取消里有官方 EB：10 / 22
- `isAuditThrough`：Y 180、N 1、空 2（按场景码能查出的单，绝大多数已审过；打回未标场景的旧单不在本池）

## 文件

| 文件 | 内容 |
|---|---|
| `pagequery_raw.json` | 列表接口原行 |
| `va_atoms.json` | getVasList 原行 |
| `events.json` | getEventOrder4VaAtom 原行（含 eventNo / eventCode / eventName） |
| `orders_summary.json` | 单号 + 状态 + EB/WI 摘要 |
| `details.json` / `details_checkpoint.json` | 按单明细 |
| `summary.json` | 计数 |

## 字段来源（当前 OMS 导出，未自造）

- 列表：`oms.VaOrderService_pageQuery`（含 `status`/`statusDesc`/`isAuditThrough`/`cancelReason`/`failReason`/`cancelDate`/`businessOrder` 等）
- 原子：`oms.VaOrderService_getVasList`（含 `sceneOverviewName`/`sop`/`vasDes`/`statusDesc` 等）
- 异常：`oms.VaOrderService_getEventOrder4VaAtom`（`eventNo`/`eventCode`/`eventName`）

本批**没有**旧表里的 `auditTrace`（`REVIEW_FAILED`）。驳回痕迹在本接口集里主要看 `isAuditThrough` + `cancelReason`/`failReason`。

## 本批未做

- 按 EB 再扩查空场景取消单（打回断号前史）
- 覆盖或替换旧 xlsx
- 写成飞书案例书 / expert KB
