# File Role Map

状态：步骤4“文件与能力层级映射”已重启；当前完成 4.1-4.3，节点级细表待 4.4-4.6 继续补全。

| 文件 / 目录 | 角色 | 所在层级 | 与主链路关系 | 备注 | 来源 |
| --- | --- | --- | --- | --- | --- |
| `agentic/experts/experts/inbound/inbound-appointment-manage/` | baseline expert 源目录 | expert 本体 | 承载预约送仓 expert 的业务、编排、节点、prompt、KB | 作为文件与能力映射的根目录 | 仓库复制后校正 / 2026-08-09 |
| `manifest.json` | expert 身份、触发说明、输入 schema、intent 枚举 | Expert 身份与入口契约层 | 决定外部什么时候调用该 expert，以及调用时可传哪些字段 | 后续迁移时优先对齐 expert id、description、inputs | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `design.md` | 业务定位、覆盖范围、不覆盖范围、API 取舍、转人工、验收口径 | 设计与业务边界层 | 是判断能力边界和“不调用”接口的主依据 | 不等同运行时；需要再用 workflow/nodes 验证是否真的调用 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `workflow.json` | 节点清单、节点顺序、输入输出字段、Coze IO 类型 | 运行时编排层 | 串联确定性节点、LLM 节点和输出节点 | 说明运行结构，但不单独定义业务边界 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `nodes/*.ts` | intent 识别、路由、API request 构造、API 输出解析、兜底汇总、scope guard、输出格式化 | 确定性节点能力层 | 把 workflow 中的节点变成可执行能力 | 逐节点能力映射待 4.4 补全 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `prompts/main.md` | LLM 推理约束和对客表达口径 | LLM 推理与对客表达层 | 接收事实、KB、scope 信息后生成自然语言回答 | 约束禁止项、回答原则、不要编造 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `prompts/kb/*.md` | SOP、预约规则、违规费规则、分批到仓、POD 下载、API reference | KB / SOP / 规则知识层 | 为 KB-only 和 API+KB 解读提供知识依据 | 需要区分业务规则和 API 字段说明 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `agentic/experts/package.json`、`scripts/smoke-inbound-appointment-manage.ts`、fixture、`scripts/README.md` | smoke、fixture、线上测试、run history inspect | 测试 / 验收 / 调试层 | 验证 expert 是否能运行、输出是否符合契约 | 不属于运行时回答链路，但属于工程验收能力 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
| `agentic/experts/experts_recaller/nodes/*.ts` | outputContext / enrichedContext 消费、session handoff、previousOutput 传播 | 外层编排 / handoff 层 | 负责跨 expert 的输出解析、上下文回传和下一跳输入构造 | 不属于 baseline expert 自身目录；分析输出消费时需要扩到该层 | `ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3` |
