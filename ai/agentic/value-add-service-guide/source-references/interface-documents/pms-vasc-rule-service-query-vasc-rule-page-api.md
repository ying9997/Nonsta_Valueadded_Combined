---
title: pms.VascRuleService_queryVascRulePage — 分页查询增值服务适用规则
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/pms-vasc-rule-service-query-vasc-rule-page-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# pms.VascRuleService_queryVascRulePage — 分页查询增值服务适用规则

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `pms.VascRuleService_queryVascRulePage` |
| 系统 | PMS（价格管理系统）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.pms.spi.v2.base.VascRuleService#queryVascRulePage` |
| 接口描述 | 分页查询指定 VASC 产品的适用规则配置列表 |

---

## 请求参数

入参类型：`VascRuleCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vascCode | String | 是 | 增值服务产品编码，用于查询该产品下的规则 |
| id | Long | 否 | 规则 ID，用于精确查询单条规则 |
| ruleDescription | String | 否 | 规则描述，模糊匹配 |
| ruleList | List\<ApplicableRule\> | 否 | 规则列表，新增/更新时传入 |
| pageVo | PageVo | 否 | 分页参数，见下方说明 |
| ctx | CommandContext | 是 | 调用上下文（框架注入） |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | - | 排序字段 |
| direction | String | 否 | - | 排序方向（ASC/DESC） |

### 请求示例（Dubbo 调用）

```java
VascRuleCommand command = new VascRuleCommand();
command.setCtx(CommandContext.getContext());
command.setVascCode("VASC202405001");

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<VascRuleInfoVo> result = vascRuleService.queryVascRulePage(command);
```

---

## 响应数据

返回 `Page<VascRuleInfoVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content | List\<VascRuleInfoVo\> | 当前页数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页码、每页条数） |

### VascRuleInfoVo — 增值服务规则信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| vascCode | String | 增值服务产品编码 |
| ruleDescription | String | 规则描述 |
| isApplicableRule | String | 是否有适用规则（Y/N） |
| ruleList | List\<ApplicableRule\> | 适用规则条件列表，见下方说明 |

### ApplicableRule — 规则条件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 规则条件 ID |
| ruleValue | String | 规则值 |
| ruleProject | String | 规则项目（条件维度，如仓库、客户等） |
| preCondition | String | 前置条件 |
| leftBracket | String | 左括号（用于复合条件分组） |
| rightBracket | String | 右括号（用于复合条件分组） |
| andOr | String | 逻辑操作符（AND / OR） |
| isDynamic | String | 是否动态规则（Y/N） |
| ruleType | String | 规则类型 |
| ruleTypeValue | String | 规则类型对应值 |

---

## 相关接口（同一 SPI 服务）

| 接口方法名 | 说明 | 入参 | 出参 |
|-----------|------|------|------|
| `createVascRule` | 新增规则 | VascRuleCommand | Long（新增 ID） |
| `updateVascRule` | 更新规则 | VascRuleCommand | void |
| `deleteVascRule` | 删除规则 | VascRuleCommand | void |
| `getVascRule` | 查询单条规则 | VascRuleCommand | VascRuleInfoVo |
| `queryVascRulePage` | 分页查询规则 | VascRuleCommand | Page\<VascRuleInfoVo\> |

---

## 注意事项

- 此接口通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关，无需签名参数
- SPI 依赖：`com.winit.pms.spi.v2`，版本见 pms2 的 pom.xml（`spi-pms.version`）
- 实现类：`com.winit.pms.vasc.service.impl.VascRuleServiceImpl`
- `vascCode` 是核心查询条件，查询时必须传入，否则返回空结果


