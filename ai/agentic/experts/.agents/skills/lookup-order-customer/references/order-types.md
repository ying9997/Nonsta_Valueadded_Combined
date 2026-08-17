# Order type coverage

Last verified: 2026-07-28.

This registry covers every order or business identifier exposed by current expert workflow inputs, plus TOM order families directly relevant to those workflows. `supported` means the current TOM list/result model exposes enough customer identity to resolve the triple. `partial` means a link or uniqueness check is still required. `gap` means no verified reverse lookup exists.

| Type | Identifiers | Status | Primary path | Identity evidence |
| --- | --- | --- | --- | --- |
| Inbound | WI, customer reference, package/item/product barcode, third-party case, logistics no. | supported | `InboundOrderSearch` | `customerCode`, `customerName` |
| Outbound / last mile | WO, tracking no., seller/customer order no., package/source/cross-dock id | supported | `OverseasOBOrder` | `customerInfo.customerCode`, `customerInfo.customerName` |
| Value-add | V order no., VASC-like order no., linked business no., event/package/item barcode | supported | `VasOrder` | `customer.customerCode`, `customer.customerName` |
| Booking | booking no./code, WI, logistics no., send-warehouse no., overseas-transfer no. | supported | `BookingManagement` | `customerCode`, `customerName` |
| Tracking inquiry | TA inquiry serial no. | partial | `TailTrace.getList` | resolve exact row to linked order/tracking, then use outbound lookup |
| ISP | ISP order, tracking no., seller order no. | supported | `IspOrder` | `bpartnerValue`, `bpartnerName` |
| Return / RMA | Winit return order, RMA no., return tracking no. | supported | `ReturnInventoryManagement` | `customterCode`, `customterName` (upstream spelling) |
| Transport | TO / customer order no. | partial | `tms.transportorder.queryPage` | response contract contains customer code/name, but seller API injects current customer context |
| Global transfer / international warehouse | Winit order, logistics/FBA/tracking no. | partial | `InternationalWarehouse` | source row exposes `userName`; reverse through customer account list |
| Allocation / warehouse transfer | transfer order no. | partial | `TransferManagement` | list exposes customer name; inspect raw `customerInfo` or require unique exact match |
| Unusual event | event no., main event no., linked order/doc/sub-package | partial | `UnusualEvent` | list exposes customer name only |
| Claim | claim/compensation application no. | gap | `afs.customer.compensate.pageList` | current repository path requires customer context first |
| POD | POD record id | partial | resolve linked WO/tracking first | POD id alone has no verified owner lookup |

## Ambiguity rules

- A `VASC...` token may be a value-add product code or a value-add order number. Accept it only when the value-add order query returns an exact row.
- Tokens without a stable prefix may be tracking, seller, customer, package, booking, event, or logistics identifiers. Use the user's wording as a hint, then try supported routes. Do not accept the first fuzzy match.
- Customer names are not stable unique keys. A name-only result is usable only when the customer list returns exactly one exact match.
- HTTP success, a menu route, or a non-empty table does not prove ownership. Match the original identifier and verify the final customer row.

## Current gaps to update

1. Verify cross-customer TO lookup in TOM and capture the exact raw-row customer fields.
2. Verify whether transfer raw `customerInfo` always contains `customerCode`.
3. Verify an exception detail field or interface that exposes `customerCode` directly.
4. Find a cross-customer claim-id reverse lookup; the current expert API is tenant-scoped.
5. Find a POD-id-to-WO/tracking reverse lookup when no linked business identifier is supplied.
6. Verify whether `TailTrace.getList` can expose customer identity directly instead of resolving TA to WO/tracking first.
7. Add stable prefix/format rules for booking, ISP, RMA, global-transfer, allocation, and exception identifiers when authoritative examples become available.

Keep these as gaps until a real read-only lookup proves a unique identity triple.
