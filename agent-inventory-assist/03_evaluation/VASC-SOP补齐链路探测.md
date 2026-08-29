# VASC → SOP 补齐链路探测（2026-08-29）

状态：探测完成 · **离线事实表路径可跑通** · **直连 OpenAPI 当前缺凭证**

## 目标

为日后 `sop_gate` 叶子：从 Udesk 对话抽出 `VASC…` → 拿到客户需求描述/背景 + 审核侧 `sceneOverviewName` + 仓库操作 `sop`。

## 结论（能否跑通）

| 路径 | 能否跑通 | 说明 |
|------|----------|------|
| **A. 离线事实表 / 已有 repull JSON** | **能** | 按 `orderNo=VASC…` join 即可拿到描述与 SOP |
| **B. 现调 OMS OpenAPI** | **本机当前不能直连** | 历史探针标记 `api_direct_call_status=not_called_missing_openapi_credentials`；数据来自 `api_backing_db_mirror` |

推荐：`sop_gate` 补齐 **先走路径 A**；缺单再排队路径 B（需凭证）。

## 证据

### 事实表（仓内）

- `workspace/data/raw/全量_增值单接口口径事实补齐.xlsx`（与探针目录同哈希；含接口口径，gitignore 未入库属预期）
- 探针同源：`D:\DA\outputs\value_added_related_probe\all_interface_repull.json` + 同名 xlsx

### 关键表/字段（`vaAtoms口径` / `vaAtomRows`）

| 字段 | 用途 |
|------|------|
| `orderNo` | 增值单号 VASC…（join 键） |
| `requirementDescription` / `requirementBackground` | 客户侧描述/背景 |
| `serviceCode` / `serviceName` | 如 `OW01V1602` 入库其他服务需求 |
| `sceneOverviewName` / `sceneOverviewCode` | 审核场景概述 |
| `sop` | **仓库操作 SOP** |

### 命中规模（repull JSON 快照）

- unique VASC ≈ **959**；`vaAtomRows` ≈ 966  
- 有 `sop` ≈ **700**；有 `sceneOverviewName` ≈ **663**；有 `requirementDescription` ≈ **503**  
- 其中 `OW01V1602` ≈ **313** 行，有 SOP ≈ **239**  
- 无 VASC 可抽的讨论/会话会进「未命中」桶（历史群聊映射约 186～190）——Udesk 同样会有一部分对话**抽不到 VASC**，`sop_gate` 只能标 `enrichment_miss`

### 接口文档（路径 B 就绪时）

- `workspace/knowledge/api-docs/vas-product-api-doc.md`：`data.list[].sop` / `sceneOverviewName` / `vasDes` 等  
- 历史 build：`D:\DA\outputs\value_added_related_probe\build_all_interface_repull_workbook.mjs`

## 建议执行顺序（任务，未开跑）

1. Udesk 分层抽样落会话（仅 `intent` / `missing` 叶子）。  
2. 从入选会话 `messages` 正则抽 `VASC\d+`。  
3. Join `all_interface_repull.json` 或事实表 `vaAtoms口径`（优先仓内/探针 JSON，免解 xlsx）。  
4. 命中且 `sop` 非空 → 补 `sop_gate` 叶子；未命中 → `TODO` 列表，凭证齐全后再 OpenAPI 补拉。

## 与今天共识的关系

- 不阻塞当前 Udesk 抽样。  
- 不把群聊「讨论-增值单映射」当客户–客服评测主源；仅作 VASC 对齐的**历史旁证**。
