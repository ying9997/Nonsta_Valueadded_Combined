# pms.PlanEventService_queryPlanEventPage — 分页查询异常事件配置

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `pms.PlanEventService_queryPlanEventPage` |
| 系统 | PMS（价格管理系统）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.pms.spi.v2.base.PlanEventService#queryPlanEventPage` |
| 接口描述 | 分页查询异常事件/增值服务事件配置信息 |

---

## 请求参数

入参类型：`PlanEventQueryCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vo | PlanEventVo | 否 | 查询条件对象，见下方字段说明 |
| pageVo | PageVo | 否 | 分页参数 |
| ctx | CommandContext | 是 | 调用上下文（框架注入） |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | CREATED | 排序字段 |
| direction | String | 否 | DESC | 排序方向（ASC/DESC） |

### PlanEventVo — 查询条件字段

以下字段支持作为查询过滤条件传入（均为可选）：

| 字段 | 类型 | 匹配方式 | 说明 |
|------|------|----------|------|
| eventNo | String | 精确 | 事件编号（5位唯一编码） |
| eventCode | String | 模糊 | 事件编码 |
| eventName | String | 模糊 | 事件名称 |
| keyword | String | 模糊 | 按编码或名称搜索 |
| sgCode | String | 精确 | 关联 SG 编码 |
| pscgCode | String | 精确 | 关联 PSCG 编码 |
| isActive | String | 精确 | 是否有效（Y/N） |
| eventType | String | 精确 | 事件类型（STANDARD_EXCEPTION / PSC_VAS） |
| isNeedCharge | String | 精确 | 是否需要收费（Y/N） |
| controllable | String | 精确 | 是否可控异常（Y/N） |
| eventAttr | String | 精确 | 事件属性 |
| exceptionType | String | 精确 | 异常分类 |
| isAtomicVas | String | 精确 | 是否增值线上化（Y/N） |
| vasType | String | 精确 | 增值类型 |
| notInEventCodes | List\<String\> | NOT IN | 排除的事件编码列表 |
| isAtomicVas | String | 精确 | 是否原子增值服务（Y/N） |
| isNotifyCustomer | String | 精确 | 是否通知客户（Y/N） |

### 请求示例（Dubbo 调用）

```java
PlanEventQueryCommand command = new PlanEventQueryCommand();
command.setCtx(CommandContext.getContext());

PlanEventVo vo = new PlanEventVo();
vo.setIsActive("Y");
vo.setEventType("STANDARD_EXCEPTION");
command.setVo(vo);

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<PlanEventVo> result = planEventService.queryPlanEventPage(command);
```

---

## 响应数据

返回 `Page<PlanEventVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content / list | List\<PlanEventVo\> | 数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页、每页条数） |

### PlanEventVo — 返回字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件编号（5位唯一编码） |
| eventCode | String | 事件编码 |
| eventName | String | 事件名称 |
| eventDefine | String | 事件定义/描述 |
| eventType | String | 事件类型：STANDARD_EXCEPTION-标准异常 / PSC_VAS-PSC中增值服务 |
| eventAttr | String | 事件属性 |
| exceptionType | String | 异常分类 |
| category | String | 分类 |
| sgCode | String | 关联 SG 编码 |
| sgName | String | 关联 SG 名称 |
| pscgCode | String | 关联 PSCG 编码 |
| pscgName | String | 关联 PSCG 名称 |
| vasType | String | 增值类型 |
| isAtomicVas | String | 是否增值线上化（Y/N） |
| isActive | String | 是否有效（Y/N） |
| isDelete | String | 是否删除（Y/N） |
| isNeedCharge | String | 是否需要收费（Y/N） |
| isNeedCost | String | 是否产生成本（Y/N） |
| isNeedCustomerVerify | String | 是否需要客户确认（Y/N） |
| isNotifyCustomer | String | 是否通知客户（Y/N） |
| isCompensate | String | 是否赔付（Y/N） |
| isEstimateFee | String | 是否预估费用（Y/N） |
| isRequiredAction | String | 是否需要预设动作（Y/N），默认 N |
| isInterceptInboundList | String | 是否拦截入库上架（Y/N） |
| isAllowSplitOrder | String | 是否允许拆单（Y/N） |
| controllable | String | 是否可控异常（Y/N） |
| requirementCost | String | 是否产生成本（Y/N） |
| autoClose | String | 是否自动关闭（Y/N） |
| processFlow | String | 处理流程 |
| responsibleParty | String | 责任方：CUSTOMER-客户 / SUPPLIER-供应商 / WINIT-万邑通 |
| defaultSlaDay | Integer | 默认影响 SLA 天数 |
| influenceSla | Integer | 影响全程 SLA 天数 |
| influenceSlaUnit | String | 影响全程 SLA 单位：TD-当天 / WD-工作日 / ND-自然日 / HD-小时 |
| exceptionHandlingSla | BigDecimal | 异常处理时效（保留2位小数） |
| exceptionHandlingSlaUnit | String | 异常处理时效单位：TD/WD/ND/HD |
| followCycle | BigDecimal | 跟进周期 |
| followCycleUnit | String | 跟进周期单位：TD/WD/ND/HD |
| feeNode | Integer | 扣费节点（天数） |
| feeCalculateType | String | 收入成本计算类型，默认基于价格表 |
| maxStorageFeeDay | Integer | 仓租最大收费天数 |
| storageFeeUnit | String | 仓租收费单位 |
| serviceCompletionNode | String | 服务完成节点 |
| serviceProvider | String | 归属方 |
| supplierServiceCode | String | 供应商服务编码 |
| exceptionNode | String | 异常环节 |
| exceptionPlace | String | 异常发生地 |
| exceptionObject | String | 异常对象 |
| vascCode | String | 关联增值产品编码 |
| docType | String | 单据类型：PACKAGE_SERNO-包裹条码 / SUB_PACKAGE_SERNO-子包裹条码 / MERCHANDISE_SERNO-商品条码 / ITEM_SERNO-单品条码 / SERVICE_NO-服务单 / INBOUND_ORDER_NO-入库单 / OUTBOUND_ORDER_NO-出库单 |
| closeMode | String | 关闭类型：MANUAL-手动关闭 / AUTO-自动关闭 |
| subCloseMode | String | 子关闭类型：INBOUND_PKG_STATUS / REGISTER / INBOUND_ORDER_STATUS / SCAN_ENTRY_RATE_STATUS |
| closeModeValue | String | 关闭类型匹配值（逗号分隔）：UD-已卸货 / LOST-已丢失 / SCP-已上架 |
| scanEntryRate | String | Scan 录入率（%） |
| compensateType | String | 赔付类型：FL-头程丢失 / IW-库内丢失 |
| eventSource | String | 异常来源：CWM-云仓 / TMS-智运 / OMS-订单 |
| registerTriggerProcess | String | 生成异常时触发更改入库包裹状态：LOST-已丢失 / STOP-已终止 |
| informCondition | String | 通知条件 |
| incomeSharingRule | String | 收入分摊规则 |
| orderType | String | 订单类型 |
| operationObject | List\<String\> | 操作对象列表 |
| organizationId | Long | 组织 ID |
| createdby | String | 创建人 |
| created | Date | 创建时间 |
| updatedby | String | 修改人 |
| updated | Date | 修改时间 |

---

## 枚举值说明

### eventType — 事件类型

| 枚举值 | 说明 |
|--------|------|
| STANDARD_EXCEPTION | 标准异常事件 |
| PSC_VAS | PSC 中的增值服务 |

### responsibleParty — 责任方

| 枚举值 | 说明 |
|--------|------|
| CUSTOMER | 客户 |
| SUPPLIER | 供应商 |
| WINIT | 万邑通 |

### SLA 时间单位（influenceSlaUnit / exceptionHandlingSlaUnit / followCycleUnit）

| 枚举值 | 说明 |
|--------|------|
| TD | 当天 |
| WD | 工作日 |
| ND | 自然日 |
| HD | 小时 |

### docType — 单据类型

| 枚举值 | 说明 |
|--------|------|
| PACKAGE_SERNO | 包裹条码 |
| SUB_PACKAGE_SERNO | 子包裹条码 |
| MERCHANDISE_SERNO | 商品条码 |
| ITEM_SERNO | 单品条码 |
| SERVICE_NO | 服务单 |
| INBOUND_ORDER_NO | 入库单 |
| OUTBOUND_ORDER_NO | 出库单 |

### closeMode — 关闭类型

| 枚举值 | 说明 |
|--------|------|
| MANUAL | 手动关闭 |
| AUTO | 自动关闭 |

### eventSource — 异常来源

| 枚举值 | 说明 |
|--------|------|
| CWM | 云仓 |
| TMS | 智运 |
| OMS | 订单 |

---

## 注意事项

- 此接口通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关，无需公共请求参数（app_key / sign 等）
- SPI 依赖：`com.winit.pms.spi.v2`，版本见 pms2 的 pom.xml（`spi-pms.version`）
- 默认排序：按创建时间（CREATED）**降序**
- 调用方需注入 `PlanEventService` Dubbo Reference Bean
