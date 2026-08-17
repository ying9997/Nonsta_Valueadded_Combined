# customer 域 Experts 规划

> `customer` 域负责**跨旅程**的客户通用画像数据，包括客户群体属性、头程方式、补货周期等。这些信息被多个业务域复用（出库、退货、费用等），统一由 `customer` 域维护。
>
> **注意**：入库专属的 CBM/SKU 额度与入库可用 PSC，已归入 `inbound` 域（`inbound/inbound-capacity-availability`、`inbound/inbound-psc-eligibility`），API 写入 `inbound-api-matrix.md`，不属于本域职责。

---

## 一、专家状态追踪

> 最左列：`[ ]` 未完整 · `[x]` 已完整（manifest、workflow、prompt、可被上游调用齐备）。  
> 当前状态：`待规划` / `设计中` / `开发中` / `待配置` / `已完成` / `阻塞`

| [ ] | 优先级 | Expert ID | 目标完成 | 当前状态 | 需要 API | API 就绪度 | 主要依赖 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | P2 | `customer/profile` | 2026-07 | 待规划 | 是 | 0% | CRM/客户标签系统 API；提供跨旅程通用画像（WF 群体、头程方式、补货周期）；**不再**承载入库额度/PSC |
| [ ] | P1 | `customer/human-service-records` | 2026-07 | 待重新发布 | 是 | 90% | 本地已改为按 `客户邮箱 = username` 硬过滤；查询范围内全部会话与消息进入 transcript，不再受摘要条数参数截断；系统事件保留原文并折叠，超过 10,000 字符时由 workflow 在开头预警；需重新导出、发布 Coze workflow 并更新专家登记绑定后才在线上生效 |
| [ ] | P2 | `customer/permission-status` | 待定 | 待规划 | 是 | 0% | 从 `profile` 拆出；触发条件：权限查询逻辑复杂到需要独立专家 |
| [ ] | P2 | `customer/replenishment-advisor` | 待定 | 待规划 | 是 | 0% | 依赖 `profile` + SKU 库存 + 销量数据；触发条件：补货建议高频咨询出现 |

---

## 二、`customer/profile`

### 定位

不直接对客，作为共享专家被多个域调用，提供客户的**跨旅程通用属性**快照，避免各域重复查询相同的客户标签逻辑。

**不负责**入库专属能力——CBM/SKU 额度由 `inbound/inbound-capacity-availability` 负责，入库可用 PSC 由 `inbound/inbound-psc-eligibility` 负责。

### 适用调用场景

- `inbound/inbound-process-guide`：根据客户是否 WF 群体、是否使用 Winit 头程，匹配差异化规则（可选，非阻塞）
- 未来 `outbound`、`return`、`billing` 等域需要识别客户通用属性时

### 不在此处处理的入库场景

| 能力 | 负责专家 | 说明 |
|---|---|---|
| CBM/SKU 额度查询（占用 vs 上限） | `inbound/inbound-capacity-availability` | **MKS** API，写入 inbound-api-matrix |
| 入库可用 PSC / 产品线开通态 | `inbound/inbound-psc-eligibility` | **OMS** API，写入 inbound-api-matrix |
| 权限申请与审批进度 | `inbound/inbound-permission-apply` | 当前流程在**飞书多维表格**，写入 inbound-api-matrix |

### 输入

| 字段 | 类型 | 说明 |
|---|---|---|
| `customerCode` | string | 客户编码 |
| `fields` | string[]（可选） | 指定需要返回的字段子集，减少不必要查询 |

### 输出

```json
{
  "customerCode": "C123456",
  "isWFGroup": true,
  "usesWinitHeadHaul": false,
  "commonReplenishmentSkus": ["SKU001", "SKU002"],
  "replenishmentCycleDays": 30
}
```

> 旧字段 `warehousePermissions`、`productPermissions`、`cbmQuota` 已移除，由 `inbound` 域专家负责。

### 数据来源

- 客户标签系统（WF 群体、头程方式等属性）
- CRM（补货周期、通用账户属性）

---

## 三、后续可能扩展的 Experts

见追踪表 P2 行，触发条件满足后转入规划。

---

## 四、`customer/human-service-records`

### 定位

这是 `customer` 域中的对客查询型例外专家，不属于 `customer/profile` 的共享画像层。它只处理“当前登录用户查询自己的历史人工客服沟通记录”，用于人工客服不可转接时补齐历史记录查询能力。

### 权限边界

- 必须使用框架顶层 `username` 匹配飞书 `客户邮箱` 查询。
- 框架 `customerCode` 不映射飞书 `客户id`；`customerCode` 与 `customerName` 只用于一致性诊断，不作为查询条件，也不能单独兜底查询。
- 对客回答不得提及飞书、多维表、内部表或 Wiki。

### 数据来源

- 飞书 Wiki 挂载的多维表格。
- 运行时通过 `FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN` 解析真实 Bitable app token。
- 查询使用的表字段：`客户邮箱`、`客户`、`messages`、`对话组ID`、`对话开始时间`；飞书 `客户id` 不作为本专家查询条件。
