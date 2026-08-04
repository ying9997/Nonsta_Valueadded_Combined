---
title: 拍照视频类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, photograph]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 拍照视频类增值服务项

收录商品外观拍照、开箱拍照、指定位置拍照、拍摄视频、提供监控视频等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1562` | 入库-商品开箱拍照 | [value-added-service-item-inbound-product-unboxing-photo.md](value-added-service-item-inbound-product-unboxing-photo.md) |
| `OW01V1599` | 提供海外仓监控视频-少包裹调查 | [value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md](value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md) |
| `OW01V1600` | 提供海外仓监控视频-少单品调查 | [value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md](value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md) |
| `OW01V1610` | 入库-单品指定位置开箱拍照 | [value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md](value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md) |
| `OW01V1674` | 入库-异常包裹开箱拍照 | [value-added-service-item-inbound-exception-package-unboxing-photo.md](value-added-service-item-inbound-exception-package-unboxing-photo.md) |
| `OSF6V1569` | 库内-商品外观拍照 | [value-added-service-item-in-warehouse-product-appearance-photo.md](value-added-service-item-in-warehouse-product-appearance-photo.md) |
| `OSF6V1570` | 库内-商品开箱拍照 | [value-added-service-item-in-warehouse-product-unboxing-photo.md](value-added-service-item-in-warehouse-product-unboxing-photo.md) |
| `OSF6V1595` | 单品指定位置开箱拍照 | [value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md](value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md) |
| `OSF6V1651` | 库内商品拍摄视频 | [value-added-service-item-in-warehouse-product-video-shooting.md](value-added-service-item-in-warehouse-product-video-shooting.md) |
| `OSF6V1677` | 退货商品补拍细节照 | [value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md](value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md) |

## 维护边界

- 拍照视频类原子通常是中间辨识动作，不等同最终上架、销毁或自提。
- 必须区分商品级拍照、包裹级开箱拍照、指定位置拍照和监控视频调查。
- 当前部分拍照类标准入口可能失效或转非标；服务项页必须明确状态证据和字段证据边界。
