# T1–T4 场景卡 + 评测集（分轮）

## 本轮授权（已执行）

- 方案：**先卡后集**
- 范围：**仅先建 T1 + T3 场景卡草稿**；样本 / jsonl **下一轮**
- 测集确认：T1–T4；ABC（`20250619`）暂不扩入

| ID | OMS 码 | 场景名 | 本轮 |
|----|--------|--------|------|
| T1 | `20250430` | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 新建卡 draft |
| T2 | `20250522001` | 【入库】指定商品拍照暂存 | 已有 B 卡，本轮不改 |
| T3 | `202506120001` | 【入库】关联第三方商品条码上架 | 新建卡 draft |
| T4 | `20250407004` | 【入库】尺重/标签辨识后换标上架 | 已有 F-001 卡，本轮不改 |

## 产出

- `scenario-cards/t1-inbound-package-barcode-batch-relabel.json`
- `scenario-cards/t3-inbound-third-party-merchandise-barcode.json`

两张卡均为 `status=draft`，**尚未**拷入 `internal-review-copilot/knowledge/scenario-cards/`（晋升 / 接线另授权）。

## 下一轮（未授权，勿自动续跑）

1. 按 T1–T4 从 `_oms_cache` + `three_chat_full_window` 抽 HQ 样本  
2. 出分场景 jsonl / 分布说明  
3. 用样本回填附件 `requiredFieldKeys`，决定是否晋升 `supported`  
4. （可选）将定稿卡晋升到 knowledge 目录  

## 参考

- 测集与映射：`_runs/20260909_inbound_scene_probe/top-recommendation.md`  
- 卡模板：`internal-review-copilot/knowledge/scenario-cards/*.json`
