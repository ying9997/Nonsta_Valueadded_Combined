# 专家大版本批量升级手册

本文记录**批量发布新版本**的完整操作流程，适用于同时迭代多个专家、需要在 Coze 侧更新工作流并在飞书多维表登记新版本的场景。

单专家小迭代无需走完整流程，可在对应步骤后提前结束。

---

## 前置条件

- Node.js 已安装，依赖已就绪（`npm install`）
- 飞书登记表的环境变量已配置在 `.env`（见 [scripts/README.md](../scripts/README.md)）：
  - `FEISHU_APP_ID`
  - `FEISHU_APP_SECRET`
  - `FEISHU_BITABLE_APP_TOKEN`
  - `FEISHU_BITABLE_TABLE_ID`

---

## 步骤 1：确保所有 manifest 合法

```bash
npm run check:experts:manifest
```

修复所有报错后再继续。常见问题：
- `inputSchema` 含框架保留键（`query`、`inputContext` 等）
- `manifest.id` 与目录名不一致
- `outputSchema` 含 `outputContext`（框架字段，禁止写入 manifest）

---

## 步骤 2：生成所有专家的 Coze 导出包

```bash
npm run export:coze:all
```

成功后，各专家包写入两处：

| 位置 | 用途 |
|------|------|
| `experts/{domain}/{id}/workflow/workflow/*.yaml` | 工作流草稿，与仓库一同维护 |
| `experts_coze_output/{id}.zip` | 上传 Coze 用的压缩包 |

如某个专家单独失败，可单独重跑：

```bash
npm run export:coze -- experts/{domain}/{expert-id}
```

> `tracking-stale` 等**无 `coze.config.yml` 的专家**不参与 `export:coze:all`，其草稿 YAML 需手工维护（或补建 `coze.config.yml`）。检查 `experts_coze_output/` 目录，确认所有需要上传的专家都有对应 `.zip`。

---

## 步骤 3：更新 `release-id.ts` 版本号

打开 `experts_recaller/nodes/release-id.ts`，将 `release_id` 改为新的批次标识：

```ts
// 格式：rel-experts-YYYYMMDD
const release_id = 'rel-experts-20260508';
```

**命名约定**：`rel-experts-` 后接**本次发布的日历日**（`YYYYMMDD`）。每次大版本发布改一次；同一天的修复可沿用当日 ID。

该字段同时用于：
1. **`experts_recaller` 工作流**中标识当前在线的专家批次
2. **飞书登记表** `release_id` 列，便于按批次追踪上线记录

---

## 步骤 4：预检同步（dry-run）

**无需**飞书 token，可先运行 dry-run 确认版本号与字段无误：

```bash
npm run sync:expert-register:dry-run
```

输出示例：

```
--- delivery-status ---
ver: "1.0.0" -> "V1.0.0_20260508"
release_id: "rel-experts-20260508"
{ ... 多维表字段预览 ... }

展示 11 条，跳过 0 条（未调用飞书写接口）；ver-date=20260508；扫描共 11 条
```

若某专家 `manifest.json` 没有 `version`，可传入兜底值：

```bash
npm run sync:expert-register:dry-run -- --ver 1.0.0
```

若需指定日期（非今天）：

```bash
npm run sync:expert-register:dry-run -- --ver-date 20260508
```

---

## 步骤 5：执行飞书登记表同步

确认 dry-run 无误后，**配置好 `.env`** 再执行：

```bash
npm run sync:expert-register
```

脚本会按 `(expert_id, ver, release_id)` 查找现有记录：
- **存在** → 更新该行
- **不存在** → 新建行

仅同步单个专家（**勿用 `--only` 或 `npm run ... -- --flag`**，npm 会拦截）：

```bash
# 推荐：positional（最稳）
npm run sync:expert-register -- tracking-stale

# 或 npm config 写法（无需 --）
npm run sync:expert-register --expert-id=tracking-stale
npm run sync:expert-register:dry-run --expert-id=tracking-stale
```

---

## 步骤 6：【人工】上传各专家包到 Coze

从 `experts_coze_output/` 目录取出各专家的 `.zip` 文件，在 Coze 控制台逐一导入/更新。

操作路径（Coze 控制台）：

1. 进入对应专家的工作流
2. 点击「导入」→ 选择 `.zip` 包
3. 确认节点连线、变量绑定无误后**发布**

> ⚠️ 导入后务必**在 Coze 侧发布**，否则线上调用的仍是旧版。

---

## 步骤 7：【人工】将 `workflow_id` 回填到飞书多维表

每个专家在 Coze 发布后会得到（或维持）一个 `workflow_id`。将最新的 `workflow_id` 填入飞书登记表对应行的 `coze_workflow_id` 列。

`experts_recaller` 工作流根据此列调用各专家，**不填则无法路由**。

---

## 验收清单

- [ ] `npm run check:experts:manifest` 无报错
- [ ] `npm run export:coze:all` 无报错，`experts_coze_output/` 下各专家 `.zip` 均已生成
- [ ] `experts_recaller/nodes/release-id.ts` 的 `release_id` 已更新到本次日期
- [ ] `npm run sync:expert-register:dry-run` 输出符合预期（版本号、条数无异常）
- [ ] `npm run sync:expert-register` 执行成功（飞书表行已新建/更新）
- [ ] Coze 侧各专家已导入并**发布**新版本
- [ ] 飞书登记表各行的 `coze_workflow_id` 已填写/核对

---

## 常用参数速查

| 命令 | 说明 |
|------|------|
| `npm run check:experts:manifest` | 校验所有 manifest，不生成任何文件 |
| `npm run export:coze:all` | 批量导出所有专家的 Coze 包（zip + yaml） |
| `npm run export:coze -- experts/{domain}/{id}` | 单专家导出 |
| `npm run sync:expert-register:dry-run` | 预览同步内容，不写飞书 |
| `npm run sync:expert-register` | 实际写入飞书（需 `.env`） |
| `npm run sync:expert-register -- <id>` | 仅同步指定专家（推荐 positional） |
| `npm run sync:expert-register --expert-id=<id>` | 仅同步指定专家（npm config 写法） |
| `npm run sync:expert-register --ver=<x.y.z>` | 兜底版本号（manifest 无 version 时） |
| `npm run sync:expert-register --ver-date=<YYYYMMDD>` | 指定版本日期 |

---

## 相关文档

| 文档 | 用途 |
|------|------|
| [how-to-create-expert.md](how-to-create-expert.md) | 新建单个专家的完整流程 |
| [design-spec.md](design-spec.md) | 三层输出约定（§7）、inputSchema 边界（§6） |
| [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) | `coze.config.yml` 详细配置与 endOutputs 说明 |
| [scripts/README.md](../scripts/README.md) | 环境变量与本地调试 |

---

*维护：每次发布流程有变更时，同步更新本页。*
