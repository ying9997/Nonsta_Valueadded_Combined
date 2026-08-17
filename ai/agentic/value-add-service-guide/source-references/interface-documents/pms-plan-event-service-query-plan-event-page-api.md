---
title: TOM 内部接口：pms.PlanEventService_queryPlanEventPage
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# TOM 内部接口：pms.PlanEventService_queryPlanEventPage

> 来源：DevTools 抓包与响应样例
> 当前文档仅沉淀接口结构与调用边界；运行时样例文件不作为正式 `source_refs`。
> 整理时间：2026-06-18  
> 适用范围：公司内部 TOM 系统，非万邑通开放平台 OpenAPI

## 1. 接口概述

该接口用于查询 TOM「产品 / 事件管理」下的规划事件分页数据。当前已验证可用于：

- 标准异常事件查询
- 增值服务事件查询

两类查询共用同一个后端服务方法：

```text
pms.PlanEventService_queryPlanEventPage
```

通过请求参数中的 `where[vo][ACTION_NAME]` 和 `where[vo][eventType]` 区分查询场景。

| 查询场景 | `ACTION_NAME` | `eventType` | TOM 页面 |
|---|---|---|---|
| 标准异常 | `standardException` | `STANDARD_EXCEPTION` | `/PlanEvent/standardException` |
| 增值服务 | `valueAddedService` | `VAS` | `/PlanEvent/valueAddedService` |

## 2. 请求信息

| 项目 | 内容 |
|---|---|
| 请求域名 | `https://cnpmstom.winit.com.cn` |
| 请求路径 | `/PlanEvent/ajaxProcess` |
| 完整 URL | `https://cnpmstom.winit.com.cn/PlanEvent/ajaxProcess` |
| HTTP 方法 | `POST` |
| Content-Type | `application/x-www-form-urlencoded; charset=UTF-8` |
| 返回格式 | JSON |
| 认证方式 | TOM/IAM 登录态 Cookie + CSRF Token |

## 3. 调用前置条件

调用该接口前需要具备：

1. 有权限的 TOM/IAM 账号。
2. 可访问 `cnpmstom.winit.com.cn` 的网络环境。
3. 有效 TOM 登录态 Cookie。
4. 有效 `X-CSRF-Token`。
5. 对应业务页作为 `Referer`。

完整自动化链路通常为：

```text
IAM login
→ OAuth getToken
→ 同步 Cookie/JWT 到 TOM 子域
→ GET 业务页获取 CSRF
→ POST /PlanEvent/ajaxProcess
```

注意：如果复用 `winit-tom-adapter`，需要将 `cnpmstom.winit.com.cn` 加入 Cookie 同步域名：

```text
WINIT_COOKIE_SYNC_HOSTS=cnumstom.winit.com.cn,cnomstom.winit.com.cn,tom.winit.com.cn,cnpmstom.winit.com.cn
```

## 4. 请求头

抓包样例中已验证存在以下关键请求头：

| Header | 是否必需 | 说明 |
|---|---:|---|
| `Accept` | 建议 | `application/json, text/javascript, */*; q=0.01` |
| `Content-Type` | 是 | `application/x-www-form-urlencoded; charset=UTF-8` |
| `Origin` | 是 | `https://cnpmstom.winit.com.cn` |
| `Referer` | 是 | 标准异常或增值服务页面地址 |
| `X-Requested-With` | 是 | `XMLHttpRequest` |
| `X-CSRF-Token` | 是 | 从业务页、响应头、Cookie 或浏览器抓包获取 |
| `Cookie` | 是 | TOM/IAM 登录态。浏览器 cURL 样例中通过 `-b/--cookie` 携带 |

Referer 示例：

```text
标准异常: https://cnpmstom.winit.com.cn/PlanEvent/standardException
增值服务: https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService
```

## 5. 请求参数

请求体使用 `application/x-www-form-urlencoded`，字段采用浏览器 Form Data 的 bracket notation。

### 5.1 公共参数

| 参数 | 类型 | 必填 | 示例 | 说明 |
|---|---|---:|---|---|
| `draw` | Number/String | 是 | `1` | DataTables 请求序号 |
| `start` | Number/String | 是 | `0` | 分页起始位置，按 offset 传值 |
| `length` | Number/String | 是 | `50` | 每页条数 |
| `api` | String | 是 | `pms.PlanEventService_queryPlanEventPage` | 后端服务方法名 |
| `where[vo][ACTION_NAME]` | String | 是 | `standardException` | 页面动作/查询场景 |
| `where[vo][eventType]` | String | 是 | `STANDARD_EXCEPTION` | 事件类型 |
| `where[vo][eventCode]` | String | 否 | 空 | 按事件编码筛选 |
| `where[vo][eventName]` | String | 否 | 空 | 按事件名称筛选 |
| `where[vo][isActive]` | String | 否 | `Y` | 是否启用。样例固定传 `Y` |

### 5.2 标准异常专用筛选参数

| 参数 | 类型 | 必填 | 示例 | 说明 |
|---|---|---:|---|---|
| `where[vo][ACTION_NAME]` | String | 是 | `standardException` | 标准异常查询动作 |
| `where[vo][eventType]` | String | 是 | `STANDARD_EXCEPTION` | 标准异常事件类型 |
| `where[vo][controllable]` | String | 否 | 空 | 是否可控，枚举待确认 |
| `where[vo][eventAttr]` | String | 否 | 空 | 事件属性，如知悉类/操作类，枚举待确认 |
| `where[vo][sgCode]` | String | 否 | 空 | SG 编码 |

### 5.3 增值服务专用筛选参数

| 参数 | 类型 | 必填 | 示例 | 说明 |
|---|---|---:|---|---|
| `where[vo][ACTION_NAME]` | String | 是 | `valueAddedService` | 增值服务查询动作 |
| `where[vo][eventType]` | String | 是 | `VAS` | 增值服务事件类型 |
| `where[vo][pscgCode]` | String | 否 | 空 | PSCG 编码 |
| `where[vo][isAtomicVas]` | String | 否 | 空 | 是否增值原子，枚举待确认 |
| `where[vo][vasType]` | String | 否 | 空 | 增值类型 |

## 6. 请求示例

### 6.1 查询标准异常

Form Data：

```text
draw=1
start=0
length=50
api=pms.PlanEventService_queryPlanEventPage
where[vo][ACTION_NAME]=standardException
where[vo][eventType]=STANDARD_EXCEPTION
where[vo][eventCode]=
where[vo][eventName]=
where[vo][isActive]=Y
where[vo][controllable]=
where[vo][eventAttr]=
where[vo][sgCode]=
```

URL encoded body 示例：

```text
draw=1&start=0&length=50&api=pms.PlanEventService_queryPlanEventPage&where%5Bvo%5D%5BACTION_NAME%5D=standardException&where%5Bvo%5D%5BeventType%5D=STANDARD_EXCEPTION&where%5Bvo%5D%5BeventCode%5D=&where%5Bvo%5D%5BeventName%5D=&where%5Bvo%5D%5BisActive%5D=Y&where%5Bvo%5D%5Bcontrollable%5D=&where%5Bvo%5D%5BeventAttr%5D=&where%5Bvo%5D%5BsgCode%5D=
```

### 6.2 查询增值服务

Form Data：

```text
draw=1
start=0
length=50
api=pms.PlanEventService_queryPlanEventPage
where[vo][ACTION_NAME]=valueAddedService
where[vo][eventType]=VAS
where[vo][eventCode]=
where[vo][eventName]=
where[vo][isActive]=Y
where[vo][pscgCode]=
where[vo][isAtomicVas]=
where[vo][vasType]=
```

URL encoded body 示例：

```text
draw=1&start=0&length=50&api=pms.PlanEventService_queryPlanEventPage&where%5Bvo%5D%5BACTION_NAME%5D=valueAddedService&where%5Bvo%5D%5BeventType%5D=VAS&where%5Bvo%5D%5BeventCode%5D=&where%5Bvo%5D%5BeventName%5D=&where%5Bvo%5D%5BisActive%5D=Y&where%5Bvo%5D%5BpscgCode%5D=&where%5Bvo%5D%5BisAtomicVas%5D=&where%5Bvo%5D%5BvasType%5D=
```

## 7. 响应结构

样例响应顶层结构：

```json
{
  "info": {
    "content": [],
    "pageable": {},
    "total": 211,
    "lastPage": false,
    "firstPage": false,
    "sort": {},
    "totalElements": 211,
    "numberOfElements": 50,
    "totalPages": 5,
    "size": 50,
    "number": 1
  },
  "status": 1,
  "url": ""
}
```

### 7.1 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | Number | 调用状态。样例成功值为 `1` |
| `info` | Object | 分页结果对象 |
| `url` | String | 样例为空 |

### 7.2 `info` 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `content` | Array | 当前页数据列表 |
| `pageable` | Object | 分页对象，具体结构待补充 |
| `total` | Number | 总记录数 |
| `totalElements` | Number | 总记录数。样例中与 `total` 一致 |
| `numberOfElements` | Number | 当前页记录数 |
| `totalPages` | Number | 总页数 |
| `size` | Number | 每页大小 |
| `number` | Number | 当前页号。样例 `start=0` 时返回 `number=1` |
| `firstPage` | Boolean | 是否首页 |
| `lastPage` | Boolean | 是否末页 |
| `sort` | Object | 排序信息 |

## 8. `content[]` 字段

以下字段来自标准异常与增值服务响应样例的字段全集。部分字段仅根据字段名推断含义，业务定义需以后端或产品配置为准。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | Number/String | 内部主键 |
| `eventNo` | String | 事件编号/内部编号，具体含义待确认 |
| `eventType` | String | 事件类型，如 `STANDARD_EXCEPTION`、`VAS` |
| `eventCode` | String | 事件编码 |
| `eventCodes` | Array/String | 事件编码集合，结构待确认 |
| `eventName` | String | 事件名称 |
| `eventDefine` | String | 事件定义/说明 |
| `eventSource` | String | 事件来源 |
| `eventAttr` | String | 事件属性，如标准异常样例中的 `AWARE_CLASS` |
| `eventAttrName` | String | 事件属性名称 |
| `sgCode` | String | SG 编码 |
| `sgCodes` | Array/String | SG 编码集合 |
| `sgName` | String | SG 名称 |
| `pscgCode` | String | PSCG 编码 |
| `pscgName` | String | PSCG 名称 |
| `vasType` | String | 增值类型 |
| `vasTypeDesc` | String | 增值类型描述 |
| `vascCode` | String | VASC 编码，具体含义待确认 |
| `isAtomicVas` | String | 是否增值原子 |
| `isStandardVas` | String | 是否标准增值 |
| `isActive` | String | 是否启用，样例为 `Y` |
| `isDelete` | String | 是否删除 |
| `processFlow` | String | 处理流程 |
| `defaultSlaDay` | Number/String | 默认 SLA 天数 |
| `responsibleParty` | String | 责任方 |
| `controllable` | String | 是否可控 |
| `exceptionHandlingSla` | Number/String | 异常处理 SLA |
| `exceptionHandlingSlaUnit` | String | 异常处理 SLA 单位 |
| `influenceSla` | Number/String | 影响 SLA |
| `influenceSlaUnit` | String | 影响 SLA 单位 |
| `followCycle` | Number/String | 跟进周期 |
| `followCycleUnit` | String | 跟进周期单位 |
| `exceptionType` | String | 异常类型 |
| `exceptionNode` | String | 异常节点 |
| `exceptionObject` | String | 异常对象 |
| `exceptionPlace` | String | 异常地点 |
| `operationObject` | String | 操作对象 |
| `operationObjectName` | String | 操作对象名称 |
| `orderType` | String | 订单类型 |
| `orderTypeDesc` | String | 订单类型描述 |
| `docType` | String | 单据类型 |
| `category` | String | 分类 |
| `keyword` | String | 关键字 |
| `isNotifyCustomer` | String | 是否通知客户 |
| `isNeedCustomerVerify` | String | 是否需要客户确认 |
| `isRequiredAction` | String | 是否需要操作 |
| `informCondition` | String | 通知条件 |
| `registerTriggerProcess` | String | 登记触发流程 |
| `autoClose` | String | 是否自动关闭 |
| `closeMode` | String | 关闭方式 |
| `closeModeValue` | String | 关闭方式值 |
| `subCloseMode` | String | 子关闭方式 |
| `serviceCompletionNode` | String | 服务完成节点 |
| `isNeedCharge` | String | 是否需要收费 |
| `isNeedChargeWarehouseFee` | String | 是否需要收仓储费 |
| `isNeedCost` | String | 是否需要成本 |
| `isEstimateFee` | String | 是否预估费用 |
| `feeNode` | String | 费用节点 |
| `feeCalculateType` | String | 费用计算类型 |
| `requirementCost` | String/Number | 需求成本 |
| `maxStorageFeeDay` | Number/String | 最大仓储费天数 |
| `storageFeeUnit` | String | 仓储费单位 |
| `incomeSharingRule` | String | 收入分摊规则 |
| `compensateType` | String | 赔付类型 |
| `isCompensate` | String | 是否赔付 |
| `scanEntryRate` | String/Number | 扫描录入率，具体含义待确认 |
| `serviceMethod` | String | 服务方式 |
| `serviceProvider` | String | 服务提供方 |
| `supplierServiceCode` | String | 供应商服务编码 |
| `supplierServiceName` | String | 供应商服务名称 |
| `isAllowSplitOrder` | String | 是否允许拆单 |
| `isInterceptInboundList` | String | 是否拦截入库列表 |
| `organizationId` | Number/String | 组织 ID |
| `created` | String | 创建时间 |
| `createdby` | String | 创建人 |
| `updated` | String | 更新时间 |
| `updatedby` | String | 更新人 |
| `attrList` | Array | 属性列表 |
| `costItemList` | Array | 成本项列表 |
| `revenueItemList` | Array | 收入项列表 |
| `ruleList` | Array | 规则列表 |
| `notInEventCodes` | Array/String | 排除事件编码集合 |

## 9. 响应样例

### 9.1 标准异常样例字段

本地响应第一条样例的关键字段：

```json
{
  "eventCode": "B07E1827",
  "eventName": "调拨笼车溢收",
  "eventType": "STANDARD_EXCEPTION",
  "isActive": "Y",
  "eventAttr": "AWARE_CLASS",
  "sgCode": "B07",
  "pscgCode": null
}
```

本地样例分页：

```json
{
  "status": 1,
  "totalElements": 422,
  "totalPages": 9,
  "numberOfElements": 50,
  "size": 50
}
```

### 9.2 增值服务样例字段

本地响应第一条样例的关键字段：

```json
{
  "eventCode": "OW01V1825",
  "eventName": "入库-补贴原商品条码（带示例图）",
  "eventType": "VAS",
  "isActive": "Y",
  "vasType": "",
  "eventAttr": null,
  "sgCode": null,
  "pscgCode": "OW01"
}
```

本地样例分页：

```json
{
  "status": 1,
  "totalElements": 211,
  "totalPages": 5,
  "numberOfElements": 50,
  "size": 50
}
```

## 10. 分页拉取策略

接口请求使用 `start` + `length` 控制分页：

```text
第 1 页: start=0, length=50
第 2 页: start=50, length=50
第 3 页: start=100, length=50
...
```

建议按以下任一方式判断是否继续：

1. 使用响应中的 `info.totalElements` 计算总页数。
2. 每次 `start += length`，直到 `start >= totalElements`。
3. 或读取响应中的 `info.lastPage`，为 `true` 时停止。

## 11. 自动化调用注意事项

1. 该接口是 TOM 内部接口，不是开放平台 OpenAPI。
2. 必须携带 TOM 登录态 Cookie 和有效 `X-CSRF-Token`。
3. `Referer` 应与查询场景对应，否则可能被 CSRF 或权限逻辑拦截。
4. 若使用自动登录流程，需要确认 Cookie 同步覆盖 `cnpmstom.winit.com.cn`。
5. 浏览器抓包中的 cURL 可能使用 Windows CMD 转义，如 `^"`、`^%5B`；复制到程序中使用前需要去除 `^` 转义。
6. `where[vo]` 参数为空字符串时也会随浏览器 Form Data 一起提交。为最大程度复现页面行为，建议保留这些空字段。

## 12. 最小调用模板

```http
POST /PlanEvent/ajaxProcess HTTP/1.1
Host: cnpmstom.winit.com.cn
Accept: application/json, text/javascript, */*; q=0.01
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Origin: https://cnpmstom.winit.com.cn
Referer: https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService
X-Requested-With: XMLHttpRequest
X-CSRF-Token: <csrf-token>
Cookie: <tom-session-cookie>

draw=1&start=0&length=50&api=pms.PlanEventService_queryPlanEventPage&where%5Bvo%5D%5BACTION_NAME%5D=valueAddedService&where%5Bvo%5D%5BeventType%5D=VAS&where%5Bvo%5D%5BisActive%5D=Y
```



