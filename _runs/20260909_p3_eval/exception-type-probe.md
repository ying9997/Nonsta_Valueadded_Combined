# 异常名称/异常对象字段探测结果

## 找到的候选字段

| 数据源 | 字段名 | 样本值（前10个去重） | 覆盖率（非空/说明） |
|--------|--------|-------------------|---------------------|
| `_oms_cache/orders.csv` | （无） | — | 表头无「异常名称/异常对象/eventName/eventObj」 |
| `_oms_cache/attrs_submit.csv` | `AON` / 异常单号 | EB 号文本，非异常名称 | 仅异常单号，不是名称/对象 |
| `_oms_cache/atoms.csv` / `traces.csv` | （无） | — | 无目标字段 |
| `details.json` → `events[]`（OMS `getEventOrders`） | **`eventName`**（异常名称） | ['包裹条码异常(需客户处理)', '包裹条码批量异常（需客户处理）', '商品有条码但系统无法识别', '包裹内出现订单外商品', '商品条码异常(需客户处理)', 'ABC类包裹/子包裹内商品错装暂存（需客户处理）', 'A+包裹质量异常', '商品质量异常(影响销售)'] | 见下：本探测合并池有事件的增值单 **246** 单 |
| `details.json` → `events[]` | **`eventObj`**（异常对象） | ['包裹', '商品'] | 值域见下 |
| `case_level_dataset_入库.json` | submittedFields 中无独立「异常名称/异常对象」字段 | hits=无 | cases 有 `ebNos`，无结构化 eventName/eventObj |

### `_oms_cache` 表头一览（确认无目标列）

- `orders.csv`: `order_no, order_date, product_code, product_name, va_source, warehouse_code, warehouse_name, customer_code, customer_name, status, is_audit_through, actual_audit_time`
- `attrs_submit.csv`: `attr_id, order_no, va_atom_id, service_code, service_sequence, attribute_name, attribute_key, attribute_value, input_node`
- `atoms.csv`: `atom_id, order_no, service_code, service_name, service_sequence, scene_overview_code, scene_overview_name, sop, vas_des, atom_status`
- `traces.csv`: `order_no, event_code, event_content, supplement_desc, old_status, new_status, trace_time`

### attrs 中含「异常/EVENT」的近似字段（非目标）

| attribute_key | attribute_name | 出现次数 | 样本 |
|---------------|----------------|--------:|------|
| `EVENT02` | 附件 | 232 | [] |
| `EVENT04` | 指定出库日期 | 80 | ['2026-04-21 17:00:00', '2026-04-22 17:00:00', '2026-04-23 17:00:00'] |
| `EVENT03` | 上传SOP | 47 | [] |
| `AON` | 异常单号 | 45 | ['EB090126041828899024', 'RM5100000003176533', '这些退货单都是未及时关联sku导致被自动销毁，因货值很高，现需要找回，如找到需重新上架到退货单号'] |
| `EVENT01` | 拍照要求/辨识方法 | 17 | ['K3683称重0.714kg， 最近WI49321835多上架一个，这边已确认没多发，需要把这一个识别出来，然后销毁', '识别入库单号及统计对应入库单号数量', '确认标签'] |
| `EVENT03` | 上傳SOP | 12 | [] |

### 已有 details 中 events 覆盖

| 文件 | 订单数 | 含 events 数组 | 含 `eventName`/`eventObj` |
|------|-------:|------------:|--------------------------:|
| `_runs/20260909_t14_eval/details.json` | 47 | 47 | **0**（仅 `eventNo` 占位，无名称/对象） |
| `_runs/20260904_demo_cases/demo_all.details.json` | 7 | 6 | 6 |
| `_runs/20260901_oms_facts/details.json` | 183 | 123 | 123 |
| `_runs/20260902_oms_facts_a/details.json` | 73 | 55 | 55 |
| `_runs/20260902_oms_facts_b/details.json` | 98 | 68 | 68 |
| `_runs/20260908_3scene_build_v3/details.json` | 34 | 34 | 34 |
| `_runs/20260908_3scene_build_v2/details.json` | 34 | 34 | 34 |
| `_runs/20260908_3scene_build/details.json` | 64 | 34 | 34 |

**说明：** Step 2 交叉统计只计入带 `eventName`/`eventObj` 的事件；T14 详情未参与映射验证。

### 异常对象值域（合并池，按事件去重行计数）

| eventObj | 计数 |
|----------|-----:|
| 包裹 | 515 |
| 商品 | 309 |

## 结论

- **异常名称字段是：`events[].eventName`**（OMS 异常单展示名「异常名称」；示例：`包裹条码异常(需客户处理)`）。
- **异常对象字段是：`events[].eventObj`**（示例值目前仅见 **`包裹` / `商品`** 两种）。
- **不在** `_oms_cache/*.csv` 里：当前 probe 导出未包含 getEventOrders / UnusualEvent 详情。
- **推荐取数方式：** 对增值单调用既有 OMS 脚本路径 `get_event_orders(session, vasc, serviceCode, serviceSequence)`（见 `scripts/oms/expand_f001_by_eb.py` / `query_vas_order.get_event_orders`）；或 UnusualEvent 详情页/列表（`AI_EXPERT/TOM/PlanEvent查询/query_unusual_event.py`，字段 `eventName`）。
- **本轮 Step 2** 使用已落盘的 `details.json`（含 events）做交叉统计，**未新查 OMS**。

