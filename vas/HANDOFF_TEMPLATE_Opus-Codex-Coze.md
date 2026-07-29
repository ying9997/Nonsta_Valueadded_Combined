# HANDOFF 模板：Opus → Codex → Coze 交接契约

> 本模板定义三阶段协作流程的接口规范。每个模块启动时复制本模板到模块目录，填入具体内容。

---

## §0 角色定义

| 角色 | 工具 | 职责边界 |
|------|------|----------|
| **Opus**（方案层） | Claude Code / Opus | 出方案、划边界、定 schema、写评测集、评估 Codex 产出质量 |
| **Codex**（执行层） | OpenAI Codex | 按方案产出文件：prompt 文件、知识库 md、Coze workflow JSON、Coze 压缩包；回答执行相关问题；每日 commit |
| **Coze**（验证层） | Coze 平台 | 承载 Agent 运行时；跑评测集；暴露真实调用效果 |

**原则：**
- Opus 不写代码/不产出 Coze 包；Codex 不做方案决策/不修改方案文档。
- Opus 产出的所有内容必须足够具体，让 Codex 无需方案判断即可执行。
- 任何执行中发现的方案歧义，Codex 应标记 `[AMBIGUITY]` 并回传 Opus，不自行决定。

---

## §1 三阶段流水线

```
Opus                          Codex                         Coze
 │                              │                             │
 │─── §2 方案交付物 ──────────►│                             │
 │                              │                             │
 │                              │─── §3 执行产出物 ─────────►│
 │                              │                             │
 │◄── §4 验证结果 ─────────────│◄── 评测运行结果 ───────────│
 │                              │                             │
 │─── §5 迭代指令 ────────────►│                             │
 │                              │                             │
```

---

## §2 Opus → Codex 交付物清单

Opus 在交付时必须产出以下文件，Codex 以此为执行依据：

### 2.1 必填交付物

| 文件 | 路径约定 | 内容要求 |
|------|----------|----------|
| **方案文档** | `{module}/方案文档.md` | 完整决策树、分支逻辑、非目标清单 |
| **输出 Schema** | `{module}/schema/output.json` | Agent 结构化输出的 JSON Schema，含必填/可选标注 |
| **Prompt 骨架** | `{module}/prompts/main-prompt-skeleton.md` | System prompt 结构，标注 `{{变量}}` 占位符和注入位置 |
| **知识库清单** | `{module}/kb/KB_INDEX.md` | 列出每个 kb 文件的用途、注入时机、token 预估 |
| **评测集** | `{module}/evals/golden-set.json` | 至少 9 条金标用例，含 input + expected output + forbiddenOutputs |
| **验收标准** | `{module}/ACCEPTANCE.md` | 通过条件（route accuracy ≥ X%、无候选外推荐等） |

### 2.2 可选交付物

| 文件 | 何时需要 |
|------|----------|
| `prompts/kb-*.md` | 当知识库内容已定稿，直接交给 Codex 打包 |
| `schema/input-context.json` | 当中间层输入格式已确定 |
| `diagrams/flow.md` | 当决策树复杂需可视化辅助理解 |

### 2.3 交付物质量门槛

Opus 自检清单（交付前必须逐项确认）：

- [ ] 方案文档无 `TODO`、`TBD`、`待定` 等未决标记
- [ ] Output Schema 每个字段有 `description` 和 `required` 标注
- [ ] Prompt 骨架中所有 `{{变量}}` 在 input-context.json 或 KB_INDEX.md 中有来源说明
- [ ] 评测集覆盖所有分支，每分支 ≥ 3 条
- [ ] 验收标准有量化指标，非"效果好"等模糊表述
- [ ] 无方案歧义：每个决策点只有一种解读方式

---

## §3 Codex 执行产出物

Codex 按 §2 交付物执行后，产出以下文件：

### 3.1 文件结构（Coze 包内）

```
{module}/coze-package/
├── bot-config.json           # Coze Bot 配置（人设、开场白、模型选择）
├── workflows/
│   └── main-workflow.json    # Coze Workflow 编排（节点、连线、变量）
├── prompts/
│   ├── system-prompt.md      # 最终 system prompt（变量已填充模板语法）
│   └── kb-*.md               # 知识库文件（直接用于 Coze 知识库上传）
├── plugins/                  # 如需调外部 API
│   └── api-plugin.json       # Coze Plugin 定义
└── MANIFEST.md               # 产出清单 + 与方案文档的映射关系
```

### 3.2 MANIFEST.md 格式

```markdown
# 产出清单

## 映射关系

| Opus 交付物 | Codex 产出物 | 状态 |
|-------------|-------------|------|
| 方案文档 §4 决策树 | workflows/main-workflow.json 节点 1-5 | ✅ 已实现 |
| schema/output.json | bot-config.json → outputSchema | ✅ 已实现 |
| prompts/main-prompt-skeleton.md | prompts/system-prompt.md | ✅ 已实现 |
| kb/KB_INDEX.md → kb-sop-templates.md | prompts/kb-sop-templates.md | ✅ 已实现 |
| ... | ... | ... |

## 执行问题记录

| 编号 | 类型 | 描述 | 状态 |
|------|------|------|------|
| Q1 | [AMBIGUITY] | 方案文档 §3 的 X 条件有两种解读... | 🔴 待 Opus 确认 |
| Q2 | [LIMITATION] | Coze Workflow 不支持 Y 功能... | 🟡 已用 Z 方案绕过 |
| Q3 | [DEVIATION] | 因 token 限制，将 kb-X 拆为两个文件... | 🟢 已处理 |
```

### 3.3 Codex 执行规范

- **不改方案文档**：发现歧义标记 `[AMBIGUITY]` 写入 MANIFEST.md，不自行决策
- **commit 规范**：使用 `ce-commit` skill，前缀 `feat(coze):` / `fix(coze):` / `docs:`
- **文件命名**：kebab-case，与 Opus 交付物中的名称保持映射关系
- **每日 commit**：至少一次，内容哪怕只是 WIP 也要提交以保留进度

---

## §4 Coze → Opus 验证回传

### 4.1 评测运行后，Codex 回传格式

```json
{
  "runId": "eval-2026-07-30-001",
  "model": "doubao-pro-256k",
  "totalCases": 9,
  "results": [
    {
      "caseId": "2d-001",
      "passed": true,
      "actualRoute": "2d_standard_redirect",
      "expectedRoute": "2d_standard_redirect",
      "issues": []
    },
    {
      "caseId": "2b-002",
      "passed": false,
      "actualRoute": "2b_other_service_sop",
      "expectedRoute": "2b_other_service_sop",
      "issues": [
        "fieldSuggestions.background 为空，expected 非空",
        "confirmationSummary 缺少'确认≠审核通过'句式"
      ]
    }
  ],
  "summary": {
    "routeAccuracy": 0.89,
    "candidateViolations": 0,
    "schemaViolations": 1,
    "forbiddenOutputViolations": 0
  },
  "codexNotes": "2b-002 失败原因疑似 SOP 模板库 token 超限导致截断"
}
```

### 4.2 Opus 评估后产出

Opus 基于回传结果，产出迭代指令：

```markdown
## 迭代指令 - Round N

**通过判定：** ❌ 未通过（route accuracy 89% < 目标 100%）

**修复指令：**

1. [P0] 2b-002: system prompt 中 SOP 模板库注入位置调整为 {{sop_templates}} 占位，
   中间层预过滤后只注入 top-3 匹配模板。Codex 需修改 prompts/system-prompt.md 
   对应位置。
2. [P1] 所有 2b 用例: confirmationSummary 尾部追加固定句式校验逻辑，
   写入 workflows/main-workflow.json 的输出校验节点。

**不需要修改的：**
- 2d、2a 分支已全部通过，不动。
- bot-config.json 模型选择不变。

**下轮验收条件：** route accuracy = 100%，schema violations = 0
```

---

## §5 迭代循环

```
Round 1: Opus 交付 → Codex 执行 → Coze 评测 → 回传结果
Round 2: Opus 评估 + 发修复指令 → Codex 修改 → Coze 重测 → 回传
Round N: 直到验收标准全部通过 → 标记模块 DONE
```

**迭代收敛规则：**
- 每轮修改只针对失败用例，不回归已通过用例的实现
- 如连续 3 轮同一用例失败，Opus 需重新评估方案（可能是方案设计问题而非执行问题）
- Codex 每轮修改后 commit message 标注 `fix(coze): round-N [caseId]`

---

## §6 文件组织约定

```
{module}/
├── 方案文档.md                    # Opus 产出 - 方案设计
├── ACCEPTANCE.md                  # Opus 产出 - 验收标准
├── schema/
│   ├── output.json                # Opus 产出 - 输出 schema
│   └── input-context.json         # Opus 产出 - 输入上下文 schema
├── prompts/
│   └── main-prompt-skeleton.md    # Opus 产出 - prompt 骨架
├── kb/
│   ├── KB_INDEX.md                # Opus 产出 - 知识库索引
│   └── kb-*.md                    # Opus 或 Codex 产出 - 知识库文件
├── evals/
│   ├── golden-set.json            # Opus 产出 - 金标评测集
│   └── results/
│       └── eval-YYYY-MM-DD-NNN.json  # Codex 回传 - 评测结果
├── coze-package/                  # Codex 产出 - Coze 部署包
│   ├── bot-config.json
│   ├── workflows/
│   ├── prompts/
│   ├── plugins/
│   └── MANIFEST.md
└── iterations/
    └── round-N-instructions.md    # Opus 产出 - 迭代修复指令
```

---

## §7 快速启动 Checklist

### Opus 侧（方案启动时）

- [ ] 复制本模板到 `{module}/HANDOFF_Opus-Codex-Coze.md`
- [ ] 完成 §2 所有必填交付物
- [ ] 自检通过 §2.3 质量门槛
- [ ] 将交付物路径填入 §2 表格
- [ ] commit 并通知 Codex 开始执行

### Codex 侧（收到交付物后）

- [ ] 读取本 HANDOFF 文件 + 所有 §2 交付物
- [ ] 按 §3 结构产出 coze-package/
- [ ] 写 MANIFEST.md 映射关系
- [ ] 记录所有 [AMBIGUITY] / [LIMITATION] / [DEVIATION]
- [ ] commit `feat(coze): initial package for {module}`
- [ ] 上传 Coze → 跑评测 → 回传 §4.1 格式结果

### 验证通过后

- [ ] Opus 确认验收标准全部满足
- [ ] Codex 最终 commit `feat(coze): {module} v1.0 accepted`
- [ ] 归档：将 iterations/ 下所有 round 文件标记 `[CLOSED]`

---

## §8 异常处理

| 场景 | 处理方式 |
|------|----------|
| Coze 平台限制导致方案无法实现 | Codex 标记 `[LIMITATION]`，描述限制 + 备选方案 → Opus 决定是否调整方案 |
| 评测集本身有问题（expected 不合理） | Codex 标记 `[EVAL-ISSUE]` → Opus 修正评测集后重发 |
| Token 超限 | Codex 标记 `[TOKEN-OVERFLOW]` + 拆分方案 → Opus 确认拆分是否影响方案逻辑 |
| 连续 3 轮不收敛 | Opus 启动方案复盘，不再发修复指令，而是重新评估方案设计 |
| Codex 对方案有建议 | 写入 MANIFEST.md `[SUGGESTION]` 区域 → Opus 视情况采纳 |
