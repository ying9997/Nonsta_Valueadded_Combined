# SKU 域专家业务参考索引

> 本目录存放 `sku` 系列专家的**业务参考**，供实现 `experts/sku/*/design.md` 时对照。  
> 权威实现规格仍以各专家目录下的 `design.md` + `manifest.json` 为准。  
> 原始 SOP 全文在 `_kb/system-guide/data/商品/海外仓商品/`（gitignore，本地维护）。

**业务总览（给产品/客服）** → [expert-manual.md](expert-manual.md)  
**Huddle / 对齐会短介绍** → [huddle-brief.md](huddle-brief.md)

---

## 专家清单与参考文档状态

| 优先级 | Expert ID | 定位 | 参考文档 | 状态 |
|--------|-----------|------|----------|------|
| P1 | `sku/profile` | 共享事实：按 `skuCode` 档案、`supervisorMode`、禁限来源 | [profile.md](profile.md) | **待配置** |
| P1 | `sku/registration-guide` | 对客引导（含解禁浅层） | [registration-guide.md](registration-guide.md) | **待配置** |
| P2 | `sku/compliance-check` | 禁限运 + 申报/品类 + 证书深判 | [compliance-check.md](compliance-check.md)（可选）· [design](../../experts/sku/compliance-check/design.md) | **待配置** |
| P2 | `sku/barcode-guide` | 打标 + 三方编码增删查 | [barcode-guide.md](barcode-guide.md) | **待配置** |
| P2 | `sku/inspection-status` | 查验单进度/结论 | —（边界卡见 [sku-plan.md](../../plan/sku-plan.md)） | 待规划 |

> **已移除**：~~`sku/inventory-status`~~ → [`storage/inventory-query`](../../plan/storage-plan.md)  
> **概念参考**：MMS 实体/飞书 AI 客服方案仅为设计输入，**非**已落地知识图谱；**字段命名以 OpenAPI 为准**（见 [sku-api-matrix.md](../../plan/sku-api-matrix.md) 命名对照）。

---

## system-guide KB 覆盖率（P1）

路径前缀：`_kb/system-guide/data/商品/海外仓商品/`

| KB 文档（主题） | 主归属专家 | 次归属 |
|-----------------|-----------|--------|
| 如何新增商品注册 / 注册商品常见问题 | registration-guide | — |
| 万邑联商品管理操作手册 | registration-guide | profile |
| 修改商品常见问题 / 商品失效 | registration-guide | profile |
| 海外仓特殊属性商品定义 | profile | compliance-check（P2） |
| 批次管理 / 多库存单元管理 | profile | registration-guide |
| 2026 禁限运清单 | compliance-check（P2） | registration-guide（handoff） |
| 如何操作 SKU 证书上传 / GPSR | compliance-check（P2） | registration-guide |
| 如何批量打印商品条码 / 第三方条码 | barcode-guide（P2） | — |

---

## 关联文档

| 文档 | 说明 |
|------|------|
| [sku-plan.md](../../plan/sku-plan.md) | 域 SSOT：边界卡、路由速查、状态追踪 |
| [sku-data.md](../../plan/sku-data.md) | 能力簇、场景映射、非 sku 清单 |
| [sku/playbook.md](../../sku/playbook.md) | LLM Wiki：决策树、flows、场景占比 |
| [sku-api-matrix.md](../../plan/sku-api-matrix.md) | MMS/OSWH API 与 Gap |
| [how-to-design-expert.md](../../how-to-design-expert.md) | 设计流程与步骤 9 评审门禁 |
