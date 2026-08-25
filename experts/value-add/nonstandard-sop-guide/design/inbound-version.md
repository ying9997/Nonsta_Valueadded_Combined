# nonstandard-sop-guide — 核心设计

## 定位

入库增值链路中，当 product-recommendation-v2 推荐了非标 VASC 且落到"库内其他服务需求"兜底原子时，
客户通常不知道"需求描述"和"需求背景说明"怎么填。本 Expert 负责：

1. 识别客户场景（匹配 B/C 类）
2. 对 B 类场景匹配历史 SOP 模板
3. 追问缺失字段
4. 生成规范 SOP 摘要
5. 客户确认后输出

## 工作流

```
validate-input → match-template → check-completeness
  ├── B 类 + 字段齐全 → llm-generate-sop → format-output (sop_generated)
  ├── B 类 + 字段不齐 → format-output (needs_clarification)
  └── C 类（无模板） → format-output (transfer_human)
```

## outputPath 取值

| outputPath | 含义 | 后续动作 |
|------------|------|---------|
| `sop_generated` | B 类场景 + 字段齐全 + SOP 已生成 | Planner 展示给客户确认 |
| `needs_clarification` | B 类场景 + 字段不齐 | Planner 向客户追问 missingFields |
| `transfer_human` | C 类场景 + 无模板 | 引导客户联系人工客服 |
| `invalid_input` | 输入校验失败（非兜底原子等） | Planner 回退 |

## 触发条件

由 Planner 判断：
- 上游 product-recommendation 推荐了非标 VASC
- 服务项落到"入库其他服务需求"兜底原子（OSF6V1603 / OSF6V1841）
- 不是 A 类命名服务（货权转移、审计盘点、代采购、DG销毁）

## 多轮追问机制

当 outputPath = `needs_clarification` 时：
- 输出 `missingFields` 列表 + 对应追问话术
- Planner/Judge 看到后向客户追问
- 客户回答后 Planner 携带新信息重新调用本 Expert
- 下次进入 check-completeness 时字段齐全则进入 SOP 生成

## 知识库

| KB 文件 | 内容 | 用途 |
|---------|------|------|
| `kb-template-index.md` | 38 场景 B/C 分类 + 关键词 | match-template 节点匹配用 |
| `kb-sop-templates.md` | B 类 23 场景的 SOP 模板 | LLM 生成 SOP 时参考 |
| `kb-field-requirements.md` | 各场景必填/可选字段 + 追问话术 | check-completeness 检查用 |

## 上线策略：分批上线

不追求一次覆盖全部 38 场景。按"知识库完整度 + 匹配召回率"分批：

| 批次 | 准入条件 | 上线方式 |
|------|---------|---------|
| 第一批 | 模板完整（场景 1-12）+ 关键词召回率 > 70% | 直接生成 SOP |
| 第二批 | 模板核心字段有但不完整（场景 13-23）+ 业务方补全后 | 业务方补模板后开放 |
| 第三批 | C 类场景 + 未来新增模板 | 长期转人工，逐步开放 |

未覆盖的场景统一走 `transfer_human`，不会产生错误 SOP。

## 已知 Gap 与改进路线

### 现状问题（eval-dryrun 验证）

- 增值单数据（141条）关键词匹配召回率：**33.3%**
- 高置信命中：0 条；中置信：23 条；低置信：24 条
- 主因：真实场景名称（如"包裹条码批量异常辨识后补贴包裹标签上架"）与知识库场景名称（如"商品外观辨识+贴标上架"）存在 N:1 映射缺失

### 改进路线（按优先级）

| 优先级 | 改进项 | 方案 | 影响 |
|--------|--------|------|------|
| P0 | 补真实样本作为 ground truth | 已有增值单 CSV 141 条 + Udesk 对话 489 条 | 建立 eval 基线 |
| P1 | LLM 语义匹配替代/辅助关键词 | match-template 改为混合模式（关键词粗筛 top-5 → LLM 精选） | 召回率预计提升至 70%+ |
| P2 | 增加字段提取节点 (extract-fields) | 新增 LLM 节点：从自然语言中提取结构化字段 → providedFields | 解决"客户已说但系统未识别"问题 |
| P3 | 置信度网关 + 确认环节 | 匹配置信度 < 阈值时先向客户确认场景 | 降低错配风险 |

### P1 混合匹配模式（计划）

```
当前：customerIntent → 纯关键词硬匹配 → scenarioId
改为：customerIntent → 关键词粗筛 top-5 候选 → LLM 从候选中选择 → scenarioId + confidence
```

### P2 字段提取节点（计划）

```
当前工作流：
  validate-input → match-template → check-completeness → ...

改为：
  validate-input → match-template → extract-fields(新LLM节点) → check-completeness → ...
```

extract-fields 负责从客户自然语言中提取结构化字段，解决 `providedFields` 需要预结构化的假设。

## 测试体系

| 层级 | 名称 | 验证什么 | 需要 LLM | 需要 ground truth |
|------|------|---------|----------|-----------------|
| L1 | Integration Test（集成测试） | 节点串联正确、outputPath 路由、边界条件 | 否 | 否 |
| L2 | Eval（评测） | 场景匹配准确率、SOP 生成质量、字段提取召回率 | 是 | 是 |
| L3 | E2E on Coze（集成验收） | Recaller 调度、enrichedContext 传递、多轮追问 | 是 | 否 |

- L1 本地跑：`npx tsx test-flow.ts`（6 个 case，已全部 pass）
- L2 本地跑：`npx tsx eval-dryrun.ts`（141 条增值单数据干跑）
- L3 部署后在 Coze 上跑

## 数据资产

| 文件 | 条数 | 内容 | 用途 |
|------|------|------|------|
| `vas_OW01V1602_*.csv` | 141 | 7月入库非标已完成增值单 | Ground truth（场景标签 + 审批 SOP） |
| `extracted-customer-inputs.json` | 489 | Udesk 对话中客户真实首句 | Eval 测试输入 |
| `extracted-clarification-patterns.json` | 32 | 客服追问→客户补充的交互模式 | 优化追问话术 |

## 边界

- 不修改现有 expert 代码
- A 类命名服务不进入（validate-input 拦截）
- 一期只覆盖入库场景
- 一期输出纯文本 SOP 摘要
- 未覆盖场景统一走 transfer_human，不产生错误 SOP
