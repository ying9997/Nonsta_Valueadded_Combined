# pms.BaseAttrRelService_findBaseAttrRelPage — 分页查询属性关系

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `pms.BaseAttrRelService_findBaseAttrRelPage` |
| 系统 | PMS（价格管理系统）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.pms.spi.v2.base.BaseAttrRelService#findBaseAttrRelPage` |
| 接口描述 | 分页查询增值服务/产品实例与基础属性的绑定关系 |

---

## 请求参数

入参类型：`BaseAttrRelQueryCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vo | BaseAttrRelVo | 否 | 查询条件对象，见下方字段说明 |
| pageVo | PageVo | 否 | 分页参数 |
| ctx | CommandContext | 是 | 调用上下文（框架注入，含语言/组织信息） |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | CREATED | 排序字段 |
| direction | String | 否 | DESC | 排序方向（ASC/DESC） |

### BaseAttrRelVo — 查询条件字段

以下字段支持作为过滤条件传入（均为可选）：

| 字段 | 类型 | 匹配方式 | 说明 |
|------|------|----------|------|
| instanceCode | String | 精确 | 产品/增值服务实例编码 |
| attrCode | String | 精确 | 属性编码 |

### 请求示例

```java
BaseAttrRelQueryCommand command = new BaseAttrRelQueryCommand();
command.setCtx(CommandContext.getContext());

BaseAttrRelVo vo = new BaseAttrRelVo();
vo.setInstanceCode("C04E03");
command.setVo(vo);

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<BaseAttrRelVo> result = baseAttrRelService.findBaseAttrRelPage(command);
```

---

## 响应数据

返回 `Page<BaseAttrRelVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content | List\<BaseAttrRelVo\> | 数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页、每页条数） |

### BaseAttrRelVo — 返回字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| instanceCode | String | 产品/增值服务实例编码 |
| attrCode | String | 属性编码 |
| attrName | String | 属性名称（按语言返回） |
| unit | String | 计量单位 |
| minValue | BigDecimal | 最小值 |
| maxValue | BigDecimal | 最大值 |
| showType | String | 展示类型（TEXT/PULLDOWN/OPTIONAL_BOX_WITH_IMAGE/ANNEX 等） |
| showTypeName | String | 展示类型名称 |
| pulldownValue | String | 下拉选项值 |
| inputMethod | String | 录入方式 |
| dimension | String | 维度 |
| isRequired | String | 是否必填（Y/N） |
| timeFormat | String | 时间格式 |
| inputNode | String | 录入节点 |
| fileFormat | String | 文件格式 |
| isShow | String | 是否展示给客户（Y/N） |
| defaultValues | List\<ScalableStringVo\> | 默认值列表 |
| nodeRelVos | List\<NodeRelVo\> | 节点关联列表（showType 为 PULLDOWN 或 OPTIONAL_BOX_WITH_IMAGE 时返回） |
| isPriceCard | String | 是否价格表属性（Y/N） |
| isCalculate | String | 是否计费属性（Y/N） |
| organizationId | Long | 组织 ID |
| createdby | String | 创建人 |
| created | Date | 创建时间 |
| updatedby | String | 修改人 |
| updated | Date | 修改时间 |
| isActive | String | 是否有效（Y/N） |
| isDelete | String | 是否删除（Y/N） |

---

## 注意事项

- 通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关
- `ctx.getLanguageCountry()` 决定 `attrName`、`showTypeName` 等多语言字段的返回语言
- 默认按创建时间（CREATED）**降序**排序
- SPI 依赖：`com.winit.pms.spi.v2`，版本见 pms2 的 pom.xml（`spi-pms.version`）
