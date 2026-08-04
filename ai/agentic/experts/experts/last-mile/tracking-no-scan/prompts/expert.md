# 轨迹无上网 — 分支语义与 Planner 提示

供维护者与 Planner 参考；**main.md** 含执行顺序；**业务知识正文**在 **kb.md**（随内部 SOP 更新）。

## 知识来源与维护

| 类型 | 说明 |
|------|------|
| **对客输出** | 仅用 **kb.md** 与 `enrichedContext` 中的事实组织话术；**禁止**在 `analysis` 中附带 winitlink、内部协作 Wiki 等内部文档链接。 |
| **内部溯源** | 内部运营知识库与仓库 **kb.md** 应对齐；定稿后同步更新 **prompts/kb.md**（不在本文件写外网可点链接，避免误拷贝进 Prompt）。 |

## branch 与典型动作

| branch | 典型动作 | suggestedNextExperts |
|--------|----------|---------------------|
| `need_info` | 补单号/出库单/上下文 | `delivery-status` |
| `bulk_no_tracking_online_service` | 转在线服务支持（话术见 KB-1，**不附链接**） | `[]` 或人工队列 |
| `non_registered` | 非挂号话术 | 通常 `[]` |
| `carrier_has_scan` | 告知已有 SCAN、非无上网异常 | 停滞诉求可用 `tracking-stale` |
| `tracking_data_unverified` | 接口仅有仓库节点，承运商数据未确认；等待/补取新鲜承运商轨迹 | `[]` |
| `mixed_scan_state` | 按逐票扫描状态拆票 | 已扫描票转 `tracking-stale` |
| `standard_claim_review` | 无 Ascan 且约 11–45 天，核验 WINIT 标准赔付完整条件 | `refund-standard` |
| `claim_window_manual_review` | 超过摘要窗口，人工核验规则与时效 | `refund-standard` |
| `parcel_created_within_10_days` | ≤10 自然日安抚话术 | 通常 `[]` |
| `platform_mixed_10_to_21_days` | 平台混合 10–21 日话术 | 通常 `[]` |
| `platform_mixed_over_21_days` | 平台混合 >21 日话术 | 视情况 `tracking-inquiry` |
| `manual_inquiry_split_weight` | 人工查件 | `need_human` / `tracking-inquiry` |
| `heavy_or_reweigh_parcel` | 多舱/重包裹话术 | 通常 `[]` |
| `standard_inquiry_and_ticket` | 常规话术 + 系统/工单 | `tracking-inquiry` |
| `non_compliant_submission` | 不合规说明 | 通常 `[]` |
| `compliant_recorded` | 合规记录闭环 | 通常 `[]` |
| `special_inquiry_escalation` | 非美 UPS 特殊查件（KB-2） | `need_human`、`tracking-inquiry` |
| `ups_us_substitute_claim` | 美 UPS 代客索赔路径（KB-2，Bitable/API） | `substitute-claim`、`need_human` |
| `need_human` | 缺 API 数据或无法分支 | `delivery-status`、`tracking-inquiry` |

设计级说明见 [design.md](../design.md)。

## 与队列中其他专家的关系

- **delivery-status** / 其他前序：若已在 `enrichedContext` 中提供 **可用 `trajectories`**（或设 `skipTrajectoryFetch` / `reuseUpstreamTrajectoryFacts`），**fetch-and-enrich 不会重复打 Winit**；仅补充合并 bulk、`orderDetails` 等。无前序时本专家自拉。
- **refund-standard**：需要赔付条款时调用。
- **tracking-inquiry** / **substitute-claim**（代客索赔）：工单入口、代客索赔、登记类动作；本专家不编造链接，**不对客承诺**已/将代为登记或跟进。
- **`carrier_has_scan`**：客户原诉「无上网」但事实已有 SCAN → 澄清非无上网；若真实诉求是扫描后停滞，可转 `tracking-stale`，不得继续套用无上网赔付规则。
- **`tracking_data_unverified`**：不能把仓库节点或空扫描数组解释成承运商确定未扫描；不得进入赔付窗口判断或推荐索赔专家。

## 集成备忘

- **异步下载等价数据**、**Bitable 写调查记录** 由上游或 Phase B 代码节点写入 `enrichedContext`；无数据时勿假装已完成拣选车核对或调查登记。
