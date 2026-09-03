# F-001 规则补丁表（工程自用）

业务签批前，干跑配置暂跟 [`F-001-SIMULATED-BUSINESS-RULES.md`](../../../../../agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md)；签批后以业务勾选覆盖。**先规则后干跑。**

| 节点 | 当前缺什么 | 规则来源 | 应写入位置 | 用哪条用例验收 |
|------|------------|----------|------------|----------------|
| validate-input | 已放行 `OW01V1602` + `VASC202411192246131` | `OW01V1602` + VASC `VASC202411192246131` | `nodes/validate-input.ts` | P-001 不得 `invalid_input` |
| match-template | 入库兜底已短路到 `inbound_label_identify`；38 库内索引仍在 | `2.1` 场景定义 | `nodes/match-template.ts` | P-001 `sceneKey` |
| context-bind（缺） | 异常入口仍可能把单号/仓库当追问槽 | `2.1` A 层免追问 | 新逻辑或 check 前置 | P-001～P-003：`missingFields` 不得含这些 |
| extract / check-completeness | 入库走附件三件（pageContext.attachmentStatus）；库内仍是旧 SCENARIO_FIELDS | 模拟必填三件：操作说明 / 商品和标签对应关系 / 标签文件 | `nodes/check-completeness.ts` | P-001（可选缺失不追问）；P-002 / P-003 |
| llm-generate-sop + main.md | 库内模板；揉 `sopText`；`[待补充]` | 表单双字段 + 仓库 SOP；缺必填禁生成 | `prompts/inbound/main.md` + Top1 | P-001 三字段；P-002 无稿 |
| format-output | 无 `sceneKey` / 三字段 | PRD 三字段名 | `nodes/format-output.ts` | 四条 `outputPath` + P-001 |
| P0 边界 | 无结构化拒编造/拒承诺 | P-004 | prompt ± 后置 | P-004 |

**附件白名单：** 操作说明附件 | 商品和标签的对应关系 | 包裹和标签的对应关系 | 视频拍摄SOP（中文+英文） | 标签文件  

**模拟 required=true：** 操作说明附件、商品和标签的对应关系、标签文件  

旧 38 场景见 [`../../DEPRECATED.md`](../../DEPRECATED.md)。
