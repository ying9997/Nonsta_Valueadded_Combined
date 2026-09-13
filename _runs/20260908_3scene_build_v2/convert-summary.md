# convert-summary（Round 2）

- 生成时间: 2026-09-08T13:57:44.021Z
- 输入: `D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2\by_flow\case_level_dataset_入库.json`
- 输出: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260908_3scene_build_v2`
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

- conversationAvailable=true: 24
- conversationAvailable=false: 10
- 缺失比例: 29.4%

## customerIntent 约束

- 仅由 requirementBackground + requirementDescription 构成
- 不包含 sceneOverviewNames / sceneName / 审核备注 / 退回原因
- sceneCode/sceneName 仅写在 atom OMS 元数据
