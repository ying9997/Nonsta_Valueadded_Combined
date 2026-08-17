# API 主路径层

本文件定义 `value-add-order-status` 的 OpenAPI 查询边界。它只解释接口用途和字段映射，不替代接口返回事实。

---

## P0 主路径

| Action | 用途 | 必要性 |
|---|---|---|
| `wh.va.order.basicInfo` | 查询增值单基本信息、主状态、业务单、VASC、时间、控制信息和原子概览 | P0 必查 |
| `wh.va.order.getVasList` | 查询原子执行状态、完成数量、退回/部分完成原因、已提交属性/附件事实 | P0 默认查询，`includeAtoms=false` 可跳过 |

### businessNo 定位分支

`basicInfo` 的业务参数只稳定支持 `orderNo`；`getVasList` 的业务参数可带 `orderNo`、`businessNo`、`orderEntry`。因此只有 `businessNo` 时不能直接调用 `basicInfo` 得出主状态，应先走定位分支：

1. 使用 `businessNo` 调用原子列表查询，作为候选增值单定位。
2. 若返回 0 张候选，输出 `clarify_vas_order_no` 或 `api_failed`，要求补充增值单号。
3. 若返回 1 张候选，从候选原子的 `orderNo` 解析 `resolvedVasOrderNo`，再调用 `basicInfo` 查询主状态。
4. 若返回多张候选，输出 `needsClarification=true` 和 `clarificationFields=["vasOrderNo"]`，不合并多张增值单状态。

---

## P0 可用事实字段

| 来源 | 字段 | 解释边界 |
|---|---|---|
| basicInfo | `orderNo` | 增值单号；对外 `vasOrderNo` 映射到 API `data.orderNo` |
| basicInfo | `status` / `statusDesc` | 主状态编码和描述；未知 `status` 不自行翻译 |
| basicInfo | `orderDate` / `estimateCompleteTime` / `estimateCompleteTimeStr` / `actualCompleteTime` | 下单、系统预计、页面当地预计、实际完成时间；`estimateCompleteTimeStr` 映射为 `estimateCompleteTimeLocal` 并优先对客展示，预计时间不是 SLA 承诺 |
| basicInfo | `cancelReason` / `failReason` | 取消或失败原因；按接口事实原样解释 |
| basicInfo | `businessOrder.businessNo` | 关联业务单号；可用于展示关联单，不代表 `businessNo` 查询唯一 |
| basicInfo | `businessOrder.eventCode` / `unusualName` / `unusualObjectName` | 关联异常信息；只解释这张已提交增值单关联事实 |
| basicInfo | `vasc.productCode` / `productName` / `isAudit` / `isNeedConfirm` | VASC 产品、审核和确认信息；不能反推推荐链 |
| basicInfo | `vaAtoms[]` | 原子概览；详细进度以 getVasList 为准 |
| basicInfo | `control.vasObjectType` | 增值对象类型；不能反推服务项配置全量 |
| basicInfo | `vaOrderGoods[]` | 已提交增值单货物事实；只作订单事实展示 |
| getVasList | `list[].serviceCode` / `serviceName` | 原子服务编码和名称 |
| getVasList | `list[].status` / `statusDesc` | 原子执行状态；未知 `status` 不自行翻译 |
| getVasList | `list[].partCompleteReason` / `returnReason` | 部分完成或退回原因 |
| getVasList | `list[].completeTime` | 原子完成时间 |
| getVasList | `list[].orderCount` / `handleCount` | 下单数量与实际完成数量 |
| getVasList | `list[].vaAtomAttrs` / `vaAtomFiles` / `vaAtomResults` | 已提交增值单上的属性、附件、执行结果事实；不能作为事前配置全量来源 |

---

## 字段映射

| 对外字段 | API 字段 | 规则 |
|---|---|---|
| `inputs.vasOrderNo` | `data.orderNo` | build 节点必须映射为 `orderNo` |
| `inputs.businessNo` | `getVasList.data.businessNo` | 仅辅助定位候选增值单；不唯一时追问 `vasOrderNo` |
| `inputs.orderEntry` | `getVasList.data.orderEntry` | 定位分支需要时透传；缺失不应阻断 `vasOrderNo` 主路径 |
| `inputs.parentGoodsId` | `getSubGoods.data.parentId` | 仅 P2 子货物增强使用 |

---

## businessNo 分支

- 若 `businessNo` 能唯一定位增值单，可继续主路径。
- 若定位到多张增值单，输出 `needsClarification=true` 和 `clarificationFields=["vasOrderNo"]`。
- 不把多张增值单状态合并成一个结论。
- 若无法通过 API 稳定支持 `businessNo` 定位，v1 降级为要求客户补充增值单号。
- `businessNo` 只作为辅助定位和关联展示字段；查询主键仍以 `vasOrderNo` / API `orderNo` 为准。
- 当只有 `businessNo` 且没有唯一候选时，`analysis` 只能说明“需要补充增值单号”，不能猜测最近一张或状态最严重的一张。
- 通过 `businessNo` 定位到的原子列表本身不等于主单状态；只有拿到唯一 `orderNo` 并成功查询 `basicInfo` 后，才能输出 `status_found`。

---

## 调用边界

- 专家调用 JSON 顶层不接收 `data`。
- 专家调用 JSON 顶层不接收 `action`。
- OpenAPI 插件入参 `data` 来自 build 节点的 `winitRequestData`。
- `action` 来自 `coze.config.yml` 字面量或 build 节点输出的 `winitOpenapiAction`。
