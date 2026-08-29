# udesk-stratified-v0.1（Udesk 分层抽样）

从真实客户–客服对话抽出的评测会话。叶子本版只做 `intent`（首轮意图）/ `missing`（中段缺信息）；`sop_gate` 延后。

## 文件

| 文件 | 说明 |
|------|------|
| `sessions.json` | 终选会话清单（开头有中文字段说明） |
| `leaves.jsonl` | 切好的单轮叶子（阶段3重跑后更新） |
| `leaves.manifest.json` | 叶子计数 |

会话数：**110** · 2.1亲缘：**10** · 权威：EVAL-AUTHORITY.md

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

## sessions.json 顶部字段（中文）

| 英文字段 | 意思 |
|----------|------|
| `finalByPrimaryBucket` | 各粗桶最终选中了多少通会话（按主桶统计） |
| `quotaTarget` | 抽样开始前设定的各粗桶目标通数 |
| `relabel21InSelected` | 被标成「像审核SOP§2.1 尺重/标签辨识后换标上架」的会话通数（亲缘，不是细类金标） |
| `coverageGaps` | 没抽满的粗桶清单（桶代号、目标、实得、原因） |
| `highRiskTagged` | 带高危标签的会话通数（可与粗桶重叠） |
| `withVasc` | 对话文本里能抽出 VASC 增值单号的会话通数 |
| `sessionCount` | 终选会话总通数 |
| `primaryBucket` | 本通会话的主粗桶代号（B1～B8） |
| `primaryBucketName` | 主粗桶中文名 |
| `likelyRelabel21` | 是否像 §2.1 换标场景（true=像） |
| `leafPlan` | 本通计划切哪些叶子：intent=首轮意图，missing=中段缺信息，sop_gate=延后 |
| `selectionReason` | 为何入选（配额/高危补强/补抽底线等） |

缺口：
- 无（各桶已达软底线或配额）

中间产物：`_runs/20260829_udesk_sample/`