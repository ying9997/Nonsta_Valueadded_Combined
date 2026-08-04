# 当前摸底修正版：AI 智能客服增值 Expert 链路

> 基线时间：2026-07-22  
> 依据：用户 Coze 实证、`agentic/智能客服expert沟通会议纪要-0722.md`、`agentic/qa-gen_base.csv`、`agentic/qa-gen_expert_system.csv`、`agentic/Coze工作流导出/`、`agentic/value-add-service-guide/`。

## 1. 先修正一个关键误区

之前把问题设计成“先确认客户走 staging_D 还是 production”不成立。

当前口径：

- `cs_Default_Query_v4_production` 资源存在，但用户已在 Coze 实证：主 Bot 的 IF A/B 节点没有连到它。
- 灰度逻辑可以按用户 ID 尾数 5/6/7 走新版、其他尾数走旧版；但在没有待灰度 expert 改动时，两个分支实际都指向 `cs_Default_Query_v4_staging_D`，相当于不启用灰度差异。
- 本课程后续不再把 “production vs staging_D 对比” 作为主问题。需要关注的是：问题是否命中 QID、QID 是否绑定 expert、expert 是否注册且 workflow_id 正确、专家工作流自身是否可跑通。

未验证边界：本地没有完整导出的 `cs_Bot_Client_v2p` 主 Bot 画布，因此“production 未被主 Bot 调用”记录为用户 Coze 实证，而不是本地文件验证结论。

## 2. 修正后的调用链路

```text
客户提问
  -> 万邑联侧栏 AI 客服
  -> 主 Bot：cs_Bot_Client_v2p
  -> 主工作流：cs_Default_Query_v4_staging_D
  -> 改写 / 意图分类 / QID 匹配
  -> qa-gen_base.csv 查 QID 对应知识与 sys_experts
  -> 若没有 QID：走兜底
  -> 若有 QID 但没有 sys_experts：用 QID 知识库答案
  -> 若有 QID 且 sys_experts 非空：进入 experts_recaller_v2_staging_D
  -> Planner 从可用 experts 中选择一个或多个 expert
  -> Agent Loop 按专家登记表的 workflow_id 调 Coze expert workflow
  -> 汇总 expert 输出，交给下游生成最终回答
```

本地证据：

- `Chatflow-cs_Default_Query_v4_staging_D_1-draft-5799` 描述写明 v4 支持通过 qa-gen 配置召回专家智能体。
- 该 Chatflow 读取 `qid` 和 `sys_experts`，并把所有召回项的 `sys_experts` 合并去重为 `expert_ids`。
- 该 Chatflow 中存在 `experts_recaller_v2_staging_D` 节点，并把 `expert_ids` 传入。
- `Workflow-experts_recaller_v2_staging_D_1-draft-6009` 通过专家登记表字段 `coze_workflow_id` / `workflow_id` 调用对应专家 Coze workflow。

## 3. QID 和 expert 的绑定机制

核心不是 `pre_get_solution` 直接生成 expert，而是：

1. 主工作流先匹配 QID。
2. 根据 QID 读取 `qa-gen_base.csv` 行。
3. 从该行 `sys_experts` 字段解析 expert id 列表。
4. `experts_recaller_v2_staging_D` 再用这些 expert id 查询专家注册表。
5. Planner 从可用 expert 中判断是否需要调用、调用几个、调用顺序。

本地证据：

- `qa-gen_base.csv` 中已经存在多行绑定 `value-add-exception-diagnosis,value-add-order-status,value-add-product-recommendation,value-add-service-config`。
- `qa-gen_expert_system.csv` 注册了增值相关 expert，并包含线上 workflow id、版本、release id、schema、描述等字段。

## 4. 当前增值相关 expert 与 workflow id

| expert id | 线上 workflow id | 本地导出目录 | 定位 |
|-----------|------------------|--------------|------|
| `value-add-guide` | `7649772381074849843` | `Workflow-value_add_guide_20260608_1-draft-4575` | 增值服务操作指引 |
| `value-add-exception-diagnosis` | `7657141939158040618` | `Workflow-value_add_exception_diagnosis_20260630_1-draft-4581` | 判断异常是否进入增值推荐链，不推荐具体 VASC |
| `value-add-order-status` | `7657830401780432932` | `Workflow-value_add_order_status_20260702_1-draft-4560` | 查询已提交增值单状态、原子进度、退回/部分完成原因 |
| `value-add-product-recommendation` | `7657143181591642112` | `Workflow-value_add_product_recommendation_20260630_1-draft-4587` | 根据异常事实和客户意图推荐候选 VASC |
| `value-add-service-config` | `7657143966111334434` | `Workflow-value_add_service_config_20260630_1-draft-4606` | 在 VASC 已知时解释服务项/原子编排和字段边界 |

说明：原先说“4 个增值专家”容易漏掉 `value-add-guide`。更稳妥的说法是“5 个增值相关 expert，其中 4 个围绕异常增值链路，另 1 个是操作指引”。

## 5. Coze 平台给 LLM 节点提供知识的两种方式

| 方式 | 原理 | 本项目是否使用 |
|------|------|--------------|
| **Coze RAG 知识库（运行时检索）** | 在 Coze 后台创建知识库、上传文档；LLM 节点配置 `knowledgeFCParam` 绑定；运行时按用户问题做向量相似度搜索，取回最相关片段注入 LLM | ❌ 未使用。所有 5 个 expert 的 `knowledgeFCParam` 均为 `{}`（空） |
| **预注入（开发时硬编码）** | 知识内容写死在工作流的 Text 节点中；运行时通过 Code 节点按条件裁剪后，作为模板变量注入 LLM 的 prompt | ✅ 全部使用这种方式 |

RAG 方式的优缺点：知识量可以很大（几万条），但检索不一定准，可能漏掉关键信息。
预注入方式的优缺点：知识一定在 LLM 看到的上下文里（不会漏），但能装的知识量受上下文窗口限制；更新知识后必须重新生成工作流并重新导入 Coze 才能生效。

## 5.1 `value-add-service-guide` 如何打包进 expert 工作流

结论：知识库经 AI IDE 加工后，以 **Text 节点**的形式硬编码进工作流 YAML。运行时由 Code 节点按条件裁剪，最终通过模板变量注入 LLM 节点的 prompt。LLM 节点本身的 systemPrompt 只包含角色指令和输出格式模板，不包含业务知识正文。

具体三层机制：

```text
Text 节点（type: text）
  ← 存放 AI IDE 从 value-add-service-guide/ 加工浓缩后的知识切片
  ← 开发时写死在 workflow YAML 中
  ↓
Code 节点（type: code）
  ← 运行时按条件裁剪（如按 vasType 取对应章节）
  ↓
LLM 节点（type: llm）
  ← systemPrompt = 角色指令 + 输出格式
  ← 知识通过 {{变量名}} 占位符从上游 Code 节点接收
  ← knowledgeFCParam: {} = 不走 Coze RAG
```

全量验证结果：

| Expert | Text 节点（硬编码知识） | Code 节点 | LLM 节点 |
|--------|------------------------|-----------|----------|
| value-add-guide | `kb-vas`（VAS SOP 操作指引） | `load-vas-kb`（按 vasType 过滤章节） | 1 个，接收 `{{vasSopGuide}}` |
| value-add-exception-diagnosis | `kb-exception-entity`（35 个异常编码实体表）+ `kb-value-add-entry` + `kb-exception-mapping-summary` | `load-exception-entity` + `normalize-exception-facts` + `decide-value-add-candidacy` | 3 个（classify / clarify / analyze） |
| value-add-order-status | `kb-api-boundary` + `kb-status-semantics` + `kb-fee-goods-boundary` | 有 | 1 个，接收三层 KB 变量 |
| value-add-product-recommendation | `kb-flow-context`（入库流程语境 + PSC 差异矩阵）+ 另外 3 个 text 节点 | `load-flow-context` | 3 个（classify / recommend / finalize） |
| value-add-service-config | `kb-service-orchestration`（VASC→服务项编排表 50+行） | `load-vasc-context` + `compose-conditional-config` + `compose-committed-config` | 1 个，接收 `{{configEvidence}}` |

与 `value-add-service-guide/` 本地目录的关系：

- 本地目录有 224+ 文件（异常条目、映射表、接口文档、数据快照等）。
- 工作流 Text 节点中的内容是 AI IDE 对这些文件的**加工浓缩版**，不是逐字复制。
- 例如：`kb-exception-entity` = 从 `inbound-exceptions/` 目录下几十个异常 md 文件提取的结构化表格。

对后续新增/修改 expert 的含义：

- 更新 `value-add-service-guide` 后，不会自动影响线上 expert。
- 需要让本地 AI IDE 基于该知识库重新生成或更新 expert 工作流（重新生成 Text 节点内容）。
- 人工导入 Coze、发布后拿到 workflow id。
- 更新 `qa-gen_expert_system.csv` / 专家注册表中的 workflow id、schema、版本等。
- 再到 `qa-gen_base.csv` 的目标 QID 行填写或调整 `sys_experts`。

## 6. 新增 expert 的最小交付链路

```text
整理本地知识库 / schema
  -> 本地 AI IDE 生成 expert workflow
  -> 离线测试单个 expert 输入输出
  -> 打包 Coze 工作流
  -> 人工导入 Coze 并发布
  -> 获取线上 workflow_id
  -> 更新 qa-gen_expert_system.csv / 专家注册表
  -> 在 qa-gen_base.csv 的相关 QID 填 sys_experts
  -> 用真实账号或灰度账号线上测试
```

重点：新增 expert 通常不需要改 `cs_Bot_Client_v2p`，也不需要重写 `cs_Default_Query_v4_staging_D` 的改写、分类、QID 匹配等主流程；主流程和 recaller 已经是固定承载层。

## 7. 后续学习计划的修正方向

后续课程应围绕这 5 个问题训练：

1. 如何判断客户问题有没有命中 QID？
2. 如何判断 QID 是否绑定了正确的 `sys_experts`？
3. 如何看 `qa-gen_expert_system.csv` / 注册表中的 workflow id、schema、release 是否正确？
4. 如何验证 expert workflow 自身是否把知识库切片/接口调用/输出 schema 做对？
5. 如何端到端定位“客户没走到增值 expert”或“走到了但回答不对”的根因？

不再把“production 和 staging_D 哪条路径”作为默认第一题。只有当你要验证新的灰度版本、或者 Coze 主 Bot 画布发生变化时，才把灰度路径作为专项检查。
