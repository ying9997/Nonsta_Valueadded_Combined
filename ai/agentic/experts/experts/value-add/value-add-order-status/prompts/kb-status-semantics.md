# 状态语义层

本文件为增值单主状态、原子进度、退回/部分完成原因和下一步动作提供解释规则。

---

## riskFlags

| 标记 | 触发依据 | 说明 |
|---|---|---|
| `returned` | 主单或原子存在退回原因，如 `returnReason` 非空 | 需提示按退回原因补充或转人工 |
| `partially_completed` | 存在部分完成原因，或完成数量小于请求数量且状态为部分完成 | 说明只完成了部分服务 |
| `needs_customer_confirmation` | 接口事实显示待确认、缺材料、退回需补充或原子控制信息要求客户动作 | 可提示客户补材料 |
| `pending_over_48h` | 有创建时间且距当前超过 48 小时，状态仍非完成/取消 | 只作保守提醒，不承诺 SLA |
| `atom_progress_unavailable` | 主状态成功但 `getVasList` 失败 | 原子进度不可用，不影响主状态 |
| `api_optional_failed` | P2 增强接口失败但 P0 成功 | 增强信息不可用，不影响主状态 |

---

## 主状态解释原则

接口事实只稳定提供 `status` / `statusDesc` 字段；当前知识切片没有完整、可冻结的增值单主状态枚举。因此：

- 优先使用 API 返回的 `statusDesc` 作为对客状态描述。
- 若 `statusDesc` 为空，只输出原始 `status`，并说明当前没有可确认的状态中文含义。
- 不自行把未知 `status` 翻译成“处理中/已完成/已取消”等。
- 若接口同时返回取消或失败原因，应把 `cancelReason` / `failReason` 作为事实说明，不用状态码猜原因。
- 若 P2 费用、预估费用或货物增强接口失败，写入 `optionalFetchFailures`；不得改变 P0 主状态语义。

### 保守语义桶

以下只作为归类提示，必须在 API `statusDesc` 或其它接口事实与语义一致时才可使用；不得用它翻译未知编码。

| semanticBucket | 可使用条件 | 对客说明 |
|---|---|---|
| `in_progress` | `statusDesc` 明确表示处理中、待处理、作业中或等价含义 | 当前增值单仍在处理流程中 |
| `completed` | `statusDesc` 明确表示已完成或全部完成 | 当前增值单已完成 |
| `partially_completed` | `statusDesc` 或原子事实明确表示部分完成，或存在 `partCompleteReason` | 当前只完成了部分服务，需说明部分完成原因 |
| `returned` | 存在 `returnReason`，或 `statusDesc` 明确表示退回 | 当前存在退回原因，需按原因补充或转人工 |
| `cancelled` | `statusDesc` 明确表示取消，或 `cancelReason` 非空 | 当前增值单已取消或取消原因已返回 |
| `failed` | `statusDesc` 明确表示失败，或 `failReason` 非空 | 当前增值单失败，需按失败原因说明 |
| `unknown` | 缺少 `statusDesc` 且状态码未在已知事实中解释 | 只展示原始状态码，不做翻译 |

---

## 原子状态解释原则

- 原子状态同样优先使用 `statusDesc`。
- `partCompleteReason` 非空时写入 `riskFlags=["partially_completed"]`，并在 `atomProgress` 中保留原文原因。
- `returnReason` 非空时写入 `riskFlags=["returned"]`，并在 `nextAction` 中优先考虑 `provide_materials` 或 `contact_support`。
- `orderCount` 与 `handleCount` 同时存在且 `handleCount < orderCount` 时，只能说明完成数量少于下单数量；是否部分完成仍以状态描述或原因字段为准。
- `completeTime` 只能说明已完成节点时间；不能承诺其它原子预计完成时间。

## 时间解释原则

- `estimateCompleteTimeLocal` 是页面展示的当地预计完成时间，优先用于对客说明，但不是 SLA 承诺。
- `estimateCompleteTime` 仅在当地展示时间缺失时作为回退，不自行转换时区。
- `actualCompleteTime` 是主单实际完成时间。它为空时，不得用预计时间或原子 `completeTime` 代替。
- 主单已完成但只有原子 `completeTime` 时，明确称为“原子服务处理时间”。

---

## nextAction

| 枚举 | 含义 | 对客口径 |
|---|---|---|
| `wait` | 继续等待处理 | 当前未见客户动作要求 |
| `provide_materials` | 需补材料或按退回原因处理 | 按接口返回退回/补充原因说明 |
| `contact_support` | 需要人工核实 | 接口失败、状态冲突或费用争议 |
| `clarify_vas_order_no` | 需补增值单号 | businessNo 不唯一或无法定位 |
| `not_supported_pre_order_quote` | 未下单前报价不支持 | 明确本专家只查已提交增值单 |

---

## 解释限制

- 不承诺完成时间。
- 不把接口失败解释为业务状态。
- 不从状态反推 VASC 推荐或服务配置。
- 退回/部分完成原因只按接口事实解释，不扩展内部原因。
- 未知 `status` 不自行翻译；状态描述缺失时保留原始编码并标注证据不足。
- 已提交订单里的 `vaAtomAttrs` 字段形态可作为订单事实解释；不能当作服务配置专家的完整字段证据。
