---
title: 上架前销毁
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, destroy, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-monitoring.md
  - source-references/kb-business-source-snapshots/inbound-exception-putaway-destroy.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202409121753076
vasc_product_name: 上架前销毁
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: destroy
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 上架前销毁

## 摘要

`上架前销毁` 是入库异常链路中的标准 VASC 产品，用于异常货物到仓后、正式上架前，客户要求不再上架并由仓库执行销毁的场景。

本产品下的原子不是随意选择的。核心动态判断是异常对象：异常对象为商品时选择 `上架前商品销毁`，异常对象为包裹时选择 `上架前包裹销毁`。对象选错会导致增值退回或需要重新提交。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202409121753076` |
| VASC 产品名称 | 上架前销毁 |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 销毁 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 货物处于上架前或入库异常暂存阶段，而不是普通库内销毁或出库销毁。
2. 客户处理意图是销毁，不是上架、自提、拍照或调拨。
3. 异常对象是商品还是包裹，并据此选择对应原子。
4. 异常关闭需要满足异常单入口提交、处理方式为销毁、增值状态完成等条件。
5. DG 商品、需销毁证明或专业供应商处理等特殊销毁，不能默认由本标准产品承接。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 异常对象为商品，客户要求销毁 | 上架前商品销毁 | 异常暂存商品被销毁，退出原单/新单上架链路，不再形成可销售库存 | 异常单入口提交销毁增值；增值完成后，异常以销毁处理闭环 | 通常为终态。 |
| 异常对象为包裹，客户要求销毁 | 上架前包裹销毁 | 异常暂存包裹整包销毁，包裹级实物退出上架链路 | 异常单入口提交销毁增值；增值完成后，包裹异常以销毁处理闭环 | 通常为终态。 |
| 异常对象与销毁原子不匹配 | 选错商品销毁或包裹销毁 | 仓库不应按错误对象执行销毁；实物继续停留在异常暂存或待处理状态 | 增值单可能被退回，需要按异常对象改选后重新提交 | 非闭环。 |
| 客户需要销毁证明、DG 或特殊处理 | 不应默认使用标准销毁原子 | 实物继续暂存，等待非标、合规或供应商能力确认 | 信息流转向非标确认、客服确认或特殊审批；不能用本页直接承诺执行 | 条件闭环。 |
| 客户改为上架或自提 | 本产品不适用 | 实物不走销毁，改按原单/新单上架或自提方向处理 | 信息流应改选对应 VASC 产品；不要在销毁页解释上架原子配置 | 非本产品闭环。 |

## 可处理异常索引

以下异常来自异常到 VASC 映射，表示 normalized 数据中存在 `exception -> 上架前销毁` 的关联。

| 异常编码 | 异常名称 | 异常节点 | 原子判断线索 |
|---|---|---|---|
| `B01E01` | 入库单状态异常 | `IN_BOUND` | 包裹状态类，通常先判断包裹销毁。 |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` | 包裹串仓，通常先判断包裹销毁。 |
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` | 包裹异常，通常先判断包裹销毁。 |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` | 需结合异常对象，可能按包裹或商品处理。 |
| `B0102E27` | 商品裸装 | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | `IN_BOUND` | 商品/批次类异常，需看异常对象。 |
| `B01E1381` | 商品实物无批次信息或批次信息不全 | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1470` | 订单状态被终止无法上架 | `IN_BOUND` | 包裹状态类，通常先判断包裹销毁。 |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` | 包裹状态类，通常先判断包裹销毁。 |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | `IN_BOUND` | 商品数量异常，通常先判断商品销毁。 |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `IN_BOUND` | 包裹/商品关系异常，需看异常对象。 |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` | 包裹异常，通常先判断包裹销毁。 |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` | 商品类异常，通常先判断商品销毁。 |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1703` | 上架前包裹销毁 | N | 上架前销毁 | missing_field_evidence |
| 2 | `OW01V1563` | 上架前商品销毁 | N | 上架前销毁 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 上架前包裹销毁 | 异常对象为包裹，或业务场景是包裹条码异常、入库单状态异常、直发串仓、订单终止/已上架后包裹拦截等包裹级处理。 | 业务 SOP 和异常解决方案目录均有证据。 |
| 上架前商品销毁 | 异常对象为商品，或业务场景是商品条码异常、商品质量异常、商品信息流异常、批次信息不全、订单外商品、多货等商品级处理。 | 业务 SOP 和异常解决方案目录均有证据。 |

## 对象匹配规则

来源 SOP 明确：客服需要检查异常单异常对象是商品还是包裹。

- 异常单如果挂的是商品异常，增值选择 `上架前商品销毁`。
- 异常单如果挂的是包裹异常，增值选择 `上架前包裹销毁`。
- 对象不匹配会导致退回；例如商品异常选择包裹销毁，需要更改为商品销毁后重新提交。

## 与其他销毁产品的区别

| 产品 | 区别 |
|---|---|
| 上架前销毁 | 入库异常或上架前暂存货物销毁，本页范围。 |
| 库内销毁 | 已在库或库内异常商品销毁，不应直接套用上架前销毁。 |
| DG 商品销毁/需证明销毁 | 可能需要非标、专业供应商或额外证明能力，不默认属于本标准产品。 |

## 证据边界

- 本页不生成字段配置、模板、附件、枚举和费用结论。
- normalized 数据证明本产品与异常、原子存在关联，但对象匹配必须结合异常单对象和 SOP。
- 若客户需要销毁证明、特殊品类处理或 DG 销毁，需另查非标或业务确认，不能直接用本页下结论。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
