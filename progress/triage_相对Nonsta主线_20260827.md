# 相对 Nonsta 主线根的 Triage 表

- 主线根：`D:\DA\Nonsta_Valueadded_Combined`
- 扫描日：2026-08-27
- 决策确认：2026-08-27（§5 四项已勾选）
- 状态：**决策已锁定；搬迁按 §4 批次执行**
- 依据：目录体量、Git 状态、与 Nonsta 已有分区的重叠、`D:\增值智能化` / `00_INDEX` 既有收拢记录

## 标签定义

| 标签 | 含义 | 默认动作 |
|------|------|----------|
| **A** 有效-主资产 | 当前产品/expert 仍以此为权威或准权威 | 合入 Nonsta 对应分区，停用仓外分叉 |
| **B** 有效-证据/输入 | 评测、样本、KB、脚本、接口探测等可复用输入 | 迁入 `workspace/` / `scripts/` / `evidence-link`，或索引后保留外仓 |
| **C** 归档-参考 | 历史副本、学习快照、已迁完残留、合并来源 | 进 `archive/`，或仓外原位 + `progress` 索引 |
| **D** 删除候选 | 重复生成物、`node_modules`、空壳临时目录 | 进复核清单，确认后再删 |
| **I** 仅索引 | 独立 Git/大仓，强拆成本高 | 不物理迁入；在 Nonsta README/`progress` 登记路径与用途 |

## 判据（本次使用）

1. 是否被当前 Active 产品（`agent-inventory-assist` / `experts/.../nonstandard-sop-guide` / `vas` 活分支）直接需要  
2. 是否唯一权威源（非副本）  
3. 近几周是否仍在改，或明确下一阶段要用  

---

## 0. Nonsta 仓内（现状，不搬，只定角色）

| 路径 | 约文件数 | 标签 | 角色 | 备注 |
|------|----------|------|------|------|
| `agent-inventory-assist/` | 15（内容） | **A** | **唯一 Active 产品壳** | **已确认 P1**：唯一工作副本；DA 根独立仓待合并后停用 |
| `experts/` | 52 | **A** | 准上线 expert 包 | 2026-08-17 映射表已大量迁入 |
| `vas/` | 84 | **A/C 混** | 合入后的 Vas 工作树残留 | 大量已迁到 `workspace`/`handoff`/`archive`；保留追溯，新工作勿再堆这里 |
| `workspace/` | 223 | **A** | 进行中知识/评测/原型 | 主工作脏区，允许实验 |
| `business/` / `handoff/` / `scripts/` | 少 | **A** | 决策与对外交接 | |
| `ai/` | 2596 | **C** | 合并来源 `AI-cs-expert-study` | 映射表已标大量「暂缓」；默认只读参考 |
| `archive/` | 17 | **C** | 已确认归档 | |
| `progress/` | — | **A** | 迁移/triage 进度 | 本表所在处 |

---

## 1. 高优先级分叉（先对齐，再收其它）

| ID | 当前路径 | 约文件数 | Git | 标签 | 建议 Nonsta 落点 | 建议动作 | 理由 |
|----|----------|----------|-----|------|------------------|----------|------|
| P1 | `D:\DA\agent-inventory-assist` | 内容 10；含独立 `.git` | 是 | **A** | `Nonsta/.../agent-inventory-assist/` | **✅ 已确认：以 Nonsta 内为唯一工作副本；并入 DA 根独有/更新内容 → 停用 DA 根独立仓** | 合并完成前禁止两处同改 |
| P2 | `D:\DA\Vas-Nonstandard-Guide` | 1246 | 是 | **A→C（过渡）** | 成果只回流 `workspace/` / `vas/` / `agent-inventory-assist/` | **✅ 已确认：尽快只回流 Nonsta；外仓冻结新主线改动，未迁内容分批并入后标只读/归档** | 外仓不再作 Active 开发根；原型等改在 Nonsta 内进行 |
| P3 | `D:\增值智能化\`（整根） | 2575 | 否 | **B+C** | 不整搬；按子项分流（见 §2） | **降级为附属证据仓；Nonsta 加索引** | 已是上一轮收拢根，与 Nonsta 角色重叠；主线改 Nonsta 后避免第三根 |

---

## 2. `D:\增值智能化` 子项

| ID | 当前路径 | 约文件数 | 标签 | 建议 Nonsta 落点 | 建议动作 |
|----|----------|----------|------|------------------|----------|
| Z1 | `projects/value-add-service-guide-push/` | 252（Git） | **I** | `progress/external_index.md` 链到 `D:\增值智能化\projects\...` | **✅ 已确认：仅索引，不物理迁入 Nonsta** |
| Z2 | `projects/outbound-value-add-service-guide/` | 14 | **I** | 同上 | **✅ 已确认：仅索引，不物理迁入 Nonsta** |
| Z3 | `evidence/` | 1994 | **B** | `workspace/data/raw/` 或仓外索引 `progress/external_evidence.md` | **体量大：默认 I；抽评测要用的进 workspace** |
| Z4 | `deliverables/` | 14 | **B** | `workspace/demos/` 或 `archive/deliverables/` | 路线图/截图：要演示→workspace；仅历史→archive |
| Z5 | `tools/` | 8 | **B** | `scripts/` | 飞书讨论脚本：有用则迁入 scripts |
| Z6 | `workflows/` | 133 | **C** | `archive/workflows/AI_EXPERT_workflow/` | 历史工作流，只查不改 |
| Z7 | `source_snapshots/` | 151 | **C** | `archive/source_snapshots/` | 已是快照 |
| Z8 | `_loose_inputs_202608/` | 4 | **B** | `workspace/data/raw/` | CSV/Excel 输入；注意敏感 |

---

## 3. DA 根其它增值相关

| ID | 当前路径 | 约文件数 | 标签 | 建议 Nonsta 落点 | 建议动作 |
|----|----------|----------|------|------------------|----------|
| D1 | `D:\DA\ai-cs-expert-study` | 8393（Git） | **C** / **I** | 已由 `ai/` 合入；外仓作 remote 追溯 | **不搬**；索引「合入源」；避免再从这里开新主线改动 |
| D2 | `D:\DA\_tmp_ai_cs_expert_study_read` | 2667（Git） | **C**→**D** | — | **归档索引后标删除候选**；与 `ai/` / D1 重复读盘 |
| D3 | `D:\DA\AI_EXPERT` 内 value-add / experts_target | 仓大 | **I** | 索引到 `progress` | 专家系统母仓，不强拆；增值片段已部分进 `增值智能化` |
| D4 | `D:\DA\AI_EXPERT_analyst` | 2161 | **I** / **C** | 索引 | 分析仓；按需抽文件，不整迁 |
| D5 | `D:\DA\experts` | 357 | **I** | 索引 `experts-push` 对照 | 学习/实现源；与 Nonsta `experts/` 可能重叠，先 diff 再决定 |
| D6 | `D:\DA\experts-push` | 1199（Git） | **I** / **B** | 索引；精选文档可进 `experts/` 或 `workspace/knowledge` | 发布仓，保持独立 |
| D7 | `D:\DA\Iron_Triangle_Practice` 内增值样例 | 部分 | **C** | `archive/examples/` 或仅索引 | 练习样例，非产品权威 |
| D8 | `D:\DA\message-reach-dashboard` | 11 | **—（非主线）** | 不纳入 Nonsta 收拢 | **✅ 已确认：不算增值主线**；本 triage 表不再跟踪，保持 DA 原位即可 |
| D9 | `D:\DA\outputs\value_added_related_probe` | ~162+含 node_modules | **B**+**D** | 净结果 → `workspace/data/probe/` 或 `workspace/experiments/vasc-probe/`；`node_modules` → **D** | 接口探测有业务价值；依赖目录不进 Git |
| D10 | `D:\DA\artifact_work*`（×4） | 各约 1 可见脚本级 | **C**→**D** | 脚本若仍要 → `scripts/`；目录本身归档/删 | 历史一次性构建夹 |
| D11 | `D:\DA\spreadsheet_work` | 1 | **C**→**D** | 同 D10 | |
| D12 | `D:\DA\prototypes` | 1 | **C** | 有增值相关则 `workspace/prototypes/`，否则非主线 | 先打开确认主题 |
| D13 | `D:\DA\80_releases_deliverables` | 0（空） | **D** | — | 空壳；交付物多已在 `增值智能化/deliverables` |
| D14 | `D:\DA\99_generated_review` | 0 | **D** | — | 空 |
| D15 | `D:\DA\90_archive_review` | 4 | **C** | 敏感 auth 保持仓外；笔记可索引 | 含敏感认证截图，**勿进 Nonsta Git** |
| D16 | `D:\DA\_tmp` / `Workspace` | 0 | **D** | — | 空临时壳 |

---

## 4. 执行顺序（§5 已确认，可开搬）

| 批次 | 做什么 | 状态 |
|------|--------|------|
| **Batch-0** | P1：以 `Nonsta/.../agent-inventory-assist` 为唯一副本；diff 并入 DA 根独有内容；停用 `D:\DA\agent-inventory-assist` 独立仓 | **✅ 2026-08-27 完成**（见 `batch0_agent-inventory-assist_merge_20260827.md`） |
| **Batch-1** | P2：冻结 `Vas-Nonstandard-Guide` 新主线改动；未迁内容分批回流 `workspace/` / `vas/` / 相关产品目录；外仓标只读 | **待执行** |
| **Batch-2** | 写 Nonsta 根 README + `progress/external_index.md`（Z1/Z2 仅索引；P2 外仓只读说明） | **待执行** |
| **Batch-3** | 迁 B 小件：Z5 tools→`scripts/`，Z8 loose inputs→`workspace/data/raw/`，D9 探测净结果（不含 node_modules） | 待 Batch-0/1 |
| **Batch-4** | C 归档：Z6/Z7、D2、P2 回流完成后的外仓残留；`ai/` 维持只读 | 待 Batch-1 |
| **Batch-5** | D 空壳与 `node_modules` 复核删除 | 最后 |

---

## 5. 已确认决策（2026-08-27）

| ID | 你的决定 |
|----|----------|
| **P1** | 以 `Nonsta/.../agent-inventory-assist` 为**唯一工作副本** |
| **P2** | `Vas-Nonstandard-Guide` **尽快只回流 Nonsta**（外仓不再作 Active 开发根） |
| **D8** | `message-reach-dashboard` **不算**增值主线 |
| **Z1/Z2** | KB 项目 **仅索引**，不物理迁入 Nonsta |

---

## 6. 统计摘要

| 标签 | 条数（约） | 含义 |
|------|------------|------|
| A | 仓内主分区 + P1/P2 | 必须先理顺分叉 |
| B | Z1–Z5、Z8、D9 等 | 收拢有效输入 |
| C | `ai/`、D1/D2、Z6/Z7、练习仓 | 归档或只读 |
| D | 空壳、tmp、node_modules、重复读盘 | 最后删 |
| I | 大 Git 母仓 / 发布仓 | 不搬，只挂索引 |

本表不替代 `progress/迁移映射表_20260817.md`（那是 **Nonsta 仓内** 旧→新分区）。本表管的是：**仓外增值资产相对 Nonsta 主线根怎么收。**
