---
title: 自提类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, self-pickup]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 自提类增值服务项

收录上架前自提、是否需要 WINIT 打托等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1594` | 上架前自提（无需WINIT打托） | [value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md](value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md) |
| `OW01V1604` | 上架前自提（需WINIT打托） | [value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md](value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md) |

## 维护边界

- 自提类原子必须区分包裹自提和托盘/打托后自提。
- 面单、预约、提货时段等字段当前缺少字段证据，不能写成定版配置。
- 自提是实物退出上架链路，不等同销毁或继续上架。
