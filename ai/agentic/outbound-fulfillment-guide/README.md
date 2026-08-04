# outbound-fulfillment-guide

面向 AI Agent 的海外仓出库仓内履约知识库治理项目。本次范围止于仓库完成出库并完成承运商或客户交接。

## 当前状态

项目处于 Phase 0：规则、Schema、目录和校验骨架建设中。

当前不包含正式业务事实，不可用于回答具体出库规则，也没有可消费的 runtime knowledge package。

进度与验证以 [ROADMAP.md](ROADMAP.md) 为准。

## 目标范围

知识主干覆盖：

- 出库下单、资格、字段和订单类型。
- 信息、库存、费用与资格校验。
- 库存占用与分配、订单释放、波次、拣货及其异常。
- 复核、VASC、装箱、包装、打托、称重、量方和面单。
- 仓库出库、集货、承运商交接、自提、销毁、下架等仓内终点。
- 仓内异常、处理动作、SLA、费用、增值服务项和配置字段。
- 对象层级、状态域、适用范围、有效期和来源证据。

承运商和派送产品只收录面单、仓库出库及交接所需信息。交接后的轨迹、首扫、在途、派送、妥投、POD、查件、索赔、派送失败处置，以及独立退货或 RMA 均不在本次范围内。

## 核心设计

```text
source-references/snapshots
→ source-references/extracts 和 data/extracted
→ data/canonical/entities + data/canonical/relationships + data/canonical/vocabularies
→ domain + entities + relationship-mappings + glossary
→ index + runtime slices + release package
```

`data/canonical/` 是唯一可审查事实源。业务 Markdown 和关系映射是生成视图，不是第二事实源。

## 根文件

| 文件 | 职责 |
|---|---|
| `AGENTS.md` | AI 行为、读取顺序、查询、写入、Git 和维护闭环 |
| `SCHEMA.md` | 实体、事实、关系、来源、状态和报告契约 |
| `ROADMAP.md` | 当前阶段、验证、阻塞和下一步 |
| `VERSION` | 当前 SemVer；`0.0.0` 表示尚未发布知识版本 |
| `CHANGELOG.md` | 已发布或未发布变更 |
| `DECISIONS.md` | 关键治理和工程决策 |
| `index.md` | 生成导航；当前仅为 Phase 0 引导页 |
| `log.md` | 操作、校验、冲突和未完成事项记录 |

## 目录

| 目录 | 职责 |
|---|---|
| `domain/` | 按履约主题生成的流程和规则视图 |
| `entities/` | 稳定实体的生成视图 |
| `relationship-mappings/` | Canonical 关系的可读映射 |
| `data/` | Schema、候选数据、Canonical 和可重建报告 |
| `source-references/` | 项目内证据快照、抽取和来源报告 |
| `glossary/` | 术语、代码、状态域和对象层级生成视图 |
| `templates/` | Canonical 和治理文件模板 |
| `tests/` | 检索、答案、边界和 fixture |
| `scripts/` | 校验、生成、覆盖和发布工具 |
| `releases/` | 版本记录和包外发布证据 |
| `dist/` | 本地可重建发布产物，不作为事实源 |

## 本地命令

```text
npm ci
npm run kb:validate
```

Phase 0 只实现 `kb:validate`。其他 `kb:*` 命令在实现前必须明确返回 `not_implemented`，不能假成功。

Phase 0 校验通过只代表骨架合格，不代表业务知识完整、发布包可用或外部系统已生效。

## 写入边界

- 正式文件只使用项目内相对路径。
- 外部资料先进入 `source-references/`，再成为正式来源。
- 不在本项目存储具体客户、订单或线上实时状态。
- 不把 Expert、Prompt、工作流或 Coze 配置写入知识发布包。
- push、tag、release、远程仓库和外部发布必须另行确认。
