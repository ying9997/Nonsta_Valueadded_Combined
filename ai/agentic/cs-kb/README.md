# cs-kb

客服知识库（Customer Service Knowledge Base）批处理工具集。本项目从 `prompts` 仓库的 `qa-gen/tools` 拆分而来，源仓库副本待后续清理。

## 项目目的

整理和管理 Winit 客服知识库，支撑 AI 客服线上问答。知识库分为三个层级：

| 层级 | 名称 | 说明 | 内外部 |
|------|------|------|--------|
| **L1** | 飞书客服知识库 | [飞书知识空间](https://winitlink.feishu.cn/wiki/space/7224327607519068164) — 历史文档积累，只增不整理，可能存在过时内容 | 不区分 |
| **L2** | 本地客服知识库 | 按 LLM wiki 思路整理 L1，**尚未建设**（待补充） | 不区分 |
| **L3** | qa-gen 多维表格 | [已确认 QA 库](https://winitlink.feishu.cn/wiki/JJuqwnlp2iyY09kCz2Rcr7FdnRd?table=tblLEgFazhddZOUT) — `question → solution`，AI 客服线上在用 | **仅外部信息** |

### 内外部信息界定

| 类型 | 定义 |
|------|------|
| **外部信息** | 可以向外部客户披露的内容 |
| **内部信息** | Winit 内部的流程和知识，不能向外部客户披露 |

L1/L2 不区分内外部，可同时收录两类信息。L3 面向 AI 客服对外服务，`sys_solution_final` 入库前须人工确认**仅含外部信息**；内部流程、内部政策等不得进入 L3。

**Udesk** 是人工客服软件。`tbl3XLmGtZUm658z` 存放 Udesk 线上人工客服对话记录，用于洞察用户问题和知识缺口，**不是** AI 客服直接检索的知识源。

### 整体数据关系

```
L1 飞书知识库 ──────────────> L2 本地 wiki（待建设）

Udesk 人工对话 ──> tbl3XLmGtZUm658z ──> AI 分类提取 Q ──> 人工写 S ──┐
                                                                      ├──> L3 qa-gen ──> AI 客服检索
AI 客服线上对话（答错/未命中）────────────────────> 人工补 Q+S ────────┘
```

### L3 来源与流程（qa-gen）

L3 是 **AI 客服唯一线上知识源**。历史上，QA 条目来自两条线，**均由人工撰写 solution**：

| 来源 | 过程 | 本仓库工具 |
|------|------|-----------|
| **Udesk 人工客服对话** | 对话导入 → AI 分类并提取 `question` → 人工撰写 `sys_solution_final` | `human-services`（导入）、`udesk-classification`（分类） |
| **AI 客服线上对话** | 发现回答不准确或知识库未命中 → 人工补充 `question` + `sys_solution_final` | —（发生在 AI 客服运营侧） |

两条线汇入 L3 后，走统一的后续加工：

```
人工确认 Q+S（仅外部信息）──> sys_op_flag = pending
        │
        v
  AI 加工（summary / reclassification）──> sys_op_flag = done
        │
        v
  AI 客服线上检索 L3
```

| 阶段 | 做什么 | 谁负责 | 本仓库工具 |
|------|--------|--------|-----------|
| **汇入 L3** | 人工写入/确认 `question` 与 `sys_solution_final`，确保**仅含外部信息** | 客服/运营 | Udesk 线：`human-services`、`udesk-classification` |
| **AI 加工** | 对 `pending` 记录生成 `sys_summary`、意图分类等；完成后标 `done` | 工程跑 batch | `summary`、`reclassification` |
| **线上服务** | AI 客服检索 L3 回答用户；答错或未命中时回到「汇入 L3」 | AI 客服系统 + 运营 | — |

**原则：**

- `sys_solution_final` 始终由人工撰写或确认，AI 只做分类、提取 Q、生成摘要等辅助加工。
- 内外部边界在**写入 L3 时**由人工把关：只收录可向客户披露的外部信息，内部流程/知识不得进入 L3。
- Udesk 对话经 AI 提取 Q 后仍需人工写 S；AI 客服缺口则由人工直接补 Q+S。

### 本仓库在整体中的位置

当前阶段，cs-kb 覆盖 L3 闭环中的两段：

- **Udesk 线**：`human-services`（对话导入）→ `udesk-classification`（AI 分类提取 Q）→ 人工写 S 进 L3
- **L3 加工线**：`summary` / `reclassification`（对已确认的 Q+S 做摘要和分类）

AI 客服线上的缺口回补由运营人工直接写入 L3，不在本仓库工具范围内。L2 建设亦不在本阶段范围内。

## 工具模块

| 模块 | 用途 | Bitable 表 | Coze workflow_id |
|------|------|-----------|------------------|
| `tools/summary` | 为 QA 记录生成摘要 | `tblLEgFazhddZOUT` | `7591815477089812518` |
| `tools/reclassification` | 基于摘要重新分类 | `tblLEgFazhddZOUT` | `7592903692534398991` |
| `tools/udesk-classification` | Udesk 对话分类 | `tbl3XLmGtZUm658z` | `7593001979368063017` |
| `tools/human-services` | 从 xlsx 导入人工客服对话 | `tbl3XLmGtZUm658z` | （Coze 插件/workflow，无本地 batch 脚本） |

## 处理流程

每个批处理工具遵循相同流水线：

1. `init_param.ts` — 获取飞书 tenant_access_token
2. `get_records.ts` — 从 Bitable 拉取 `sys_op_flag=pending` 的记录
3. Coze LLM 节点 + `prompt/*.md` — 生成摘要或分类
4. `update_*.ts` — 写回 Bitable 并标记 `done`
5. `scripts/batch_run.py` — 本地循环触发 Coze workflow，直到无待处理数据

## 前置依赖

- Python 3.x
- Coze 平台已配置对应 Workflow
- 飞书应用与 Bitable 权限

```bash
pip install -r requirements.txt
```

## 配置

复制环境变量模板并填写：

```bash
copy .env.example .env
```

| 变量 | 用途 |
|------|------|
| `COZE_API_TOKEN` | 本地 `batch_run.py` 调用 Coze API |
| `LARK_APP_ID` | 飞书应用 ID（供 Coze Workflow 节点参考） |
| `LARK_APP_SECRET` | 飞书应用密钥（供 `gen_coze_zip.py` 注入 Coze 代码节点） |

## 运行 batch 脚本

在项目根目录执行（需先配置 `.env`）：

```bash
python tools/summary/scripts/batch_run.py
python tools/reclassification/scripts/batch_run.py
python tools/udesk-classification/scripts/batch_run.py
```

可选 UI 模式（默认 `--pretty`）：

```bash
python tools/summary/scripts/batch_run.py --fancy   # Live 仪表盘
python tools/summary/scripts/batch_run.py --quiet   # 仅最终统计
python tools/udesk-classification/scripts/batch_run.py --continue-on-fail
```

## Coze 部署说明

每个可打包工具在 `tools/<tool>/coze/` 下维护：

- `workflow.template.yaml` — 从 Coze 导出的工作流骨架（已脱敏）
- `spec.json` — 节点 title 与本地 `src/`、`prompt/` 的映射

### 新工具接入（只需导出一次）

```bash
python scripts/bootstrap_coze_tool.py --tool <tool-folder> --zip path/to/Workflow-xxx-draft-NNNN.zip
```

脚本会自动：脱敏模板、解析节点、匹配 `src/*.ts` 与 `prompt/*.md`、生成 `spec.json`。

### 生成 Coze 导入包

配置 `.env` 中的 `LARK_APP_ID` / `LARK_APP_SECRET` 后：

```bash
python scripts/gen_coze_zip.py --all          # 所有已 bootstrap 的工具
python scripts/gen_coze_zip.py summary        # 单个工具
python scripts/gen_coze_zip.py --list         # 查看可打包工具
```

输出目录：`dist/coze/`。TypeScript 节点在 Coze 平台运行，无法读取本地 `.env`；打包时会将飞书凭证硬编码注入 `init_param` 代码节点。

### 已接入工具

| 工具目录 | Coze workflow |
|---------|---------------|
| `summary` | `cs_qa_summary` |
| `reclassification` | `cs_qa_reclassification` |
| `udesk-classification` | `cs_udesk_classification` |

- `tools/human-services/plugin/read_xls_from_link.ts` — Coze 插件，需单独维护

## 目录结构

```
cs-kb/
├── README.md
├── requirements.txt
├── .env.example
├── shared/
│   └── batch_run_base.py
└── tools/
    ├── summary/
    ├── reclassification/
    ├── udesk-classification/
    └── human-services/
```
