---
title: TOM 补数运行说明
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map, tom, interface]
updated: 2026-06-22
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md
---

# TOM 补数运行说明

## 外部运行环境

TOM 自动化脚本属于项目外部运行环境，不纳入本知识库，不记录本机绝对路径。

`.env` 只用于本地调用，不得写入知识库正文、报告或快照说明。复跑后必须把可沉淀的输出复制到本项目内，并使用相对路径引用。

## 已验证脚本

| 脚本 | 用途 | 备注 |
|---|---|---|
| `query-standard-exception.mjs` | 拉取标准异常配置 | 调用 PlanEvent 标准异常场景 |
| `query-vas.mjs` | 拉取增值原子配置 | 调用 PlanEvent VAS 场景 |
| `build-vasc-master.mjs` | 汇总 VASC 列表、规则、SLA ruleMatch | 可生成 master JSON 和 CSV |
| `fetch-exception-vasc-detail-items.mjs` | 批量拉取指定 VASC 的详情页 `detail_items` | 本次新增，用于补齐真实原子编排 |
| `call-tom-ajax.mjs` | 通用 TOM ajax 调用器 | 适合探索接口 |

## 本次补数命令

本次使用 `fetch-exception-vasc-detail-items.mjs` 批量拉取 18 个入库异常引用的 VASC 详情页。

输出文件：

```text
source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json
```

本项目内的规范化结果：

```text
source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
```

## 已验证但不能补齐字段的接口

| 接口或页面 | 验证结果 |
|---|---|
| TOM VASC 详情页 `detail_items` | 能补齐 VASC 到原子的真实编排，但 `attrs` 均为空 |
| `pms.VascTomService_queryVascItemTypes` | 只返回可选原子池，包含编码、名称、描述和是否加入，不含执行属性 |
| `pms.PlanEventService_queryPlanEventPage` | 单查原子仍未返回非空 `attrList` |
| `pms.vasc.getVascInfo` | 当前 TOM ajax 通道返回接口不存在 |

## 后续补字段方向

字段级需要继续寻找以下来源：

- `wh.va.order.basicInfo` 的 `vaAtomAttrs`、`vaAtomFiles`。
- `wh.va.order.getVasList` 的 `vaAtomAttrs`、`vaAtomFiles`。
- 页面运行时响应中的执行字段、附件字段、模板字段。
- 更底层的原子属性配置接口。
