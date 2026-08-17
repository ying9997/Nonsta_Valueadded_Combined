# Mainline vs Branches

状态：已根据 Q1-Q6 归档包整理初稿。

## 主链路

1. 用户提出预约送仓相关问题。
2. Agent 识别 / 归一 `intent`。
3. Agent 判断是否需要单号，以及是否已有 `inboundOrderNos` / `inboundOrderNo` / `bookingNo`。
4. Agent 判断 `routePath`：
   - `kb_only`：输出 SOP / 规则 / 操作指引。
   - `api_chain`：调用预约相关 API 获取事实，再结合 KB 输出解读。
5. Agent 输出操作指引、状态解读、费用说明、POD 下载指引或越界处理建议。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6`

## 支线

- 创建预约指引：`create_guide`
- 修改预约指引：`modify_guide`
- 取消预约指引：`cancel_guide`
- 分批到仓处理：`split_shipment`
- 预约状态查询：`query`
- 违规费查询 / 说明：`penalty`
- 预约 POD 下载指引：`pod_guide`

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2`、`step2-q5-q6`

## 后置能力

- `SOP 分发器` 概念四步法。
- `只读解读器` 概念四步法。
- `intent` 上游来源。
- `inputContext` / `previousOutput` 的来源和跨 expert 编排机制。
- planner / agent loop 如何消费转交说明。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2`、`step2-q3-q4`、`step2-q5-q6`
