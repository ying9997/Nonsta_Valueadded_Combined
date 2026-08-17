# 归一化契约 Opus 验收清单

> 验收对象：`候选清单归一化契约.md`、`candidate-normalization-sample.json`  
> 验收范围：仅验证 Agent 运行时候选输入归一化契约；不验收页面原型、接口联调、评测用例、中间层拼接实现。

| 序号 | 验收点 | 验证方式 | 通过标准 | 阻塞风险 |
|------|--------|----------|----------|----------|
| 1 | 三份交付物拆分存在 | 检查目录文件 | 目录内存在 `候选清单归一化契约.md`、`candidate-normalization-sample.json`、`归一化契约Opus验收清单.md` 三个独立文件 | 缺文件会导致切片不可验收 |
| 2 | 契约边界明确 | 阅读契约第 1、9 节 | 明确本切片仅定义中间层输出给 Agent 的候选输入结构，不做页面原型、接口联调、评测用例、中间层拼接代码 | 边界混入实现承诺会扩大交付范围 |
| 3 | 字段全量定义 | 检查契约第 4 节字段表 | 必填字段包含 `vascType`、`serviceKind`、`sourceApi`、`normalizationStatus`、`vascCode`、`vascName`、`serviceName` | 缺关键字段会导致 Agent 输入不可控 |
| 4 | `vascType` 枚举完整 | 检查契约第 5.1 节 | 仅允许 `standard`、`nonstandard`、`unknown`，并说明每个值的路由边界 | 枚举不完整会导致标准/非标判断漂移 |
| 5 | `serviceKind` 枚举完整 | 检查契约第 5.2 节 | 仅允许 `standard_service`、`named_nonstandard`、`other_service_request`、`unknown` | 缺少命名非标或其他服务需求会破坏 2a/2b 分流 |
| 6 | `sourceApi` 枚举完整 | 检查契约第 5.4 节 | 覆盖 `pms.vasc.listAllVasc`、`pms.vasc.getVascInfo`、`wh.va.order.getVasList`、`middleware.normalizedCandidateList`、`unknown` | 来源不可追溯会导致字段责任不清 |
| 7 | `normalizationStatus` 枚举完整 | 检查契约第 5.5 节 | 覆盖可路由、缺字段、冲突、不支持来源等状态，并说明 Agent 处理方式 | 缺状态会导致异常数据继续自动路由 |
| 8 | 接口现状准确 | 检查契约第 2 节 | 明确 `listAllVasc/getVascInfo` 原生无 `vascType/serviceKind`，`getVasList` 有 `vasType` 但不是 Step 2 候选权威来源 | 写错接口现状会导致中间层和 Agent 使用错误来源 |
| 9 | 中间层注入责任明确 | 检查契约第 4、6 节 | 明确 `vascType`、`serviceKind` 属于中间层补充注入字段，原始接口无法直接获取时不得由 Agent 推断 | 责任不清会导致模型凭名称猜测 |
| 10 | 禁止模型自主推断 | 检查契约第 6.2、8 节 | 明确禁止 Agent 根据 `vascName`、`serviceName`、中文关键词或相似名称推断标准/非标 | 模型误判会把标准服务导入非标 SOP 或反向误导 |
| 11 | 2d 路由关联准确 | 检查契约第 6.4 节和 JSON 第 1 条 | `vascType = standard` 且 `serviceKind = standard_service` 对应 `2d_standard_redirect` | 标准纠偏无法自动判断或误入非标字段生成 |
| 12 | 2a 路由关联准确 | 检查契约第 6.4 节和 JSON 第 2 条 | `vascType = nonstandard` 且 `serviceKind = named_nonstandard` 对应 `2a_named_nonstandard_direct` | 命名非标被误归为其他服务需求，造成不必要 SOP 长追问 |
| 13 | 2b 路由关联准确 | 检查契约第 6.4 节和 JSON 第 3-5 条 | `vascType = nonstandard`、`serviceKind = other_service_request` 且 `serviceDomain` 有效时对应 `2b_other_service_sop` | 其他服务需求无法进入 SOP 分支 |
| 14 | 2b 三类域覆盖 | 检查 JSON 样例 | 至少存在 `serviceDomain = inbound`、`in_warehouse`、`outbound` 各 1 条 other_service_request 样例 | 少任一域会导致全场景样例不完整 |
| 15 | unknown 兜底覆盖 | 检查 JSON 样例最后一条 | 至少存在 1 条 `vascType = unknown`、`serviceKind = unknown`、`routeBranch = manual_fallback` 的样例 | 缺兜底样例会导致缺字段场景不可验收 |
| 16 | JSON 样例数量达标 | 运行 JSON 解析或人工计数 | `systemScopedVascList` 数组长度大于等于 6 | 未覆盖用户要求的六类候选类型 |
| 17 | JSON 格式合法 | 使用 `ConvertFrom-Json` 或等价 JSON 解析器校验 | 文件可被标准 JSON 解析器成功解析，无注释、无尾逗号 | 格式错误会导致下游无法消费 |
| 18 | 来源字段可追溯 | 检查每条 JSON 的 `sourceApi`、`rawSourceApis`、`originalFields` | 每条样例均包含来源接口和原始字段映射 | 无法定位字段来源，不能对齐 source-references 范式 |
| 19 | 归一状态可追溯 | 检查每条 JSON 的 `normalizationStatus`、`normalizationNotes` | 每条样例均说明归一状态；补充注入类样例说明中间层补齐原因 | 无法判断候选能否参与自动路由 |
| 20 | 不依赖页面原型 | 检查契约全文 | 不出现 DOM、CSS、按钮落点、页面布局、前端实现承诺 | 混入原型切片会违反边界隔离 |
| 21 | 不依赖接口联调实现 | 检查契约全文 | 不出现具体请求编排、缓存策略、重试代码、拼接代码实现 | 混入中间层实现会违反本切片目标 |
| 22 | 不包含评测用例 | 检查契约和 JSON | JSON 仅为结构化候选样例，不包含测试输入、期望输出、评分指标或金标集 | 混入评测切片会违反边界隔离 |
| 23 | 与 README/HANDOFF 分支一致 | 对照既有 README/HANDOFF | 分支命名和含义保持：2d 标准增值纠偏、2a 命名/具体非标服务直选、2b 其他服务需求 + SOP | 分支口径冲突会导致后续原型、评测和中间层契约不一致 |
| 24 | 候选范围不扩推 | 检查契约第 8 节 | 明确禁止推荐 `systemScopedVascList` 候选外服务 | Agent 可能生成不存在或不可选服务 |
| 25 | `getVasList.vasType` 边界清楚 | 检查契约第 2、5.4、6.2 节 | 明确 `getVasList` 有 `vasType`，但不作为 Step 2 候选清单权威类型来源 | 错用已下单数据会污染候选分流 |
| 26 | 字段缺失兜底规则明确 | 检查契约第 6.1、6.2、6.4 节 | 缺 `vascCode`、`vascName`、`serviceCode`、`serviceName`、`vascType`、`serviceKind` 时均有固定兜底或人工兜底规则 | 空字段进入 Agent 会导致不可控生成 |
| 27 | 验收清单条目可勾选 | 检查本表结构 | 每条均包含验收点、验证方式、通过标准、阻塞风险 | 验收不可执行，无法逐条复核 |

