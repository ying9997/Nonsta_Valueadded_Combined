---
title: 入库异常与增值流程
type: reference
entity_type: inbound_process
tags: [inbound, inbound-process, exception, value-added-service, overview]
source_refs: [
  "source-references/kb-business-source-snapshots/README.md",
  "source-references/exception-vas-data-package/README.md",
  "relationship-mappings/README.md"
]
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 入库异常与增值流程

本目录沉淀“入库 -> 异常 -> 增值”的业务主链路，包括实物流、信息流、客户处理动作、异常单与增值单之间的关系。

本目录采用多分支流程模型，不把入库异常简化为单一路径。AI 需要先判断入库产品/验货方式、业务节点、异常对象、客户处理意图和系统证据，再进入 VASC 与服务项选择。

## 收录内容

- 入库异常进入增值处理的总流程。
- 实物流：货物、包裹、商品、单品、托盘在仓内的处理路径。
- 信息流：入库单、异常单、VASC 产品、增值单、增值服务项、配置字段之间的流转。
- 客户处理动作的判断路径，例如原单上架、新单上架、销毁、自提、拍照暂存。
- 入库产品、业务节点与异常触发点之间的分支地图。

## 不收录内容

- 单个异常的详细解释，放入 `inbound-exceptions/`。
- 单个 VASC 产品解释，放入 `vasc-products/`。
- 单个增值服务项和字段配置，放入 `value-added-service-items/`。
- 异常到 VASC、VASC 到原子的完整适用性表，放入 `relationship-mappings/`。

## 当前文件

- [入库异常到增值服务总流程](inbound-exception-to-value-added-overall-flow.md)
- [入库业务分支与异常触发地图](inbound-business-branch-exception-trigger-map.md)
- [客户处理意图到增值选择决策流程](customer-action-decision-flow.md)
- [入库异常与增值实物流](physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](information-flow-inbound-exception-value-added.md)

其中，实物流和信息流两篇文档同时承担两类通用判断：

- 异常发生时，实物和系统信息分别卡在哪个状态。
- 使用 VASC 后，实物和系统信息会流向哪里。

## 后续计划文件

- `exception-order-to-vasc-order-flow.md`
- `inbound-exception-investigation-entry-flow.md`

## 维护规则

新增或修改本目录文件时，必须同步检查：

- `relationship-mappings/` 是否需要补充或标注证据边界。
- `source-references/` 是否已有项目内来源快照。
- 根 `index.md` 是否列出新增文件。
- 根 `log.md` 是否记录本次变更。
- 来源标记只能使用 `value-add-service-guide/` 内的项目相对路径；目录外资料可以阅读参考，但不能写入正式来源或索引。
