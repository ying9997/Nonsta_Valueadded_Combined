# AI_EXPERT 目录规范

> **性质**：等同于 `_workflow/README.md`——所有新建目录/文件必须遵守，Agent 也必须执行。
> **生效**：2026-07-28 起新建内容必须符合；存量内容渐进治理（见末尾迁移清单）。
> **维护者**：本人。修改本规范时同步更新 `AGENTS.md` 的路由表。

---

## 0. 设计原则

本规范融合三个已验证的范式：

| 范式 | 核心思想 | 本仓库如何用 |
|---|---|---|
| **PARA**（Tiago Forte） | 按行动力分类：Projects / Areas / Resources / Archives | 四区分离，活跃项目和存档严格分开 |
| **Johnny Decimal** | 每类东西有固定编号区间，一个东西只在一个地方 | 一级目录分区编号（10-/20-/30-/…），保证唯一权威位置 |
| **Monorepo** | shared/ + packages/ + apps/，依赖清晰 | 复用资产 vs 引擎 vs 实例三层分离 |

**最高原则：一个东西只在一个地方。** 如需多处引用，用 README 中的链接指向权威路径，不复制文件。

---

## 1. 一级目录分区

```
D:\da\ai_expert\
│
├── 10_projects/          ← 活跃项目（有明确目标和截止）
├── 20_areas/             ← 持续职责（无截止，持续维护）
├── 30_resources/         ← 参考资源（知识库、工具、第三方）
├── 40_archives/          ← 归档（已完成/暂停/废弃的项目）
├── _workflow/            ← 任务流水日志（已有规范，不动）
│
├── README.md             ← 目录索引
├── HANDBOOK.md           ← 人读总说明
├── AGENTS.md             ← 机器路由
└── .gitignore
```

**根目录硬约束**：
- 只允许 README.md / HANDBOOK.md / AGENTS.md / .gitignore / skills-lock.json
- 任何其他文件必须进入对应分区目录
- 不允许直接在根目录创建子目录（除上述 5 个分区 + `_workflow/`）

---

## 2. 各区定义与归属规则

### 10_projects/ — 活跃项目

**定义**：有明确交付目标 + 有截止时间 + 正在推进的工作。

**归属判断**：如果你这周/这月会打开它写东西 → 在这里。

**当前归属**（迁移后）：

| 项目 | 目录名 | 旧位置 |
|---|---|---|
| 增值配置 AI 化 | `vas-config-ai/` | `增值配置AI化/` |
| 非标增值客户引导 | `vas-nonstandard-guide/` | 在 `增值配置AI化/增值单ai指引助手/` 内 |
| 库存健康度平台 | `inventory-health/` | `Inventory_temperature_health_related/` |
| 履约报告 | `fulfillment-reports/` | `fulfillment_reports/` + `Recommended_*` |

**项目内部结构模板**（建议，不强制）：

```
10_projects/{project-name}/
├── README.md           ← 项目一句话 + 当前状态 + 权威入口
├── docs/               ← 设计文档
├── configs/            ← 配置
├── runs/               ← 实验/运行产出（.gitignore 大文件）
├── scripts/            ← 脚本
└── data/               ← 数据（.gitignore 原始数据）
```

### 20_areas/ — 持续职责

**定义**：没有"完成"状态，是长期维护的能力/系统。

**归属判断**：如果它"不会结束"只会"持续优化" → 在这里。

**当前归属**：

| 职责域 | 目录名 | 旧位置 |
|---|---|---|
| TOM 连接器 | `tom-connector/` | `TOM/` |
| FMS 连接器 | `fms-connector/` | `FMS文件访问/` |
| 数据库连接 | `db-connector/` | `数据库/` + `数据库连接公共服务/` |
| 专家系统（生产） | `experts/` | `experts_target/` |
| SmartBI 服务 | `smartbi-server/` | `smartbi_server/` |
| 学习与成长 | `learning/` | `learn(xuexi)/` |

### 30_resources/ — 参考资源

**定义**：不是我产出的，而是我消费/参考的知识或工具。

**归属判断**：如果是"查阅用的"而不是"我在写的" → 在这里。

**当前归属**：

| 资源 | 目录名 | 旧位置 |
|---|---|---|
| 产品/系统团队知识库 | `kb-product-system/` | `_kb0702/kb_all/` |
| 增值服务知识库 | `kb-value-add/` | `_kb0702/value-add-service-guide/`（唯一权威） |
| 头程补货知识库 | `kb-replenishment/` | `_kb0702/first-mile-replenishment-guide/` |
| 第三方 Skills | `skills/` | `skills/` |
| AI 工作规范手册 | `methodology/` | `AI工作规范手册_*` + `.cursor/skills/` |

### 40_archives/ — 归档

**定义**：已完成/暂停/废弃，不再修改但保留供参考。

**归属判断**：超过 1 个月没碰 + 不打算继续 → 归档。

**归档命名**：`{原目录名}_archived_{YYYYMM}/`

**当前应归档**：

| 内容 | 旧位置 |
|---|---|
| 库存分析早期版本 | `Inventory_*/temperature_health/`、`Temperature_health_ruilian/` |
| 客服项目管理（参考） | `agentic/winit-ai-agent-project-manage/` |
| TOM 原始能力包 | `20260611-TOM接口能力包/` + `.zip` |
| Coze 快照 | `agentic/Coze工作流导出/`、`Coze离线快照/` |
| MBR Dashboard（参考） | `MBR/`、`MBR-Dashboard-Realtime/` |

---

## 3. 命名规范

### 目录命名

| 规则 | 正例 | 反例 |
|---|---|---|
| 纯英文 kebab-case | `vas-config-ai/` | `增值配置AI化/` |
| 无括号、无空格、无中文 | `learning/` | `learn(xuexi)/` |
| 项目名用业务缩写 | `inventory-health/` | `Inventory_temperature_health_related/` |
| 日期前缀仅用于 `_workflow/` 内 | `_workflow/20260728_xxx/` | 根目录出现 `20260611-*` |

### 文件命名

| 场景 | 模式 | 正例 |
|---|---|---|
| 设计文档 | `{主题}_{YYYYMMDD}.md` | `mvp-scope_20260717.md` |
| 配置文件 | `{用途}.yaml` | `sheet-mapping.yaml` |
| 脚本 | `{动作}_{对象}.py` | `probe_mks_price.py` |
| 会议纪要 | `meeting_{主题}_{YYYYMMDD}.md` | `meeting_vas-config_20260717.md` |
| 临时/中间产物 | 以 `_tmp_` 前缀 + 进 `.gitignore` | `_tmp_pricecard.tsv` |

### 禁止出现在 git 的内容

```gitignore
# 必须在 .gitignore 中
node_modules/
.venv/
__pycache__/
__MACOSX/
*.zip        # 大文件用链接引用而非直接存储
_tmp_*
output/      # 运行时产出
```

---

## 4. 唯一权威路径规则

**核心**：一份内容只有一个可编辑的位置。其他需要引用的地方用链接。

| 场景 | 做法 |
|---|---|
| 两处需要同一份知识库 | 确定一处为权威（在 README 标注），另一处写 README 指向权威路径 |
| 代码有新旧两版 | 只保留最新版，旧版 git tag 后从工作目录删除 |
| 备份 | 用 git 分支/tag，不在文件系统创建 `*_bak`、`*_backup`、`*_old` 目录 |
| 项目从活跃变归档 | 移到 `40_archives/`，AGENTS.md 路由表同步更新 |

**禁止**：
- 复制整个目录作为备份（用 `git tag v{date}_{purpose}` 代替）
- 同一内容在两个目录都能编辑
- 保留 `*_bak/` 后缀的目录超过 1 周

---

## 5. 与已有规范的关系

| 规范 | 管辖范围 | 本规范的补充 |
|---|---|---|
| `_workflow/README.md` | 任务流水归档格式 | 不动，继续按"日期_任务名/四件套"执行 |
| `AGENTS.md` 路由表 | Agent 找文件 | 路由表中的路径必须指向权威位置 |
| `HANDBOOK.md` 三层模型 | 叙事/交付/学习 | 本规范细化为 4 区（projects/areas/resources/archives）|
| 项目内 `AGENTS.md` | 项目级 Agent 约定 | 项目内规范优先于本全局规范 |

---

## 6. 参考范式说明

### PARA（Projects / Areas / Resources / Archives）

出处：Tiago Forte《Building a Second Brain》。
核心：按行动力而非主题分类。同一个"增值服务"话题，活跃项目在 Projects、知识库在 Resources、做完的在 Archives。
适合你的原因：你的工作区混合了"正在做的"和"参考用的"——PARA 的四区分类能解决"这个目录还活着吗"的问题。

### Johnny Decimal

出处：[johnnydecimal.com](https://johnnydecimal.com)
核心：10 个大类 × 10 个子类 = 最多 100 个位置，每个东西只有一个地方。编号保证排序。
适合你的原因：你的 `narrative(xushi)/` 已经在用编号（01-06），扩展到一级目录（10_/20_/30_/40_）让排序稳定。

### Monorepo 三层分离

出处：Nx/Turborepo 约定（`libs/` + `apps/` + `tools/`）。
你已在用的实例：Inventory 的 `shared/` + `platform/` + `projects/`。
扩展方式：每个项目内可按"规则层 / 引擎层 / 实例层"组织。

---

## 7. 渐进迁移计划（不用一次做完）

### Phase 1：止血（本周）

- [ ] 根目录散落文件归位（10 个文件，15 分钟）
- [ ] 删除 `__MACOSX/`
- [ ] `.gitignore` 加入 `node_modules/`、`.venv/`、`__MACOSX/`、`*.zip`
- [ ] 确定学习目录权威路径 = `learn(xuexi)/`，`_learning/` 内容合并后删除

### Phase 2：去重（本月内）

- [ ] `agentic/value-add-service-guide/` 内容确认与 `_kb0702/` 一致后删除，改为 README 链接
- [ ] `agentic/experts/` 确认 `experts_target/` 为最新后删除（或 .gitignore 其 node_modules）
- [ ] Inventory 内 `*_bak` 目录用 git tag 标记后删除

### Phase 3：重构命名（下月）

- [ ] 新建 `10_projects/`、`20_areas/`、`30_resources/`、`40_archives/` 四个分区目录
- [ ] 活跃项目逐个迁入 `10_projects/`（每次迁一个，更新 AGENTS.md 路由）
- [ ] 连接器迁入 `20_areas/`
- [ ] 知识库迁入 `30_resources/`
- [ ] 归档内容迁入 `40_archives/`

### Phase 4：稳态（持续）

- 每次新建目录前对照本规范自检
- 每月检查一次：有没有目录 >1 月未修改 → 考虑归档
- AGENTS.md 路由表保持与物理路径同步

---

## 8. 自检 Checklist（新建目录时）

1. [ ] 这个内容属于哪个区？（projects / areas / resources / archives）
2. [ ] 这个位置是否已有同类内容？（避免重复）
3. [ ] 目录名是否纯英文 kebab-case？
4. [ ] 是否需要在 AGENTS.md 更新路由？
5. [ ] 如果是引用他人内容，权威路径在哪？（不复制，只链接）
6. [ ] 是否有 README.md 说明用途？（>3 文件的目录必须有）

---

*本规范修改时同步更新 AGENTS.md 路由表和 HANDBOOK.md 三层模型描述。*
