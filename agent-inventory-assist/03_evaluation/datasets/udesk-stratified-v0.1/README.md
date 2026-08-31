# udesk-stratified-v0.1（Udesk 分层抽样）

> **已归档（2026-08-31）** · 见同目录 [`ARCHIVED.md`](./ARCHIVED.md)。  
> **勿再当现行评测主源。** 试用 P0 改看：`../oms-scene-f001-v0.1/` · 权威索引：`../EVAL-AUTHORITY.md`。

从真实客户–客服对话抽出的评测会话（历史试点）。叶子本版只做 `intent`（首轮意图）/ `missing`（中段缺信息）；`sop_gate` 延后。**未做需求收束**，切叶偏早/噪音大。

## 文件

| 文件 | 说明 |
|------|------|
| `sessions.json` | 终选会话清单（**开头有中文字段说明** `fieldLegendZh` / `bucketNamesZh`） |
| `leaves.jsonl` | 切好的单轮叶子 |
| `leaves.manifest.json` | 叶子计数 |

会话数：**111** · 2.1 OMS亲缘：**8**（全池可证 8，精确2.1=2） · 叶子：**201**（intent 111 + missing 90）

## §2.1 亲缘打标（已收紧）

- **不再**用对话口语正则冒充 `likelyRelabel21`
- 须对话抽出 VASC，且 TOM/`oms.VaOrderService_getVasList` 的 `sceneOverviewName` 命中：
  - 精确：`【入库】尺重/标签辨识后换标上架`
  - 亲缘：入库「换商品标签上架 / …换标上架…」等
- 证据：`_runs/20260829_udesk_sample/oms_relabel21_hits.json`
- **coverage gap**：目标 ≥10，Udesk 全池 OMS 对照后仅 8 通，禁止口语正则凑数

## 粗桶代号（BN）对照

| 代号 | 中文 | 目标 | 实得 |
|------|------|------|------|
| B1 | 入库·换标/辨识上架 | 18 | 26 |
| B2 | 入库·异常调拨/串仓 | 11 | 14 |
| B3 | 入库·拍照/视频/暂存 | 11 | 12 |
| B4 | 入库·其它 | 9 | 10 |
| B5 | 库内·换标/货权/SKU | 13 | 13 |
| B6 | 库内·拍照/盘点/尺重 | 11 | 14 |
| B7 | 库内·其它（冻结/销毁/加固等） | 10 | 10 |
| B8 | 入口/怎么填/报价审核咨询 | 9 | 12 |

中间产物：`_runs/20260829_udesk_sample/`
