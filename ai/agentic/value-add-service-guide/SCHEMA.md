# 知识库 Schema

> 本文件定义 `value-add-service-guide/` 的写入规范、元数据、实体类型、标签体系和关系规则。

## 快速规则

**领域范围**：入库 -> 异常 -> 增值相关知识，包括入库异常是什么、客户怎么处理、可选哪些 VASC 增值产品、某个 VASC 下有哪些增值服务项（增值原子/增值事件）、增值服务项需要哪些配置字段，以及这些实体之间的关系映射。

**主题边界**：本库不是全量增值服务库，而是以入库异常处理为核心的增值服务知识库。纯出库、纯退货、纯库内日常增值可以作为关联资料出现，但只有在它们用于处理入库异常、入库到仓异常、入库上架前异常或异常单处理时，才进入核心实体和映射。

## 主题链路

本库围绕以下链路建模，但 AI 检索时不强制从第一步开始：

```text
inbound_process -> inbound_exception -> customer_requirement / customer_action -> vasc_product -> value_added_service_item -> config_field
```

| 链路层级 | 本库回答的问题 | 推荐承载文件 |
|---|---|---|
| `inbound_process` | 入库异常进入增值处理的总流程是什么？ | `type: process` + `entity_type: inbound_process` |
| `inbound_exception` | 异常是什么、发生在哪个入库节点、对象是什么？ | 单异常实体页 |
| `customer_requirement` / `customer_action` | 客户要选择哪种处理意图，例如原单上架、新单上架、销毁、自提、拍照暂存？ | 映射表字段，必要时独立实体页 |
| `vasc_product` | 哪个 VASC 产品承载这个处理方案？ | VASC 产品实体页 |
| `value_added_service_item` | VASC 下实际执行哪些仓库动作？ | 增值服务项实体页 |
| `config_field` | 客户要填写什么、上传什么、有哪些枚举和校验？ | 配置字段实体页 |

若用户直接询问 VASC 产品、增值服务项或配置字段，AI 可以从对应实体开始查询，不必回溯到异常。

## 收录口径

### 核心收录

- 入库单、包裹、商品、单品、SKU、托盘等对象在入库、收货、查验、上架前、上架、异常暂存过程中发生的异常。
- 异常单中可由客户选择 VASC 或增值服务项处理的场景。
- 入库增值下单中与异常处理有关的 VASC 产品、增值服务项和配置字段。
- 为判断异常与 VASC 是否适用所需的关系映射、规则、字段和证据来源。

### 关联收录

- 库内增值、出库增值或退货增值中，被入库异常映射引用的 VASC 产品或增值服务项。
- 接口、快照和覆盖率报告中用于校验入库异常增值链路的来源材料。

### 不作为核心收录

- 与入库异常无关的纯营销、纯产品介绍、纯收费说明。
- 与异常处理无关的常规库内增值服务。
- 无法追溯来源、无法判断是否适用于入库异常的孤立配置字段。

## 核心术语

| 术语 | 本库定义 | 维护重点 |
|---|---|---|
| 入库流程 | 从入库预报、到仓、收货、查验、异常暂存到上架完成的业务链路。 | 只沉淀与异常处理和增值服务选择有关的节点。 |
| 入库异常 | 入库或入库相关库内节点中阻断、影响或改变正常入库处理的异常事件，通常有异常编码和异常名称。 | 异常编码、异常名称、发生节点、异常对象、客户是否需要处理、可选处理路径。 |
| 客户处理意图 / 客户动作 | 客户针对异常选择的处理方向，例如原单上架、新单上架、WINIT 创建入库单上架、销毁、自提、拍照暂存、上传文件、确认信息。 | 动作名称、适用条件、对应 VASC、需要客户提供的信息。 |
| 增值服务产品 / VASC 产品 | 由一个或多个增值服务项组成的场景级解决方案。常见产品编码以 `VASC` 开头。 | 产品编码、产品名称、标准/非标、关联 PSCG、处理方式、提交入口、关联服务项、SLA。 |
| 增值服务项 / 增值原子 / 增值事件 | 构成增值服务产品的基本单位，是仓库不可再拆分的动作组，例如补贴原商品条码、更换商品包装、商品开箱拍照、销毁、直接上架。收入、成本通常落在服务项上，而不是产品上。 | 服务项编码、服务项名称、操作对象、动作定义、配置字段、是否收费、是否产生成本、是否有效。 |
| 配置字段 | 客户在选择某个增值服务项时需要填写或上传的信息，例如标签类型、尺寸规格、包裹条码、商品条码、文件、服务要求。 | 字段类型、必填条件、枚举值、上传格式、模板、校验规则。 |
| 关系映射 | 异常、客户需求、VASC 产品、增值服务项、字段之间的适用关系。 | 适用/不适用、条件、对象层级、入口、客户动作、备注和来源。 |
| 接口来源参考 | 系统接口文档，用于补充字段名、编码、查询链路、响应结构和可自动化校验的数据来源。 | 接口标识、系统、用途、关键请求字段、关键响应字段、可支撑的实体/映射。 |

增值服务产品与增值服务项是 `1:1` 或 `1:N` 关系；一个增值服务项也可以被多个增值服务产品复用。同一个产品下有多个服务项时，客户可能可以任选一个或多个；若存在分组，同组内可能只能选一个。

标准与非标需要同时作用于产品和服务项：标准服务项组成标准增值产品，非标服务项组成非标增值产品，标准服务项和非标服务项不能混合组成同一个产品。

**主要读者**：AI Agent。AI 会检索本知识库内容，并生成面向用户的回答。

**来源标记边界**：

- `source_refs`、索引、关系映射来源、实体页来源只能引用 `value-add-service-guide/` 内文件。
- `value-add-service-guide/` 外的资料可以作为阅读参考，但不能作为正式来源路径写入。
- 如需使用目录外资料作为依据，必须先沉淀到 `value-add-service-guide/source-references/` 或其他项目内目录，再使用项目内相对路径引用。
- 本库迁移后应能脱离原工作区，只依赖 `value-add-service-guide/` 内文件继续检索和维护。

**目录与文件命名**：

- 只使用英文。
- 使用小写 kebab-case。
- 不使用空格。
- 名称要尽量具体，让 AI 能从路径判断内容。
- 使用稳定业务词，不使用临时项目名或日期。
- 文件内引用路径必须使用相对于 `value-add-service-guide/` 的项目内路径；不得使用本机绝对路径、盘符路径、用户目录路径或 `value-add-service-guide/` 外部路径。
- 外部系统、脚本、`.env` 和目录外资料只可作为运行边界描述；可沉淀材料必须复制到本项目内后再引用。

推荐示例：

- `inbound-exception-to-vasc-product-mapping.md`
- `exception-b01e1315-product-barcode-abnormal-customer-action-required.md`
- `vasc-product-original-order-putaway.md`
- `value-added-service-item-inbound-original-product-barcode-labeling.md`
- `value-added-service-item-replace-product-packaging.md`
- `config-field-label-size-specification.md`

不推荐示例：

- `异常处理.md`
- `new.md`
- `20260622.md`
- `temp-vas.md`
- `abc.md`

## Frontmatter

所有业务内容文件都应使用以下 frontmatter。

```yaml
---
title: 页面标题，可使用中文或中英双语
type: concept | rules | reference | faq | comparison | process | mapping | playbook
entity_type: overview | inbound_process | inbound_exception | customer_action | vasc_product | value_added_service_item | config_field | relationship_mapping | answer_playbook | glossary | source_reference | interface_reference | dataset_reference
tags: [inbound, exception, value-added-service]
source_refs: [project-relative-path-inside-value-add-service-guide]
updated: YYYY-MM-DD
confidence: high | medium | low
fidelity: summary | preserve
status: draft | active | deprecated | pending_verification
---
```

### 必填字段

| 字段 | 含义 |
|---|---|
| `title` | 页面标题，可以使用中文。 |
| `type` | 文档形态，用于决定写作方式和索引分组。 |
| `entity_type` | 该文件代表的业务实体类型。 |
| `tags` | 受控标签，必须来自本 Schema。 |
| `source_refs` | 项目内相对来源路径，必须位于 `value-add-service-guide/` 内。 |
| `updated` | 最近一次有意义的内容更新时间。 |
| `confidence` | 置信度。 |
| `fidelity` | 摘要型或保留型。 |
| `status` | 知识生命周期状态。 |

### 可选实体字段

按实体类型选择使用，不要求每个文件都填写。

```yaml
exception_code: B01E1315
exception_name: 商品条码异常(需客户处理)
exception_stage: inbound | inbound_receiving | inbound_inspection | inbound_putaway | inbound_temporary_storage | in_warehouse_related | outbound_related | return_related | unknown
exception_object_level: order | package | product | item | sku | pallet
exception_node: IN_BOUND
exception_requires_customer_action: true | false | conditional | unknown

customer_action_code: original_order_putaway
customer_action_name: 原单上架
customer_action_type: putaway | relabel | repack | photograph | destroy | self_pickup | transfer | temporary_storage | upload_file | confirm_info | other
customer_required_input: [inbound_order_no, package_barcode, product_barcode, file, remark]

vasc_product_code: VASC202407031503503
vasc_product_name: 原单上架
vasc_product_type: standard | non_standard | planned | unknown
vasc_submission_entry: exception_order | inbound_order | both | unknown
vasc_handling_method: original_order_putaway | new_order_putaway | winit_created_order_putaway | direct_putaway | destroy | self_pickup | temporary_storage | photograph_then_hold | outbound | none | unknown
vasc_active_status: active | inactive | planned | deprecated | unknown
related_pscg: 海外仓入库

service_item_code: ""
service_item_name: 入库-补贴原商品条码
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: order | package | product | item | sku | pallet | other
service_item_type: standard | non_standard | unknown
service_item_required_in_vasc: true | false | conditional | unknown
service_item_mutex_group: 贴商品标
charge_required: true | false | conditional | unknown
cost_generated: true | false | conditional | unknown
effective: true | false | unknown

config_field_code: LABEL_SIZE_SPECIFICATION
config_field_name: 标签尺寸规格
field_required: true | false | conditional
field_value_type: string | number | enum | boolean | file | table | object | array
field_input_node: customer | warehouse | system | unknown
field_evidence_status: confirmed | partial | missing | inferred
external_source_note: 外部系统或原始来源说明，仅写系统名或资料类型，不写本机绝对路径
```

## 实体类型

| `entity_type` | 用途 |
|---|---|
| `overview` | 总览、导航、整体概念说明。 |
| `inbound_process` | 入库异常进入增值处理的总流程、节点、状态和判断路径。 |
| `inbound_exception` | 单个入库或库内异常，建议一个异常编码一个文件。 |
| `customer_action` | 客户处理意图或动作，例如原单上架、新单上架、销毁、自提、上传资料。 |
| `vasc_product` | 单个 VASC 增值产品或场景级服务方案。 |
| `value_added_service_item` | 单个增值服务项，即增值原子/增值事件。 |
| `config_field` | 单个配置字段、枚举组、上传文件要求或校验规则。 |
| `relationship_mapping` | 异常、VASC 产品、增值服务项、字段之间的多对多关系表。 |
| `answer_playbook` | AI 回答常见问题时的组装模式。 |
| `glossary` | 术语、状态、对象层级和编码定义。 |
| `source_reference` | 来源材料摘要或保留型来源说明。 |
| `interface_reference` | 接口文档来源参考，用于沉淀系统字段、查询接口、响应结构和可校验数据来源。 |
| `dataset_reference` | 数据证据包、原始快照、规范化数据、覆盖率报告或字段来源记录。 |

## 文档类型

| `type` | 用途 |
|---|---|
| `concept` | 概念定义和解释。 |
| `rules` | 适用条件、校验、限制、业务规则。 |
| `reference` | 字典、目录、清单、来源摘要。 |
| `faq` | 问答型内容。 |
| `comparison` | 产品、服务项或处理路径对比。 |
| `process` | 流程、状态流转、步骤说明。 |
| `mapping` | 关系映射表。 |
| `playbook` | AI 回答模式。 |

## 受控标签

标签必须来自本节。新增标签前，先在本节登记。

### 领域标签

- `inbound`: 入库流程或入库单上下文。
- `inbound-process`: 入库流程、节点、状态或总链路。
- `inbound-receiving`: 入库收货节点。
- `inbound-inspection`: 入库查验或异常识别节点。
- `inbound-putaway`: 入库上架节点。
- `inbound-temporary-storage`: 入库异常暂存或待处理节点。
- `in-warehouse`: 到仓后或库内操作。
- `exception`: 异常知识。
- `customer-action`: 客户处理动作或处理意图。
- `value-added-service`: 增值服务知识。
- `vasc-product`: VASC 产品级知识。
- `value-added-service-item`: 增值服务项、增值原子、增值事件知识。
- `config-field`: 配置字段和校验知识。
- `relationship-mapping`: 实体关系映射。
- `interface-reference`: 接口来源参考。
- `dataset-reference`: 数据证据包、快照、规范化数据或覆盖率报告。
- `raw-data`: 原始接口、页面或系统快照。
- `normalized-data`: 清洗后的结构化数据。
- `coverage-report`: 覆盖率、缺口和对账报告。
- `tom-snapshot`: TOM 页面或接口快照。
- `glossary`: 术语和编码字典。

### 对象层级标签

- `order-level`: 订单维度。
- `package-level`: 包裹维度。
- `product-level`: 商品维度。
- `item-level`: 单品维度。
- `sku-level`: SKU 维度。
- `pallet-level`: 托盘维度。

### 增值类型标签

- `standard-vasc`: 标准增值产品。
- `non-standard-vasc`: 非标增值产品。
- `planned-vasc`: 规划中或未完全生效的增值产品。
- `active-vasc`: 当前启用的 VASC 产品。
- `inactive-vasc`: 当前未启用或不可用的 VASC 产品。
- `customer-initiated`: 客户可主动发起。
- `winit-initiated`: WINIT 主动发起。

### 处理意图标签

- `original-order-putaway`: 原单上架。
- `new-order-putaway`: 新单上架。
- `winit-created-order-putaway`: WINIT 创建入库单上架。
- `direct-putaway`: 直接上架。
- `destroy`: 销毁。
- `self-pickup`: 自提。
- `temporary-storage`: 暂存。
- `photograph`: 拍照。
- `relabel`: 贴标、补标或换标。
- `repack`: 换包装或增加包装。

### 文档形态标签

- `overview`: 总览。
- `process`: 流程。
- `rules`: 规则。
- `reference`: 参考资料。
- `faq`: 常见问题。
- `mapping`: 映射。
- `playbook`: AI 回答模式。

## 关系规则

关系必须显式记录。不能因为名称相似就推断二者有关。

### 核心关系类型

| 关系 | 含义 |
|---|---|
| `inbound_process -> inbound_exception` | 某个入库节点可能产生某类异常。 |
| `exception -> vasc_product` | 某个 VASC 产品可以用于处理某个异常。 |
| `exception -> customer_action` | 某个异常要求或允许客户执行某种处理动作。 |
| `exception_customer_requirement -> vasc_product` | 某个异常下的具体客户需求或处理意图对应某个 VASC 产品。 |
| `customer_action -> vasc_product` | 某个客户处理动作通常由哪些 VASC 产品承载。 |
| `vasc_product -> value_added_service_item` | 某个 VASC 产品包含或允许选择某些增值服务项。 |
| `value_added_service_item -> config_field` | 某个增值服务项要求或允许填写某些配置字段。 |
| `config_field -> enum` | 某个字段拥有可选枚举值。 |

### 映射权威性

关系映射表是判断「能不能选、是否适用、什么条件下适用」的权威来源。

实体详情页也应保留反向链接，方便 AI 检索。但如果实体详情页和关系映射表冲突：

1. 优先使用更新且置信度不低的关系映射表。
2. 在冲突文件或待核实说明中保留冲突。
3. 回答时标记为待核实，不得直接给出确定结论。

### 关系基数

允许以下关系：

- 一个异常可以关联多个 VASC 产品。
- 一个异常可以关联多个客户处理意图。
- 一个客户处理意图可以被多个异常复用。
- 一个客户处理意图可以对应多个 VASC 产品。
- 一个 VASC 产品可以关联多个增值服务项。
- 一个增值服务项可以被多个 VASC 产品复用。
- 一个字段可以被多个增值服务项复用。
- 一条映射可以带有场景条件、对象层级、提交入口、支持状态和备注。

## 标准章节模板

### 入库异常增值总流程页

适用于 `type: process` + `entity_type: inbound_process`。

```markdown
# 入库异常增值处理总流程

## 摘要

## 流程范围

## 触发入口

## 节点与状态

| 节点 | 触发条件 | 可能异常 | 客户动作 | 可选 VASC | 备注 |
|---|---|---|---|---|---|

## 判断规则

## 不适用场景

## 相关映射

## 来源说明
```

### 入库异常页

适用于 `entity_type: inbound_exception`。

```markdown
# 异常名称

## 摘要

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 |  |
| 异常名称 |  |
| 异常环节 |  |
| 异常节点 |  |
| 异常对象 |  |
| 是否需要客户处理 |  |

## 异常含义

## 触发场景

## 客户处理选项

## 可选 VASC 产品

## 相关增值服务项

## 客户需提供的信息

## 不支持或特殊场景

## 相关链接

## 来源说明
```

### 客户处理动作页

适用于 `entity_type: customer_action`。当某类处理意图被多个异常和 VASC 复用时，可以建立独立页面。

```markdown
# 客户处理动作名称

## 摘要

## 动作标识

| 字段 | 值 |
|---|---|
| 动作编码 |  |
| 动作名称 |  |
| 动作类型 | putaway / relabel / repack / photograph / destroy / self_pickup / temporary_storage / other |

## 适用异常

## 可承载 VASC 产品

## 客户需提供的信息

## 不适用或限制

## 相关链接

## 来源说明
```

### VASC 产品页

适用于 `entity_type: vasc_product`。

```markdown
# VASC 产品名称

## 摘要

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 |  |
| VASC 产品名称 |  |
| 产品类型 | standard / non_standard / planned / unknown |
| 提交入口 | exception_order / inbound_order / both / unknown |
| 操作对象 |  |

## 适用场景

## 可处理异常

## 可选增值服务项

## 配置要求

## 客户需提供的信息

## 限制条件

## 相关链接

## 来源说明
```

### 增值服务项页

适用于 `entity_type: value_added_service_item`。

```markdown
# 增值服务项名称

## 摘要

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 |  |
| 服务项名称 |  |
| 别名 | 增值原子 / 增值事件 |
| 操作对象 |  |
| 标准或非标 |  |
| 是否收费 |  |
| 是否产生成本 |  |
| 是否有效 |  |

## 仓库动作

## 所属 VASC 产品

## 必填字段

## 可选字段

## 上传文件要求

## 字段证据状态

## 校验规则

## 相关链接

## 来源说明
```

### 配置字段页

适用于 `entity_type: config_field`。

```markdown
# 字段名称

## 摘要

## 字段标识

| 字段 | 值 |
|---|---|
| 字段编码 |  |
| 字段名称 |  |
| 值类型 |  |
| 是否必填 | true / false / conditional |

## 业务含义

## 可选值

## 校验规则

## 被哪些增值服务项使用

## 示例

## 相关链接

## 来源说明
```

### 关系映射页

适用于 `entity_type: relationship_mapping`。

关系映射建议使用机器可读表格。

推荐字段：

| 字段 | 含义 |
|---|---|
| `source_entity` | 来源实体 slug 或编码。 |
| `target_entity` | 目标实体 slug 或编码。 |
| `relationship_type` | 关系类型，例如 `exception_to_vasc_product`、`vasc_product_to_service_item`。 |
| `support_status` | `supported`、`unsupported`、`conditional`、`planned`、`deprecated`、`unknown`。 |
| `scenario_condition` | 适用条件。 |
| `object_level` | 订单、包裹、商品、单品、SKU 或托盘。 |
| `submission_entry` | 异常单、入库单、两者都支持或未知。 |
| `customer_action` | 客户需要执行的动作。 |
| `vasc_product_code` | VASC 产品编码。 |
| `service_item_code` | 增值服务项编码。 |
| `config_field_code` | 配置字段编码。 |
| `notes` | 重要备注。 |
| `source_refs` | 来源行或来源文档。 |

针对“异常解决方案”类映射，优先使用以下字段，贴近现有来源表结构：

| 字段 | 含义 |
|---|---|
| `exception_object` | 异常对象，例如商品、包裹、订单。 |
| `exception_event_name` | 异常名称，可为一个或多个异常名称。 |
| `customer_requirement_description` | 客户需求描述，例如要求新单上架、原单上架、销毁、自提、拍照后暂存。 |
| `solution_vasc_product` | 解决异常的增值产品。 |
| `solution_service_item` | 解决异常的增值服务项。 |
| `service_item_attribute_note` | 服务项属性备注，例如支持良品/不良品上架、非标、需上传模板。 |
| `scenario_description` | 场景说明。 |
| `support_note` | 支持、不支持、建议、不推荐、规划中等说明。 |

针对“VASC 产品清单”类映射，优先使用以下字段：

| 字段 | 含义 |
|---|---|
| `public_sale` | 是否对外公售产品。 |
| `vasc_product_type` | 标准增值、非标增值、规划中或未知。 |
| `vasc_product_code` | 增值服务产品编码。 |
| `vasc_product_name` | 增值服务产品名称。 |
| `product_description` | 产品说明。 |
| `related_pscg` | 关联 PSCG。 |
| `handling_method` | 处理方式，例如用原入库单上架、客户提供入库单上架、销毁、自提、暂存。 |
| `related_service_item` | 关联增值服务项。 |
| `sla_config` | SLA 配置。 |
| `sla_note` | SLA 备注。 |

### 接口来源参考页

适用于 `entity_type: interface_reference`。

接口文档可以进入本库，但只能作为来源参考和字段依据，不直接作为业务适用性结论。

```markdown
# 接口名称

## 摘要

## 接口标识

| 字段 | 值 |
|---|---|
| 接口标识 |  |
| 系统 |  |
| 调用方式 | OpenAPI / Dubbo RPC / TOM internal |
| 接口路径 |  |
| 主要用途 |  |

## 可支撑的知识实体

## 关键请求字段

## 关键响应字段

## 可抽取到 Schema 的字段

## 不应直接作为业务规则的内容

## 相关实体或映射

## 来源说明
```

接口来源参考的使用规则：

1. 可用于确认系统字段名、编码字段、状态字段、对象层级、响应结构。
2. 可用于反向生成或校验异常、VASC 产品、增值服务项、配置字段。
3. 不可单独用于判断某异常是否支持某 VASC 产品；此类判断仍以关系映射表为准。
4. TOM 内部接口、Dubbo 直调接口、OpenAPI 接口需要在文档中标明调用边界，避免 AI 对外错误引用。
5. 接口文档可以保留原始字段名，但文件路径仍应使用英文小写 kebab-case。

### 数据证据包页

适用于 `entity_type: dataset_reference`。

数据证据包可以进入本库，但只能作为来源证据、覆盖率依据和自动化抽取输入，不直接替代业务实体页或关系映射表。

```markdown
# 数据证据包名称

## 摘要

## 目录说明

## 可支撑的实体和关系

## 覆盖率结论

## 已知缺口

## 使用规则

## 来源说明
```

数据证据包的使用规则：

1. `raw` 原始快照是证据层，只引用，不人工改写。
2. `normalized` 规范化数据可作为生成实体页和关系映射表的主要输入，但必须可追溯到 raw、系统快照或本地静态 JSON。
3. `reports` 覆盖率报告用于判断哪些链路已齐、哪些仍缺证据；缺口不得被写成“不存在”。
4. 字段、附件、模板和上传关系必须有字段级来源，例如 `vaAtomAttrs`、`vaAtomFiles` 或等价来源；不能用空数组、空字段或未覆盖记录推断为“无字段”。
5. 数据证据包中的旧 `AGENTS.md`、`SCHEMA.md` 或历史规则只能作为来源记录；当前知识库规则以根目录 `AGENTS.md` 和 `SCHEMA.md` 为准。
6. 数据证据包内部的来源字段也必须使用项目内相对路径；若原始数据包含外部绝对路径，应在导入时改写为当前项目内的保留副本路径。

### normalized 到关系映射的同步规则

凡 `data/normalized/` 中的规范化数据发生新增、替换、重命名或内容变化，必须同步检查所有由该 normalized 文件派生的关系映射。

当前依赖关系：

| 上游 normalized 文件 | 派生映射 | 同步要求 |
|---|---|---|
| `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` | `relationship-mappings/inbound-exception-to-vasc-product-mapping.md` | 重新生成或差异审查异常到 VASC 关系、覆盖统计、来源路径。 |
| 同上 | `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md` | 重新生成或差异审查 VASC 到增值服务项编排、顺序、必选状态、互斥组。 |
| 同上 | `relationship-mappings/service-item-config-field-evidence-coverage.md` | 重新生成或差异审查字段证据覆盖状态；不得生成具体字段配置结论。 |

同步后必须更新：

- `relationship-mappings/README.md`。
- 根 `index.md` 中的映射入口和统计说明。
- 已存在的相关实体页。
- `log.md` 中的数据版本、差异摘要、重建结果和未解决问题。

若使用新的 normalized 文件替换旧文件，应保留旧文件或在日志中说明废弃关系，并更新所有 `source_refs`。不得让映射表继续引用已废弃的 normalized 文件。

## 置信度规则

| 值 | 含义 |
|---|---|
| `high` | 官方来源、系统配置或多来源一致确认。 |
| `medium` | 单一可信来源，或从保留型业务文档中抽取。 |
| `low` | 口头、推断、存在冲突或尚未核实。 |

## 状态规则

| 状态 | 含义 |
|---|---|
| `draft` | 初稿，尚未评审。 |
| `active` | 当前可用知识。 |
| `deprecated` | 历史规则，保留用于追溯。 |
| `pending_verification` | 存在不确定或冲突，不能作为最终结论。 |

## 保真度规则

| 值 | 含义 |
|---|---|
| `summary` | 面向 AI 的抽取和总结。 |
| `preserve` | 保留来源结构或来源措辞。 |

本知识库的实体页和映射页优先使用 `summary`。只有来源参考页需要保留原始表格或原文结构时，才使用 `preserve`。

## 冲突处理

如果新旧规则冲突：

1. 不删除旧规则。
2. 将旧规则标记为废弃，或补充截至日期说明。
3. 添加新规则、来源和更新时间。
4. 在 [log.md](log.md) 记录变更。

如果关系不明确：

1. 使用 `support_status: unknown` 或 `conditional`。
2. 使用 `confidence: low` 或 `medium`。
3. 添加 `pending_verification` 说明。

## AI 维护闭环规则

本知识库由 AI 维护，任何结构或内容变更都必须形成闭环。闭环不是额外建议，而是写入规范的一部分。

### 变更影响范围

| 变更类型 | 必须检查的关联内容 |
|---|---|
| 新增实体页 | 根索引、目录索引、相关映射表、相关实体反向链接、来源说明、日志 |
| 修改实体编码、标题或路径 | 所有引用该实体的链接、映射表、索引、来源说明、日志 |
| 修改关系映射 | 相关异常页、客户动作页、VASC 产品页、增值服务项页、字段页、日志 |
| 修改字段配置或上传要求 | 增值服务项页、配置字段页、字段映射、来源证据状态、日志 |
| 修改来源数据或覆盖率报告 | 数据证据包说明、受影响映射、受影响实体页、日志 |
| 修改 normalized 数据 | 所有派生关系映射、关系目录 README、根索引、受影响实体页、日志 |
| 修改 Schema、标签或实体类型 | `AGENTS.md`、`README.md`、索引、已有文件 frontmatter、日志 |
| 删除或废弃文件 | 索引、目录 README、所有入链、映射表、替代文件说明、日志 |

### 依赖关系

AI 判断受影响文件时，应按以下依赖链追踪：

```text
inbound_exception <-> relationship_mapping <-> vasc_product <-> value_added_service_item <-> config_field
customer_action <-> relationship_mapping <-> vasc_product
source_reference / dataset_reference / interface_reference -> relationship_mapping / entity pages
glossary -> frontmatter tags / status / object levels / action types
```

### 维护要求

1. `index.md` 和目录级 README 是导航层，必须反映当前文件和主要入口。
2. `relationship-mappings/` 是关系判断层，凡涉及“能不能选、是否适用、什么条件下适用”，必须同步检查。
3. 实体页是解释层，应保留必要的正向/反向链接，但不得复制映射表的大段内容。
4. 来源参考是证据层，路径必须为项目内相对路径，覆盖率缺口不得写成“不存在”。
5. `log.md` 是审计层，必须记录结构性变更、批量变更、关系变更、来源变更和未完成事项。

### 自动化与手工更新

后续如果建立自动索引脚本，AI 应优先运行脚本生成导航文件；脚本尚未建立或无法运行时，AI 必须手动完成等价更新。

无论使用脚本还是手工更新，AI 都不能只修改单个文件后结束任务。

## 索引规则

[index.md](index.md) 是 AI 检索导航索引。

### 目录 README 规则

每个业务目录必须包含 `README.md`。目录 README 是目录级导航和收录口径说明，不是业务实体页。

目录 README 至少包含：

- 目录用途。
- 收录内容。
- 不收录内容或边界。
- 子目录或计划文件。
- 与 `relationship-mappings/`、`source-references/` 的关系。

目录 README 应使用 `entity_type: overview`，除非该目录本身是专门的关系、术语、来源或流程目录。

后续添加脚本后：

- `index.md` 应由文件和 frontmatter 自动生成。
- 启用自动生成后，停止手动编辑 `index.md`。
- 根文件应始终出现在索引顶部。
- 在索引脚本建立前，AI 必须根据“AI 维护闭环规则”手动维护根索引和目录索引。

## 日志规则

以下变化必须记录到 [log.md](log.md)：

- 根目录 Schema 变化。
- 新增实体类型或标签。
- 新增关系映射表。
- 批量导入。
- 废弃规则。
- 冲突处理。
- 已知数据质量问题。
- AI 维护闭环中的同步更新和未完成事项。

推荐日志格式：

```markdown
## [YYYY-MM-DD] action | short topic

- Changed:
- Added:
- Verified:
- Open issues:
```
