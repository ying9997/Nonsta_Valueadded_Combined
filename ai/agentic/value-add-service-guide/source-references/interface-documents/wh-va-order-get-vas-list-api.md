---
title: wh.va.order.getVasList — 查询增值原子列表
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/wh-va-order-get-vas-list-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# wh.va.order.getVasList — 查询增值原子列表

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `wh.va.order.getVasList` |
| 接口路径 | `POST /wh/va/order/getVasList` |
| 接口描述 | 分页查询指定增值订单的增值原子（服务步骤）列表 |
| 系统 | openapi → oms2（Dubbo RPC） |
| 权限控制 | 仅允许查询当前客户下的增值单 |

---

## 公共请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| action | String | 是 | - | 固定值 `wh.va.order.getVasList` |
| app_key | String | 是 | - | 用户名 / 应用密钥 |
| client_id | String | 是 | - | 客户端 ID，注册时系统分配 |
| timestamp | String | 是 | - | 请求时间戳（毫秒） |
| sign | String | 是 | - | 签名值，见签名说明 |
| sign_method | String | 否 | `md5` | 签名方式 |
| version | String | 否 | `1.0` | API 版本号 |
| format | String | 否 | `json` | 返回格式 |
| platform | String | 否 | - | 平台标识 |
| language | String | 否 | `zh_CN` | 语言 |
| data | Object | 是 | - | 业务参数，见下方说明 |

### 签名说明

按以下顺序拼接后 MD5 加密：

```
token + "action" + action + "app_key" + app_key + "data" + data
     + "format" + format + "platform" + platform + "sign_method" + sign_method
     + "timestamp" + timestamp + "version" + version + token
```

---

## 业务请求参数（data 字段）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号（前缀 `V`） |
| businessNo | String | 否 | 业务单号 |
| orderEntry | String | 否 | 增值单下单入口 |
| pageVo | PageVo | 否 | 分页参数，见下 |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | - | 排序字段 |
| direction | String | 否 | - | 排序方向（ASC/DESC） |

### 请求示例

```json
{
  "action": "wh.va.order.getVasList",
  "app_key": "your_app_key",
  "client_id": "your_client_id",
  "timestamp": "1624080000000",
  "version": "1.0",
  "sign": "md5_hash_value",
  "sign_method": "md5",
  "format": "json",
  "language": "zh_CN",
  "data": {
    "orderNo": "V106075100",
    "pageVo": {
      "pageNo": 1,
      "pageSize": 20
    }
  }
}
```

---

## 响应数据

返回 `Page<VaAtomVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| pageNo | Integer | 当前页码 |
| pageSize | Integer | 每页条数 |
| totalCount | Long | 总条数 |
| list | List\<VaAtomVo\> | 增值原子列表 |

### VaAtomVo — 增值原子

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 增值订单号 |
| winitOrderNo | String | Winit 订单号 |
| winitProductCode | String | Winit 产品编码 |
| winitProductName | String | Winit 产品名称 |
| serviceCode | String | 原子服务编码 |
| serviceName | String | 原子服务名称 |
| serviceDesc | String | 原子服务描述 |
| serviceSequence | String | 原子序号 |
| serviceNode | String | 服务节点 |
| serviceType | String | 增值类型 |
| serviceObject | String | 服务对象 |
| executeOrder | Integer | 执行顺序 |
| status | String | 状态编码 |
| statusDesc | String | 状态描述 |
| partCompleteReason | String | 部分完成 / 退回原因 |
| returnReason | String | 回退原因 |
| completeTime | Date | 完成时间 |
| timeZone | String | 时区 |
| workOrderNo | String | 单据号 |
| orderCount | int | 下单数量 |
| handleCount | int | 实际完成数量 |
| vasType | String | 增值类型（标准增值 / 非标增值） |
| vasDes | String | 增值需求描述 |
| sop | String | 仓库操作 SOP |
| calculateType | String | 收入成本计算类型（基于价格表定义 / 基于仓库作业动作） |
| sceneOverviewCode | String | 增值审核场景概述编码 |
| sceneOverviewName | String | 增值审核场景概述名称 |
| supportExportAtta | String | 是否支持导出附件（Y/N） |
| verdorCode | String | 供应商编码 |
| verdorName | String | 供应商名称 |
| vendorServiceCode | String | 供应商服务编码 |
| vendorServiceName | String | 供应商服务名称 |
| vaAtomCommandJson | String | 增值指令 JSON |
| vasc | VascVo | 关联的 VASC 信息，见下 |
| vaAtomAttrs | List\<VaAtomAttrVo\> | 增值执行属性列表，见下 |
| vaAtomFiles | List\<VaAtomFileVo\> | 增值执行附件列表，见下 |
| vaExecuteCommands | List\<VaExecuteCommandVo\> | 增值执行指令列表，见下 |
| vaAtomResults | List\<VaAtomResultVo\> | 增值执行结果列表，见下 |
| vaExecuteOrderGoods | List\<CommonGoodsVo\> | 增值执行单货物列表 |
| vaExecutionRequirement | VaExecutionRequirement | 增值执行要求，见下 |

### VascVo — 增值产品信息

| 字段 | 类型 | 说明 |
|------|------|------|
| productCode | String | 增值产品编码 |
| productName | String | 增值产品名称 |
| vascDesc | String | 增值产品说明 |
| vasType | String | 增值类型（标准增值 / 非标增值） |
| vasTypeName | String | 增值类型名称 |
| vasExecutor | String | 增值执行人（PD / 海外仓 / 运营 / 尾程询价负责人） |
| vaSection | String | 增值环节 |
| pscCode | String | PSC 编码 |
| sla | Integer | SLA 天数 |
| slaUnit | String | SLA 单位 |
| slaUnitCode | String | SLA 单位编码 |
| shelveWay | String | 上架方式 |
| shelveWayCode | String | 上架方式编码 |
| isAudit | String | 是否需要审核（是/否） |
| auditDepartment | String | 审核负责部门（PD / 商品组 / 仓库） |
| auditDepartmentCode | String | 审核负责部门编码 |
| isChangeAtom | String | 审核时是否可变更原子编排（是/否） |
| isNeedConfirm | String | 是否需要客户确认（Y/N） |
| isSupportNoBusinessOrder | String | 是否支持无业务单据（Y/N） |
| relatedPsc | PscVo | 关联 PSC（productCode / productName） |

### VaAtomAttrVo — 增值执行属性

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单号 |
| serviceCode | String | 服务编码 |
| attributeName | String | 属性名 |
| attributeKey | String | 属性键 |
| attributeValue | String | 属性值 |
| attributeValueName | String | 属性值名称 |
| attributeKeyOriginal | String | 原属性键 |
| attributeValueOriginal | String | 原属性值 |
| unit | String | 单位 |
| showType | String | 展示类型 |
| pulldownValue | String | 下拉选项值 |
| inputNode | String | 输入节点 |
| isRequired | String | 是否必填（Y/N） |
| defaultValue | String | 默认值 |
| minValue | BigDecimal | 最小值 |
| maxValue | BigDecimal | 最大值 |
| timeFormat | String | 时间格式 |
| fileFormat | String | 文件格式 |
| isCalculate | String | 是否作为计费单位字段（Y/N） |
| isPriceCard | String | 是否作为价卡适用条件（Y/N） |
| isShow | String | 是否展示给客户（Y/N） |

### VaAtomFileVo — 增值执行附件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单号 |
| fileType | String | 文件类型 |
| fileName | String | 文件名称 |
| url | String | 文件地址 |
| containerNo | String | 容器号 |
| merchandiseSerno | String | M 码 |
| inputNode | String | 输入节点 |
| attrId | Long | 属性 ID |

### VaExecuteCommandVo — 增值执行指令

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| inboundOrderNo | String | 目标入库单号 |
| vaAtomId | Long | 原子 id |
| commandType | String | 指令类型（换标指令 / 拍照指令） |
| goodsKey | String | 货物 id |
| serviceCode | String | 原子编码 |
| serviceSequence | String | 原子序号 |
| orderNo | String | 增值订单号 |

### VaAtomResultVo — 增值执行结果

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| goodsKey | String | 货物标识 |
| vaAtomId | Long | 原子 id |
| serviceCode | String | 原子编码 |
| orderNo | String | 增值订单号 |
| resultJson | String | 实际结果 JSON |
| resultGoodsIds | String | 货物 id 列表 |
| serviceSequence | String | 增值原子序号 |

### VaExecutionRequirement — 增值执行要求

接口类型，已知实现：

| 实现类 | 说明 |
|--------|------|
| EmptyVaExecutionRequirement | 无执行要求 |
| LabelingVaExecutionRequirement | 贴标映射执行要求 |
| CombinationVaExecutionRequirement | 组套执行要求 |
| SplitVaExecutionRequirement | 拆套执行要求 |

---

## 公共响应结构

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 返回码，`0` 表示成功 |
| msg | String | 返回消息 |
| data | Object | 返回数据（分页结果） |


