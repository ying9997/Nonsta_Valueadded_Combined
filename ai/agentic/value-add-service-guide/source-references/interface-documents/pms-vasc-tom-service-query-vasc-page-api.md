---
title: pms.VascTomService_queryVascPage — 分页查询增值服务产品（TOM专用）
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/pms-vasc-tom-service-query-vasc-page-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# pms.VascTomService_queryVascPage — 分页查询增值服务产品（TOM专用）

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `pms.VascTomService_queryVascPage` |
| 系统 | PMS（价格管理系统）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.pms.spi.v2.base.VascTomService#queryVascPage` |
| 接口描述 | TOM 专用分页查询 VASC（增值服务产品）列表，返回基础信息及属性映射 |

---

## 请求参数

入参类型：`VascQueryCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vascCode | String | 否 | 增值服务产品编码，精确匹配 |
| vascName | String | 否 | 增值服务产品名称，模糊匹配 |
| isActive | String | 否 | 是否有效（Y/N） |
| pscgCode | String | 否 | 关联 PSCG 编码 |
| vasEventCode | String | 否 | 增值服务事件编码 |
| exceptionEventCodeSet | Set\<String\> | 否 | 异常事件编码集合（去重），用于按异常事件过滤 VASC |
| queryAttr | String | 否 | 是否查询属性详情，控制返回数据粒度 |
| attributeQueryList | List\<VascAttributeVo\> | 否 | 属性查询条件列表，按属性类型过滤 |
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
VascQueryCommand command = new VascQueryCommand();
command.setCtx(CommandContext.getContext());
command.setIsActive("Y");
command.setPscgCode("OW01");

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<VascBaseInfoVo> result = vascTomService.queryVascPage(command);
```

---

## 响应数据

返回 `Page<VascBaseInfoVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content | List\<VascBaseInfoVo\> | 当前页数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页码、每页条数） |

### VascBaseInfoVo — 增值服务产品基础信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| vascCode | String | 增值服务产品编码 |
| vascName | String | 增值服务产品名称（支持多语言） |
| vascDesc | String | 增值服务产品描述（支持多语言） |
| pscgCode | String | 关联 PSCG 编码 |
| pscgName | String | 关联 PSCG 名称（支持多语言） |
| listing | String | 上架方式（已弃用） |
| isActive | String | 是否有效（Y/N） |
| vascAttributeMap | Map\<String, List\<String\>\> | 增值服务属性映射表，key 为属性类型，value 为属性值列表 |

### vascAttributeMap 常见属性类型

| 属性类型 Key | 说明 |
|-------------|------|
| VAS_ORDER_STATUS_INBOUND | 入库增值单适用状态 |
| VAS_ORDER_STATUS_OUTBOUND | 出库增值单适用状态 |
| VASC_PRODUCT_TYPE | 增值产品类型 |
| VASC_SUBMITTER | 提交人类型 |

---

## 与其他 VASC 查询接口的区别

| 接口 | 特点 |
|------|------|
| `pms.VascTomService_queryVascPage` | TOM 专用，内部设置 `fromTom=true`，分页返回基础信息 |
| `pms.vasc.listAllVasc` | 通用接口，支持更多属性过滤，用于前端下拉列表 |
| `pms.vasc.getVascInfo` | 查询单个 VASC 详情，包含完整原子列表 |

---

## 注意事项

- 此接口通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关，无需签名参数
- SPI 依赖：`com.winit.pms.spi.v2`，版本见 pms2 的 pom.xml（`spi-pms.version`）
- 实现类：`com.winit.pms.vasc.service.impl.VascTomServiceImpl`
- 内部固定设置 `fromTom=true`，与普通 VASC 查询行为略有差异


