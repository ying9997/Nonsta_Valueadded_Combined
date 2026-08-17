# 入库单轨迹查询接口对接文档

> 关联：[Inbound API 矩阵](inbound-api-matrix.md) · [Winit OpenAPI 接入](../winit-openapi-integration.md)  
> **Action 命名**：经 Coze 代理注册名为 **`wh.tracking.*`**（无 `winit.` 前缀），与 `winit.wh.inbound.getOrderDetail` 不同。  
> **`orderNo`**：须带 **WI 前缀**（如 `WI49616707`）；纯数字会报「订单不存在」。

---

## 接口总览

| 接口 Action | 说明 | 适用场景 |
|---|---|---|
| `wh.tracking.queryOrderTracking` | 查询入库单轨迹 | 已知 WI 单号，查下单→上架全流程节点 |
| `wh.tracking.queryUnloadRecords` | 按快递单号精确查卸货轨迹 | 批量完整快递单号，确认是否已卸货 |
| `wh.tracking.queryUnloadRecordsFuzzy` | 按快递单号模糊查卸货轨迹 | 单号不完整或需模糊搜索 |

### 接口选择指南

| 场景 | 推荐接口 |
|------|---------|
| 已知入库单号，查询完整物流轨迹 | `queryOrderTracking` |
| 已知完整快递单号，批量查询是否已卸货 | `queryUnloadRecords` |
| 快递单号不完整，需要模糊搜索 | `queryUnloadRecordsFuzzy` |

### 注意事项

1. `queryOrderTracking` 返回**入库单维度**全流程轨迹（下单→发货→到仓→收货→上架等）；`queryUnloadRecords*` 仅返回**快递维度**卸货记录。
2. `queryUnloadRecords` 的 `expressNos` 为数组，支持批量精确查询；`queryUnloadRecordsFuzzy` 的 `expressNo` 为单个字符串，支持模糊匹配。
3. 卸货轨迹接口必须传入分页参数 `pageParams`。
4. 时间字段格式统一为 `yyyy-MM-dd HH:mm:ss`。
5. **`getOrderDetail` 不含轨迹**；各专家若需轨迹/里程碑，须并行或串行调用本文件接口，不可依赖 `getOrderDetail.trajectoryList`（该字段不存在或已废弃）。

### 专家消费映射

| Expert | queryOrderTracking | queryUnloadRecords | queryUnloadRecordsFuzzy |
|--------|:------------------:|:------------------:|:---------------------:|
| `inbound-order-status` | 是（默认，有单号时） | 否 | 否 |
| `inbound-arrival-status` | 是（默认） | 是（客户提供快递单号时） | 是（单号不完整时） |
| `inbound-putaway-status` | 是（提取 SHELVED 等上架节点） | 否 | 否 |
| `inbound-transit-tracking` | 是（TS 阶段节点） | 否 | 否 |
| `inbound-putaway-expedite` | 可选（SLA 辅助） | 否 | 否 |
| `inbound-customs-clearance` / `inbound-overseas-inspection` | 可选（里程碑辅助） | 否 | 否 |

---

## 1. wh.tracking.queryOrderTracking

### 功能说明

根据入库单号查询该订单的完整轨迹列表，返回从下单到上架各环节的轨迹节点信息。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 是 | 入库单号（WI 前缀） |

### 请求示例

```json
{
  "action": "wh.tracking.queryOrderTracking",
  "data": {
    "orderNo": "WI49616707"
  }
}
```

### 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| trackingList | Array | 轨迹列表 |
| trackingList[].date | DateTime | 轨迹时间 (UTC) |
| trackingList[].localTrackingDate | String | 当地轨迹时间 |
| trackingList[].trackingCode | String | 轨迹编码 |
| trackingList[].trackingDesc | String | 轨迹描述 |
| trackingList[].location | String | 轨迹地址 |
| trackingList[].operator | String | 操作人 |
| trackingList[].remark | String | 备注 |

### 响应示例

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "trackingList": [
      {
        "date": "2026-03-10 08:30:00",
        "localTrackingDate": "2026-03-10 16:30:00",
        "trackingCode": "RECEIVED",
        "trackingDesc": "包裹已到达仓库",
        "location": "深圳仓",
        "operator": "warehouse_sys",
        "remark": ""
      },
      {
        "date": "2026-03-10 10:00:00",
        "localTrackingDate": "2026-03-10 18:00:00",
        "trackingCode": "SHELVED",
        "trackingDesc": "包裹已上架",
        "location": "深圳仓-A区",
        "operator": "warehouse_sys",
        "remark": ""
      }
    ]
  }
}
```

---

## 2. wh.tracking.queryUnloadRecords

### 功能说明

根据快递单号列表精确匹配查询卸货轨迹，支持批量查询，分页返回。适用于快递入仓场景，追踪包裹的卸货节点。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expressNos | Array\<String\> | 否 | 快递单号列表（精确匹配） |
| warehouseCode | String | 否 | 仓库编码 |
| unloadDateStart | String | 否 | 卸货时间开始 (`yyyy-MM-dd HH:mm:ss`) |
| unloadDateEnd | String | 否 | 卸货时间结束 |
| pageParams | Object | 是 | 分页参数 |
| pageParams.pageNo | Integer | 是 | 页码，从 1 开始 |
| pageParams.pageSize | Integer | 是 | 每页条数 |

### 请求示例

```json
{
  "action": "wh.tracking.queryUnloadRecords",
  "data": {
    "expressNos": ["SF1234567890", "SF0987654321"],
    "warehouseCode": "SZWH01",
    "unloadDateStart": "2026-03-01 00:00:00",
    "unloadDateEnd": "2026-03-15 23:59:59",
    "pageParams": {
      "pageNo": 1,
      "pageSize": 20
    }
  }
}
```

### 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| list | Array | 卸货轨迹列表 |
| list[].expressNo | String | 快递单号 |
| list[].warehouseCode | String | 仓库编码 |
| list[].warehouseName | String | 仓库名称 |
| list[].unloadDate | DateTime | 卸货时间 |
| pageParams | Object | 分页信息 |
| pageParams.pageNo | Integer | 当前页码 |
| pageParams.pageSize | Integer | 每页条数 |
| pageParams.totalCount | Long | 总记录数 |

---

## 3. wh.tracking.queryUnloadRecordsFuzzy

### 功能说明

根据单个快递单号模糊匹配查询卸货轨迹，分页返回。适用于快递单号不完整或需要模糊搜索的场景。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expressNo | String | 否 | 快递单号（模糊匹配） |
| warehouseCode | String | 否 | 仓库编码 |
| unloadDateStart | String | 否 | 卸货时间开始 |
| unloadDateEnd | String | 否 | 卸货时间结束 |
| pageParams | Object | 是 | 分页参数 |
| pageParams.pageNo | Integer | 是 | 页码，从 1 开始 |
| pageParams.pageSize | Integer | 是 | 每页条数 |

### 请求示例

```json
{
  "action": "wh.tracking.queryUnloadRecordsFuzzy",
  "data": {
    "expressNo": "SF12345",
    "warehouseCode": "SZWH01",
    "unloadDateStart": "2026-03-01 00:00:00",
    "unloadDateEnd": "2026-03-15 23:59:59",
    "pageParams": {
      "pageNo": 1,
      "pageSize": 20
    }
  }
}
```

### 响应参数

与 `queryUnloadRecords` 响应结构一致。
