# 如何设计专家（规划与设计手册）

本文面向**新增或重构**某一业务域专家体系的开发者与产品/业务同学，说明在动手写 `experts/{domain}/{expert-id}/` 代码**之前**，如何从客服场景、域划分、边界、API 与知识库一路收敛到可实现的 `design.md`。

**与实现手册的分工**

| 阶段 | 文档 | 产出 |
|------|------|------|
| **规划与设计**（本文） | [how-to-design-expert.md](how-to-design-expert.md) | 域 plan、边界卡、API 矩阵、`docs/experts/` 参考、`design.md` 草稿 |
| **实现与交付** | [how-to-create-expert.md](how-to-create-expert.md) | `manifest.json`、`nodes/`、`workflow.json`、`export:coze` |

**建议阅读顺序（规范原文）**

1. [REQUIREMENTS.md](../REQUIREMENTS.md) — 专家定位、不互调、Schema 与对客约束摘要  
2. [design-spec.md](design-spec.md) — 元数据、`inputSchema`、上下文、`format-output` 形状  
3. [plan/domain-taxonomy.md](plan/domain-taxonomy.md) — 域划分与命名约定  
4. [plan/project-plan.md](plan/project-plan.md) — OKR 与排期对齐  
5. 实现阶段再读 [how-to-create-expert.md](how-to-create-expert.md) 与 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md)

**路径说明**：规划文档在 **`docs/plan/`**；流程知识库在 **`docs/{domain}/`**（如 `docs/inbound/playbook.md`）；单专家业务参考在 **`docs/experts/{域}/`**；实现侧权威设计在 **`experts/{域}/{id}/design.md`**。

---

## 0. 本仓库里的「设计」指什么

专家设计要解决四件事，**全部在写代码前想清楚**：

1. **路由**：客户这类问题该由哪个 Expert 处理？不该由谁处理？  
2. **契约**：最小入参、结构化输出、是否需要 `enrichedContext` 透传？  
3. **数据**：读哪些 API / KB？缺 API 时如何降级或标 Gap？  
4. **编排**：工作流主分支（校验 → 拉数 → LLM → format-output），**不在设计阶段写节点代码**。

设计阶段的分散材料目前分布在各域 plan（如 [inbound-experts-plan.md](plan/inbound-experts-plan.md)）、Playbook、API 矩阵与 `docs/experts/` 中；**本文把它们串成统一流程**。

---

## 准备

1. 确认本专家所属 **OKR 场景**与目标月份（见 [project-plan.md](plan/project-plan.md)）。  
2. 确认 **domain** 与 **expert-id** 命名符合 [domain-taxonomy.md](plan/domain-taxonomy.md)（`[a-z0-9-]+`，目录名与最终 `manifest.id` 一致）。  
3. 若有客服咨询样本，整理为「一级分类 + 细分场景 + 量级」表（参考 [inbound-data.md](plan/inbound-data.md)）。  
4. 收集该场景 SOP、Helpdesk 话术、内部 Wiki 链接（设计用；**对客 `analysis` 禁止引用**，见 [REQUIREMENTS.md](../REQUIREMENTS.md) §4）。

---

## 步骤 1：数据分析与场景聚类

**目标**：从原始咨询数据中归纳「一类客户诉求 = 一个处理闭环」。

| 动作 | 说明 |
|------|------|
| 统计量级 | 按一级/二级分类计数，优先覆盖高频场景 |
| 识别闭环 | 同一数据源、同一套 API、同一套对客话术结尾 → 候选合并为一个 Expert |
| 识别例外 | 量极低（如 <50 条/季）、无独立 API、无独立 SOP → 并入相邻 Expert 或标「人工兜底」 |
| 标注旅程阶段 | 对应客户旅程节点（如入库：TS / 到仓 / 上架 / 清关），便于后续 Playbook 映射 |

**产出**：`docs/plan/{domain}-data.md` 或在该域 plan 文档中增加「场景覆盖映射」表。

**入库示例**：[inbound-experts-plan.md §五](plan/inbound-experts-plan.md) 将 8,989 条咨询映射到 18 个专家。

---

## 步骤 2：域选型与专家拆分

**目标**：决定 Expert 放在哪个 `domain`，以及业务流程层 / 基础信息层 / 共享域如何分工。

按 [domain-taxonomy.md §六](plan/domain-taxonomy.md) 选型：

1. 客户问的是**某一环节的单据/进度/异常** → **客户旅程域**（`inbound`、`outbound`、`last-mile` …）。  
2. 逻辑被**多个旅程**共用，且含独立判断规则 → **共享基础域**（`warehouse`、`customer`、`sku`）。  
3. 仅 FAQ、无 API、且只服务单一场景 → 可留在该旅程域的**基础信息层**（如 `inbound/inbound-warehouse-info`）。

**两层拆分（旅程域内常用）**

| 层 | 定位 | 示例 |
|----|------|------|
| **业务流程层** | 完整对客闭环：拉数 + 判断 + 话术 + 升级路径 | `inbound/inbound-exception-check` |
| **基础信息层** | 状态查询、规则 FAQ、静态资料；可被业务层复用 | `inbound/inbound-order-status`、`inbound/inbound-process-guide` |

**跨域依赖**：在 plan 中单独列出，**不**把 `warehouse/*`、`sku/*` 硬塞进 `inbound` 目录（见 [inbound-experts-plan.md §四](plan/inbound-experts-plan.md)）。

**产出**：域 plan 文档中的专家清单表（含 `[ ]` / `[x]` 勾选列，约定见 [domain-taxonomy.md §五](plan/domain-taxonomy.md)）。

---

## 步骤 3：为每个 Expert 写「边界卡片」

**目标**：每个候选 Expert 一张卡，避免路由重叠与实现期返工。在域 plan 中用统一小节（参考 [inbound-experts-plan.md §六](plan/inbound-experts-plan.md)）。

**边界卡片模板**（复制到 plan 或 `docs/experts/{域}/{id}.md`）：

```markdown
### `{domain}/{expert-id}`

**问**：客户哪些问题由本专家处理（列举 3～5 条典型问法）  
**不问**：明确路由到其他 Expert 的情形（→ `other/expert-id`）  
**衔接**：与上下游 Expert 的数据交接（谁传入 enrichedContext / 结构化字段）  
**输入**：业务最小入参（将写入 manifest.inputSchema）  
**输出**：structured 关键字段 + analysis 原则（一句话）  
**依赖**：API / 共享域 Expert / KB 文档路径  
**降级**：API 未就绪时的 Mock、纯 KB、或标「阻塞」  
```

**路由速查**：域 plan 末尾增加一棵 ASCII 或 mermaid 决策树（见 [inbound-experts-plan.md §七](plan/inbound-experts-plan.md)）。

**硬约束（设计期就要遵守）**

- Expert **不互相调用**；缺数据时在 `analysis` 或 planner 侧声明需哪类专家补参（[REQUIREMENTS.md](../REQUIREMENTS.md)）。  
- `inputSchema` **只规划业务字段**；`query`、`inputContext` 等框架字段不进 Schema（[design-spec.md](design-spec.md) §6）。  
- 需要链式 enrichedContext 时，在设计中注明是否开启 `x_recaller_propagate_previous_enriched_context` 及优先来源专家。

---

## 步骤 4：API 矩阵与就绪度

**目标**：每个 Expert 依赖哪些接口、读写属性、就绪百分比、Gap 谁跟进。

| 列 | 含义 |
|----|------|
| Expert ID | 与目录一致 |
| 消费场景 | 本专家哪条分支用该 API |
| action / 系统 | OpenAPI action 或 OMS/MKS/内部服务名 |
| 读/写 | 只读查询 vs 创建/更新 |
| 就绪度 | 0% / 20% / 100% 等；0% 标「下期」或「阻塞」 |
| Gap | 无 OpenAPI、仅飞书表、需研发新建等 |

**产出**：

- 域级矩阵：如 [inbound-api-matrix.md](plan/inbound-api-matrix.md)、[warehouse-api-matrix.md](plan/warehouse-api-matrix.md)  
- 跨域共享层（额度、PSC、权限表）在矩阵中单列「共享层」节，避免每个 Expert 重复调研  

**API 调研**：可复用 [plan/prompts/inbound-api-discovery-prompt.md](plan/prompts/inbound-api-discovery-prompt.md) 发给后端仓库 Agent；交付物回填矩阵，**不**要求对方改 experts 仓库。

**排期策略**（参考 [last-mile-plan.md §二](plan/last-mile-plan.md)）：

- **本期**：API-READY > 0%，可先实现主路径  
- **下期**：API = 0%，设计完成但实现标 `阻塞` 或 Mock 分支  

---

## 步骤 5：知识库与 Playbook 对齐

**目标**：把 SOP 映射到 Expert 与 Playbook 章节，避免 LLM 凭空编造。

| 材料 | 位置 | 用途 |
|------|------|------|
| **Playbook / flows** | `docs/{domain}/` | 双轨模型、状态机、决策树、环节分册 |
| **原始 KB** | `_kb/` | SOP 全文、截图；设计溯源用 |
| **专家参考** | `docs/experts/{域}/{id}.md` | 业务流程图、节点表、话术原则 |
| **Prompt 知识** | `experts/{域}/{id}/prompts/kb*.md` | 实现期裁剪进 LLM（非设计必交付） |

**入库示例**：[docs/inbound/README.md](inbound/README.md) 将 11 类咨询映射到 `flows/` 章节与 Expert ID。

设计阶段至少完成：

1. 本 Expert 主要读取哪些 Playbook 章节 / `_kb` 路径  
2. 状态机或 SLA 规则摘要（写入边界卡或参考文档）  
3. 标注 `[KB]`（有出处）与 `[推断]`（待产品确认）

---

## 步骤 6：编写或更新域 plan 文档

**目标**：域内专家体系的**单一事实来源**（SSOT），供排期会与评审使用。

**建议结构**（新域可复制 [inbound-experts-plan.md](plan/inbound-experts-plan.md)）：

1. 结论（专家数量、两层划分）  
2. 业务流程层清单表  
3. 基础信息层清单表  
4. 跨域依赖表  
5. 场景覆盖映射（数据 → Expert）  
6. 各 Expert 边界卡片（§ 步骤 3）  
7. 路由速查树  
8. **专家状态追踪表**（优先级、目标完成月、状态、API、依赖）

**状态列约定**（与实现对齐）：

| 状态 | 含义 |
|------|------|
| `待规划` | 仅有场景名，边界未写 |
| `设计中` | 边界卡 + API 矩阵 + 参考文档进行中 |
| `开发中` | 已按 [how-to-create-expert.md](how-to-create-expert.md) 落代码 |
| `待配置` | 代码完成，Coze/环境未配 |
| `已完成` | 可调用；plan 表最左列改 `[x]` |
| `阻塞` | 缺 API / 业务确认 |

**文件命名**：`docs/plan/{domain}-experts-plan.md` 或沿用 `{domain}-plan.md`（与 [domain-taxonomy.md §三](plan/domain-taxonomy.md) 索引一致）。

---

## 步骤 7：编写 `docs/experts/{域}/{id}.md` 参考文档

**目标**：业务/SOP 视角的设计说明，供实现与评审对照；**不是**运行时代码。

约定见 [docs/experts/README.md](experts/README.md)。建议包含：

1. 业务场景一句话  
2. Expert ID、域  
3. 内部 SOP / Wiki 链接（维护用，不进对客 Prompt）  
4. 业务流程图（mermaid）  
5. 节点/分支说明表  
6. 与其他 Expert 的分工（尤其基础层 vs 流程层）  
7. structured 输出字段草案  

**参考范例**：[docs/experts/last-mile/delivery-status.md](experts/last-mile/delivery-status.md)。

实现权威仍以 `experts/{域}/{id}/design.md` 为准；两者冲突时以 **`design.md` + `manifest.json`** 为准，并回写参考文档。

---

## 步骤 8：编写 `experts/{域}/{id}/design.md`（实现前定稿）

**目标**：把边界卡翻译成**可实现的**输入输出、工作流分支与集成方式，作为 [how-to-create-expert.md](how-to-create-expert.md) 的直接输入。

**推荐章节**（可与模板专家对齐，见 `experts/last-mile/delivery-status/design.md`）：

| 章节 | 内容 |
|------|------|
| 调用说明 | 适用场景、最小入参、参数提示 |
| 示例调用 JSON | 完整框架字段 + `inputs` 示例（对齐 [design-spec.md](design-spec.md) §6） |
| 输入设计 | 业务字段表 → 将抄入 `inputSchema` |
| 数据拉取与兜底 | OpenAPI action、插件链、Mock、公开页兜底 |
| 工作流分支 | validate → fetch → llm → format-output 主路径与异常分支 |
| 输出设计 | `structured` 字段表 + `analysis` 原则 + 是否写 `enrichedContext` |
| 对客约束 | 禁止引用飞书/内部表；升级人工条件 |

此文件可在步骤 1 复制模板目录时先建骨架，**设计评审通过后再填实**。

---

## 步骤 9：设计评审与准入实现

**评审参与者**：产品/客服代表、研发（API）、专家实现者。

**准入 checklist**（全部满足再进入 [how-to-create-expert.md](how-to-create-expert.md)）：

- [ ] Expert ID、domain 符合 [domain-taxonomy.md](plan/domain-taxonomy.md)，且无与同域其他 Expert 的路由冲突  
- [ ] 边界卡「问 / 不问 / 衔接」已写，路由树可覆盖典型咨询  
- [ ] API 矩阵中本 Expert 主路径接口已标就绪度；Gap 有负责人或明确 Mock 策略  
- [ ] Playbook / `_kb` 映射完成；`[推断]` 项已登记待确认  
- [ ] `docs/experts/{域}/{id}.md` 已建（或明确合并进域 plan 边界节）  
- [ ] `design.md` 含示例 JSON、`structured` 草案、工作流主分支  
- [ ] 域 plan 状态追踪行已更新为 `设计中` → 评审通过后改为 `开发中`  

---

## 步骤 10：与实现阶段衔接

设计完成后按固定顺序落地：

1. 复制 [experts/_template/arithmetic-formula/](../experts/_template/arithmetic-formula/)  
2. 从 `design.md` 抄写 `manifest.json`（`description` 含 **Use when**）  
3. 按工作流分支实现 `nodes/`、`workflow.json`、`prompts/`  
4. `npm run dev:expert` → `export:coze` → `check:experts:manifest`  
5. 域 plan 状态 → `待配置` / `已完成`，最左列 `[x]`  

详见 [how-to-create-expert.md](how-to-create-expert.md) 全文。

---

## 附录 A：新域从零启动清单

适用于尚无 `docs/plan/{domain}-experts-plan.md` 的业务域：

1. [ ] 在 [domain-taxonomy.md](plan/domain-taxonomy.md) 登记域 ID 与 Plan 链接  
2. [ ] 整理 `{domain}-data.md` 或等价场景统计  
3. [ ] 创建 `{domain}-experts-plan.md`（结构见步骤 6）  
4. [ ] 如需流程总览，建 `docs/{domain}/playbook.md` + `flows/`  
5. [ ] 创建 `{domain}-api-matrix.md`（可先空表后填）  
6. [ ] 在 [docs/experts/](experts/README.md) 下建 `{domain}/` 目录  
7. [ ] 在 [project-plan.md](plan/project-plan.md) 或域 plan 中对齐 OKR 月份  

---

## 附录 B：已有域新增单个 Expert

不必重写整份域 plan，最小增量：

1. [ ] 在域 plan 清单表增加一行（`[ ]`、优先级、状态 `待规划`）  
2. [ ] 写边界卡片 + 更新路由速查  
3. [ ] 在 API 矩阵增加相关行  
4. [ ] 新建 `docs/experts/{域}/{id}.md`  
5. [ ] 设计评审通过后复制模板并实现  

---

## 附录 C：文档索引

| 文档 | 设计阶段用途 |
|------|----------------|
| [plan/domain-taxonomy.md](plan/domain-taxonomy.md) | 域命名、依赖关系 |
| [plan/project-plan.md](plan/project-plan.md) | OKR、排期缓冲 |
| [plan/inbound-experts-plan.md](plan/inbound-experts-plan.md) | 域 plan 范例 |
| [plan/inbound-api-matrix.md](plan/inbound-api-matrix.md) | API 矩阵范例 |
| [docs/inbound/playbook.md](inbound/playbook.md) | 流程 Playbook 范例 |
| [docs/experts/README.md](experts/README.md) | 专家参考文档约定 |
| [design-spec.md](design-spec.md) | Schema、上下文契约 |
| [how-to-create-expert.md](how-to-create-expert.md) | 设计完成后的实现手册 |

---

*维护：域规划流程或状态约定变更时，请同步更新本页与相关域 plan 的「状态追踪」节。*
