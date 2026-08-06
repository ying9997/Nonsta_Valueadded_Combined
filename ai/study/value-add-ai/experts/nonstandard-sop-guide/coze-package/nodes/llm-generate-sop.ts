/**
 * llm-generate-sop — LLM 节点声明（type=llm，实际由 Runner 调度 prompts/main.md）。
 * 本文件仅作节点签名占位；实际 prompt 在 prompts/main.md。
 *
 * 输入：
 *   - sopInput: 归一化后的客户信息
 *   - matchResult: 场景匹配结果（scenarioId/scenarioName）
 *   - completenessResult: 字段完整性检查结果
 *   - kbSopTemplates: SOP 模板知识库内容
 *
 * 输出：
 *   - sopGenerationResult: { sopText, scenarioName, fieldsUsed }
 *
 * 当 workflow.json 中 type=llm 时，Runner 读取 promptFile 指定的 prompt，
 * 将 inputs 中的变量注入 prompt，调用 LLM，输出写入 outputs。
 * 本 .ts 文件不会被直接执行。
 */
