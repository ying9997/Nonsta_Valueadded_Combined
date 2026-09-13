# 场景扩展上线手册（Rollout Playbook）

> 本文档定义从"新场景需求"到"上线"的标准流程。每批新场景都走同一套流程，可重复执行。

## 一、总览

```
每批场景的上线流程（约 5-7 个工作日/批）：

第 1 步：建场景卡（0.5 天）
  ↓
第 2 步：构建测试集（1 天）
  ↓
第 3 步：Pipeline 评测（0.5 天）
  ↓
第 4 步：E2E 飞书测试（0.5 天）
  ↓
第 5 步：历史数据跑批（1-2 天）
  ↓
第 6 步：上线（0.5 天）
```

## 二、每步详细说明

### 第 1 步：建场景卡

**输入：** SOP 知识库对应章节 + OMS 场景码

**产出：** `internal-review-copilot/knowledge/scenario-cards/{sceneKey}.json`

**做什么：**
1. 从 SOP 知识库提取场景定义、核心动作、SOP 步骤
2. 填写场景卡 JSON：
   - sceneKey / sceneName / omsSceneCode
   - positiveSignals（strong + weak）
   - negativeSignals（hard + soft）
   - boundaryRules（和已有场景的边界）
   - requiredAttachmentPolicy
3. status 设为 `"draft"`
4. 从 OMS 缓存统计附件出现率，填 requiredFieldKeys

**谁做：** Cursor 自动生成草稿，人工审阅修正边界规则

**检查项：**
- [ ] 场景卡 JSON 格式正确，loadScenarioCards() 能加载
- [ ] positiveSignals 不和已有场景冲突
- [ ] boundaryRules 标注了和近邻场景的区分方法
- [ ] OMS 场景码正确

---

### 第 2 步：构建测试集

**输入：** 场景卡 + OMS 缓存 + 群聊数据

**产出：** `internal-review-copilot/eval/golden/{batch}-golden.jsonl`

**做什么：**
1. 从 OMS 缓存按场景码筛选增值单
2. 关联异常单（attrs_submit 里的 EB 号）
3. 关联群聊（三群合并数据）
4. 抽样 HQ 候选（有 EB + 有群聊 + 对话 ≥ 500 字）
5. 每个场景按 L1-L4 四个出口各取 2-3 条
6. 人工标注 golden label：
   - expectedScene
   - acceptableScenes（含通用兜底 §2.1）
   - expectedOutputPath
   - expectedActions
   - expectedMissing
7. 跑 trace，人工确认每条 case 的场景判断正确

**谁做：** Cursor 自动抽样 + 生成 trace，人工标注 golden label

**检查项：**
- [ ] 每个新场景至少 3 条 golden label
- [ ] L1-L4 各层至少有 1 条覆盖
- [ ] golden label 的 expectedScene 经人工确认
- [ ] 测试集和 pipeline 隔离（pipeline 不读 golden 文件）

---

### 第 3 步：Pipeline 评测

**输入：** 测试集 + pipeline（含新场景卡）

**产出：** `_runs/{date}_eval/objective-eval-report.md` + `llm-judge-report.md`

**做什么：**
1. 场景卡 status 从 `"draft"` 改为 `"supported"`
2. 跑客观评测（run-objective-eval.ts）：
   - 出口准确率
   - 场景精准匹配率 / 可接受匹配率
   - 动作命中率
   - 各组件指标（误拦率/漏放率/缺失字段 P/R）
3. 跑 LLM Judge（run-llm-judge.ts）对 L4 SOP 打分
4. 和上一批的基线对比，确认新场景不影响已有场景准确率

**达标标准：**
- 新场景的场景可接受匹配率 ≥ 60%
- 已有场景的准确率不降（回归不退化）
- L4 SOP 的 LLM Judge 安全分 = 5.0（无违规表述）

**谁做：** Cursor 跑脚本，人工看报告 + 错误归因

**检查项：**
- [ ] 客观评测报告达标
- [ ] 回归不退化
- [ ] 错误 case 有归因（动作提取错 / 场景映射错 / 附件规则错）

---

### 第 4 步：E2E 飞书测试

**输入：** 通过评测的场景 + 飞书群 + 审核人员

**产出：** `_runs/{date}_demo_e2e/demo-result.md`

**做什么：**
1. 选 3 条代表性 case（L4/L3/L2 各 1 条）
2. 发飞书卡片到测试群
3. 审核员点按钮确认场景 / 确认 SOP
4. 验证完整链路：
   - L4：SOP 卡片 → 确认写入 OMS → 回读验证
   - L3：追问卡片 → @销售/客服 → 补材料后重跑
   - L2：场景选择卡片 → 审核员点按钮 → SOP 生成 → 写入 OMS
5. 审核员反馈话术/格式是否需要调整

**达标标准：**
- 三条 case 全部跑通，状态机正确流转
- 审核员确认话术可用
- OMS 写入成功（dry-run 或白名单真写）

**谁做：** Cursor 发消息，审核员操作，人工验证

**检查项：**
- [ ] L4 全链路到 OMS 写入
- [ ] L2 场景确认按钮正常
- [ ] @人正确
- [ ] 审核员无异议

---

### 第 5 步：历史数据跑批

**输入：** 通过 E2E 的场景 + 历史增值单池

**产出：** `_runs/{date}_batch_run/batch-report.md`

**做什么：**
1. 从 OMS 缓存取该场景的全量历史单（窗口内）
2. 跑 pipeline（skipLlm 先跑规则，再对 L4 样本跑真实 LLM）
3. 统计分布：
   - L1/L2/L3/L4 各多少条
   - 场景识别准确率（对有 golden label 的子集）
   - SOP 生成成功率
   - 异常 case（编造/LLM 失败/场景判错）
4. 抽查 10 条人工看 SOP 质量
5. 和 E2E 测试时的小样本结果对比，确认无大面积偏差

**达标标准：**
- L2（转人工）比例 < 50%（说明 pipeline 能处理一半以上的单）
- SOP 编造率 < 5%
- 无 LLM 系统性失败（502 等）

**谁做：** Cursor 跑批，人工抽查

**检查项：**
- [ ] 跑批完成无系统性报错
- [ ] 分布合理（不是全部转人工）
- [ ] 抽查 SOP 无严重问题

---

### 第 6 步：上线

**输入：** 通过跑批的场景

**产出：** 场景卡正式生效 + 配置更新

**做什么：**
1. 场景卡 status 确认为 `"supported"`
2. 异常名称映射表更新（如有新的异常名称→场景映射）
3. OMS_WRITE_ALLOWLIST 扩充（或改为按场景码白名单）
4. 通知审核团队：新场景已上线，AI 可以处理哪些类型的单
5. 监控头 3 天的转人工率和 SOP 质量

**检查项：**
- [ ] 场景卡 status = supported
- [ ] 评测报告归档
- [ ] 审核团队已通知
- [ ] 监控告警配置

---

## 三、批次规划

基于 scene-rank-v4 的优先级排序：

| 批次 | 场景 | 状态 | 预计时间 |
|------|------|------|---------|
| **已完成** | 尺重/标签辨识后换标上架（§2.1） | supported | - |
| **已完成** | 指定商品拍照暂存（§2.7） | supported | - |
| **已完成** | 包裹条码批量异常补贴包裹标签上架（§2.33） | supported | - |
| **已完成** | 关联第三方商品条码上架（§2.12） | supported | - |
| **已完成** | 包裹类异常换商品标签上架（§2.5） | supported（低优先） | - |
| **第 2 批** | 批量辨识商品后补贴商品条码及包裹条码（§2.2） | 待建卡 | 5-7 天 |
| **第 2 批** | 包裹类异常关联第三方包裹条码直接上架 | 待建卡 | |
| **第 2 批** | ABC类/子包裹内商品错装暂存 | 待建卡 | |
| **第 2 批** | 商品异常更换包裹标签商品标签新单上架 | 待建卡 | |
| **第 3 批** | 剩余入库场景（§2.3~§2.32 未覆盖的） | 待建卡 | 5-7 天 |
| **第 4 批** | 库内场景（§3.x） | 待规划 | 待定 |

## 四、文件规范

每批上线产出的文件统一放在：

```
_runs/{YYYYMMDD}_batch{N}_{slug}/
  ├── scenario-cards/          # 新建的场景卡（审阅通过后复制到 knowledge/scenario-cards/）
  ├── golden/                  # 本批 golden labels
  ├── eval/                    # 评测报告
  ├── e2e/                     # E2E 飞书测试记录
  ├── batch-run/               # 历史跑批结果
  └── rollout-checklist.md     # 本批的检查项完成状态
```

## 五、参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| SOP 知识库 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` | 场景定义和 SOP 模板 |
| 场景排序 v4 | `_runs/20260909_inbound_scene_probe/scene-rank-v4.md` | 优先级排序 |
| OMS 场景码全表 | `_runs/20260902_oms_scene_code_map/scene_overview_code_map.json` | 码→名映射 |
| 待验证假说 | `internal-review-copilot/knowledge/pending-hypotheses.md` | 未闭环的问题 |
| 评测脚本 | `internal-review-copilot/scripts/run-objective-eval.ts` / `run-llm-judge.ts` | 自动评测 |
| 四版对比基线 | `_runs/20260909_phase2v3/abcd-comparison.md` | Pipeline 架构基线 |
