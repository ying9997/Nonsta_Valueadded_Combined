---
title: 数据来源优先级
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map, standard]
updated: 2026-06-25
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/README.md
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/exception-vas-data-package/sources/data-coverage.md
---

# 数据来源优先级

## 优先级

| 优先级 | 来源 | 使用场景 | 注意事项 |
|---:|---|---|---|
| 1 | 已保存的原始接口或页面快照 | 需要复核某次取数结果 | 不人工修改，作为证据留存 |
| 2 | 规范化数据 | 写业务文档、做 VASC/原子映射 | 必须能追溯到 raw 或本地 JSON |
| 3 | 本地静态 JSON | 标准异常、VASC、原子主数据基础事实 | 需要记录文件路径和更新时间 |
| 4 | 接口文档 | 字段含义、字段结构、接口用途 | 只说明结构，不能替代真实数据 |
| 5 | TOM 实时接口 | 本地资料不足时补齐缺口 | 必须保存新快照，不能只凭接口口头结论 |
| 6 | 人工判断 | 解释字段用途或业务含义 | 必须标注“未确认”或“推断” |

## 写作约束

- VASC 到原子的真实编排，以 TOM VASC 详情页 `detail_items` 快照为准。
- 不能仅凭 `vasc-master.json` 推断完整原子编排。
- 原子主数据以 `plan-event-vas.json` 为基础。
- 原子属性字段不能以 `plan-event-vas.json` 的空 `attrList` 推断为“无字段”。
- `vas_event_attrs_slim.json` 当前仍只能作为部分字段快照；`pms.BaseAttrRelService_findBaseAttrRelPage` 已验证可重建并扩充普通属性字段，但不能替代附件模板和上传关系证据。
- 附件、模板、上传关系必须单独标注来源，不能混写进普通属性字段。

## TOM 实时数据使用规则

使用项目外部 TOM 环境调接口时，只允许记录：

- 调用了哪个脚本。
- 调用了哪个接口或页面。
- 输出了哪个快照文件。
- 覆盖了哪些对象。
- 仍缺哪些数据。

禁止把 `.env` 中的账号、密码、token、cookie、app key 或任何认证值写入知识库。
禁止把本机绝对路径写入知识库；可沉淀输出必须复制到本项目内，并使用相对路径引用。
