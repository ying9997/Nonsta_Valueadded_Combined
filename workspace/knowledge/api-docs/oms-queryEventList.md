# oms.unusualEventOrder.queryEventList — 查询异常单列表

## 基本信息

| 项目 | 内容 |
|------|------|
| 接口标识 | `oms.unusualEventOrder.queryEventList` |
| 请求方式 | POST |
| URL | `/oms/unusualEventOrder/queryEventList` |
| 描述 | 分页查询客户的异常单列表，支持多条件筛选 |

---

## 公共请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | String | 是 | 固定值：`oms.unusualEventOrder.queryEventList` |
| app_key | String | 是 | 应用标识 |
| client_id | String | 是 | 客户端 ID |
| timestamp | String | 是 | 请求时间戳 |
| sign | String | 是 | 签名值 |
| sign_method | String | 否 | 签名方式，默认 `md5` |
| format | String | 否 | 返回格式，默认 `json` |
| version | String | 否 | 版本号，默认 `1.0` |
| language | String | 否 | 语言，默认 `zh_CN` |
| data | Object | 是 | 业务参数，见下节 |

---

## 业务请求参数（data）

> `customerCode` 由系统从登录上下文自动获取，无需传入。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| pageParams.pageNo | Integer | 否 | 页码，默认 1 |
| pageParams.pageSize | Integer | 否 | 每页条数，默认系统配置值 |
| orderNo | String | 否 | WINIT 订单号 |
| packageSerno | String | 否 | 包裹条码 |
| subPackageSerno | String | 否 | 子包裹条码 |
| itemSerno | String | 否 | 单品条码 |
| merchandiseSerno | String | 否 | 商品条码 |
| eventNo | String | 否 | 异常单号 |
| docNo | String | 否 | 增值单号 |
| stateClassification | String | 否 | 状态分类：`TFB`-待反馈、`PI`-处理中、`PD`-已处理 |
| status | String | 否 | 异常单状态 |
| eventCode | String | 否 | 异常编码 |
| warehouseCode | String | 否 | 登记仓库编码 |
| createdStart | String | 否 | 创建日期起，格式 `yyyy-MM-dd` |
| createdEnd | String | 否 | 创建日期至，格式 `yyyy-MM-dd` |
| expectedDestroyDateStart | String | 否 | 预计销毁日期起，格式 `yyyy-MM-dd` |
| expectedDestroyDateEnd | String | 否 | 预计销毁日期至，格式 `yyyy-MM-dd` |
| pendingType | String | 否 | 待办事项类型 |
| exceptionObject | String | 否 | 异常对象 |
| exceptionNode | String | 否 | 异常环节 |
| exceptionPlace | String | 否 | 异常发生地 |

### 请求示例

```json
{
  "action": "oms.unusualEventOrder.queryEventList",
  "app_key": "your_app_key",
  "client_id": "your_client_id",
  "timestamp": "1718000000000",
  "sign": "xxxxxxxx",
  "data": {
    "pageParams": {
      "pageNo": 1,
      "pageSize": 20
    },
    "stateClassification": "TFB",
    "createdStart": "2026-06-01",
    "createdEnd": "2026-06-16"
  }
}
```

---

## 响应参数

### 公共响应结构

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | String | 响应码，`0` 表示成功 |
| msg | String | 响应描述 |
| data | Object | 业务数据 |

### data 结构

| 参数名 | 类型 | 说明 |
|--------|------|------|
| list | Array | 异常单列表，见下节 |
| pageParams | Object | 分页信息，见下节 |

### list 列表项字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| eventNo | String | 异常单号 |
| orderNo | String | WINIT 订单号 |
| createDate | String | 异常创建时间，格式 `yyyy-MM-dd` |
| eventCode | String | 异常编码 |
| eventName | String | 异常名称 |
| eventDefinition | String | 事件定义 |
| status | String | 异常单状态 |
| eventDetailId | Long | 详情 ID（查询详情接口时使用） |
| isNeedFeedback | String | 是否需要反馈：`Y`-需要、`N`-不需要 |
| isNeedCustomerInformation | String | 是否需要客户提供信息 |
| eventAttribute | String | 异常属性代码 |
| eventAttributeName | String | 异常属性名称 |
| winitProductCode | String | PSC 编码 |
| winitProductName | String | PSC 名称 |
| sgCode | String | SG 编码 |
| warehouseCode | String | 登记仓库编码 |
| warehouseName | String | 登记仓库名称 |
| exceptionNode | String | 异常环节代码 |
| exceptionNodeName | String | 异常环节名称 |
| exceptionPlace | String | 异常发生地代码 |
| exceptionPlaceName | String | 异常发生地名称 |
| exceptionObject | String | 异常对象代码 |
| exceptionObjectName | String | 异常对象名称 |
| vascCode | String | 增值服务编码 |
| expectedDestroyDate | String | 预计销毁日期 |

### pageParams 分页信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| pageNo | Integer | 当前页码 |
| pageSize | Integer | 每页条数 |
| totalCount | Long | 总记录数 |
| fieldName | String | 排序字段，默认 `CREATED` |
| direction | String | 排序方向：`ASC` / `DESC`，默认 `DESC` |

### 响应示例

```json
{
  "code": "0",
  "msg": "操作成功",
  "data": {
    "list": [
      {
        "eventNo": "EVT202606160001",
        "orderNo": "WO0009230625",
        "createDate": "2026-06-16",
        "eventCode": "EX001",
        "eventName": "包裹破损",
        "eventDefinition": "包裹在运输过程中发生破损",
        "status": "TFB",
        "eventDetailId": 10001,
        "isNeedFeedback": "Y",
        "isNeedCustomerInformation": "N",
        "warehouseCode": "USLA01",
        "warehouseName": "洛杉矶仓",
        "exceptionNodeName": "入库",
        "exceptionObjectName": "包裹"
      }
    ],
    "pageParams": {
      "pageNo": 1,
      "pageSize": 20,
      "totalCount": 1,
      "direction": "DESC"
    }
  }
}
```

---

## stateClassification 枚举说明

| 值 | 含义 |
|----|------|
| `TFB` | 待反馈（To FeedBack） |
| `PI` | 处理中（Processing） |
| `PD` | 已处理（Processed） |

---

## 关联接口

| 接口标识 | 说明 |
|----------|------|
| `oms.unusualEventOrder.queryEventOrderDetail` | 查询异常单详情（使用 `eventDetailId`） |
| `oms.unusualEventOrder.queryEventPackage` | 查询异常单关联包裹列表 |
| `oms.unusualEventOrder.queryEventItem` | 查询异常单关联单品列表 |
| `oms.unusualEventOrder.queryEventMerchandise` | 查询异常单关联商品列表 |
| `oms.unusualEventOrder.queryEventSubPackage` | 查询异常单关联子包裹列表 |
| `oms.unusualEventOrder.queryEventCharge` | 查询异常单费用明细 |

---

## 注意事项

1. 所有查询条件均为可选，建议至少传入一个筛选条件避免全量返回。
2. 日期范围字段（`createdStart/End`、`expectedDestroyDateStart/End`）格式必须为 `yyyy-MM-dd`。
3. `eventDetailId` 是查询详情接口的关键入参，列表查询后请保存该字段。
4. 平台标识为 `BK` 或 `gfs` 时跳过权限校验；其他平台会校验客户与异常单的归属关系。
