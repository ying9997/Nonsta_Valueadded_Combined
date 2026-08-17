---
title: SKU 域 LLM Wiki 索引
type: index
tags: [sku, playbook, customer-service]
sources:
  - raw/new-product-shipping-inquiry.md
  - raw/inbound-carriability-flow.md
  - raw/consultation-taxonomy-analysis.md
updated: 2026-07-10
---

# SKU 域 LLM Wiki 索引

> 面向 `sku/profile`、`sku/registration-guide`、`sku/compliance-check`（P2）的**结构化知识库**。  
> 原始飞书 Wiki 导出保留在 [`raw/`](raw/README.md)；本目录为 AI 可直接检索的归纳版。  
> 标注：**`[KB]`** = 飞书导出或系统界面截图可核对；**`[推断]`** = 待产品确认。

---

## 文档地图

```
docs/sku/
├── README.md                    ← 本文件：索引与场景路由
├── playbook.md                    ← Hub：术语、主决策树、专家路由
├── scenes/
│   └── consultation-taxonomy.md   ← 商品咨询群 ~7,450 条归类与占比
├── flows/
│   ├── 01-new-product-carriability.md   ← 新品能否发货/入库
│   ├── 02-registration-audit-expedite.md← 注册审核与加急
│   ├── 03-return-resubmit.md            ← 退回原因与重提
│   ├── 04-direct-shipment-restriction.md← 头程直发限制（限直发）
│   ├── 05-prohibit-inbound-sale.md      ← 禁止入库 / 禁售
│   ├── 06-special-attribute-removal.md  ← 解除带电/液体/磁/粉末/刀片/DG
│   └── 07-compliance-certificates.md    ← WEEE/GPSR/MSDS/电清关链接
├── appendix/
│   ├── system-paths.md          ← 万邑联 / TOM 查询路径
│   ├── weee-categories-de.md    ← 德国 WEEE 六类定义
│   └── ecommerce-clearance-link-rules.md ← 电商清关销售链接要求
└── raw/                         ← feishu-docx 原始导出 + 配图（英文路径）
```

---

## 客服场景 → 章节 → 专家

| 客户问法（摘要） | 咨询量占比 | 读取章节 | Expert |
|------------------|-----------|----------|--------|
| SKU 加急审核 / 注册加急 | ~61% | `flows/02` | `sku/registration-guide` |
| 商品能否承运或入库（新品） | ~25% | `flows/01` | `sku/registration-guide` · P2 `compliance-check` |
| 为什么限直发 / 不能下 Winit 头程单 | ~3% | `flows/04` | `sku/profile` · `sku/registration-guide` |
| 退回原因 / 怎么改 | ~2% | `flows/03` | `sku/registration-guide` |
| 禁止入库 / 禁售原因 | <1% 各 | `flows/05` | `sku/profile` · P2 `compliance-check` |
| 取消带电池/液体/磁等属性 | <1% 各 | `flows/06` | `sku/registration-guide` |
| WEEE / GPSR / 电池资料 / 电清关链接 | <1% 各 | `flows/07` | P2 `compliance-check` · `sku/registration-guide` |

完整域边界见 [sku-plan.md](../plan/sku-plan.md)、[sku-data.md](../plan/sku-data.md)。

---

## 关联文档

| 文档 | 说明 |
|------|------|
| [docs/experts/sku/](../experts/sku/README.md) | 专家业务参考 |
| [experts/sku/*/design.md](../../experts/sku/profile/design.md) | 实现向设计 |
| `_kb/system-guide/data/商品/海外仓商品/` | 操作手册 SSOT（gitignore） |

---

## 维护

原始 Wiki 重新导出见 [raw/README.md](raw/README.md)。结构化文档变更须同步更新 `playbook.md` 决策树与本索引映射表。
