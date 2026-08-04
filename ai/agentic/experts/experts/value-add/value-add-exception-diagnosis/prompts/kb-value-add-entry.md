# 增值入口层

本文件定义哪些异常具备进入 value-add 推荐链的入口证据。它不决定具体 VASC；具体候选只能由 `value-add-product-recommendation` 基于映射和客户意图继续判断。

---

## 总体入口规则

| 判断维度 | 可进入推荐链的条件 | 不可直接进入的条件 |
|---|---|---|
| 异常类别 | 异常属于操作增值类，或当前异常实体存在映射关系线索 | 仅为知悉类、仓库可直接处理类，且无客户处理动作 |
| 异常对象 | 对象层级可归一为 `order` / `package` / `product` / `item` / `pallet` | 对象未知且客户描述不足 |
| 客户意图 | 客户表达继续上架、拍照/视频、销毁、自提、调拨、非标、调查等处理诉求 | 客户只问责任、赔付、费用减免 |
| 上游事实 | 已有异常编码、异常名称、异常单号或 `valueAddHandoff` | 只有“少货/多货/系统异常”口述，未核实差异事实 |

---

## 类别级入口判断

| exceptionCategory | 入口判断 | 诊断说明 |
|---|---|---|
| `barcode_package` | `candidate` | 包裹条码异常通常阻断到仓识别或上架，可进入推荐链判断后续处理方向 |
| `barcode_product` | `candidate` | 商品/单品条码异常影响验收、识别或上架，可进入推荐链 |
| `packaging_quality` | `candidate` | 包装、裸装、质量、DG 包装异常可能触发拍照、销毁、包装或上架处理 |
| `order_status` | `candidate` | 入库单终止、已上架需拦截等状态问题可进入处理意图判断，但需保留状态限制 |
| `batch_attribute` | `candidate` | 批次、SN、属性缺失或异常存在映射线索；下游必须结合客户意图和限制过滤 |
| `wrong_item_mispack` | `candidate` | 错装、订单外商品、计划外实物可进入推荐链，但需先确认实物归属 |
| `wrong_warehouse` | `candidate` | 串仓可进入调拨、自提、新单或非标方向判断；置信度需结合实际仓/目标仓 |
| `quantity_discrepancy` | `needs_upstream_check` 或 `candidate` | 缺差异核实时先回到入库异常核实；有异常编码且为操作增值类时可条件进入 |
| `outbound_related` | `candidate`，但跨阶段 | 自提/出库关联异常可有增值关系线索；入库专家需提示跨阶段边界 |
| `unknown` | `unknown_exception` | 需要补异常编码、异常单号、异常名称或对象描述 |

---

## 客户处理意图线索

| 客户意图线索 | 本专家处理方式 |
|---|---|
| 原单上架 / 新单上架 / 直接上架 | 只写入 `handoffFacts.customerActionHint`，不判断具体 VASC |
| 拍照 / 视频 / 调查 | 标为中间确认动作；不默认等于异常关闭 |
| 销毁 / 自提 | 标记需要对象匹配；不判断商品销毁还是包裹销毁 |
| 调拨 / 转仓 / 非标 | 标记为非标或人工确认方向；不承诺系统可下单 |
| 责任、赔付、减免 | 输出 `needs_upstream_check` 或人工转向，本专家不判责 |

---

## 缺失项分级

| 缺失维度 | 类型 | 说明 |
|---|---|---|
| `exceptionCode` | blocking | 无编码且名称/描述不足时无法稳定命中异常实体 |
| `exceptionName` | blocking | 无编码时必须有标准异常名称或异常截图描述 |
| `exceptionCategory` | blocking | 无法判断异常类别时不能进入推荐链 |
| `objectLevel` | informational | 有助于下游推荐；本专家可先输出条件性 handoff |
| `customerActionHint` | informational | 下游推荐首选方向会更准，但不阻断异常诊断 |
| `discrepancyFacts` | blocking | 数量差异类缺核实结果时必须先回上游核实 |

---

## 降级输出

- `unknown_exception`：异常编码/名称/描述都不足，生成追问，不进入推荐。
- `needs_upstream_check`：数量差异、责任判定、赔付或缺少上游异常核实。
- `not_value_add`：用户询问已提交增值单状态、未下单前报价、费用明细或与入库异常无关的问题。
