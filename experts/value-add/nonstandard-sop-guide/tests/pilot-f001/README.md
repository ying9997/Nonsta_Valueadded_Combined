# F-001 试点最小测试集（Top1）

- 场景：`【入库】尺重/标签辨识后换标上架` / `inbound_label_identify`
- 原子：`OW01V1602` 入库其他服务需求
- VASC：`VASC202411192246131` 入库非标增值（特批）
- 入口默认：入库异常 → 处理异常 → 增值单填写（`UNUSUAL` / `UNUSUAL_INBOUND`）
- 字段口径：[`2.1-inbound-relabel-shelving.md`](../../../../workspace/knowledge/sop/2.1-inbound-relabel-shelving.md)
  - **上下文免追问**：异常单号 / 关联 WI / 仓库等来自 `pageContext`
  - **校验白名单（仅 OMS 真字段）**：5 项真附件名
  - **必填子集**：见 [`SIMULATED-BUSINESS-RULES.md`](SIMULATED-BUSINESS-RULES.md)（**模拟**，待业务覆盖）
- **主路径产物（校验通过时）**：① 需求描述 + 需求背景说明；② 仓库操作 SOP
- 评测深度：主路径 `sop_generated` + 缺附件 `needs_clarification`；**不含**页面联动 / Copilot
- 执行载体：规则补丁落地后本地 nodes 干跑，再 Coze

## 模拟必填（干跑用）

| required=是 | required=否（默认） |
|-------------|---------------------|
| 操作说明附件 | 包裹和标签的对应关系 |
| 商品和标签的对应关系 | 视频拍摄SOP（中文+英文） |
| 标签文件 | |

## 四条用例

| ID | 文件 | 覆盖 | 期望 outputPath | 闸门 |
|----|------|------|-----------------|------|
| P-001 | `cases/P-001-happy.json` | 上下文齐 + 三必填齐（可选可缺）→ 三类草稿 | `sop_generated` | **必过** |
| P-002 | `cases/P-002-clarify-multi.json` | 缺操作说明 + 商品和标签对应关系 | `needs_clarification` | **必过** |
| P-003 | `cases/P-003-clarify-label-file.json` | 只缺 `标签文件` | `needs_clarification` | 加固 |
| P-004 | `cases/P-004-p0-no-fabricate.json` | 诱导编造 / 承诺时效 | 拒绝；不得 `sop_generated` | 加固 |

## 业务方可审

[`BUSINESS-REVIEW.md`](BUSINESS-REVIEW.md) · 飞书确认包。模拟规则可先跑工程；业务签字后以签批覆盖。

## 已知工程缺口

旧 nodes 仍缺 `OW01V1602` / Top1 / 附件白名单等，见 [`RULES-PATCH.md`](RULES-PATCH.md)。**模拟业务规则 ≠ 已可验收干跑**；还需补节点后才能跑通。
