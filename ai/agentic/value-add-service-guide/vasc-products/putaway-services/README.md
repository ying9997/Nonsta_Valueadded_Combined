---
title: 上架处理类 VASC 产品
type: reference
entity_type: overview
tags: [value-added-service, vasc-product, original-order-putaway, new-order-putaway, direct-putaway]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 上架处理类 VASC 产品

收录用于原单上架、新单上架、WINIT 创建入库单上架、客户创建入库单上架、客户提供预报单上架、直接上架等处理意图的 VASC 产品。

## 当前已生成产品页

- [原单上架](vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](vasc-product-new-order-putaway-winit-created-inbound-order.md)
- [新单上架（客户提供预报单）](vasc-product-new-order-putaway-customer-provided-forecast-order.md)
- [原单上架（直接上架）](vasc-product-original-order-direct-putaway.md)
- [新单上架（直接上架）](vasc-product-new-order-direct-putaway.md)

## 使用边界

- 本目录的产品页解释 VASC 产品、适用判断、可处理异常索引和产品下候选原子编排。
- 产品页中的原子列表是候选编排，不代表所有异常或客户需求下都可选。
- AI 必须结合异常对象、客户处理意图、入库单承接方式、互斥组和业务 SOP 动态判断原子是否可选。
- 原子字段、附件、模板、枚举和上传内容放入 `../../value-added-service-items/`，不在产品页定版。
