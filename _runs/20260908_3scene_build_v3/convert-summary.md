# convert-summary（Round 2.1）

- 生成时间: 2026-09-08T14:50:32.043Z
- 输入: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260908_3scene_build_v3\case_level_dataset_入库_enriched.json`
- 输出: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260908_3scene_build_v3`
- requireEb: true
- allowedScenes: 20250407004, 20250407008, 20250522001

## 过滤漏斗

| 阶段 | 数量 |
|------|-----:|
| case 总数 | 537 |
| 命中三场景（case） | 31 |
| 通过过滤写入 details（VASC 展开） | 34 |
| 其中 clean（可抽样） | 27 |
| 其中 flagged（保留不抽样） | 7 |

## 过滤原因分布（未写入或跳过的次数）

| 原因 | 次数 |
|------|-----:|
| not_three_scene | 506 |
| no_eb | 16 |

## 三场景命中（过滤前，case 级）

- F-001: 7
- A: 5
- B: 19

## details 按场景（VASC 级）

| 场景 | clean | flagged |
|------|------:|--------:|
| F-001 | 2 | 0 |
| A | 4 | 0 |
| B | 21 | 7 |

## 群聊上下文

- conversationAvailable=true: 31
- conversationAvailable=false: 3
- 缺失比例: 8.8%

## customerIntent 约束

- 仅由 requirementBackground + requirementDescription 构成
- 不包含 sceneOverviewNames / sceneName / 审核备注 / 退回原因
- sceneCode/sceneName 仅写在 atom OMS 元数据
