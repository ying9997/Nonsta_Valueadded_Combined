# summary

为 L3 qa-gen 表中已确认的 QA 记录生成结构化摘要（`sys_summary`）。

## 在知识库流程中的位置

```
人工确认 question + sys_solution_final
        │
        sys_summary 为空
        │
        v
   [本工具] 生成 sys_summary
        │
        v
   reclassification（意图分类，下游工具）
```

本工具处理 L3 [qa-gen 多维表格](https://winitlink.feishu.cn/wiki/JJuqwnlp2iyY09kCz2Rcr7FdnRd?table=tblLEgFazhddZOUT) 中**已有 Q+S、待 AI 加工**的记录。不生成或修改 `question` / `sys_solution_final`。

## 数据表

| 项 | 值 |
|----|-----|
| 表 ID | `tblLEgFazhddZOUT` |
| App token | `Oup1bQvrJabY24sOyphcQ0C1nic` |

### 字段

| 字段 | 方向 | 说明 |
|------|------|------|
| `question` | 读 | 用户问题 |
| `sys_solution_final` | 读 | 人工确认后的 solution |
| `sys_summary` | 读/写 | 读：为空表示待处理；写：LLM 生成的结构化摘要 |

### 触发条件

拉取 `sys_summary` 为空的记录，每批最多 200 条。无待处理记录时 batch 脚本退出。

## Coze 工作流

| 项 | 值 |
|----|-----|
| 名称 | `cs_qa_summary` |
| Workflow ID | `7591815477089812518` |

### 节点拓扑

```
开始 (debug_mode)
  → init_param        获取飞书 token
  → get_records       拉取 sys_summary 为空的记录
  → 选择器            len > 0 才继续
  → gen_summaries     LLM 批处理（batchSize=200, concurrentSize=10）
  → update_records    写回 sys_summary
  → 结束              返回 len
```

LLM 使用 `prompt/gen_summary.md` 作为 `systemPrompt`，输入 `question` 与 `sys_solution_final`，输出结构化 markdown 摘要。

## 目录结构

```
summary/
├── README.md
├── coze/
│   ├── spec.json              # 节点与本地文件映射
│   └── workflow.template.yaml # 工作流骨架（密钥已脱敏）
├── prompt/
│   └── gen_summary.md         # LLM 摘要 prompt
├── scripts/
│   └── batch_run.py           # 本地循环触发 Coze workflow
└── src/
    ├── init_param.ts          # 飞书鉴权
    ├── get_records.ts         # 拉取 sys_summary 为空的记录
    └── update_summaries.ts    # 写回摘要
```

## 运行

在项目根目录配置 `.env`（`COZE_API_TOKEN`、`LARK_APP_ID`、`LARK_APP_SECRET`）后：

```bash
python tools/summary/scripts/batch_run.py
python tools/summary/scripts/batch_run.py --fancy
python tools/summary/scripts/batch_run.py --quiet
```

脚本会循环触发 Coze workflow，直到没有 `sys_summary` 为空的记录。单次执行日志中的 `len` 为当批处理条数。

## 部署与更新

修改 `src/` 或 `prompt/` 后，在项目根目录重新生成 Coze 导入包：

```bash
python scripts/gen_coze_zip.py summary
```

将 `dist/coze/Workflow-cs_qa_summary-draft-3288.zip` 导入 Coze 资源库并发布。首次接入或工作流结构变更时，可用导出的 zip bootstrap：

```bash
python scripts/bootstrap_coze_tool.py --tool summary --zip path/to/export.zip
```

## 摘要输出格式

`gen_summary.md` 要求 LLM 输出层级 markdown，大致结构：

```
问题概述
- 核心问题：…
- 场景/前提：…

解决方案
- …
- …
```

每条不超过 20 字，使用中文，不含代码块包裹。
