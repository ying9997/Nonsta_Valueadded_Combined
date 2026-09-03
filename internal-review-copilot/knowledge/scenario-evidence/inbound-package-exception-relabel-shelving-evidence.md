# 场景 A evidence：【入库】包裹类异常换商品标签上架

- 日期：2026-09-02
- 性质：知识库 evidence，不是运行时 card，不是 gold jsonl
- 配套：`internal-review-copilot/knowledge/scenario-card-dependency-audit.md`
- 本文件不改 `lib/**` / `scripts/**`，不声称本场景已有完整金标

---

## 1. 场景基本信息

| 项 | 值 |
|----|----|
| sceneKey | `inbound_package_exception_relabel_shelving`（拟新增；仓库内原先无此 key） |
| sceneName | 【入库】包裹类异常换商品标签上架 |
| 当前状态 | **candidate_supported** |
| 是否已有业务签批 | **否**（无独立 2.5 运行规则文件，无签批附件/字段表，与 F-001 边界未签批） |
| 是否已有历史 gold 样本 | **否**（知识库写 47 条历史；本项目没有 A 的 casebook / 正式 gold。OMS 展开池里有带该场景名的已完成单，尚未人工核验是否符合 §2.5 定义，不能当正式 gold） |
| OMS 场景码（旁证，不能单独命中） | extras 池见 `sceneOverviewCode=20250407008`。**不得**只凭场景码或 `OW01V1602` 命中 |

建议用法：可召回进 topK；高置信才标 A。不得与 F-001 同级自动放行，不得按未签批字段拦单。

---

## 2. 权威来源

### 2.1 必须核对的本地来源

| 路径 | 角色 | 可信度 | 对本场景的结论 |
|------|------|--------|----------------|
| `workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md` | SOP **完整栏目**权威（场景概述…附件要求） | **authority**（完整性模板） | **不含**本 OMS 场景定义，也不是场景匹配权威。填写示例是「开箱装配件」「库内库存验证拍照」，不是 A |
| `workspace/knowledge/sop/库内增值_知识库_SOP模板场景清单.md` | 从新版知识库抽出的**库内**清单 | **deprecated_reference**（错范围） | #7「拍摄照片/视频」、#9「指定单品/库位换标」、#20「A+包裹更换标签」都是库内或近邻，**不能当 A 权威** |
| `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | F-001 主规则 | **authority**（仅 F-001） | 典型触发已含「商品条码与包裹条码不对应」「供应商贴错条码后换商品标签」，与 §2.5 **重叠**。只作边界对照，不是 A 定义 |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/` | F-001 教材（rules 8 条、CASEBOOK 12 组、index 183 张） | **derived** | 多组也是「换商品标 + 上架」。第 7/8 组是称重拍照/暂存，作 A 的反例。**不是** A 金标 |
| `agent-inventory-assist/03_evaluation/datasets/oms-scene-f001-v0.1/` | F-001 倒查试用集（3 通会话 + 183 池） | **derived**（仅 F-001） | 部分 SOP 含「先不要上架 + 换商品标签」，是 F-001 / A / 拦截近邻，**不是** A 金标 |

### 2.2 新版知识库 §2.5 原文（权威）

仓库内**存在**完整原文，不是间接摘要：

- 路径：`workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md`
- 位置：`### 2.5 【入库】包裹类异常换商品标签上架（47条）`（约 L316–L331）
- 附录频次：§6.1 排名第 7，47 条
- 可信度：**authority**（场景定义 + 短模板）

**场景定义（原文）：** 包裹条码正常，商品条码异常。

**标准 SOP 模板（原文结构）：**

```text
异常编号：[EBxxx]
新入库单：[WIxxx]
1. 补贴包裹标签 × [数量]
2. 补贴商品标签 × [数量]
3. 上架到新入库单[WIxxx]
4. 将异常单状态变更为已完成，关闭异常单。
```

**没有**同等独立运行文件：仓库内不存在 `2.5-*.md` / `inbound-package-exception-*.md` 规则文件。运行边界、附件勾选、与 F-001 互斥均为 **missing**。

### 2.3 其它来源（不得升格为 authority）

| 路径 | 可信度 | 说明 |
|------|--------|------|
| `agent-inventory-assist/02_design/PRD-非标增值生成Agent-V1.0.md` §4.2 | **derived** | **未列**本 sceneKey。禁止把 PRD 自造 `sku_mapping` 写成 OMS fieldKey |
| `_runs/20260901_oms_eb_expand/extras_details.json` | **derived**（OMS 旁证） | 6 张已完成单带 `sceneOverviewName=【入库】包裹类异常换商品标签上架`、`sceneOverviewCode=20250407008`、`isAuditThrough=Y`。未做 §2.5 人工核验 |
| `_tmp/20260831_oms_f001_expand/udesk_vasc_oms_cache.json` | **derived** | 客服会话反查命中该 OMS 场景名，`exactScene=false`，不是内部审核金标 |
| `internal-review-copilot/knowledge/scenario-cards/inbound-package-exception-relabel-shelving.json` | **derived** | 已有 card 骨架；本 evidence 是其依据，不替代签批 |
| 旧 38 场景 `kb-template-index.md` 等 | **禁止** | DEPRECATED |

---

## 3. 正向识别信号

必须同时看到：**包裹侧异常表述 + 换商品标签 + 上架（通常到新 WI）**。只有「换标 + 上架」不够。

### strong positive signals

- 正文明确写「包裹类异常」
- 「包裹条码正常」且「商品条码异常」
- 作业是换 / 补贴**商品标签**（不是只换包裹标、不是只贴第三方箱唛）
- 处理后上架到指定 WI，并关闭 / 完成异常单
- OMS 已标本场景名（可辅助，**不能单独当命中**）

### weak positive signals

- 「补贴包裹标签」+「补贴商品标签」（§2.5 模板步骤；单独出现不够）
- 「新入库单」「上架」「关闭异常单」
- 「覆盖原商品标签」「贴商品标」
- 原子 `OW01V1602` / 「入库其他服务需求」（几乎所有入库非标都有）

弱信号只能进 topK 候选，不能把 decision 推成高置信 supported。

---

## 4. 反向排除信号

### 不是 F-001 的情况

出现下列任一，优先 F-001 或转人工，不要高置信标 A：

- 尺重 / 标签**辨识**后再换标
- 绿标 SKU、撕覆盖标后按露出 SKU 认货（本批 `348477`）
- 同一包裹混多个 SKU，需按实物对应关系辨识
- 已提供或明确要求「商品和标签的对应关系」作为辨识附件
- OMS 场景名已是「尺重/标签辨识后换标上架」（`20250407004`）

### 不是场景 B 的情况

- 指定商品 / 异常包裹**拍照核实**后再决定处理方式
- 数字标识 + 回传命名 + **暂存区** / 「等客户确认后再处理」
- 只有拍照、没有换商品标上架

### 不是「拦截不上架 / 先放一边」

- 「拦截不上架」「先放在一边」「暂存不上架」且**没有**换商品标 + 上架
- 本批 14 条同文拦截单（`347559`…`347517`）必须 `unsupported` / `transfer_human`

### 不是库内拍照 / 视频或其它库内场景

- 库内清单 #7「拍摄照片/视频」、SOP 填写示例「库内库存验证拍照」
- 库内「指定单品/库位商品更换标签上架」「A+包裹更换标签上架」
- 出库「补贴/更换商品标签」
- 无主货找回后补贴标签（新版 §2.9）
- 「直接扫描上架 / 第三方箱唛已关联」（本批 `348495`）
- 「不用辨识、只换包裹标签盲贴」（cache `VASC000000301812`：OMS 标了 A 名，正文是换**包裹**标，作 A 反例 / 脏标）

---

## 5. 与 F-001 的边界（保守处理）

A 与 F-001 **都可能包含「换标 + 上架」**。2.1 典型触发已写「商品条码与包裹条码不对应」，与 §2.5「包裹条码正常、商品条码异常」几乎同句。**边界未业务签批。**

保守规则（pending，供 card / Eval 用，不是已生效产品规则）：

1. 有「尺重 / 辨识 / 绿标 / 混 SKU / 对应关系附件」→ **优先 F-001**。
2. **仅当**正文明确「包裹条码正常、商品条码异常」或「包裹类异常」，且作业是换商品标后上架、**没有**辨识叙事 → 才允许高置信标 A。
3. 只有「换商品标签并上架」、两边信号都不够 → **`ambiguous` / `manual_review`**，`supported=false`，不得进 `check-completeness`，不得两卡抢。
4. `348477`（物流标盖住绿标 SKU，撕开后按 SKU 换商品条码再上架）= **F-001 vs A 边界待判**。现网 dry-run 走 F-001。正式改判必须显式点名，不能静默漂成 A。
5. 区分不了时禁止强行 `supported`。

---

## 6. 样本候选

检索范围：新版 §2.5、F-001 casebook / oms-scene-f001-v0.1、udesk cache、`_runs/20260901_oms_eb_expand/extras_details.json`、本批 16 条 dry-run。未新拉 OMS。

| # | source file | source type | 线索 | 最终审批结果 | 可作为 gold | 适合层级 | 备注 |
|---|-------------|-------------|------|--------------|-------------|----------|------|
| A1 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` §2.5 | derived_example | 定义 + 四步模板 | 无（模板） | **否** | L2 | 唯一干净正例草稿。可造 smoke，不是历史单 |
| A2 | `_runs/20260901_oms_eb_expand/extras_details.json` · `VASC000000233940` | historical_completed | OMS 场景名 A；SOP「补贴附件商品标签后，上架到新单 WI48280416」；`isAuditThrough=Y`；已完成 2026-02-05 | **有**（通过 + 完成） | **否（待核验）** | L2 / L4 | 最接近 §2.5 模板。缺「包裹条码正常 / 商品条码异常」原文，核验前不能入正式 gold |
| A3 | 同上 · `VASC000000251262` | historical_completed | OMS 场景名 A；SOP「补贴商品条码…上架到 WI48486961」；审核通过；`vaSource=UNUSUAL` | **有** | **否（待核验）** | L2 | 有 EB。未写清包裹条码是否正常 |
| A4 | 同上 · `VASC000000217224` / `217263` / `217302` / `217308` | historical_completed | 四张同文「补贴万邑通单品码上架」；审核通过 | **有** | **否** | L2 | SOP 过短，看不出是否「包裹类异常」。最多当同文一致性探针 |
| A5 | `_tmp/20260831_oms_f001_expand/udesk_vasc_oms_cache.json` · `VASC000000251802` | conversation | OMS 场景名 A；「按对应关系覆盖原商品标签 + 上架 WI」；会话 `#h28vz4rj` | **本缓存未见审核字段** | **否** | L2 | 客服会话，不是待审核金标。「对应关系」会把模型推向 F-001 |
| A6 | 同上 · `VASC000000207000` | conversation | OMS 场景名 A；拆快递袋按实物 SKU 换商品条码、原单上架；服务名却是「库内其他服务需求」 | 未见 | **否** | L2 | `exactScene=false`；入库/库内标签冲突 |
| A7 | 同上 · `VASC000000301812` | conversation | OMS 标了 A 名，正文「不用辨识、换新 WI **包裹**标签盲贴」 | 未见 | **否** | L2 | **A 反例 / 脏标**：场景名不可当金标 |
| A8 | 同上 · `VASC000000293940` | conversation | 「部分到仓商品需要换标上架」+ 补贴商品标签 | 未见 | **否** | L2 | 弱正例，缺包裹类异常句 |
| A9 | `_runs/20260902_internal_review_dryrun_after_requirement_source_fix/` · `VASC000000348477` | shadow_pending | 撕物流标、按绿标 SKU 换商品条码再上架 | **无**（待审核） | **否** | L2 / L3 | F-001 vs A 边界。现网命中 F-001。不计入准确率 |
| A10 | 同上 · `VASC000000348495` | shadow_pending | 直接扫描上架，第三方箱唛已关联 | **无** | **否** | L2 | A / F-001 共同反例 |
| A11 | 同上 · `VASC000000347559`（代表 14 条） | shadow_pending | 「拦截不上架 / 先放一边」，无换标 | **无** | **否** | L2 | A / B / F-001 共同反例。14 张同文算 1 个作业 |
| A12 | `workspace/knowledge/cases/f001-inbound-relabel-shelving/CASEBOOK.md` 第 1/9/11 组 | casebook | 换商品标或标准「更换新商品条码」后改 F-001 | 有（完成 / 取消 / 终止） | **否（对 A）** | L2 | 只证明「换标 ≠ A」。F-001 教材，不是 A gold |
| A13 | `oms-scene-f001-v0.1/candidates.json` `#h28xxs7z` / `VASC000000260013` | conversation | F-001 倒查会话 | 锚点单在 CASEBOOK 为完成 | **否（对 A）** | L2 | F-001 正例，A 反例 |

---

## 7. 缺口

| 缺口 | 现状 | 是否阻塞正式评测 | 是否阻塞 v0.2 骨架 |
|------|------|------------------|-------------------|
| 历史通过单（已核验、可入 gold） | 知识库声称 47 条；本项目 **0** 条已核验 gold。extras 有 6 张带场景名的已完成单，**缺人工核验** | **阻塞正式准确率** | 不阻塞。可用 §2.5 造 1 条 derived 正例 |
| 取消 / 驳回 / 审核未过单 | **0**。未找到「OMS 场景=A 且取消/未通过」的已整理样本 | **阻塞**（缺负向 gold） | 不阻塞。拦截 / `348495` / `301812` 可作 derived/shadow 反例 |
| 附件 / 字段签批 | **全部缺**。无 2.5 白名单，无模拟必填。不得借用 F-001 三必填 | 阻塞 L3 正式分（A 不得按附件对错判） | 不阻塞。card 附件策略保持 `pending` / `enforcement=none` |
| 与 F-001 边界签批 | **缺**。2.1 与 §2.5 定义重叠 | **阻塞**高置信双场景自动放行 | 不阻塞骨架。模糊必须 `ambiguous` |
| 本批待审核正例 | 16 条无 A 正例；`348477` 只是边界 | 不阻塞（shadow 不作 gold） | 不阻塞 |
| OMS 码表核验 | extras 见 `20250407008`，未对照正式码表文档 | 不阻塞抽评测 | 不阻塞；禁止只凭码命中 |
| 独立 2.5 运行文件 | **不存在** | 不阻塞 v0.1 抽样 | 不阻塞 card 骨架 |

**结论：** A 可以进 candidate card 和 Eval v0.1 的 **derived / shadow** 格；在核验至少 1 张历史通过单、补 1 张取消/驳回、并写下 F-001 互斥之前，**不能**把 A 写成已有完整金标，也不能和 F-001 一起算正式准确率。

---

## 8. 附件 / 字段状态与门禁（本轮确认）

| 项 | 状态 |
|----|------|
| 必填附件 / 字段 | **pending**。无签批白名单，无 simulated 必填。不得借用 F-001 三必填，不得把 PRD `sku_mapping` 写成 fieldKey |
| 可否进入 match-template v0.2 topK | **可以**（candidate_supported）。高置信才标 A；模糊必须 ambiguous |
| 可否进入 check-completeness hard gate | **不可以**。命中后 `enforcement=none`，不得按未签批字段拦单 |

2026-09-02 探测补记：Udesk 无「包裹类异常 / 包裹条码正常」原词；飞书有换商品标签催审线程但无 OMS 终态。详见 `data-source-probe-ab.md`。不写 CASEBOOK，见 `workspace/knowledge/cases/inbound-package-exception-relabel-shelving/CASEBOOK_TODO.md`。
