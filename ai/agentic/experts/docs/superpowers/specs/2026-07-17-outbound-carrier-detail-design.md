# Outbound Carrier Detail Design

## 目标

让 `outbound-order-status` 在客户询问物流标识、跟踪号或出库单对应的实际承运商时，能够先用 id/54 定位出库单，再用 id/55 补充订单详情，并确定性输出实际承运商字段。

## 当前问题

- 当前线上工作流仅调用 `queryOutboundOrderList`（id/54）。
- id/54 能定位 `WO`、包裹号和状态，但本次样本没有返回实际承运商。
- `queryOutboundOrder`（id/55）对同一订单返回了：
  - `carrier: US YANWEN`
  - `carrierServiceCode: US YANWEN Ground`
  - `carrierServiceName: US YANWEN Ground`
- 产品字段 `deliverywayName` / `winitProductName` 不是实际承运商，不能替代 `carrier`。

## 方案比较

### 方案 A：所有 id/54 命中订单都补查 id/55

优点是结果最完整、逻辑简单。缺点是所有状态查询都会增加接口调用、耗时和失败面。

### 方案 B：仅在承运商诉求或 id/54 缺少承运商时补查 id/55（采用）

保留 id/54 的多标识定位能力；当用户明确询问渠道商、派送商、快递公司或承运商，或者 id/54 命中结果缺少承运商字段时，对命中的 `WO` 调用 id/55。该方案兼顾正确性、调用成本和现有行为兼容性。

### 方案 C：把 id/55 加到 `delivery-status`

可以让轨迹专家自行补订单详情，但会扩大其职责并重复出库查询能力，因此不采用。

## 数据流

1. `resolve-outbound-lookup` 规范化用户提供的 WO、跟踪号或卖家订单号。
2. 现有 id/54 批处理定位订单。
3. 新增节点从 id/54 结果提取命中的 `outboundOrderNum`，并判断是否需要补查承运商。
4. 新增 id/55 `queryOutboundOrder` 批处理调用。
5. 新增确定性合并节点提取并写回：
   - `carrier`
   - `carrierServiceCode`
   - `carrierServiceName`
   - `carrierHasChange`
   - `trackingNum`
   - `outboundOrderNum`
6. 剪枝、LLM 解读和格式化继续使用合并后的订单 JSON。

## 输出契约

`structured` 增加 `carriers`：

```json
{
  "carriers": [
    {
      "trackingNo": "YWPHX010044034795",
      "outboundOrderNum": "WO12106863128",
      "carrier": "US YANWEN",
      "carrierServiceCode": "US YANWEN Ground",
      "carrierServiceName": "US YANWEN Ground",
      "carrierHasChange": "O",
      "source": "queryOutboundOrder"
    }
  ]
}
```

不存在实际承运商字段时，不根据 `deliverywayName`、`winitProductName`、轨迹描述或承运商知识库推断。

## 异常与兼容

- id/55 失败或无数据时，保留 id/54 结果，不让整个专家失败。
- id/55 详情仅覆盖同一 `outboundOrderNum` 的字段。
- 多包裹时保留订单级承运商；若未来 id/55 返回包裹级承运商，再按 `packageNum` 分组扩展，本次不提前实现。
- 不修改 `delivery-status`、`pod-request`、`supplier-tracking` 或 `carrier-contact`。

## 验收

- 跟踪号 `YWPHX010044034795` 能经 id/54 定位 `WO12106863128`。
- id/55 详情能生成 `carrier=US YANWEN` 和 `carrierServiceName=US YANWEN Ground`。
- 对客回答不得把 `Winit Fulfillment-7日达...` 当作实际承运商。
- id/55 空结果或失败时，专家仍返回 id/54 状态，并明确承运商未知。
- 通过 `typecheck`、manifest 校验、Coze 节点严格校验、输出契约校验及专家导出。

## 交付物

- 更新后的 `outbound-order-status` 源文件、工作流配置和 Prompt。
- 新增承运商补查回归测试。
- 新生成的 `outbound-order-status` Coze 导出包；只生成本地文件，不发布线上。
