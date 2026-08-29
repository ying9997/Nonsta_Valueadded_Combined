# 目录规划决策：探索资产与准上线 Expert 包分层

> 日期：2026-08-17
> 仓库：`Nonsta_Valueadded_Combined`
> 状态：目录治理决策稿；当前不执行文件迁移

## 1. 背景

本仓库由两个源仓库合并而来：

- `vas/`：来自 `Vas-Nonstandard-Guide`，沉淀非标增值 AI 指引的产品方案、业务资料、原型、评测集、接口契约等探索资产。
- `ai/`：来自 `AI-cs-expert-study`，沉淀线上 AI 客服 Multi-Expert 体系的学习资料、线上 expert 结构、以及 `nonstandard-sop-guide` 的 expert 雏形。

合并后的目标不是简单把两个仓库并列保存，而是把“非标增值需求描述 + SOP 生成”能力逐步整理成可接入线上 AI 客服主链路的新增 expert。

因此目录规划必须同时满足两类需求：

1. 支持业务、产品、算法、数据标注/运营、评测的探索和沉淀。
2. 支持未来新增线上 expert 的完整交付包，避免上线前从多个目录拼装材料。

## 2. 已确认决策

| # | 决策问题 | 确认选择 | 理由 | 不采用的方式 |
|---|---|---|---|---|
| 1 | 项目资产是否继续按 `requirements/design/eval/contracts/prototypes` 分散维护 | 不继续作为长期目标结构 | 这些目录来自快速探索阶段，混用了项目阶段和产物类型，后续难以支撑 expert 上线交付 | 继续沿用旧目录并只补 README |
| 2 | 是否把 future expert 拆散到 `product/knowledge/eval/engine` | 不拆散 | 线上接入需要“一个 expert 一个完整包”，拆散会降低调试、导出、部署和验收效率 | prompt 放 engine、评测放 eval、设计放 product、节点放别处 |
| 3 | 是否新增准上线 expert 包目录 | 是 | 对齐 AI 客服线上 expert 标准结构：`manifest.json`、`design.md`、`nodes/`、`prompts/`、`workflow/`、`coze.config.yml` 等必须自包含 | 只在 `ai/study/value-add-ai/experts/` 下继续演进 |
| 4 | 是否仍保留探索资产区 | 是 | 当前项目大量材料是业务确认、产品方案、知识源、原始数据、原型和评测资产，不都属于上线 expert 包 | 全部塞进 expert 包 |
| 5 | `workspace/knowledge` 与 `experts/.../prompts` 的关系 | 两者共存，职责不同 | `workspace/knowledge` 是源材料和业务可维护知识；`experts/.../prompts` 是 expert 运行时使用的压缩/切片/上线版本 | 只保留一份知识，导致业务维护或上线部署一方受损 |

## 3. 目标目录骨架

建议最终收敛为以下一级目录：

```text
business/       # 业务专家确认、业务评审和口径材料
workspace/      # 本部门内部探索资产：产品、知识、数据、标注、评测、原型、演示
experts/        # 准上线 AI 客服 expert 包
handoff/        # 给 PDM、应用研发、外部协作方的交付材料
progress/       # 项目进度、阻塞、目录决策、上线准备
scripts/        # 工具脚本
archive/        # 历史探索、废弃方案、迁移前旧结构
```

当前 `ai/` 和 `vas/` 是合并保留区，不作为长期目标结构。迁移前不删除原目录；迁移时应先建立映射表，再分批移动。

## 4. `workspace/`：探索资产工作台

`workspace/` 用于承接本部门内部兼任的产品、算法、数据标注/运营和评测工作。这里的材料服务于“理解问题、形成方案、积累知识、构建评测、验证交互”，不要求直接满足线上 expert 包结构。

建议结构：

```text
workspace/
  product/       # PRD、产品方案、路由策略、讨论结论
  knowledge/     # SOP 知识源、VASC 系统事实、规则、业务知识
  data/          # 原始数据、候选样本、清洗结果
  annotation/    # 标注规范、标注进度、业务复核记录
  eval/          # golden set、验收标准、评测报告、badcase
  prototypes/    # 可运行原型、页面快照
  demos/         # 演示脚本、场景化示例问答、业务评审演示材料
  experiments/   # 历史探索、早期方案包、非主线试验
```

### 4.1 当前文件映射示例

| 当前位置 | 目标位置 | 说明 |
|---|---|---|
| `vas/design/Agent_PRD_库内增值AI指引_九模块迭代版_v2.md` | `workspace/product/` | 产品方案与 PRD |
| `vas/design/讨论结论记录_20260801.md` | `workspace/product/` 或 `business/decisions/` | 若作为业务确认依据，可放 business；若作为内部产品决策，可放 product |
| `vas/references/库内增值_系统事实_VASC清单.md` | `workspace/knowledge/` | 系统事实源材料 |
| `vas/references/库内增值_知识库_SOP模板场景清单.md` | `workspace/knowledge/` | SOP 知识源 |
| `vas/references/rules/`、`vas/references/sop/` | `workspace/knowledge/` | 业务规则与 SOP 源材料 |
| `vas/eval/飞书群聊_非标增值讨论_20260421-20260801.xlsx` | `workspace/data/` | 原始/半原始数据 |
| `vas/eval/*真实对话候选*` | `workspace/data/` | 候选样本 |
| `vas/eval/golden-set.json` | `workspace/eval/` | 金标集 |
| `vas/eval/acceptance-criteria.md` | `workspace/eval/` | 评测验收标准 |
| `vas/eval/evaluations_*.json` | `workspace/eval/` | 评测用例 |
| `vas/prototypes/*.html` | `workspace/prototypes/` | 可运行原型 |
| `vas/prototypes/references/` | `workspace/prototypes/references/` | 页面快照和参考页面 |
| `vas/prototypes/demo-content/` | `workspace/demos/` | 演示对话和场景化示例 |
| `vas/prototypes/演示操作指南.md` | `workspace/demos/` 或 `business/review-pack/` | 如果给业务方评审，则放 business |
| `vas/iterations/`、`vas/eval/workflow/` | `workspace/experiments/` 或 `archive/` | 历史执行包，不应继续混在 eval |

## 5. `experts/`：准上线 Expert 包

`experts/` 用于承接未来要接入 AI 客服主链路的 expert。这里的每个 expert 必须尽量自包含，便于本地测试、Coze 导出、上线验收和后续维护。

建议结构：

```text
experts/
  value-add/
    nonstandard-sop-guide/
      manifest.json       # expert 注册合约
      design.md           # expert 内部设计
      coze.config.yml     # Coze 导出配置
      workflow/           # Coze workflow YAML
      nodes/              # code node 源码
      prompts/            # 运行时 prompt 与 KB 切片
      tests/              # 节点/流程集成测试
      eval/               # expert 专属评测脚本与报告
      debug/              # Coze 节点调试手册、问题排查
      deploy/             # coze package/import/final 等部署包
```

### 5.1 当前文件映射示例

| 当前位置 | 目标位置 | 说明 |
|---|---|---|
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/manifest.json` | `experts/value-add/nonstandard-sop-guide/manifest.json` | 上线注册合约 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/design.md` | `experts/value-add/nonstandard-sop-guide/design.md` | expert 内部设计 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/nodes/` | `experts/value-add/nonstandard-sop-guide/nodes/` | code node |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/prompts/` | `experts/value-add/nonstandard-sop-guide/prompts/` | expert 运行时 prompt/KB 切片 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/workflow.json` | `experts/value-add/nonstandard-sop-guide/workflow/` | workflow 定义，后续以 Coze YAML 为准 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/test-*` | `experts/value-add/nonstandard-sop-guide/tests/` | 测试用例和测试说明 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/eval-*` | `experts/value-add/nonstandard-sop-guide/eval/` | expert 评测脚本和报告 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/debug-*` | `experts/value-add/nonstandard-sop-guide/debug/` | 调试手册和任务 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/coze-package/` | `experts/value-add/nonstandard-sop-guide/deploy/coze-package/` | Coze 部署包 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/coze-import/` | `experts/value-add/nonstandard-sop-guide/deploy/coze-import/` | Coze 导入包 |
| `ai/study/value-add-ai/experts/nonstandard-sop-guide/coze-final/` | `experts/value-add/nonstandard-sop-guide/deploy/coze-final/` | 最终候选包 |

### 5.2 Expert 包内资产规则

- `manifest.json` 只写 expert 对外合约：id、domain、description、inputSchema、outputSchema、recaller 上下文策略。
- `design.md` 只写 expert 内部工作流、输入输出、触发条件、边界、测试体系；不要承担产品 PRD 职责。
- `prompts/` 放运行时实际使用的 prompt 与 KB 切片，不直接塞完整业务知识源。
- `eval/` 放 expert 专属评测，回答“这个 expert 是否可上线”；项目级产品评测仍放 `workspace/eval/`。
- `deploy/` 放可导入 Coze 的包和最终候选包；不要把部署包混入 `workspace/prototypes` 或 `handoff/contracts`。

## 6. `business/`：业务确认与评审材料

建议结构：

```text
business/
  decisions/        # 业务口径确认、会议纪要、签核结论
  review-pack/      # 给业务方看的能力概述、演示说明、评审包
  knowledge-check/  # SOP/VASC/场景有效性核对材料
```

放置原则：

- 面向业务专家确认的内容放 `business/`，而不是散落在 `workspace/product` 或 `workspace/demos`。
- 业务确认结果可反向驱动 `workspace/knowledge` 和 `experts/.../prompts` 的更新。
- 如果同一文件既是内部方案又是业务评审材料，优先放 `business/review-pack/`，在 `workspace/product/` 中通过索引链接引用。

## 7. `handoff/`：对 PDM 与应用研发的交付材料

应用研发由专门团队支持，因此本仓库不以工程实现为主，但必须给研发明确的输入。

建议结构：

```text
handoff/
  pdm/          # 给 PDM 的需求说明、交互确认项、排期确认项
  engineering/  # 给应用研发的接入说明、联调说明、埋点要求
  contracts/    # Tool Calling schema、API 契约、字段清单
  release/      # 上线验收 checklist、灰度方案、降级/回滚口径
```

当前映射示例：

| 当前位置 | 目标位置 | 说明 |
|---|---|---|
| `vas/requirements/需求说明_PDM.md` | `handoff/pdm/` | PDM 确认材料 |
| `vas/requirements/需求说明_研发.md` | `handoff/engineering/` | 应用研发接入材料 |
| `vas/contracts/tool-calling-spec.md` | `handoff/contracts/` | 前端 Tool Calling 契约 |
| `vas/contracts/tool-calling-schema.md` | `handoff/contracts/` | Schema |
| `vas/contracts/api-contract/` | `handoff/contracts/api-contract/` | API/字段契约 |

## 8. 关键边界规则

### 8.1 不按市场职责强行拆一级目录

市场主流视角中的产品、算法、标注、运营在本项目中主要由同一部门兼任。职责拆分应体现在文档内容中的 RACI、阶段职责矩阵和进度评估里，而不是强行拆成多个一级目录。

### 8.2 不按项目阶段作为一级目录

需求分析、产品设计、开发测试、上线前、上线后监控是项目阶段，不适合作为长期文件归属。许多资产会跨阶段复用，例如 golden set 在设计、测试和上线后回归都会使用。

阶段状态统一由 `progress/` 管理。

### 8.3 Expert 包优先保证上线自包含

如果某个文件是 expert 上线、调试、导出、部署所必需，应放入 `experts/value-add/nonstandard-sop-guide/` 内，即使它也可以被归类为 prompt、eval 或 design。

### 8.4 源材料与上线切片允许共存

例如：

- `workspace/knowledge/`：完整 SOP 模板、VASC 系统事实、业务规则，面向业务维护和产品理解。
- `experts/value-add/nonstandard-sop-guide/prompts/`：expert 运行时使用的压缩切片、模板索引和字段要求，面向 Coze/LLM 执行。

两者必须通过文档说明来源关系，不能互相替代。

### 8.5 原型与演示分开

- `workspace/prototypes/`：HTML 原型、页面快照、可运行交互。
- `workspace/demos/`：演示脚本、场景化示例问答、业务评审说明。

这样可以避免 `prototypes/` 同时承担代码、文案、评审、prompt、demo 全部职责。

## 9. 建议迁移节奏

当前不直接迁移文件。建议按以下步骤推进：

1. 先确认本决策文档。
2. 新增一份迁移映射表，逐项列出旧路径、目标路径、迁移理由、是否需要保留索引链接。
3. 先创建空目录骨架和 README，不搬文件。
4. 迁移 `experts/value-add/nonstandard-sop-guide/`，因为这是未来上线主包，优先级最高。
5. 迁移 `handoff/`，让 PDM 和应用研发材料先清晰。
6. 再迁移 `workspace/eval`、`workspace/knowledge`、`workspace/data`。
7. 最后处理历史探索资产，放入 `archive/` 或 `workspace/experiments/`。

## 10. 后续待确认项

| 问题 | 建议默认 | 说明 |
|---|---|---|
| 根目录是否保留 `ai/` 和 `vas/` | 短期保留 | 合并初期用于追溯来源，迁移完成后可归档 |
| 是否创建根目录 `DIRECTORY_CONVENTION.md` | 等目录决策稳定后创建 | 当前先放 `progress/`，避免过早固化 |
| `nonstandard-sop-guide` 是否以库内场景为主还是沿用入库场景雏形 | 需另行确认 | 当前 `ai/` expert 雏形偏入库；`vas/` 主线偏库内，合并时需统一边界 |
| `workspace/knowledge` 到 expert prompts 的同步方式 | 先人工维护 | 后续可考虑脚本生成 prompt 切片 |
| 是否需要 `business/knowledge-check` 签核模板 | 建议需要 | SOP/VASC 有业务有效性和时效性问题，需留确认记录 |

