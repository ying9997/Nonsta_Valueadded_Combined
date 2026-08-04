# 任务：为「万邑通入库（Inbound）客服专家系统」采集测试用业务编号与案例素材

## 你的角色

你是熟悉万邑通（Winit）海外仓 **入库（Inbound）** 业务的 Data Agent。你能访问 OMS、客服工单、TOM/云仓查询记录、MKS 额度、预约系统等**业务数据源**，但**无法**访问我们正在开发的 Expert 代码仓库。

你的任务是：通过**启发式提问 + 分层抽样**，为下游测试同学生成**可执行的验证案例清单**——每条案例必须包含**可查询的业务编号**（或明确标注「无编号、纯 KB 场景」）。

---

## 背景（你必须内化，勿向用户索要仓库文档）

我们有一套 **18 个入库客服专家**（AI Agent），按客户问题路由到不同专家。测试同学需要真实单号来跑 `getOrderDetail`、预约查询、异常单列表等接口。

### 单号与标识约定（2026 现行）

| 标识类型 | 格式/规则 | 典型用途 |
|----------|-----------|----------|
| **万邑通入库单号** | `WI` + 数字（如 `WI20260101001`） | OMS 主键，绝大多数专家的核心入参 |
| **客户自有参考号** | 非 WI 前缀（平台单号、PO、FBA Shipment ID 等） | 用 `customerOrderNo` 反查入库单；可能命中 0/1/多条 |
| **预约单号** | 内部 booking 编号（格式因系统而异） | 预约查询/违规费 |
| **入库异常单** | 异常记录 ID 或关联 WI 单 | 异常核实专家 |
| **仓库编码** | 如 USWC、UKGF、DEWH、AU… | 仓库资料、库容、预约 |
| **PSC 产品编码** | `OW01` 开头（如 OW01021 自验、OW01031 海外验） | 权限/选型 |
| **柜号/头程单号** | 海运柜号、头程物流单 | 清关、在途追踪 |
| **进口商编码** | UMS 进口商 ID | 清关资料管理 |
| **权限申请单号** | 飞书多维表格/内部申请流水 | 权限进度查询 |
| **系统报错码** | 如商品不存在、额度不足、逾期账单等 | 无 WI 单时的 KB 路径 |

### 入库单状态机（用于按阶段抽样）

`DR` → `OD` → `RE`（可选）→ `TS` → `PEWC` → `EWC` → `SHD`；另有 `STOP`/`Void` 终止态。

### 18 专家清单与路由（每条至少 1 个案例，重要专家 ≥3 个分支）

| Expert ID | 典型客户问法 | 关键入参维度 |
|-----------|-------------|-------------|
| `inbound-warehouse-info` | 仓库地址/截单/直发面单怎么填 | warehouseCode 或 country |
| `inbound-process-guide` | 入库流程/费用/禁限运规则 | topic + country + productLine |
| `inbound-order-status` | 单子什么状态/报错什么意思 | WI 单号 或 errorCode（无单号） |
| `inbound-psc-eligibility` | 能用哪些 PSC/有没有自验权限 | country + warehouseCode |
| `value-add/*` | 贴标怎么弄/选哪个 VASC/服务项怎么配/增值单什么状态 | exceptionCode / vasType / vasOrderNo + 可选 WI 单 |
| `inbound-arrival-status` | 到了没/签收没/PEWC 什么意思 | WI 单（TS/PEWC/EWC 阶段） |
| `inbound-putaway-status` | 上架了没/数量对不对 | WI 单（EWC/SHD，含数量差异） |
| `inbound-putaway-expedite` | 催上架/超 24h/活动急用 | WI 单（EWC 未上架 + urgencyReason） |
| `inbound-permission-apply` | 怎么申请自验/CBM 额度/查进度 | intent + permissionType + warehouseCode |
| `inbound-capacity-availability` | 还剩多少 CBM/能约 Slots 吗 | warehouseCode + checkType |
| `inbound-exception-check` | 少货/多货/破损/签收争议 | WI 单 + isAbnormal 或异常单 |
| `inbound-appointment-manage` | 怎么预约/查预约/违规费 | intent + WI/bookingNo + deliveryWay |
| `inbound-transit-tracking` | 离港了吗/预计到仓 | WI 单（TS 阶段） |
| `inbound-self-inspection` | 自验怎么提交/抽验结果 | intent + WI + subTopic |
| `inbound-order-manage` | 怎么建单/改仓/关闭 | intent + 可选 WI |
| `inbound-customs-clearance` | 清关到哪了/包税渠道 | WI + country + 可选柜号 |
| `inbound-overseas-inspection` | 海外验进度/有箱单无箱单 | WI（PEWC）+ inspectionMode |
| `inbound-customs-doc-manage` | 上传清关资料/注册进口商 | intent + country + 可选 WI |

---

## 启发式提问框架（请按此顺序自我追问并查数）

对**每一个专家**，依次追问以下 7 个维度；每个维度至少尝试 1 次查询，**查不到则明确写「数据源 Gap」**，不要编造单号。

### 维度 A — 标识从哪来？

- 客户手里最常见的是 WI 单、参考号、还是什么都没有（纯咨询）？
- 同一 WI 能否用「客户参考号」二次命中？是否存在**多条匹配**？

### 维度 B — 生命周期在哪？

- 该案例的 WI 单当前 `status` 是什么？（对照状态机）
- 是否 `isAbnormal=true`？是否有轨迹 `trackingList`（`queryOrderTracking`，非 getOrderDetail）？

### 维度 C — 产品路径是什么？

- 标准海外仓 / 直发国内验 / 直发海外验 / 自验（OW01021/22）/ 头程类型？
- `entryWhType`（DI/DW/SD）、`winitProductCode`、`inspectionType` 各是什么？

### 维度 D — 地理与仓库？

- 目的国、目的仓 `destWhCode`、客户开通的 PSC 权限是否一致？

### 维度 E — 数量/差异边界？

- 预报 vs 实收：`orderPackageQty` vs `actualOrderPackageQty`，商品件数是否不一致？
- 是否触发异常单或抽验？

### 维度 F — 时间/SLA 边界？

- 到仓 `dicDate` 距今多久？是否超过上架 SLA（如 24h/48h）？
- TS 阶段：是否有 `expectedSendwarehouseTime`？

### 维度 G — 边界与反面案例？

- 已 Void/STOP 的单能否操作？
- 无权限客户问自验/海外验？
- 包税渠道 vs 自清关？
- 无 TMS 细粒度清关数据时 OMS 只有粗状态？

---

## 分专家「必覆盖分支」清单（每条分支找 1 个真实样例）

### 1. inbound-order-status

- [ ] WI 单 + 正常状态解读（PEWC / EWC / TS 各 1）
- [ ] 仅 errorCode、无 WI（下单报错）
- [ ] 客户参考号命中（单条 / 多条歧义各 1）

### 2. inbound-arrival-status

- [ ] TS 在途、未到仓
- [ ] PEWC 已到仓待确认
- [ ] EWC 已确认；直发包裹数 discrepancy（orderPackageQty ≠ actual）

### 3. inbound-putaway-status

- [ ] EWC 上架中（有 dicDate、无 shelveCompletedDate）
- [ ] SHD 已完成
- [ ] 上架数量与预报不一致

### 4. inbound-putaway-expedite

- [ ] EWC 超 SLA 未上架
- [ ] 活动急用（urgencyReason）
- [ ] 已 SHD（应提示无需催促）

### 5. inbound-exception-check

- [ ] 有异常单记录
- [ ] 仅数量差异、无 formal 异常单
- [ ] 直发少包裹 / 运输破损 / 签收争议（各 1）

### 6. inbound-appointment-manage

- intent=`query` + WI 有关联 booking
- intent=`create_guide`（无单号，KB）
- intent=`penalty` + 有违规费记录
- LCL / FCL / Express 各 1

### 7. inbound-self-inspection

- intent=`submit_guide`（无 API）
- intent=`status` + 发货前 OD/TS
- intent=`progress` + 到仓后抽验有异常费

### 8. inbound-overseas-inspection

- inspectionMode: 有箱单 / 无箱单 / 预报 各 1
- PEWC 停留较久
- isAbnormal 标记

### 9. inbound-transit-tracking

- TS + 有 trajectoryList
- 有 expectedSendwarehouseTime
- 到港延误（轨迹异常描述即可）

### 10. inbound-customs-clearance

- 自清关在途 WI
- 包税渠道（dutiableChannelQuery 场景，可无 WI）
- 目的国 UK / EU 各 1

### 11. inbound-customs-doc-manage

- intent=upload / register_importer / query_importer / general 各 1
- UK vs BE/EU 国家差异

### 12. inbound-order-manage

- intent=create / modify / close / cancel 各 1
- 可读 WI：OD 可改 vs EWC 不可关 等 operability 差异

### 13. inbound-permission-apply

- apply + self_inspection / overseas_inspection / cbm_quota 各 1
- progress + 有 applicationId vs 无

### 14. inbound-capacity-availability

- checkType=cbm / sku / slots / overall 各 1
- 额度将满 vs 充足（不同 warehouseCode）

### 15. inbound-psc-eligibility

- 已开通自验 vs 未开通
- 多国仓 PSC 列表差异

### 16. inbound-warehouse-info

- 精确 warehouseCode
- 仅 country 模糊查
- topic=截单 / 直发地址 / 联系人 各 1

### 17. inbound-process-guide

- 费用咨询 / 禁限运 / CBM 规则 / 头程选择 各 1

### 18. value-add 4 experts

- `value-add-exception-diagnosis`：异常编码/名称是否进入增值链
- `value-add-product-recommendation`：已知异常 + 客户处理意图，推荐候选 VASC
- `value-add-service-config`：已知 VASC，解释服务项/原子、互斥和字段证据
- `value-add-order-status`：有增值单号或业务单号，查询已提交增值单状态

---

## 输出格式（严格遵守）

请输出 **Markdown 表格 + JSON 附录**。

### Part 1 — 总览表

| case_id | expert_id | 分支名称 | 客户原话（仿真） | 关键业务编号 | 辅助维度 | 数据置信度 | 备注 |
|---------|-----------|----------|------------------|--------------|----------|------------|------|
| INB-001 | inbound-order-status | PEWC状态解读 | 「为什么一直 PEWC」 | WI: ??? | status=PEWC, destWh=??? | 高/中/低/无 | 查询路径 |

**关键业务编号**列写法示例：

- `WI: WI2026xxxxxx`
- `ref: AMZ-FBA-xxx`（客户参考号）
- `booking: BKxxx`
- `wh: USWC`
- `err: 商品不存在`
- `none`（纯 KB，无需查 API）

### Part 2 — 每条案例的 inputs 草案（供测试同学直接调用）

```json
{
  "case_id": "INB-001",
  "expert_id": "inbound-order-status",
  "customerIntent": "客户问：我的入库单现在什么状态",
  "inputs": {
    "inboundOrderNos": ["WI2026xxxxxx"]
  },
  "expected_branch": "OMS getOrderDetail 主路径",
  "validation_focus": ["status 字段解读", "trajectorySummary 非空"],
  "data_provenance": "OMS 入库单查询 / 工单 #xxx / 脱敏导出"
}
```

### Part 3 — 覆盖度自检（必填）

| 检查项 | 是否满足 | 缺口说明 |
|--------|----------|----------|
| 18 专家均有 ≥1 案例 | | |
| 含 WI 前缀单号 ≥15 条 | | |
| 含非 WI 参考号 ≥3 条 | | |
| 含无单号纯 KB ≥5 条 | | |
| 覆盖 8 种以上 status | | |
| 含异常/差异场景 ≥5 条 | | |
| 含多国仓 ≥3 国 | | |
| 标注数据源 Gap 的条目 | | |

---

## 约束（必须遵守）

1. **禁止编造**：查不到的编号写 `UNAVAILABLE`，并说明已尝试的查询路径（TOM 菜单、OMS 接口、工单字段名）。
2. **脱敏**：客户名、电话可打码；单号若涉密可保留格式用 `x` 替代部分数字（如 `WI202601xxxxx`），但须注明「格式真实、数字脱敏」。
3. **优先近 6 个月**活跃单据，避免已归档无法 API 查询的陈旧单。
4. **一条案例只验证一个主分支**；复杂场景拆成多条。
5. 若同一 WI 可覆盖多个专家，**分别列出**（注明「同单多专家链式测试」）。

---

## 开始方式

请先回复你的**数据访问范围**（能查哪些系统/表/工单类型），然后按「专家 1→18」顺序执行启发式提问并填表。每完成 3 个专家，输出一次阶段性表格，便于我及早纠正抽样方向。

---

## 使用说明（测试同学）

- 本地验证：`npm run dev:expert -- <expert-id> -- --inboundOrderNos '["WI…"]'`
- Part 2 的 JSON 可整理为 `scripts/expert-online-test/fixtures/*.local.json`（已在 `.gitignore`）
- 若 Data Agent 只能查工单不能查 OMS，可在对话开头补充：「优先从近 6 个月入库类工单中提取 WI 单号、仓库编码、客户参考号。」
