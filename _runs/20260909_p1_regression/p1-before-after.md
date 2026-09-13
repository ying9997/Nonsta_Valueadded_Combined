# P1 前后 distribution 对比

| 出口 | T1 前 | T1 后 | T2 前 | T2 后 | T3 前 | T3 后 | T4 前 | T4 后 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| L1 | 1 | 1 | 1 | 1 | 0 | 0 | 5 | 5 |
| L2-unsupported | 6 | 1 | 10 | 0 | 4 | 1 | 0 | 3 |
| L2-ambiguous | 1 | 6 | 0 | 9 | 2 | 3 | 3 | 0 |
| L3 | 2 | 2 | 1 | 1 | 0 | 0 | 1 | 1 |
| L4 | 4 | 4 | 0 | 1 | 0 | 2 | 2 | 2 |

## 关键验收

| 项 | 结果 |
|----|------|
| demo-7 outputPath | **7/7** |
| VASC000000315774 | **T1 supported** → `needs_field_clarification`（缺 LF；不再是 F-001 高置信） |
| VASC000000311652 | 仍 `sop_generated` |
| VASC000000311505 | 仍 `sop_generated` |
| trace 动作约束段 | 已写入 `p1_verify` / post_p1 traces |

## 代码改动摘要

1. 删除 `taggedF001` / `context:oms_scene_f001_assist`
2. T1 卡补 strong：`辨识`、`辨识后补贴包裹标签`；weak：`确认SKU` 等；`textHas` 允许「补贴…包裹标签」隔字
3. `ACTION_SCENE_MAP` 加权 ±2（按映射累加）；收紧「关联第三方 / 补贴包裹标签 / 换商品标签」正则防误伤
4. `MatchResult` + `renderTrace` 展示动作约束

## 说明

- VASC000000326061（demo）：path 仍 `sop_generated`，scene **F-001→T1**（正文实为补贴包裹标签；原靠 OMS assist）。
- 去掉 OMS 先验后，部分 case 进入 L2-ambiguous（预期）；T3 自然 L4：0→2；T2 出现 1 条自然 L4。
