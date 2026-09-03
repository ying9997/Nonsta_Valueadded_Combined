# F-001 按 EB 扩空场景旧单

- 日期：2026-09-01
- 脚本：`scripts/oms/expand_f001_by_eb.py`
- 种子：`_runs/20260901_oms_facts` 的 183 张

## 怎么扩（实现限制）

OMS **不能**用 `eventNo` / `businessOrderNo=EB` 列表查询（过滤无效，会退回最新单）。  
`queryRelatedVaOrdersPage` **只认 WI**，不认 EB。

做法：用种子单上的 WI 拉兄弟增值单 → 再拉每张兄弟的官方 `eventNo` → **只留下和种子共用同一个 EB 的，或场景概述为空的**。

对照单元仍然是 EB，WI 只是检索钥匙。

## 结果

| 项 | 数 |
|---|---|
| 种子 WI | 206 |
| 种子外多出来的 VASC | 226 |
| 其中场景概述为空 | 206 |
| 其中空场景且已取消 | 68 |
| 与种子官方 EB 相交 | **10** |
| 空场景 + 已取消 + 官方 EB 相交 | **2** |
| 去重后的 EB 对照族 | 9 |

真断号（官方 EB 对上）只有 10 张。另外 68 张空场景取消只是同 WI 兄弟，**不能**当成同一异常的前史。

## 文件

| 文件 | 内容 |
|---|---|
| `summary.json` | 计数 |
| `related_by_wi.json` | WI → 兄弟单号 |
| `extras_details.json` | 226 张明细 |
| `keep_empty_or_shared.json` | 空场景或共享 EB |
| `eb_contrast_groups.json` | EB → 种子单 + 扩出单 |
| `readable.json` | 共享 EB 的 10 张可读摘要 |
