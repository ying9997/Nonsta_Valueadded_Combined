# RAG vs Context Stuffing 对比实验报告

- 知识目录：`D:\DA\ai-cs-expert-study\agentic\value-add-service-guide`
- Markdown 文件数：215
- 测试问题数：5

## 切片策略统计

| 切片策略       | 说明                                    |   chunk 数 |   平均 token |   最小 token |   最大 token |
|------------|---------------------------------------|-----------|------------|------------|------------|
| by_file    | 每个文件 = 1 个 chunk（保留实体边界，最接近当前方案）      |       215 |     2559.7 |         54 |      69716 |
| by_heading | 按 ## 二级标题拆分（文件内语义分段）                  |      1690 |      325.5 |          2 |      69716 |
| by_token   | 固定 512 token + 64 token 重叠（标准 RAG 做法） |      1302 |      476   |         54 |        514 |

## B01E1315 三种切片示例

目标文件：`inbound-exceptions/product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md`

### by_file

- chunk 数：1
- chunk 0 / 2718 tokens / 完整文件: # 商品条码异常（需客户处理） ## 摘要 `B01E1315` 表示货物已到仓，仓库在入库验货/上架前发现包裹内商品条码存在异常，当前信息流下无法直接完成商品识别和上架。该异常属于入库操作增值类异常，通常会进入异常暂存，需要客户判断实物与入库单关系，并选择原单上架、新单上架、拍照确认、销毁、自提或特殊处理。 本页只解释异常和可关联 VASC 索引；VASC 产品和增值服务项的详细说明放到 `va

### by_heading

- chunk 数：11
- chunk 0 / 11 tokens / 标题与导言: # 商品条码异常（需客户处理）
- chunk 1 / 182 tokens / 摘要: ## 摘要 `B01E1315` 表示货物已到仓，仓库在入库验货/上架前发现包裹内商品条码存在异常，当前信息流下无法直接完成商品识别和上架。该异常属于入库操作增值类异常，通常会进入异常暂存，需要客户判断实物与入库单关系，并选择原单上架、新单上架、拍照确认、销毁、自提或特殊处理。 本页只解释异常和可关联 VASC 索引；VASC 产品和增值服务项的详细说明放到 `vasc-products/` 和 
- chunk 2 / 105 tokens / 异常标识: ## 异常标识 | 字段 | 值 | |---|---| | 异常编码 | `B01E1315` | | 异常名称 | 商品条码异常(需客户处理) | | 异常环节 | 入库 | | 异常节点 | `IN_BOUND` | | 来源 SG | `B01,B04` | | 异常对象 | 商品 | | 是否需要客户处理 | 是 |
- chunk 3 / 433 tokens / 异常发生时的实物流与信息流状态: ## 异常发生时的实物流与信息流状态 | 维度 | 状态 | 说明 | |---|---|---| | 实物流对象 | 商品/单品 | 异常发生在包裹内商品层级，不应直接按包裹异常处理。 | | 实物流状态 | 已到仓并进入验货/上架前识别环节，异常商品通常进入异常暂存 | 来源描述为“以下包裹实物已到仓，但包裹内商品存在问题”；仓库无法通过当前商品条码完成正常上架。 | | 信息流状态 | 商品
- chunk 4 / 269 tokens / 异常含义: ## 异常含义 该异常覆盖商品条码缺失、条码不完整、无法扫描、条码错误、商品条码未录入 Winit 系统等场景。仓库无法仅凭当前条码完成商品与入库单信息的匹配，因此会将异常商品移入异常暂存，并等待客户处理意见或增值服务。 AI 不能只看到“商品条码异常”就直接推荐一个固定增值。必须先判断： - 实物商品与异常单登记入库单中的下单商品是否一致。 - 商品条码是缺失/破损/无法扫描，还是贴错、贴成其他
- chunk 5 / 605 tokens / 客户处理选项: ## 客户处理选项 | 客户处理意图 | 判断条件 | 可能的 VASC 方向 | 服务项线索 | |---|---|---|---| | 原单上架 | 实物与原入库单下单商品一致，原单状态允许继续上架 | 原单上架 | 入库-补贴原商品条码、入库-更换新商品条码；特定场景也可能涉及补贴包裹条码。 | | 新单上架（客户创建入库单） | 实物不应继续使用原单，或商品未在异常单登记入库单中下单 | 
- 其余 5 个 chunk 已省略。

### by_token

- chunk 数：6
- chunk 0 / 512 tokens / token窗口 1: # 商品条码异常（需客户处理） ## 摘要 `B01E1315` 表示货物已到仓，仓库在入库验货/上架前发现包裹内商品条码存在异常，当前信息流下无法直接完成商品识别和上架。该异常属于入库操作增值类异常，通常会进入异常暂存，需要客户判断实物与入库单关系，并选择原单上架、新单上架、拍照确认、销毁、自提或特殊处理。 本页只解释异常和可关联 VASC 索引；VASC 产品和增值服务项的详细说明放到 `va
- chunk 1 / 512 tokens / token窗口 2: 上架。 | | 信息流状态 | 商品条码与入库单商品信息不能稳定匹配，异常单待客户处理 | 当前信息流无法确认应使用原入库单、新入库单、预报单还是退出上架链路。 | | 当前卡点 | 商品条码缺失、破损、无法扫描、贴错或未录入系统等 | 卡点在商品条码与 SKU/入库单关系，不是包裹条码本身。 | | 后续处理方向索引 | 原单上架、新单上架、预报单承接、拍照确认、销毁、自提或非标 | 这里只做方
- chunk 2 / 513 tokens / token窗口 3: 破损/无法扫描，还是贴错、贴成其他商品条码。 - 客户希望使用原入库单、新入库单、Winit 创建入库单，还是无箱单预报单承接上架。 - 客户是否需要先拍照识别实物。 - 客户是否不再上架，而是销毁或自提。 ## 客户处理选项 | 客户处理意图 | 判断条件 | 可能的 VASC 方向 | 服务项线索 | |---|---|---|---| | 原单上架 | 实物与原入库单下单商品一致，原单状态允
- chunk 3 / 512 tokens / token窗口 4: 持 | 新单上架（客户提供预报单） | 入库-提供无箱单预报单上架。 | | 拍照后再判断 | 客户需要先确认实物、条码或商品状态 | 入库商品拍照 | normalized 中该 VASC 为 inactive，回答时不得作为当前可下单结论。 | | 销毁 | 客户不再上架，要求销毁异常商品或包裹 | 上架前销毁 | 需区分上架前商品销毁和上架前包裹销毁。 | | 自提 | 客户要求取回异常货物
- chunk 4 / 512 tokens / token窗口 5: ASC202407031507376` | 入库商品拍照 | inactive | 只能作为历史/映射证据，不直接推荐为当前可下单方案。 | | `VASC202407161056217` | 新单上架（客户创建入库单） | active | 常用于客户创建新入库单承接异常商品。 | | `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁时判断对象后使用
- chunk 5 / 479 tokens / token窗口 6: 荐使用”和入口关闭类备注，AI 不得将其作为标准推荐。 ## 回答用户时的检查清单 1. 先确认异常编码是否确为 `B01E1315`。 2. 确认异常对象是商品，而不是包裹或订单。 3. 确认实物与原入库单商品是否一致。 4. 确认客户要原单上架、新单上架、预报单上架、拍照、销毁、自提还是非标。 5. 查 `relationship-mappings/inbound-exception-to-v

## Context Stuffing 基线

- 固定加载文件：`relationship-mappings/inbound-exception-to-vasc-product-mapping.md`, `inbound-exceptions/product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md`
- 总 token 数：18407
- 结论：当前方案可以保证映射表一定在 LLM 上下文中；RAG 如果用户没提 VASC 或映射关系，可能检索不到映射表。

## RAG 检索明细

## 查询：我的货到仓了但是说商品条码有问题，怎么办？

### by_file
1. 相似度：0.5271（distance=0.8972）
   来源：`source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md`
   元数据：exception_code=, entity_type=, section=完整文件
   内容前 200 字：# 商品有条码但系统无法识别--需要第三方商品条码上架 客户实际贴了第三方商品条码 直发入库，未在到仓前关联好第三方商品条码，导致系统无法识别，登记了入库异常，需要提增值处理 步骤一：需要核查异常第三方商品条码是否有做系统补充关联， 内部核实 TOM查询路径 ![图片展示的是系统中核查异常第三方商品条码是否有做系统补充关联的TOM查询路径界面。左侧菜单选中“商品管理 - 商品维护”，右侧上方有“事
2. 相似度：0.5180（distance=0.9305）
   来源：`inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md`
   元数据：exception_code=B05E1586, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# 单品条码无法扫描（需客户处理） ## 摘要 `B05E1586` 表示单品在出库拣选时出现条码异常，万邑通海外仓无法通过系统识别商品。来源定义覆盖三类情况：单品条码无法扫描但人工可识别、单品存在多个不同的可识别条码、单品条码已被使用。 本异常发生在库内/出库拣选相关节点，不能按入库收货阶段的商品条码异常直接处理。AI 应优先判断是否可通过库内轻加工、拍照确认、库内非标特批或库内销毁处理。 ##
3. 相似度：0.5154（distance=0.9402）
   来源：`source-references/kb-business-source-snapshots/winit-unit-barcode.md`
   元数据：exception_code=, entity_type=, section=完整文件
   内容前 200 字：# 万邑联导入单品条码（第三方条码入库）流程 背景：通过使用单品条码导入功能，绑定自有单品码（第三方条码）与商品注册SKU码，使后续万邑通入库等作业能通过第三方条码获取到对应商品信息； # 1 申请权限 如有需要使用自有单品码（第三方条码）时，可以联系商务经理进行申请开通权限，如CE的转非标群组协助处理，如有销售的可联系销售处理。 权限申请链接：https://winitlink.feishu.c

### by_heading
1. 相似度：0.5739（distance=0.7424）
   来源：`inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md`
   元数据：exception_code=B01E1316, entity_type=inbound_exception, section=标题与导言
   内容前 200 字：# 商品有条码但系统无法识别
2. 相似度：0.5691（distance=0.7573）
   来源：`inbound-exceptions/package-barcode-exceptions/README.md`
   元数据：exception_code=, entity_type=overview, section=标题与导言
   内容前 200 字：# 包裹条码类入库异常 收录包裹条码无法识别、批量异常、包裹标签异常、包裹条码与商品关系异常等问题。
3. 相似度：0.5514（distance=0.8136）
   来源：`inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md`
   元数据：exception_code=B01E1316, entity_type=inbound_exception, section=异常标识
   内容前 200 字：## 异常标识 | 字段 | 值 | |---|---| | 异常编码 | `B01E1316` | | 异常名称 | 商品有条码但系统无法识别 | | 异常环节 | 入库 | | 异常节点 | `IN_BOUND` | | 来源 SG | `B01,B04` | | 异常对象 | 商品 | | 是否需要客户处理 | 是 |

### by_token
1. 相似度：0.5835（distance=0.7138）
   来源：`source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
   元数据：exception_code=, entity_type=, section=token窗口 141
   内容前 200 字：一致，但实物商品条码仓库无法扫描，需要补贴异常单登记的商品条码且使用异常单登记的入库单上架 | 原单上架 | 入库-补贴原商品条码 | | 关闭了非标增值下单入口 | Y | | | | | | | | | | | | | | | | | | | | | | 异常商品实物与下单商品不一致，需要补贴异常单登记的商品条码且使用异常单登记的入库单上架 | | 入库-更换新商品条码 | | 关闭了非标增值
2. 相似度：0.5760（distance=0.7361）
   来源：`source-references/kb-business-source-snapshots/inbound-exception-handling.md`
   元数据：exception_code=, entity_type=, section=token窗口 4
   内容前 200 字：①商品条码异常 🔹 异常场景：以下包裹实物已到仓,但包裹内商品存在以下某种问题: 1.商品无条码或商品条码不完整 2 单品条码状态异常:单品状态为未验货 3.单品条码重复 4.商品条码为未录入Winit系统条码; 💡 处理方式：仓库无法通过重打商品条码去完成上架, 客户处理方案: 1.可通过万邑通提供基础照片判断商品所属SKU, 提供入库前更换标签增值服务, 或将第三方商品编码(如FNSKU)维护
3. 相似度：0.5705（distance=0.7528）
   来源：`source-references/kb-business-source-snapshots/inbound-exception-handling.md`
   元数据：exception_code=, entity_type=, section=token窗口 5
   内容前 200 字：③商品裸装 🔹 异常场景：以下商品实物已到仓，仓库发现商品无物流包装（裸货），商品仓库将安排上架。为了避免货物出库后引起客诉，请更改此商品入库包装属性，勾选裸货标签，仓库在出库时会增加外包装。如未开通出库加包装权限, 请联系万邑通销售开通; 💡 处理方式：海外仓登记异常并安排货物上架后冻结： 1.客户更改此商品入库包装属性，勾选裸货标签，裸装商品卖家可以选择出库加包装服务（包材可选择：Winit标

## 查询：B01E1315异常，我想原单上架

### by_file
1. 相似度：0.5544（distance=0.8037）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md`
   元数据：exception_code=B01E1514, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# 订单状态已上架需拦截 ## 摘要 `B01E1514` 表示包裹分批到仓时，原订单状态已上架，后到且未上架的包裹不能继续上架至原入库单，需要拦截到异常暂存区。来源定义要求客户提交新入库单，并提交增值单更换包裹条码上架。 本异常的关键是“原入库单已经完成/关闭了上架信息流”。AI 应优先考虑新单承接，不应默认原单继续处理。 ## 异常标识 | 字段 | 值 | |---|---| | 异常编码 
2. 相似度：0.5351（distance=0.8689）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md`
   元数据：exception_code=B01E01, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# 入库单状态异常 ## 摘要 `B01E01` 表示订单包裹已到海外仓，但入库单状态或直发验货状态不满足正常上架要求。来源定义明确包含两类状态卡点：入库单为草稿或终止；直发自验订单未验货完成。 本异常不是单纯的条码、质量或数量问题。AI 回答时要先判断系统是否已自动提交订单并允许仓库继续上架；若不满足自动提交条件，包裹会暂存至异常区并产生额外暂存费用，需要客户更新入库单状态并联系客服提交增值服务
3. 相似度：0.5297（distance=0.8880）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e1470-order-terminated-unable-to-putaway.md`
   元数据：exception_code=B01E1470, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# 订单状态被终止无法上架 ## 摘要 `B01E1470` 表示订单包裹已到海外仓，但订单状态已被客户终止，仓库拦截后无法继续按原路径上架。来源定义说明包裹会暂存至异常区并产生额外暂存费用，需要客户及时联系客服处理。 本异常与普通“入库单状态异常”相近，但关键差异是已明确为客户终止状态。AI 不能直接承诺原单上架，应优先判断是否需要新单承接、销毁、自提、直接上架或特批非标。 ## 异常标识 | 

### by_heading
1. 相似度：0.6129（distance=0.6316）
   来源：`vasc-products/putaway-services/vasc-product-original-order-putaway.md`
   元数据：exception_code=, entity_type=vasc_product, section=标题与导言
   内容前 200 字：# 原单上架
2. 相似度：0.5879（distance=0.7010）
   来源：`vasc-products/putaway-services/vasc-product-original-order-direct-putaway.md`
   元数据：exception_code=, entity_type=vasc_product, section=标题与导言
   内容前 200 字：# 原单上架（直接上架）
3. 相似度：0.5830（distance=0.7151）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md`
   元数据：exception_code=B01E1514, entity_type=inbound_exception, section=摘要
   内容前 200 字：## 摘要 `B01E1514` 表示包裹分批到仓时，原订单状态已上架，后到且未上架的包裹不能继续上架至原入库单，需要拦截到异常暂存区。来源定义要求客户提交新入库单，并提交增值单更换包裹条码上架。 本异常的关键是“原入库单已经完成/关闭了上架信息流”。AI 应优先考虑新单承接，不应默认原单继续处理。

### by_token
1. 相似度：0.5686（distance=0.7587）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md`
   元数据：exception_code=B01E1514, entity_type=inbound_exception, section=token窗口 1
   内容前 200 字：# 订单状态已上架需拦截 ## 摘要 `B01E1514` 表示包裹分批到仓时，原订单状态已上架，后到且未上架的包裹不能继续上架至原入库单，需要拦截到异常暂存区。来源定义要求客户提交新入库单，并提交增值单更换包裹条码上架。 本异常的关键是“原入库单已经完成/关闭了上架信息流”。AI 应优先考虑新单承接，不应默认原单继续处理。 ## 异常标识 | 字段 | 值 | |---|---| | 异常编码 
2. 相似度：0.5637（distance=0.7740）
   来源：`inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md`
   元数据：exception_code=B01E01, entity_type=inbound_exception, section=token窗口 1
   内容前 200 字：# 入库单状态异常 ## 摘要 `B01E01` 表示订单包裹已到海外仓，但入库单状态或直发验货状态不满足正常上架要求。来源定义明确包含两类状态卡点：入库单为草稿或终止；直发自验订单未验货完成。 本异常不是单纯的条码、质量或数量问题。AI 回答时要先判断系统是否已自动提交订单并允许仓库继续上架；若不满足自动提交条件，包裹会暂存至异常区并产生额外暂存费用，需要客户更新入库单状态并联系客服提交增值服务
3. 相似度：0.5618（distance=0.7799）
   来源：`relationship-mappings/inbound-exception-to-vasc-product-mapping.md`
   元数据：exception_code=, entity_type=, section=token窗口 16
   内容前 200 字：终止无法上架 | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json | | B01

## 查询：包裹条码扫不了，能不能帮我拍个照看看？

### by_file
1. 相似度：0.5060（distance=0.9763）
   来源：`inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md`
   元数据：exception_code=B06E1613, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# A+包裹条码无法扫描 ## 摘要 `B06E1613` 表示仓库在出库进行 A+ 包裹条码采集时，实物上无包裹条码，无法进行采集。来源责任方为 `WINIT_WAREHOUSE`，但仍标记需要客户确认。 本异常发生在库内/出库采集环节，虽然属于包裹条码问题，但不是入库到仓时的包裹条码异常。AI 应判断是否需要库内轻加工补标、拍照确认、库内非标特批或库内销毁。 ## 异常标识 | 字段 | 值 
2. 相似度：0.4965（distance=1.0143）
   来源：`inbound-exceptions/package-barcode-exceptions/README.md`
   元数据：exception_code=, entity_type=overview, section=完整文件
   内容前 200 字：# 包裹条码类入库异常 收录包裹条码无法识别、批量异常、包裹标签异常、包裹条码与商品关系异常等问题。 ## 当前异常页 - [包裹条码异常（需客户处理）](exception-b0102e21-package-barcode-abnormal-customer-action-required.md) - [A+包商品条码和包裹条码对应关系校验不一致](exception-b01e1579-a-pl
3. 相似度：0.4771（distance=1.0958）
   来源：`inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md`
   元数据：exception_code=B05E1586, entity_type=inbound_exception, section=完整文件
   内容前 200 字：# 单品条码无法扫描（需客户处理） ## 摘要 `B05E1586` 表示单品在出库拣选时出现条码异常，万邑通海外仓无法通过系统识别商品。来源定义覆盖三类情况：单品条码无法扫描但人工可识别、单品存在多个不同的可识别条码、单品条码已被使用。 本异常发生在库内/出库拣选相关节点，不能按入库收货阶段的商品条码异常直接处理。AI 应优先判断是否可通过库内轻加工、拍照确认、库内非标特批或库内销毁处理。 ##

### by_heading
1. 相似度：0.5597（distance=0.7866）
   来源：`inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md`
   元数据：exception_code=B06E1613, entity_type=inbound_exception, section=标题与导言
   内容前 200 字：# A+包裹条码无法扫描
2. 相似度：0.5446（distance=0.8363）
   来源：`inbound-exceptions/package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md`
   元数据：exception_code=B0102E21, entity_type=inbound_exception, section=标题与导言
   内容前 200 字：# 包裹条码异常（需客户处理）
3. 相似度：0.5279（distance=0.8944）
   来源：`inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md`
   元数据：exception_code=B01E1316, entity_type=inbound_exception, section=标题与导言
   内容前 200 字：# 商品有条码但系统无法识别

### by_token
1. 相似度：0.5222（distance=0.9151）
   来源：`source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
   元数据：exception_code=, entity_type=, section=token窗口 43
   内容前 200 字：B箱内商品条码异常 | "1.按照实物补贴商品条码上架：库内-补贴原商品条码 | | | | | | | | | | 商品 | "2B箱内多单品 | 2B箱内少单品" | "1.按照实物补贴商品条码上架：库内-补贴原商品条码 | | | | | | | | | | | 要求将异常货物销毁 | 库内销毁 | 库内-异常商品销毁 | | | | | | | | | | 要求拍照后暂存，等待客户下一步指
2. 相似度：0.5188（distance=0.9277）
   来源：`source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
   元数据：exception_code=, entity_type=, section=token窗口 151
   内容前 200 字：库内-商品外观拍照 | 库内-商品开箱拍照" | 使用WINIT标准包材更换商品包装，使用新单上架 | | | | | N | | | | | | | | | | | | | | | | | 使用客制包材更换商品包装，使用新单上架 | 无 | | | | | | | | | | | | | | | | | 库内 | 海外仓 | 商品 | B05E1586 | 单品条码无法扫描(需客户处理） | "
3. 相似度：0.5157（distance=0.9392）
   来源：`source-references/kb-business-source-snapshots/direct-ship-parcel-sop.md`
   元数据：exception_code=, entity_type=, section=token窗口 20
   内容前 200 字：回后外箱没有包裹条码，但开箱确认有万邑通商品编码， 会补贴包裹条码，并扫描商品编码进行上架，收取包裹条码异常(需客户处理) ，收费标准参考增值服务价卡：异常处理sheet内的B0102E21 收费标准。 如找回后外箱和内部产品均没有任何条码，仓库会拍照与您确认处理意见，并收取无主货找回费用。 按照找回结果去对应收费 ： 未找回：收费 已找回，无winit编码，收费 已找回，有winit编码，不收费

## 查询：异常商品我不要了，可以销毁吗？

### by_file
1. 相似度：0.4985（distance=1.0060）
   来源：`value-added-service-items/destruction-items/README.md`
   元数据：exception_code=, entity_type=overview, section=完整文件
   内容前 200 字：# 销毁类增值服务项 收录包裹销毁、商品销毁、异常商品销毁、DG 商品销毁等增值服务项。 ## 当前已生成服务项页 | 服务项编码 | 服务项 | 文件 | |---|---|---| | `OW01V1703` | 上架前包裹销毁 | [value-added-service-item-pre-putaway-package-destruction.md](value-added-service
2. 相似度：0.4927（distance=1.0297）
   来源：`vasc-products/destruction-services/README.md`
   元数据：exception_code=, entity_type=overview, section=完整文件
   内容前 200 字：# 销毁类 VASC 产品 收录上架前销毁、库内异常商品销毁等 VASC 产品。 ## 当前已生成产品页 - [上架前销毁](vasc-product-pre-putaway-destruction.md) - [库内销毁](vasc-product-in-warehouse-destruction.md) ## 使用边界 - 本目录的产品页只沉淀销毁类 VASC 产品、可处理异常索引和产品下候选
3. 相似度：0.4895（distance=1.0430）
   来源：`source-references/kb-business-source-snapshots/inbound-exception-putaway-destroy.md`
   元数据：exception_code=, entity_type=, section=完整文件
   内容前 200 字：# 入库异常需要处理上架前销毁 海外仓登记了入库异常，客户反馈安排仓库直接销毁处理，需要提交增值上架前销毁 增值提交步骤如下： 步骤一：去海外仓-异常单，点处理异常 ![图片展示的是一个海外仓管理界面。左侧为功能导航栏，其中“海外仓”被红色框突出显示。右侧是“异常管理”下的“异常单”选项，也被红色框圈出。该图片与文档中“入库异常需要处理上架前销毁”上下文相关，是步骤一中“去海外仓 - 异常单，点处

### by_heading
1. 相似度：0.5571（distance=0.7949）
   来源：`value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md`
   元数据：exception_code=, entity_type=value_added_service_item, section=标题与导言
   内容前 200 字：# 库内-异常商品销毁
2. 相似度：0.5235（distance=0.9102）
   来源：`inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md`
   元数据：exception_code=, entity_type=inbound_process, section=销毁与自提实物流
   内容前 200 字：## 销毁与自提实物流 | 处理方式 | 物理结果 | 关键限制 | |---|---|---| | 上架前商品销毁 | 商品从异常暂存中退出上架链路 | 异常对象为商品时选择商品销毁，不能误选包裹销毁。 | | 上架前包裹销毁 | 包裹从异常暂存中退出上架链路 | 异常对象为包裹时选择包裹销毁。 | | 上架前自提（无需打托） | 仓库备货，客户或承运商提走 | 适用于包裹或无需打托场景。 | 
3. 相似度：0.5228（distance=0.9127）
   来源：`vasc-products/destruction-services/README.md`
   元数据：exception_code=, entity_type=overview, section=标题与导言
   内容前 200 字：# 销毁类 VASC 产品 收录上架前销毁、库内异常商品销毁等 VASC 产品。

### by_token
1. 相似度：0.5200（distance=0.9232）
   来源：`value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md`
   元数据：exception_code=, entity_type=value_added_service_item, section=token窗口 1
   内容前 200 字：# 库内-异常商品销毁 ## 摘要 `库内-异常商品销毁` 是库内销毁 VASC 下的商品销毁原子，用于针对库内异常商品，将货物销毁。normalized 主数据特别注明：此销毁服务无法提供销毁证明。 本原子与上架前商品销毁不同：上架前商品销毁面向入库异常、已卸货未上架或异常暂存阶段；本页面向库内异常商品销毁。若客户要求 DG 商品销毁或销毁证明，应查 `DG商品销毁` 或业务确认，不能用本原子承
2. 相似度：0.5144（distance=0.9440）
   来源：`source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
   元数据：exception_code=, entity_type=, section=token窗口 45
   内容前 200 字：毁 | 库内-异常商品销毁 | | | | | | | | 商品 | 库存批次号错误 | | | | | | | | | | | 商品 | 计划外批次 | | | | | | | | | | | 订单 | 打包完成后作废出库单-有商品增值 | 重新上架 | 库内非标增值（特批） | 库内其他服务需求「非标」 | | | | | | | | | | | | | | | | | | | | | | |
3. 相似度：0.5133（distance=0.9481）
   来源：`value-added-service-items/destruction-items/value-added-service-item-pre-putaway-product-destruction.md`
   元数据：exception_code=, entity_type=value_added_service_item, section=token窗口 2
   内容前 200 字：以销毁处理结束。若对象选择错误，仓库不应按错误对象执行，增值单可能被退回。 ## 所属 VASC 产品 | VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 | |---|---|---:|---|---|---| | [上架前销毁](../../vasc-products/destruction-services/vasc-product-pre-putaway-dest

## 查询：什么是VASC202407031503503？

### by_file
1. 相似度：0.4672（distance=1.1403）
   来源：`vasc-products/labeling-and-packaging-services/README.md`
   元数据：exception_code=, entity_type=overview, section=完整文件
   内容前 200 字：# 贴标包装类 VASC 产品 ## 当前已生成产品页 - [库内轻加工](vasc-product-in-warehouse-light-processing.md) 收录以补贴条码、更换标签、更换商品包装、商品轻加工为核心处理能力的 VASC 产品。
2. 相似度：0.4585（distance=1.1811）
   来源：`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
   元数据：exception_code=, entity_type=relationship_mapping, section=完整文件
   内容前 200 字：# VASC 产品到增值服务项编排映射 本文件由 normalized 数据中的 `atoms` 抽取，用于记录 VASC 产品下的增值服务项编排、顺序、必选状态和互斥组。 ## 口径 - 一行表示一个 VASC 产品中的一个增值服务项编排行。 - `sequence`、`required_in_vasc`、`mutex_group_cn` 来自 normalized 数据。 - `attr_sp
3. 相似度：0.4540（distance=1.2028）
   来源：`vasc-products/nonstandard-and-other-services/README.md`
   元数据：exception_code=, entity_type=overview, section=完整文件
   内容前 200 字：# 非标及其他类 VASC 产品 ## 当前已生成产品页 - [入库非标增值（特批）](vasc-product-inbound-nonstandard-special-approval.md) - [库内非标增值（免审核）](vasc-product-in-warehouse-nonstandard-no-review.md) - [库内非标增值（需审核）](vasc-product-in-wa

### by_heading
1. 相似度：0.5708（distance=0.7519）
   来源：`SCHEMA.md`
   元数据：exception_code=, entity_type=, section=所属 VASC 产品
   内容前 200 字：## 所属 VASC 产品
2. 相似度：0.5623（distance=0.7785）
   来源：`value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md`
   元数据：exception_code=, entity_type=, section=所属 VASC 产品
   内容前 200 字：## 所属 VASC 产品 | VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 | |---|---|---:|---|---|---| | 入库非标拍照或提供视频 | `VASC202411271721537` | 4 | N | 提供海外仓监控视频-少单品调查 | 订单级少单品监控视频调查。 |
3. 相似度：0.5617（distance=0.7803）
   来源：`value-added-service-items/other-service-demand-items/value-added-service-item-inbound-other-service-demand.md`
   元数据：exception_code=, entity_type=, section=所属 VASC 产品
   内容前 200 字：## 所属 VASC 产品 | VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 | |---|---|---:|---|---|---| | 入库非标增值（特批） | `VASC202411192246131` | 2 | N | 入库其他服务需求 | 需要审核、报价和客户确认后执行。 |

### by_token
1. 相似度：0.5189（distance=0.9273）
   来源：`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
   元数据：exception_code=, entity_type=relationship_mapping, section=token窗口 5
   内容前 200 字：normalized/exception-vasc-orchestration-2026-06-22.json | | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 3 | OW01V1558 | 入库-补贴原商品条码 | N | 贴商品标 | covered_by_vas_event_attrs_slim | source-referenc
2. 相似度：0.5137（distance=0.9468）
   来源：`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
   元数据：exception_code=, entity_type=relationship_mapping, section=token窗口 12
   内容前 200 字：1660 | 审计盘点 | N | 审计盘点 | covered_by_vas_event_attrs_slim | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json | | VASC202411192250069 | 库内非标增值（特批
3. 相似度：0.5114（distance=0.9553）
   来源：`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
   元数据：exception_code=, entity_type=relationship_mapping, section=token窗口 14
   内容前 200 字：_slim | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json | | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 4 | OW01V1600 | 提供海外仓监控视


## 并排对比表

| 查询问题                    | 切片策略                    | 检索到的文件                                                                                                                                                                                                                                                                                                                                                 | 是否命中目标？   |   消耗 token 数 | 漏检风险                          |
|-------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|--------------|-------------------------------|
| 我的货到仓了但是说商品条码有问题，怎么办？   | by_file                 | source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md<br>inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md<br>source-references/kb-business-source-snapshots/winit-unit-barcode.md                                                          | 否         |         4708 | 可能漏掉 B01E1315 异常实体页           |
| 我的货到仓了但是说商品条码有问题，怎么办？   | by_heading              | inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md<br>inbound-exceptions/package-barcode-exceptions/README.md<br>inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md                                                  | 否         |          168 | 可能漏掉 B01E1315 异常实体页           |
| 我的货到仓了但是说商品条码有问题，怎么办？   | by_token                | source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md<br>source-references/kb-business-source-snapshots/inbound-exception-handling.md<br>source-references/kb-business-source-snapshots/inbound-exception-handling.md                                                                                                       | 否         |         1534 | 可能漏掉 B01E1315 异常实体页           |
| B01E1315异常，我想原单上架       | by_file                 | inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md<br>inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md<br>inbound-exceptions/order-status-exceptions/exception-b01e1470-order-terminated-unable-to-putaway.md                            | 否         |         3695 | 可能漏掉异常到 VASC 映射表              |
| B01E1315异常，我想原单上架       | by_heading              | vasc-products/putaway-services/vasc-product-original-order-putaway.md<br>vasc-products/putaway-services/vasc-product-original-order-direct-putaway.md<br>inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md                                                                          | 否         |          171 | 可能漏掉异常到 VASC 映射表              |
| B01E1315异常，我想原单上架       | by_token                | inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md<br>inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md<br>relationship-mappings/inbound-exception-to-vasc-product-mapping.md                                                             | 是         |         1537 | 低                             |
| 包裹条码扫不了，能不能帮我拍个照看看？     | by_file                 | inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md<br>inbound-exceptions/package-barcode-exceptions/README.md<br>inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md                                                      | 是         |         2281 | 低                             |
| 包裹条码扫不了，能不能帮我拍个照看看？     | by_heading              | inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md<br>inbound-exceptions/package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md<br>inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md | 是         |           40 | 低                             |
| 包裹条码扫不了，能不能帮我拍个照看看？     | by_token                | source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md<br>source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md<br>source-references/kb-business-source-snapshots/direct-ship-parcel-sop.md                                                                                                       | 否         |         1534 | 低                             |
| 异常商品我不要了，可以销毁吗？         | by_file                 | value-added-service-items/destruction-items/README.md<br>vasc-products/destruction-services/README.md<br>source-references/kb-business-source-snapshots/inbound-exception-putaway-destroy.md                                                                                                                                                           | 否         |         2695 | 可能漏掉异常到 VASC 映射表              |
| 异常商品我不要了，可以销毁吗？         | by_heading              | value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md<br>inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md<br>vasc-products/destruction-services/README.md                                                                                             | 否         |          322 | 可能漏掉异常到 VASC 映射表              |
| 异常商品我不要了，可以销毁吗？         | by_token                | value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md<br>source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md<br>value-added-service-items/destruction-items/value-added-service-item-pre-putaway-product-destruction.md                                      | 否         |         1535 | 可能漏掉异常到 VASC 映射表              |
| 什么是VASC202407031503503？ | by_file                 | vasc-products/labeling-and-packaging-services/README.md<br>relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md<br>vasc-products/nonstandard-and-other-services/README.md                                                                                                                                                       | 否         |         7206 | 可能漏掉 VASC 产品详情页               |
| 什么是VASC202407031503503？ | by_heading              | SCHEMA.md<br>value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md<br>value-added-service-items/other-service-demand-items/value-added-service-item-inbound-other-service-demand.md                                                                           | 否         |          233 | 可能漏掉 VASC 产品详情页               |
| 什么是VASC202407031503503？ | by_token                | relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md<br>relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md<br>relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md                                                                                                              | 否         |         1536 | 可能漏掉 VASC 产品详情页               |
| Context Stuffing 基线     | mapping + B01E1315 完整文件 | 固定加载映射表和目标异常文件                                                                                                                                                                                                                                                                                                                                         | 是         |        18407 | 低：关键映射被强制放入上下文，但 token 成本固定偏高 |

## 最终总结

1. 对这个知识库来说，优先推荐 `by_heading` 作为默认 RAG 切片策略。原因是这些 Markdown 文件本身已经按“摘要、异常标识、客户处理选项、VASC 索引、检查清单”等二级标题组织，按标题切能保留业务语义，同时比整文件切更省 token。
2. `by_file` 最接近当前 Context Stuffing，实体边界完整，平均 chunk 约 2559.7 tokens；但检索后单次塞入成本较高，且长文件会稀释 embedding 表征。
3. `by_token` 平均 chunk 约 476.0 tokens，长度稳定，适合非结构化长文；但它可能把表格、限制条件和解释文字切断，对本知识库的结构化 Markdown 不如按标题切自然。
4. `by_heading` 平均 chunk 约 325.5 tokens，在命中精度、上下文完整度和 token 成本之间更均衡。
5. RAG 可能漏掉 Context Stuffing 能保证不漏的内容：异常到 VASC 产品映射表、VASC 到服务项编排映射、流程页和检查清单。尤其当用户只说“商品条码有问题”而没有提 VASC 时，检索可能只命中异常解释页，不一定命中映射表。
6. RAG 更优的地方是 token 效率和可扩展性：它只取 top-k 相关 chunk，知识文件从几百个扩展到几千个时，不需要把候选知识全部塞进 prompt。
7. 当前 Context Stuffing 基线仅固定加载映射表 + B01E1315 目标文件就需要约 18407 tokens。经验上，当固定注入上下文持续超过模型上下文窗口的 20%-30%，或知识规模超过数百个实体页且问题路由无法稳定裁剪时，就应该切到 RAG 或“规则召回 + RAG + 必选上下文”的混合方案。
8. 更适合生产的方案不是纯 RAG 替代 Context Stuffing，而是混合：用规则强制注入权威映射表/流程约束，用 RAG 检索实体详情页、VASC 产品页和服务项页。