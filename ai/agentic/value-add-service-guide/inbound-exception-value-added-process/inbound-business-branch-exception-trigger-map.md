---
title: 入库业务分支与异常触发地图
type: reference
entity_type: inbound_process
tags: [inbound, exception, trigger-map, business-branch, winit]
source_refs:
  - source-references/kb-business-source-snapshots/inbound-product-details.md
  - source-references/kb-business-source-snapshots/inbound-faq.md
  - source-references/kb-business-source-snapshots/inbound-rules.md
  - source-references/kb-business-source-snapshots/inbound-exception-handling.md
  - source-references/kb-business-source-snapshots/exception-inbound.md
  - source-references/kb-business-source-snapshots/direct-ship-order-overseas-warehouse.md
  - source-references/kb-business-source-snapshots/direct-ship-parcel-sop.md
  - source-references/kb-business-source-snapshots/direct-ship-parcel-winit.md
  - source-references/kb-business-source-snapshots/putaway-parcel-unit.md
  - source-references/kb-business-source-snapshots/overseas-warehouse-inbound-unloading-exception.md
  - source-references/kb-business-source-snapshots/customer-direct-ship-inbound.md
  - source-references/kb-business-source-snapshots/no-box-list-forecast-faq.md
updated: 2026-06-23
confidence: medium
fidelity: synthesis
status: draft
---

# 入库业务分支与异常触发地图

本文件用于让 AI 判断“问题从哪条入库分支、哪个业务节点触发”。它不直接给出最终 VASC 结论；最终可选 VASC 仍需查询 `relationship-mappings/`。

## 分支索引

| 分支 | 关键触发点 | 可能异常/问题 | 首要证据 |
|---|---|---|---|
| 标准海外仓入库 | 国内仓验货、海外仓卸货/上架、订单状态变化 | 商品尺重、条码、包装、数量差异、作废后到仓 | 入库单状态、验货数量、异常事件、上架数量、包裹轨迹。 |
| 直发国内验/自验 | 客户或国内前置验货完成后直发海外 | 自验未完成、包裹条码、少包裹/少单品、POD 与卸货不一致 | 验货完成状态、卸货记录、POD、预分拣记录。 |
| 直发海外验 | 海外仓到仓后验货 | 入库单状态异常、串仓、商品/包裹条码异常、未卸货、无主货 | 入库单状态、目的仓/实际仓、快递单号、卸货记录、异常单。 |
| 无箱单预报 | 依赖识别码和 SKU 件数，不依赖箱单明细 | 识别码问题、第三方条码未关联、后到包裹不能原单上架 | 识别码、预报单状态、SKU、第三方条码关联、异常状态。 |
| 100%A+ / A+ 特殊方案 | 包裹条码和商品条码校验更强 | A+ 包商品条码和包裹条码关系不一致、无包裹条码、批次信息缺失 | A+ 包裹规则、商品/包裹对应关系、异常编码。 |
| 终止/作废/已上架后到仓 | 信息流已中断或已闭合，实物后续到仓 | 入库单状态异常、后到包裹、已上架需拦截 | 终止人、终止原因、包裹状态、订单状态、是否质控终止。 |
| 库内/出库发现入库遗留问题 | 货物已在库或出库时才发现 | 单品条码异常、包装异常、质量异常、自提单取消出库后需入库承接 | 库存状态、出库/库内异常编码、是否需要入库新单承接。 |

## 节点触发地图

| 节点 | 触发条件 | AI 应先问/查 | 可能承接动作 |
|---|---|---|---|
| 商品注册/条码维护 | 第三方条码未维护、商品包装属性不符、需采集第三方箱码但无箱单不支持 | SKU、第三方条码、包装属性、是否开通权限 | 到仓前纠正；到仓后可能第三方条码关联、换标、新单上架。 |
| 入库单创建 | 目的仓、Winit 产品、验货方式、箱单/无箱单、状态错误 | 入库产品、目的仓、状态、是否草稿/已下单/终止 | 状态恢复、新单、异常单处理、非标改数。 |
| 发货/预约 | 未预约、预约状态限制、发货后未更新状态 | 预约状态、送仓方式、入库单当前状态 | 状态异常、送仓异常、客服介入。 |
| 到仓/卸货 | 无卸货记录、有卸货但未关联包裹、整柜卸货不逐一扫描 | 快递单号、POD、签收地址/人、卸货记录、分批送仓 | 视频调查、仓库调查、无主货找回、补包裹条码。 |
| 预分拣/验货 | 商品/包裹/子包裹/数量不匹配 | 异常对象、图片、SKU、条码、验货数量、预分拣记录 | 原单/新单上架、补/换条码、拍照、销毁、自提。 |
| 异常暂存 | 操作增值类异常已登记 | 异常编码、对象、仓库、状态、是否有关联入库单 | 查询可选 VASC，客户提交处理动作。 |
| 上架完成/部分完成 | 客户反馈少件、多件、后到包裹或库存冻结 | 上架数量、计划/验货数量、异常事件、盘点结果、包裹状态 | 盘点、补上架、新单上架、库存调整、解释无差异。 |
| 终止/作废 | 客户、系统或质控终止后实物仍流转 | 终止人、终止原因、是否质控终止、是否已到仓 | 原单是否可恢复/上架、新单+增值、数据修改服务。 |

## 重点分支说明

### 直发串仓

直发串仓是“实物到仓仓库”和“入库单目的仓”不一致。AI 不能直接回答“补标签即可”。应先判断：

- 实际到仓仓库与目的仓是否同国家、同仓群或可调拨。
- 客户是否有实际仓的直发/上架权限。
- 是否选择实际仓新单上架、目的仓调拨、自提、销毁或非标。
- 若新单上架，通常还要补贴包裹条码。

### 少包裹/少单品

少包裹/少单品不一定先有异常单。AI 应先分清：

- 包裹是“准备中”“已卸货”“已包裹预分拣”“已上架”还是其他状态。
- 直发非整柜是否有逐包卸货扫描；整柜卸货是否只代表整柜层面完成。
- 是否存在异常事件；若无异常事件，可能需要预分拣、盘点或视频调查。
- 若确认为计划外/漏上架，再判断补上架、新单上架、退费或赔付。

### 入库单状态异常

入库单状态异常常见于直发国内验非运输中、直发海外验非已下单、订单草稿/终止、直发自验未验货完成等场景。处理方向包括：

- 仓库可自动处理或客户更新状态后继续上架。
- 新单上架并补贴包裹条码。
- 销毁、自提、拍照暂存。
- 特殊需求走入库非标增值或数据恢复。

### 无主货

无主货是“货物到仓但无法定位清楚信息流”。AI 需先走找回和识别：

- 是否有 Winit 标签、商品编码、第三方条码、快递单号或客户提供的 POD。
- 是否在 6 个自然日内申请找回，或超期后仍可低概率尝试。
- 找到后如果能识别客户/商品，再决定新单上架、补条码、拍照、销毁或自提。

## 维护边界

- 本文件按业务分支组织，不按异常编码完整枚举。
- 若 normalized 数据更新，应同步检查 `relationship-mappings/`，但本文件还需要人工/AI 结合 KB 业务文档重新审阅分支描述。
- 若新增入库产品或 SOP，应先复制来源到 `source-references/kb-business-source-snapshots/`，再更新本文件。
