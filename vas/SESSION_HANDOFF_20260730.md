# SESSION HANDOFF TRANSFER PACKAGE

## Meta 元数据

- 会话用途：VAS 非标增值客户引导 Agentic 产品方案设计 + 原型 + 评测体系搭建
- 启动时间：2026-07-29 下午
- 当前阶段：局部完成（方案/评测/原型均有产出，原型在迭代修改中）
- 模型上下文负载状态：接近上限强制移交

---

## 1. Core Goal 原始核心需求

在万邑联创建增值单链路（入库段 pscgCode=OW01）中嵌入 AI 智能引导能力，帮助客户：
- 判断走标准增值 / 非标免审 / 非标SOP 哪条路径
- 非标SOP 路径下帮客户生成规范化 SOP 并一键填入表单

最终交付物：
1. 可对业务方演示的交互 HTML 原型
2. 可部署到 Coze 平台的 Bot 配置包
3. 覆盖三分支的金标评测集
4. 研发 PRD（待业务方确认原型后产出）

仓库：https://github.com/ying9997/Vas-Nonstandard-Guide  
本地路径：`D:\da\vas-nonstandard-guide`  
参考素材库：`D:\da\ai_expert`（不做 git 管理）

---

## 2. Agreed Rules & Constraints

### 输出格式规范
- 非平凡任务必须走 讨论→评估→执行 三阶段，禁止跳过讨论直接动手
- Codex prompt 需完整自包含（Codex 看不到本会话上下文）
- commit message 用 conventional commits（feat/fix/docs/refactor）

### 术语词典

| 内部编码 | 业务展示名 | 含义 |
|---------|-----------|------|
| 2d | 标准增值（纠偏） | 客户需求可由标准增值覆盖，指引返回标准路径 |
| 2a | 非标免审（命名直选） | 客户需求命中具体命名原子，直接选择不写 SOP |
| 2b | 非标SOP（其他服务需求） | 走"入库其他服务需求"兜底，需生成 SOP |
| productType | standard / nonstandard_no_review / nonstandard_special_approval | 产品三分类 |
| branchClassification | standard / 2a_named / 2b_catchall | 原子级别分支归属 |
| vas-atom-matrix | 处理方式→产品→原子 三层映射清单 | 已通过 API 提取 |

### 否定约束
- 一期范围限定入库段（pscgCode=OW01），不含出库和库内
- 不替代客户操作（AI 只指引，不代点卡片/不代提交）
- SOP 卡片严格遵循 6 章结构（操作目的/适用范围/操作步骤/关键输出/异常处理/附件要求），不可自创
- SOP 展示用客户视角（"您需要准备"而非"请客户提供"）
- 面向业务方的展示用业务名（标准增值/非标免审/非标SOP），内部技术文档保留 2d/2a/2b
- 非标特批费用不是"无法预估"——按 SOP 操作内容×计费单位可预估

### 计算/判定硬规则
- 分支判定在原子级别（不是产品级别）：原子名含"其他服务需求"→2b_catchall；非标产品下其他原子→2a_named
- 同一非标产品下可同时包含 2a 和 2b 原子
- 2b 确认摘要必须含"客户确认不等于审核通过"
- matchConfidence ≥ 0.80 → matched；≥ 0.60 → partial；< 0.60 → none

### 工作流架构
- Opus（Claude Code）：方案设计、验收评估、迭代指令
- Codex（OpenAI）：执行产出（代码/文档/Coze包）
- 交接接口：git commit + HANDOFF 文件，遵循 `HANDOFF_TEMPLATE_Opus-Codex-Coze.md`
- Coze 技术方案：Web SDK（@coze/chat-sdk）嵌入 + afterMessageReceivedFinish 回调做 DOM 联动

---

## 3. Completed Deliverables 已完成交付资产

### 方案设计
- `design/方案文档.md` — 完整方案（三分支决策树/输出 schema/评测设计/上线节奏）
- `design/弹窗前置模块方案.md` — Track B 标准页 AI 弹窗方案
- `design/方案乙原型_标准增值-非标免审-非标SOP对话示例.md` — 三分支对话流示例

### 接口契约
- `contracts/api-contract/接口契约草案.md` — 四层 schema（前端→中间层→Agent→中间层→前端）+ G1-G5 补充完成
- `contracts/api-contract/字段清单_table.md` — 全字段一览
- `contracts/candidate-normalization/` — 候选清单归一化契约

### 数据资产
- `references/vas-atom-matrix.md` + `.json` — 24 产品 53 原子，API 实证
- `eval/evaluations_cases.json` — 10 条群聊候选（2d:6, 2b:3, 2a:1）
- `eval/evaluations_2a_udesk.json` — 5 条客服库 2a 候选
- `eval/evaluations_top3_attachment_cases.json` — 3 条附件问题候选
- `eval/golden-set.json` — 9 条金标评测集（2d:3, 2b:3, 2a:3）
- `eval/acceptance-criteria.md` — 11 维度评分规则
- `scripts/data-gateway/` — winit-data 网关数据脚本

### 原型
- `prototypes/方案乙_双窗口交互原型.html` — 双 AI 窗口交互原型（正在迭代修改中）
- `popup/coze-package/` — 弹窗 Coze 包（已验收通过）

### 基础设施
- `HANDOFF_TEMPLATE_Opus-Codex-Coze.md` — Opus→Codex→Coze 标准化交接流程
- `scripts/coze-mvp-验证包/` — Coze SDK 联动验证（已验证通过：Bot 能输出纯 JSON）
- `.gitignore` 排除敏感文件（raw 群聊消息、udesk CSV）

---

## 4. Blockers & Unresolved Issues

### 当前阻塞

1. **HTML 原型迭代中** — Codex 正在执行最后一轮修改（3 个 fix）：
   - SOP 卡片包裹在 AI 气泡里
   - AI 窗口 2 加收起/展开按钮 + 表单前分隔线
   - 窗口名称改为"AI 特批非标增值指引助手"

2. **Coze 验证的小问题** — 用户输入没传到 LLM 节点。原因：LLM 节点的"用户提示词"字段需要引用变量（如 `{{input}}`），当前为空。用户知道了解决方式，待用户自行修复。

### 待确认/待讨论

3. **推荐标签逻辑** — 需和 PDM 讨论：AI 下单指引打开后，"推荐" badge 应跟随 AI 交互结果动态变化（memory: `project_vas-pdm-recommend-logic.md`）

4. **方案文档需同步更新** — 费用预估已改为"本期可做"（不再是"占位不实现"），方案文档 §7 尚未更新

---

## 5. Pending Next Steps

### P0 紧急接续任务

1. **验收 Codex 最新原型修改**（SOP 气泡包裹 + 收起按钮 + 改名）— 等 Codex push 后 pull + 检查
2. **用户完成 Coze 验证**（修复用户提示词变量引用后，确认 4 条线路都返回正确 JSON）
3. **更新方案文档 §7 费用预估**（从"占位不实现"改为"按 SOP 内容×计费单位预估"）

### P1 迭代优化任务

4. **原型继续打磨** — 用户可能还有 UI 修改意见
5. **业务方评审原型** — 确认后产出研发 PRD（memory: `project_vas-prd-pending.md`）
6. **Coze Bot 正式版开发** — 基于验证通过的 prompt 模式，配置正式 Bot + workflow

### P2 可选补充任务

7. **Track B 标准页弹窗 Coze 包验证**（`popup/coze-package/` 已有，待上传 Coze 实测）
8. **评测集系统验证** — 用真实 Coze Bot 跑 golden-set 9 条，对比模型表现
9. **扩展到出库段**（pscgCode=OW03）— 当前只覆盖入库

---

## 6. Inheritance Instruction 给新会话强制指令

1. 新开对话粘贴本全部内容后，直接加载所有上下文，不再重复询问已知背景、规则、定义
2. 优先处理 P0 待办与阻塞问题，按顺序执行
3. 全程严格遵守 Rules 约束，输出风格、颗粒度与本会话保持一致
4. 信息缺失仅列出所需字段，禁止自行脑补业务逻辑
5. 非平凡任务走 讨论→评估→执行 三阶段
6. 工作目录：`D:\da\vas-nonstandard-guide`（git 仓库）；参考目录：`D:\da\ai_expert`
7. Memory 文件在 `C:\Users\ying.jin\.claude\projects\D--da-ai-expert\memory\` — 读取 MEMORY.md 获取用户偏好和项目记忆
8. 再次临近 Token 上限时，重复执行本次 Handoff 导出流程

---

## 7. Key File Index 关键文件索引

| 文件 | 用途 |
|------|------|
| `HANDOFF.md` | 项目主交接文档（含进度、切片流水线、明日待办） |
| `HANDOFF_TEMPLATE_Opus-Codex-Coze.md` | Opus→Codex→Coze 协作模板 |
| `design/方案文档.md` | 方案乙完整设计（三分支+弹窗+上线节奏） |
| `design/方案乙原型_标准增值-非标免审-非标SOP对话示例.md` | 三分支对话示例 |
| `contracts/api-contract/接口契约草案.md` | 接口 schema（含 G1-G5） |
| `references/vas-atom-matrix.md` | 入库段产品→原子三层清单（系统事实） |
| `references/sop/非标增值服务SOP模板及填写示例.md` | SOP 6 章结构模板 |
| `eval/golden-set.json` | 9 条金标评测集 |
| `prototypes/方案乙_双窗口交互原型.html` | 当前在迭代的交互原型 |
| `scripts/coze-mvp-验证包/` | Coze SDK 联动验证材料 |

---

【数据包标记】SESSION_HANDOFF_READY，可全选复制迁移至新会话
