---
title: 销毁类 VASC 产品
type: reference
entity_type: overview
tags: [value-added-service, vasc-product, destroy]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/kb-business-source-snapshots/inbound-exception-putaway-destroy.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 销毁类 VASC 产品

收录上架前销毁、库内异常商品销毁等 VASC 产品。

## 当前已生成产品页

- [上架前销毁](vasc-product-pre-putaway-destruction.md)
- [库内销毁](vasc-product-in-warehouse-destruction.md)

## 使用边界

- 本目录的产品页只沉淀销毁类 VASC 产品、可处理异常索引和产品下候选原子编排。
- 销毁类原子需要动态判断异常对象：商品异常优先判断商品销毁原子，包裹异常优先判断包裹销毁原子。
- 对象不匹配可能导致增值退回或重新提交，因此 AI 不能只根据产品名称推荐原子。
- 销毁证明、DG 商品、专业供应商处理、字段配置和上传附件要求不在产品页定版，后续应进入 `../../value-added-service-items/` 或非标相关知识页。
