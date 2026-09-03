# OMS 拉取 TODO（A/B historical gold）

- 日期：2026-09-02
- 原因：现有 `scripts/oms/pull_f001_oms_facts.py` 写死 F-001 场景码 `20250407004`。本轮不改 OMS 脚本、不编造 A/B 全量池。

## 已有、不能当 A/B gold 的缓存

- F-001 全量事实：`_runs/20260901_oms_facts/`（与 A/B 无关，可作 F-001 对照 gold）。
- A 旁证 6 张：`_runs/20260901_oms_eb_expand/extras_details.json`，`sceneOverviewName=【入库】包裹类异常换商品标签上架`，`sceneOverviewCode=20250407008`（**2026-09-02 live 已核**，见 `oms-scene-code-verify.md`），`isAuditThrough=Y`，SOP 过短。
- B：码已核为 `20250522001`（【入库】指定商品拍照暂存）。extras 仍没有 B 样本。

## 下次应拉什么（先不执行）

共用接口（与 F-001 脚本相同，只换过滤）：

- `oms.VaOrderService_pageQuery`：状态不过滤（完成 / 取消 / 终止 / 审核未过都要）。
- `oms.VaOrderService_getVasList`：必须拿到人工 `sop`。
- 取消 / 终止：`cancelReason` / `failReason`。
- 有异常则 `getEventOrder4VaAtom`。

A 过滤：

- **只用** `where[sceneOverviewCode]=20250407008`（live 5 条已对上名；列表 `total=73`）。
- **不要**按场景名滤：`sceneOverviewName` where 会被忽略，返回全库。
- **不要**只按 `OW01V1602`。

B 过滤：

- **只用** `where[sceneOverviewCode]=20250522001`（live 5 条已对上名；列表 `total=98`）。
- **不要**按场景名滤（同上，无效）。
- 知识库提到的后续锚点单可回查，但单条本身不是 gold。

入 gold 门槛（缺一不可）：终态 + 人工 SOP 足够判作业 +（取消/驳回时）原因 + 正文符合 evidence 正向信号。只凭场景名不要入。

## 本轮已做 / 未做

- 已登录并完成 5 条核码（`oms-scene-code-verify.md`）。
- 已留存全量码–名映射：`oms-scene-overview-code-map.md`（170 条）。
- 已拉 A/B 事实池（不滤状态）：`_runs/20260902_oms_facts_a/`（73，失败 0）、`_runs/20260902_oms_facts_b/`（98，失败 3 张无 sop）。
- **未**按 §2.5 / §2.7 核 SOP，**未**升 gold。
- 未按 EB 扩 A/B 的空场景旧单。
- 未写 CASEBOOK，未改 `candidates.jsonl`。
