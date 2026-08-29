# udesk-stratified-v0.1（Udesk 分层抽样）

从真实客户–客服对话抽出的评测会话。叶子本版只做 `intent`（首轮意图）/ `missing`（中段缺信息）；`sop_gate` 延后。

## 文件

| 文件 | 说明 |
|------|------|
| `sessions.json` | 终选会话清单（**开头有中文字段说明** `fieldLegendZh` / `bucketNamesZh`） |
| `leaves.jsonl` | 切好的单轮叶子 |
| `leaves.manifest.json` | 叶子计数 |

会话数：**110** · 2.1亲缘：**10** · 叶子：**200**（intent 110 + missing 90）

## 粗桶代号（BN）对照

| 代号 | 中文 | 目标 | 实得 |
|------|------|------|------|
| B1 | 入库·换标/辨识上架 | 18 | 27 |
| B2 | 入库·异常调拨/串仓 | 11 | 11 |
| B3 | 入库·拍照/视频/暂存 | 11 | 12 |
| B4 | 入库·其它 | 9 | 10 |
| B5 | 库内·换标/货权/SKU | 13 | 13 |
| B6 | 库内·拍照/盘点/尺重 | 11 | 14 |
| B7 | 库内·其它（冻结/销毁/加固等） | 10 | 10 |
| B8 | 入口/怎么填/报价审核咨询 | 9 | 13 |

## 怎么验收顶部字段

打开 `sessions.json` 最上方：

1. 先看 `说明`、`fieldLegendZh`、`bucketNamesZh`（中文词典）  
2. 再看 `finalByPrimaryBucketZh`（带中文的各桶通数）  
3. `relabel21InSelected` = 2.1 亲缘通数（现为 10）  
4. `coverageGaps` = 缺口列表（现为空数组 = 无缺口）

中间产物：`_runs/20260829_udesk_sample/`
