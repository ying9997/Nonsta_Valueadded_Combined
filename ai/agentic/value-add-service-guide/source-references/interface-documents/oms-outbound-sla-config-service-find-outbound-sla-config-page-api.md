---
title: oms.OutboundSlaConfigService_findOutboundSlaConfigPage — 分页查询出库SLA配置
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/oms-outbound-sla-config-service-find-outbound-sla-config-page-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# oms.OutboundSlaConfigService_findOutboundSlaConfigPage — 分页查询出库SLA配置

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `oms.OutboundSlaConfigService_findOutboundSlaConfigPage` |
| 系统 | OMS2（出库单管理）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.oms.spi.outbound.OutboundSlaConfigService#findOutboundSlaConfigPage` |
| 接口描述 | 分页查询出库 SLA 配置列表，支持多条件过滤 |

---

## 请求参数

入参类型：`OutboundSlaConfigQueryCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vo | OutboundSlaConfigVo | 否 | 查询条件对象，见下方字段说明 |
| pageVo | PageVo | 否 | 分页参数 |
| ctx | CommandContext | 是 | 调用上下文（框架注入） |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始，传 0 或 null 默认返回第 1 页 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | - | 排序字段 |
| direction | String | 否 | - | 排序方向（ASC/DESC） |

### OutboundSlaConfigVo — 查询条件字段（均为可选）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，精确查询单条 |
| name | String | SLA 配置名称 |
| slaType | String | SLA 类型 |
| customerType | String | 客户类型（ALL-全部客户 / PART-部分客户） |
| pscgCode | String | PSCG 编码 |
| isActive | String | 是否有效（Y/N） |
| isDelete | String | 是否删除（Y/N） |
| isWinitResourceConsign | String | 是否 Winit 资源交货 |
| organizationId | Long | 组织 ID |
| pscgCodeList | List\<String\> | PSCG 编码集合（IN 查询） |
| slaTypeList | List\<String\> | SLA 类型集合（IN 查询） |
| consigneeTypeList | List\<String\> | 收货人类型集合（IN 查询） |
| packMethodList | List\<String\> | 打包方式集合（IN 查询） |
| warehouseCodeList | List\<String\> | 仓库编码集合（IN 查询） |
| monthList | List\<String\> | 月份集合（IN 查询） |
| customerCodeList | List\<String\> | 客户编码集合（IN 查询） |

### 请求示例（Dubbo 调用）

```java
OutboundSlaConfigQueryCommand command = new OutboundSlaConfigQueryCommand();
command.setCtx(CommandContext.getContext());

OutboundSlaConfigVo vo = new OutboundSlaConfigVo();
vo.setIsActive("Y");
vo.setSlaType("STANDARD");
command.setVo(vo);

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<OutboundSlaConfigVo> result = outboundSlaConfigService.findOutboundSlaConfigPage(command);
```

---

## 响应数据

返回 `Page<OutboundSlaConfigVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content / list | List\<OutboundSlaConfigVo\> | 数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页、每页条数） |

### OutboundSlaConfigVo — 返回字段

**基本信息**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| name | String | SLA 配置名称 |
| slaType | String | SLA 类型编码 |
| slaTypeName | String | SLA 类型名称 |
| customerType | String | 客户类型（ALL-全部 / PART-部分） |
| pscgCode | String | PSCG 编码 |
| pscgName | String | PSCG 名称 |
| isWinitResourceConsign | String | 是否 Winit 资源交货（Y/N） |
| description | String | 描述 |
| standardMaxSla | Integer | 标准 SLA 最大天数 |
| vasMaxSla | Integer | 增值 SLA 最大天数 |
| isActive | String | 是否有效（Y/N） |
| isDelete | String | 是否删除（Y/N） |
| organizationId | Long | 组织 ID |
| createdby | String | 创建人 |
| created | Date | 创建时间 |
| updatedby | String | 修改人 |
| updated | Date | 修改时间 |

**名称映射（用于前端展示）**

| 字段 | 类型 | 说明 |
|------|------|------|
| consigneeTypeMap | Map\<String, String\> | 收货人类型编码→名称映射 |
| packMethodMap | Map\<String, String\> | 打包方式编码→名称映射 |
| warehouseMap | Map\<String, String\> | 仓库编码→名称映射 |
| monthMap | Map\<String, String\> | 月份编码→名称映射 |
| customerMap | Map\<String, String\> | 客户编码→名称映射 |

**规则匹配数据**

| 字段 | 类型 | 说明 |
|------|------|------|
| ruleMatchList | List\<RuleMatchVo\> | 匹配规则集合 |
| ruleMatchVoMap | Map\<String, List\<RuleMatchVo\>\> | 确认订单→增值完成 SLA 规则映射 |
| submitAuditRuleMatch | Map\<String, List\<RuleMatchVo\>\> | 提交订单→审核完成 SLA 规则映射 |
| auditCustomerRuleMatch | Map\<String, List\<RuleMatchVo\>\> | 审核完成→客户确认 SLA 规则映射 |

### RuleMatchVo — 规则匹配

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| configId | Long | 关联配置表 ID |
| businessTypeMain | String | 主业务类型 |
| businessTypeSub | String | 子业务类型 |
| unit | String | 规则单位 |
| ruleValue | String | 规则值 |
| ruleValueDesc | String | 规则值描述 |
| ruleStart | BigDecimal | 规则范围开始值 |
| ruleEnd | BigDecimal | 规则范围结束值 |
| matchValue | String | 匹配值 |
| extraRule | String | 额外规则 |
| extraMatchValue | String | 额外匹配值 |
| extraAttributeValue | String | 二级货形集合 |
| ruleGroup | String | 服务组 |
| ruleGroupNumber | String | 作业顺序 |
| ruleGroupSeq | String | 组内序号 |
| valueType | String | 取值类型 |
| isIncrease | String | 是否配置递增（Y/N） |
| vasServiceCode | String | 增值服务单品数递增的服务编码 |
| ruleTypeGroup | String | 规则类型分组（SUBMIT_FINISH_SLA / SUBMIT_AUDIT_SLA / AUDIT_CUSTOMER_SLA） |
| standardSlaMaxDays | Integer | 标准 SLA 最大天数 |
| vasSlaMaxDays | Integer | 增值 SLA 最大天数 |
| cutTime | String | 截单时间（格式：HH:mm:ss） |
| organizationId | Long | 组织 ID |
| createdby | String | 创建人 |
| created | Date | 创建时间 |
| updatedby | String | 修改人 |
| updated | Date | 修改时间 |
| isActive | String | 是否有效（Y/N） |
| isDelete | String | 是否删除（Y/N） |

---

## 相关接口（同一 SPI 服务）

| 接口方法名 | 说明 | 入参 | 出参 |
|-----------|------|------|------|
| `createOutboundSlaConfig` | 新增 SLA 配置 | OutboundSlaConfigCommand | Long（新增 ID） |
| `updateOutboundSlaConfig` | 更新 SLA 配置 | OutboundSlaConfigCommand | void |
| `deleteOutboundSlaConfig` | 删除单条 | IdCommand | void |
| `deleteBatchOutboundSlaConfig` | 批量删除 | IdListCommand | void |
| `activeOutboundSlaConfig` | 生效/失效 | OutboundSlaConfigCommand | void |
| `getOutboundSlaConfig` | 查询单条 | IdCommand | OutboundSlaConfigVo |
| `queryOutboundSlaConfigs` | 查询全量列表 | OutboundSlaConfigQueryCommand | List\<OutboundSlaConfigVo\> |
| `queryOutboundSlaNames` | 查询所有 SLA 名称 | OutboundSlaConfigQueryCommand | List\<String\> |

---

## 注意事项

- 此接口通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关，无需签名参数
- SPI 依赖：`com.winit.oms.spi.outbound.OutboundSlaConfigService`
- 实现类位于 oms2：`com.winit.oms.otc.outbound.service.impl.OutboundSlaConfigServiceImpl`


