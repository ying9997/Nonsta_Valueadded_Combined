---
title: 关系映射
type: reference
entity_type: relationship_mapping
tags: [relationship-mapping, inbound, exception, value-added-service]
source_refs: ["source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json", "source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json", "source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md"]
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
---

# 关系映射

本目录是判断“能不能选、是否适用、什么条件下适用”的权威层。实体页可解释定义，但适用性结论必须回到关系映射确认。

## 上游同步机制

当前三份映射均由 `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` 及覆盖率报告派生。

如果该 normalized 数据新增、替换、重命名或内容变化，AI 必须重新生成或差异审查本目录下的派生映射，并同步更新本 README、根 `index.md` 和 `log.md`。

字段级证据未补齐前，只允许更新字段证据覆盖状态，不得生成确定版 `service-item-to-config-field-mapping.md`。

## 当前文件

- [入库异常到 VASC 产品映射](inbound-exception-to-vasc-product-mapping.md)
  - 来源：normalized 数据。
  - 口径：记录 `exception_code -> vasc_product_code` 的已知关联。
  - 覆盖：18 个 VASC、35 个唯一异常编码、168 条去重关系。
- [VASC 产品到增值服务项编排映射](vasc-product-to-service-item-orchestration-mapping.md)
  - 来源：normalized 数据中的 `atoms`。
  - 口径：记录 VASC 下的增值服务项顺序、必选状态、互斥组和字段证据覆盖状态。
  - 覆盖：18 个 VASC、64 条编排行、52 个唯一增值服务项。
- [增值服务项字段证据覆盖映射](service-item-config-field-evidence-coverage.md)
  - 来源：normalized 数据和覆盖率报告。
  - 口径：只记录字段证据覆盖状态，不记录具体配置字段。
  - 覆盖：52 个唯一增值服务项，其中 42 个有普通属性字段证据，10 个当前缺少普通属性字段证据。

## 暂不生成的映射

- `inbound-exception-customer-action-to-vasc-product-mapping.md`
  - 暂不生成原因：normalized 数据未提供独立的客户处理动作字段。
  - 后续需要从异常解决方案表、流程资料或人工确认后的客户动作字典补齐。
- `service-item-to-config-field-mapping.md`
  - 暂不生成原因：当前字段级证据不完整，不能确定具体字段、附件、模板和上传要求。
  - 后续需要补 `vaAtomAttrs`、`vaAtomFiles` 或等价来源。

