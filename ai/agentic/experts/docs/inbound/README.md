---
title: Winit 入库 Inbound Playbook 索引
type: index
tags: [inbound, playbook]
updated: 2026-06-06
---

# Winit 入库 Inbound Playbook 索引

> 本目录是 Winit 入库全流程的**结构化知识库**，面向 `inbound` 系列专家与人工客服。
> 原始操作 SOP、Helpdesk 话术、截图等保留在 [`_kb/service-team/inbound-services-doc/`](../../_kb/service-team/inbound-services-doc/) 及 [`_kb/product-team/winit/in-warehouse/`](../../_kb/product-team/winit/in-warehouse/)。

---

## 文档地图

```
docs/inbound/
├── README.md                         ← 本文件：索引与导读
├── playbook.md                       ← Hub：双轨模型、产品分层、状态机、决策树
├── appendix-psc-dimensions.md        ← PSC 维度矩阵（决策用摘要）
└── flows/
    ├── 01-standard-first-leg.md      ← 标准海外仓入库（Winit 头程全链路）
    ├── 02-direct-self-inspection.md  ← 直发 + 自验（客户在国内验货）
    ├── 03-direct-overseas-inspection.md ← 直发 + 海外验（海外仓验货）
    ├── 04-domestic-warehouse.md      ← 国内仓/中转仓节点（验货出库段）
    ├── 05-customs-and-international.md  ← 出口报关、国际运输、进口清关
    ├── 06-appointment-and-delivery.md   ← 预约送仓：快递/散货/整柜规则
    └── 07-receiving-putaway-exceptions.md ← 海外到仓、卸货、上架、异常
```

---

## 阅读顺序

1. 若需**快速定位客户所在链路** → 先读 `playbook.md`「产品选择决策树」
2. 若需了解**某一具体环节** → 直接跳到对应 `flows/` 分册
3. 若需核对 **PSC 编码归属** → 看 `appendix-psc-dimensions.md`，全量表在 [`_kb/system-team/inbound-psc-codes.md`](../../_kb/system-team/inbound-psc-codes.md)

---

## 客服咨询场景 → 章节映射

> 来源：[`docs/plan/inbound-data.md`](../plan/inbound-data.md)（8,989 条客服咨询 LLM 分析）

| 一级咨询分类 | 数量 | 主要读取章节 | 对应专家 |
|---|---:|---|---|
| 入库异常核实（数量差异/破损/签收争议） | 2,099 | `flows/07` | `inbound/inbound-exception-check` |
| 增值操作指引（贴标/拍照/包装） | 1,563 | `flows/07`（触发节点） | `value-add/value-add-exception-diagnosis` → `value-add/value-add-product-recommendation` |
| 仓库信息获取（地址/时效/仓型） | 1,045 | `playbook.md`「SLA 速查」 | `inbound/inbound-warehouse-info` |
| 权限申请及进度 | 851 | `playbook.md`「前置条件」 | `inbound/inbound-permission-apply` |
| 入库单状态 / 流程咨询 | 834 | `playbook.md`「状态机」+ `flows/01-03` | `inbound/inbound-order-status` + `inbound-process-guide` |
| 加急上架 / 未上架催促 | 813 | `flows/07`「上架 SLA 与催架」 | `inbound/inbound-putaway-expedite` |
| 到仓时间确认（轨迹/预计到仓） | 691 | `flows/05-06`、`flows/01`「转运段」 | `inbound/inbound-arrival-status` |
| 上架进度 + 数量核实 | 804 | `flows/07` | `inbound/inbound-putaway-status` |
| 清关进度确认 | 254 | `flows/05` | `inbound/inbound-customs-clearance` |
| 库容/Slots/承接能力 | — | `flows/06`「库容与 Slots」 | `inbound/inbound-capacity-availability` |
| 退费申请 | 35 | — | `billing-*`（待建） |

---

## 标注约定

- **`[KB]`**：有 `_kb` 文档明确来源
- **`[推断]`**：基于 PSC 命名、产品矩阵或行业常识推导；需产品确认
- 每个分册末尾「延伸阅读」列出相关 `_kb` 文档

---

## 关联文档

| 文档 | 说明 |
|---|---|
| [`docs/how-to-design-expert.md`](../how-to-design-expert.md) | 专家规划与设计通用流程（域 plan、边界、API 矩阵） |
| [`docs/plan/inbound-experts-plan.md`](../plan/inbound-experts-plan.md) | 入库专家规划（18 个专家：业务流程层 + 基础信息层） |
| [`docs/plan/inbound-api-matrix.md`](../plan/inbound-api-matrix.md) | 18 专家 API 场景矩阵（MKS 额度/OMS PSC/多维表格权限共享层、跨域索引） |
| [`docs/plan/domain-taxonomy.md`](../plan/domain-taxonomy.md) | 域划分与命名约定 |
| [`docs/experts/inbound/`](../experts/inbound/) | 入库专家业务参考（P0 已完成，见 [README](../experts/inbound/README.md)） |
| [`_kb/system-team/inbound-psc-codes.md`](../../_kb/system-team/inbound-psc-codes.md) | 76 条 PSC 编码全量对照 |
