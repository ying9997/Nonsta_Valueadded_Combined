# 妥投未收到 — 分支语义与编排提示

供维护者与 Planner 参考；**main.md** 已包含执行顺序，本文件为细化说明。

## branch 与典型动作

| branch | 典型动作 | suggestedNextExperts |
|--------|----------|----------------------|
| `need_info` | 请客户提供运单号/出库单号或轨迹截图 | `[]` 或 `delivery-status` |
| `early_exit` | 解释代收/柜/前台等场景 + 自查步骤 | 通常 `[]` |
| `cooling_wait` | 妥投后短时内建议等待与自查 | 通常 `[]` |
| `no_claim_channel` | 说明当前无可用线上索赔入口 | `need_human` 时可并列说明 |
| `claim_path_domestic` | 国内件索赔话术骨架（不写条款原文） | `refund-standard`、`substitute-claim` |
| `claim_path_international` | 国际件索赔话术骨架 | `refund-standard`、`substitute-claim` |
| `not_eligible` | 不满足受理条件的原因说明 | 视情况 `refund-standard` |
| `need_human` | POD、渠道、国别、时效等需人工/系统复核 | `substitute-claim` |
| `handoff_claim` | 客户确认发起索赔 | `substitute-claim`（必填倾向） |

## 与队列中其他专家的关系

- **delivery-status**（编排前置，默认）：向本专家传入 **`enrichedContext`**（轨迹正文、`fetchMeta`、`analysisClock` 等，见 delivery-status design §3）与 **`inputContext.previousOutput`**（上游 **`result`**：`analysis` 为轨迹/状态解读长文，可选 `structured`）。DNR 应 **优先采信 `analysis`**，用 `trajectories` 核对细节；缺轨迹且无上游分析时不得臆造妥投事实，应 `need_info` / `need_human` 并建议 **`delivery-status`**。
- **refund-standard**：需要条款、时效、举证、政策分支时调用；本专家不在 `analysis` 中复述长条款。
- **substitute-claim**（代客索赔）：需要官方入口、材料清单、进度查询时调用；**本专家不编造链接**。

## 冷静期占位

默认 **48 小时** 用于 Prompt 可执行性；业务最终阈值以运营/法务对齐为准，对齐后应同步修订 **main.md** 与 **design.md §6**。
