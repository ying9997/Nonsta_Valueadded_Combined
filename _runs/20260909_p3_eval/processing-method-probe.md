# OMS 处理方式字段探测

- 日期：2026-09-10
- 范围：只探测、不改 Copilot 代码
- 种子单：`VASC000000315774`（入库非标增值特批，当前处理方式已选「客户提供入库单上架」）
- 对照：SOP 知识库「入库非标特批处理方式选择项说明」（`workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` 第 112–122 行）

## 结论

审核详情页「处理方式」对应的表单字段是 **`select[name=shelveWayCode]`**，不是「暂时」。

「暂时」是 Copilot 卡片脚注占位，**不是 OMS 可选值**。回写 OMS 时应对 `shelveWayCode`，不要把「暂时」当枚举。

页上接口中文与侧边栏原型卡文案不完全一致：接口 option 文案是「客户提供入库单上架」，侧边栏原型写的是「客户创建新单上架」。专家节点 `format-output.ts` 已注明：点卡用页上文案，不要用接口中文或产品名。

## 详情页 HTML（live，2026-09-10）

- URL：`https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/VASC000000315774/isView/N`
- Cookie 来源：`AI_EXPERT/TOM/共享认证/playwright_cookies.json`（未失效）
- 元素：`<select class="form-control input-sm" name="shelveWayCode">`

| value | 页上 option 文案 | 本单是否已选 |
|------|------------------|--------------|
| *(空)* | 请选择 | |
| `STORAGE` | 暂存 | |
| `USE_ORIGIN_INBOUND_ORDER` | 用原入库单上架 | |
| `DESTRUCTION` | 销毁 | |
| `SELF_PICKUP` | 自提 | |
| `INBOUND_ORDER_OF_CUSTOMER` | 客户提供入库单上架 | 是 |

历史捕获 `AI_EXPERT/TOM/接口获取/任务管理/capture_20260618_114533` 已把 `shelveWayCode` 映射为中文「处理方式 :」，但当时 `isView/Y` 只渲染了已选项，没有全集。本次 `isView/N` 拉到完整 5 项。

## `_oms_cache` / 详情 JSON 里出现过的码

`_runs/20260909_inbound_scene_probe/_oms_cache/orders.csv` 没有处理方式列（只有 order_no / product / warehouse / status）。

在历史 `pageQuery` / `details.json` 里扫到的 `shelveWayCode`：

| 码 | 出现场景（观察） |
|----|------------------|
| `STORAGE` | 入库非标常见；对应页上「暂存」 |
| `USE_ORIGIN_INBOUND_ORDER` | 入库非标；「用原入库单上架」 |
| `INBOUND_ORDER_OF_CUSTOMER` | 入库非标；「客户提供入库单上架」 |
| `DESTRUCTION` | 销毁 |
| `SELF_PICKUP` | 自提 |
| `USE_NEW_INBOUND_ORDER` | 历史 JSON 有，**当前入库非标详情下拉没有** |
| `STOCK_SHELVES` / `UP_SHELVES` | 更像库内上架，不是本页入库非标下拉 |
| `OUTBOUND` / `NO_WAREHOUSE_PROCESSING` | 出库/其它产品，不是本页入库非标下拉 |

产品文档 `vasc-product-inbound-nonstandard-special-approval.md` 的「来源列表线索」与 live 下拉 5 码一致。

## 与 SOP / 原型对照

SOP 112–122 行要点：

1. **异常单来源**下非标、要上架：只能选「客户提供入库单上架」（即 `INBOUND_ORDER_OF_CUSTOMER`）。
2. **入库单来源**下非标：所有处理方式都支持，按客户场景选。
3. 拍照暂存后续：处理方式可选「暂存」（`STORAGE`），异常单状态会同步为拍照暂存待客户处理。
4. 有异常单要做新单上架：提交时必须关联异常单。

侧边栏原型 `B_侧边栏真实体验版.html` 的 6 张卡：

| 原型卡文案 | 是否出现在当前 OMS 下拉 |
|-----------|-------------------------|
| 原单上架 | 是（页上「用原入库单上架」） |
| 客户创建新单上架 | 是（页上「客户提供入库单上架」，文案不同） |
| 销毁 | 是 |
| 自提 | 是 |
| 暂存 | 是 |
| Winit创建新单上架（有箱单） | **否**（历史码 `USE_NEW_INBOUND_ORDER` 可能对应，当前下拉未出现） |

## 对 Copilot 的含义（仅记录，本轮不改）

- 卡片脚注继续写「处理方式：暂时」可以，但那是占位，不是 OMS 值。
- 以后若回写审核页，字段键是 `shelveWayCode`，候选以本页 live 下拉为准。
- 点 UI 时优先用页上 option 文案；若走侧边栏卡，注意「客户创建新单上架」≠ 接口中文「客户提供入库单上架」。

## 原始探测脚本

`_runs/20260909_p3_eval/_probe_shelve_way.mjs`（只读 OMS 详情 HTML，不改单）。
