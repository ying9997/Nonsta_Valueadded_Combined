# OMS 场景倒查试用集 · F-001（v0.1）

- 状态：**建设中（P0 试用）**
- 场景概述（OMS）：`【入库】尺重/标签辨识后换标上架`
- 对齐产品：F-001 / `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`
- 权威入口：`../../EVAL-AUTHORITY.md`

## 目标（试用阶段）

先冻结 **约 3 通** 真实客服会话（可懂 + 带 OMS 场景/SOP 金标），证明 Agent 在核心场景可给业务试用；边界与其它粗桶 **后移**。

## 主路径（已定）

```text
定场景名
  → 拉该场景 VASC 列表（含 sop）
  → 抽 EB/WI（从 sop/描述）
  → Udesk 反查命中会话
  → 会话摘要（背景/诉求/已确认/卡点）
  → 需求收束切点 → 切叶/方向标签
  → 评测
```

## 文件

| 文件 | 说明 |
|------|------|
| `README.md` | 本说明 |
| `METHOD.md` | **本轮怎么跑 / 逻辑**（必读） |
| `probe_oms_to_udesk.json` | 倒查探针：场景 VASC 池 + Udesk 命中会话 |
| `candidates.json` | 3 通不同 VASC 候选 + 摘要路径 |
| `sessions/summaries/` | 会话摘要四件套（已写）；切点/叶子未做 |

## 与已归档集的关系

`../udesk-stratified-v0.1/` **已归档**：无需求收束、分层过重，**不作现行主源**。

工程门禁仍用：`experts/.../tests/pilot-f001/`（与本真实小集并行）。
