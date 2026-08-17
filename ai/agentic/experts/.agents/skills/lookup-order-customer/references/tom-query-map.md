# TOM query map

Use a dedicated authenticated `agent-browser` session. Search exact identifiers and inspect raw DataTable rows. All routes are read-only list/detail paths under the corresponding TOM module.

| Family | Route / interface | Search labels or keys | Customer fields |
| --- | --- | --- | --- |
| Inbound | `/InboundOrderSearch/index` | 订单号, 单品条码, 商品条码, 包裹条码, 第三方箱号, 子包裹条码, 物流单号 | `customerCode`, `customerName` |
| Outbound | `/OverseasOBOrder/index` | 订单编号, 客户订单号, 万邑通跟踪单号, 快递单号, 源单号, 越库入库单号 | `customerInfo.customerCode`, `customerInfo.customerName` |
| Value-add | `/VasOrder/index` | 增值单号, 业务单据号, 异常单号, 包裹条码, 第三方包裹条码, 商品条码, 单品条码 | `customer.customerCode`, `customer.customerName` |
| Booking | `/BookingManagement/bookingList` | 预约码, 订单号, 物流单号, 预约单号, 柜号, 送仓单, 海外中转单 | `customerCode`, `customerName` |
| Tracking inquiry | `TailTrace.getList` | `serialNumber` (TA), `orderNo`, `trackingNo`, `shippingNo` | resolve linked WO/tracking first; direct customer fields are not verified |
| ISP | `/IspOrder/index` | single/batch ISP order query; also tracking and seller order | `bpartnerValue`, `bpartnerName` |
| Return / RMA | `/ReturnInventoryManagement/index` | Winit订单号, 退货跟踪号, RMA号, 客户退货跟踪号, 单品条码, 退货序列号 | `customterCode`, `customterName` |
| Global transfer | `/InternationalWarehouse/index` | Winit订单号, FBA包裹号, 物流单号, Tracking No. | `userName` |
| Allocation | `/TransferManagement/index` | 调拨单编号 | `customerInfo.customerName`; inspect raw object for code |
| Unusual event | `/UnusualEvent/index` | Winit订单号, 异常单号, 主异常单号, 单号, 子包裹号 | `customerName` |
| Transport | `tms.transportorder.queryPage` / TMS order query | `orderNo`, `customerOrderNo` | response contract: `customerCode`, `customerName`; cross-customer behavior pending |
| Customer account | `/Customers/customer` | select 客户编号 (`code`) or account name (`email`) | `code`, `name`, `email` |

## Verified internal list APIs

- Inbound: `oms.WHInboundOrderService_queryInboundOrderListByCondition`
- Outbound: `oms.OB_getOrderListByTom`
- Value-add: `oms.VaOrderService_pageQuery`
- Booking: `oms.BookingProduceOrderFacadeService_queryBookingProduceOrderPage`
- Tracking inquiry: `TailTrace.getList`
- ISP: `oms.ISPOrderService_queryIspOrderPanel` and batch variants
- Return: `oms.RMAOrderService_getReturnOrderListByTom`
- Global transfer: `oms.GlobalTransferService_queryGTPOrderByConditions`
- Unusual event: `oms.UnusualEventOrderService_findUnusualEventOrderPage`
- Customer account: `ums.CustomerService_pageCustomers`

These names are evidence for read-only routing, not permission to call similarly named write actions.

## Result rules

1. Match the submitted identifier against the returned row, including the correct identifier field.
2. If zero rows match, record `not_found` for that family and continue only to another plausible family.
3. If multiple rows match different customers, record `ambiguous`; do not select the newest or first row.
4. Resolve the customer row by exact code whenever possible.
5. Return `username` from the customer list `email` field. Never return the IAM login name.
6. If any field is absent, ask for the three-field fallback rather than filling it from repository defaults.
