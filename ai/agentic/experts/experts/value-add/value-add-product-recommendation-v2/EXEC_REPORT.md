# EXEC_REPORT

## 执行范围

只新建/修改 v2 目录：

`D:\DA\AI_EXPERT\agentic\experts\experts\value-add\value-add-product-recommendation-v2\`

未修改：

- `D:\DA\AI_EXPERT\agentic\experts\experts\value-add\value-add-product-recommendation\`
- `D:\DA\AI_EXPERT\agentic\value-add-service-guide\`

## 对照真源

| 真源 | 已读内容 | 结论 |
|------|----------|------|
| Git 源码骨架 A | 旧专家 `coze.config.yml`、`design.md`、`manifest.json`、`workflow/`、`prompts/kb-*.md`、`classify.md`、`clarify.md`、`main.md` | 旧专家用 4 个 Text 节点预注入 KB，再由代码加载节点传给 LLM。 |
| 线上 Coze 工作流 B | `增值配置AI化/增值单ai指引助手/Workflow-value_add_product_recommendation_20260630_3-draft-5466/.../workflow/value_add_product_recommendation_20260630_3-draft.yaml` | 线上运行真源同样是 Text 节点内嵌 KB：`kb-flow-context`、`kb-intent-guide`、`kb-mapping-table`、`kb-vasc-constraints`；LLM 不运行时读 Git。 |
| 新规则 C | `value-add-recommendation-rules/` 与 `test_prompt_B0102E23.json` | 已将 MVP 规则编译进 v2 prompts 和 Text 节点，重点保证 B0102E23，保留 B03E03 最小路由。 |

## 现网链路与 v2 沿用方式

现网链路：

```text
prompts/kb-*.md
  -> coze.config.yml textNodes
  -> Coze Text 节点 output
  -> inputBindings
  -> load-flow-context / load-intent-guide / verify-with-mapping
  -> llm-classify / llm-recommend
```

v2 沿用同一机制：

- 保留旧专家 4 个 Text 节点。
- 新增 `kb-decision-system-prompt`、`kb-inference-rules`、`kb-intent-routing-B0102E23`、`kb-intent-routing-B03E03`、`kb-forbidden-products`、`kb-h-rules` Text 节点。
- `load-flow-context` 拼接 inference rules 给 `llm-classify`。
- `load-intent-guide` 拼接 system prompt、inference、intent routing、forbidden、H rules 给 `llm-recommend`。
- `verify-with-mapping` 拼接 forbidden、H rules 到 constraintsKb，供后续约束链路消费。

## 改动清单

| 文件 | 改动 | 来源 |
|------|------|------|
| `manifest.json` | 专家 ID 改为 `value-add-product-recommendation-v2`，版本 `2.0.0` | v2 新目录要求 |
| `coze.config.yml` | 新增 6 个决策层 Text 节点与 inputBindings，输出包名改为 v2 | 旧专家配置 + recommendation-rules |
| `workflow.json` | 给加载/验证节点增加新 Text 入参 | 旧 workflow 骨架 |
| `nodes/load-flow-context.ts` | 拼接 `kbInferenceRules` | `inference-rules.md` |
| `nodes/load-intent-guide.ts` | 拼接 v2 决策层文本 | `system-prompt.md`、`inference-rules.md`、intent-routing、forbidden、H rules |
| `nodes/verify-with-mapping.ts` | 拼接 forbidden/H 到 constraintsKb | `forbidden-products.md`、`h-rules.md` |
| `prompts/kb-*.md` | 新增决策层 prompt 源文件 | 从 `value-add-recommendation-rules/` 复制/编译 |
| `prompts/classify.md` | 明确“描述已明确则推断，模糊才追问” | Opus P1 修正 |
| `prompts/main.md` | 明确 systemScoped、forbidden、H 规则约束；B0102E23/B03E03 特殊规则 | D6 + forbidden 产品级裁决 |
| `WHERE_TO_PUT_WHAT.md` | Git vs Coze 分流说明 | 本次任务要求 |
| `IMPORT_AND_TEST.md` | Coze 导入和 TC-B0102E23 试跑说明 | 本次任务要求 |

## 导出产物

已执行：

```powershell
npm run export:coze -- experts/value-add/value-add-product-recommendation-v2
```

生成：

- `D:\DA\AI_EXPERT\agentic\experts\experts\value-add\value-add-product-recommendation-v2\workflow\MANIFEST.yml`
- `D:\DA\AI_EXPERT\agentic\experts\experts\value-add\value-add-product-recommendation-v2\workflow\workflow\value_add_product_recommendation_v2-draft.yaml`
- `D:\DA\AI_EXPERT\agentic\experts\experts_coze_output\value-add-product-recommendation-v2.zip`

## Pending

- 未扩全量 eventCode。
- 未扩全量字段。
- 未接生产注册；正式切换需另开步骤。
- `B03E03` 只有最小路由，未做专属 test_prompt。

## 自检

- [x] v2 目录完整，未改旧正式目录。
- [x] 对照了线上工作流 + Git prompts 骨架。
- [x] 决策层规则已进入 v2 prompts 与 Coze Text 节点。
- [x] 已生成可导入 Coze 的 YAML/zip。
- [x] `WHERE_TO_PUT_WHAT.md` 已说明 Git vs Coze。
- [x] `IMPORT_AND_TEST.md` 已给 TC-B0102E23 最小入参和期望。
