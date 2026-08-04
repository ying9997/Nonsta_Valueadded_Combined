# Value-Add 领域知识库

本目录是 `value-add` 新 experts 的 repo 内自包含知识库副本。所有 value-add 规划、专家参考和实现设计应引用本目录下的相对路径，不引用 workspace 外部路径。

## 目录分层

| 目录 | 用途 | 主要消费方 |
|---|---|---|
| `inbound-exceptions/` | 入库异常实体、对象、节点和是否进入增值链的判断口径 | `value-add-exception-diagnosis` |
| `inbound-exception-value-added-process/` | 入库异常到增值服务的总流程、客户处理意图归一 | `value-add-exception-diagnosis`、`value-add-product-recommendation` |
| `relationship-mappings/` | 异常到 VASC、VASC 到服务项、字段证据覆盖三类映射 | `value-add-product-recommendation`、`value-add-service-config` |
| `vasc-products/` | VASC 产品解释、启用态和业务限制摘要 | `value-add-product-recommendation`、`value-add-service-config` |
| `value-added-service-items/` | 服务项/原子解释、字段证据和配置边界摘要 | `value-add-service-config` |
| `source-references/` | 接口文档、离线规则、快照和覆盖率报告等来源证据 | 规划、评审和实现溯源 |

## 使用约束

- 关系映射是判断适用性和候选关系的主依据。
- 接口文档只用于字段、状态和查询链路确认，不能单独反推业务适用性。
- 运行时 LLM 只读取 `experts/value-add/{expert-id}/prompts/kb*.md` 中的裁剪知识，不直接读取本目录全量材料。
- 字段、附件、模板和上传要求必须有字段级来源；缺口只能标记为待确认，不能解释为“不需要配置”。

## 当前状态

本目录已建立 repo 内落点，并复制了当前 repo 已有的原子可选性离线规则。接口文档、快照、normalized 数据、覆盖率报告和业务快照目录已预留；因 workspace 外部源目录当前无法由本会话读取，相关全量副本仍需后续补齐。
