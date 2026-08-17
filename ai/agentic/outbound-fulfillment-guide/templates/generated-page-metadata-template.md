# 生成页元数据模板

> 本文件只定义生成页元数据形态，不是业务页面，也不是业务事实。生成页必须由 Canonical 数据和生成器创建，禁止人工复制本模板后直接发布。

```yaml
id: replace-with-stable-id
title: 替换为可读标题
doc_type: replace-with-controlled-doc-type
entity_type: replace-with-controlled-entity-type
domain: outbound-fulfillment
schema_version: "replace-with-schema-version"
generated_by: replace-with-generator-id
generator_version: "replace-with-generator-version"
input_sha256: replace-with-lowercase-sha256
generation_epoch: 0
generated_at: 1970-01-01T00:00:00Z
knowledge_status: draft
confidence: low
fidelity: normalized
sensitivity: internal
disclosure_level: agent_internal
runtime_eligible: false
lifecycle_scope:
  status: unspecified
  stages: []
object_scope:
  status: unspecified
  levels: []
applicability:
  scope_status: unspecified
  required_dimensions: []
effective_period:
  status: unknown
  starts_at: null
  ends_at: null
tags: []
source_refs: []
updated_at: null
last_verified_at: null
```

`generation_epoch` 和 `generated_at` 必须取自受控生成元数据并表示同一 UTC 秒。`input_sha256` 必须由 Canonical、Schema 和生成器版本输入确定性计算，不能使用模板占位值。
