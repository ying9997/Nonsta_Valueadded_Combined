---
title: 数据覆盖率
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map, field-config]
updated: 2026-06-25
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
---

# 数据覆盖率

## 当前覆盖

| 数据层 | 覆盖情况 | 结论 |
|---|---:|---|
| 标准异常配置 | 422 条 | 已有本地快照 |
| 绑定 VASC 的异常 | 36 条 | 已识别 |
| 入库异常引用的唯一 VASC | 18 个 | 已识别 |
| VASC 基础配置 | 18 / 18 | 已齐 |
| VASC 到原子的真实编排 | 18 / 18 | 已齐 |
| 编排引用的唯一原子 | 52 个 | 已识别 |
| 原子主数据 | 52 / 52 | 已齐 |
| 原子属性字段快照 | 当前正式 slim 对 normalized 编排引用服务项覆盖 42 / 52；slim 快照总记录 61 条 | 已由 BaseAttrRel 扩充，仍非完整字段配置 |

## 当前缺口

| 缺口 | 当前状态 | 下一步 |
|---|---|---|
| 原子普通属性字段 | `pms.BaseAttrRelService_findBaseAttrRelPage` 已同步扩充 42 / 52 个编排引用服务项 | 剩余 10 个需继续找等价来源；不得解释为“不需要配置” |
| 原子附件字段 | 未形成完整静态来源 | 继续补 `vaAtomFiles` 或页面运行时响应 |
| 附件、模板、上传关系 | 未形成完整证据链 | 需要单独建证据，不得与普通属性混写 |

## 报告文件

- 机器可读报告：`source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json`
- 人类可读报告：`source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md`
- 原子属性覆盖明细：`source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv`

## 结论

本轮已经可以支持 VASC whole picture 文档中的“适用异常、VASC 基础配置、原子编排、原子主数据”。

字段级文档仍需要标注缺口。普通属性字段可优先引用 `pms.BaseAttrRelService_findBaseAttrRelPage`；凡涉及附件字段、模板字段、上传关系，必须引用 `vaAtomFiles`、页面运行时响应或等价来源后再写成确定结论。
