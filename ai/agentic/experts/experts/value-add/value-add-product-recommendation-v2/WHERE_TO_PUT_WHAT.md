# Git vs Coze 分流说明

| 产物 | 是否 git add/push | 是否导入 Coze | 说明 |
|------|-------------------|---------------|------|
| `prompts/*.md`、`coze.config.yml`、`design.md`、`manifest.json`、`workflow.json`、`nodes/*.ts` | 是，要进 Git | 否，Coze 不直接读这些源码文件 | 源码真源；push 只用于协作和版本管理，不会自动更新线上 Coze。 |
| `workflow/MANIFEST.yml`、`workflow/workflow/value_add_product_recommendation_v2-draft.yaml` | 建议进 Git，便于复现导入包 | 是，可作为目录包导入 Coze | 由 `npm run export:coze -- experts/value-add/value-add-product-recommendation-v2` 生成。 |
| `D:\DA\AI_EXPERT\agentic\experts\experts_coze_output\value-add-product-recommendation-v2.zip` | 建议进 Git，或按团队规则标为本地产物 | 是，推荐上传这个 zip 导入 Coze | 只有导入 Coze 草稿/新工作流后试跑，才会测到新逻辑。 |
| `D:\DA\AI_EXPERT\增值配置AI化\增值单ai指引助手\value-add-recommendation-rules\` | 建议进同一 Git 或作为规则资料库单独管理 | 否 | 决策层资料；运行靠编译/复制进 v2 `prompts/kb-*.md` 与 Coze Text 节点。 |
| 旧目录 `agentic/experts/experts/value-add/value-add-product-recommendation/` | 否，本步不改、不 push 覆盖 | 否，本步不覆盖线上正式包 | 正式切换另开步骤；本次只产出 v2。 |
| `node_modules/`、`.npm-cache/` | 否 | 否 | 本地导出依赖和 npm 缓存，不进 Git、不导入 Coze。 |

## 当前可导入包

- 目录包根：`D:\DA\AI_EXPERT\agentic\experts\experts\value-add\value-add-product-recommendation-v2\workflow\`
- zip 包：`D:\DA\AI_EXPERT\agentic\experts\experts_coze_output\value-add-product-recommendation-v2.zip`

## 生效边界

Git push 不会让 Coze 自动生效。必须在 Coze 导入 `workflow/` 目录包或 zip 包，并在草稿/新工作流中试跑确认。
