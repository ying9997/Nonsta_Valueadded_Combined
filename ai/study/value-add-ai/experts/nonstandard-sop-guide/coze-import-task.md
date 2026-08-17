# 任务：生成可导入 Coze 的 Workflow zip 包

## 目标

将 `nonstandard-sop-guide` expert 打包为 Coze 平台可直接导入的 zip 文件。导入后在 Coze staging 环境做灰度测试。

## 参考（已验证可成功导入的包）

```
D:\da\experts-push\experts_coze_output\value-add-product-recommendation-v2.zip
```

这个 zip 之前成功导入过 Coze。请严格参照它的：
- zip 内部目录结构
- MANIFEST.yml 格式和字段
- workflow YAML 的 schema（节点类型、参数格式、连线方式）
- LLM 节点的 llmParam 参数名/类型/值格式
- Code 节点的 code 字段内联方式

## 本次 Workflow 要包含的内容

### 基本信息
- name: `nonstandard_sop_guide_staging_1`
- description: 非标增值SOP引导（灰度）

### 节点链路（5 个业务节点）

```
Start → validate-input(code) → match-template(code) → check-completeness(code) → llm-generate-sop(llm) → format-output(code) → End
```

### Code 节点源码位置

```
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\validate-input.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\match-template.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\check-completeness.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\format-output.ts
```

这些文件已去掉 `export`，可直接内联到 YAML 的 `code: |-` 字段。

### LLM 节点 System Prompt

```
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\prompts\main.md
```

### 节点间数据流

| 源节点 | 输出字段 | 目标节点 | 输入字段 |
|--------|---------|---------|---------|
| Start(100001) | query, customerIntent, inputs.* | validate-input | query, customerIntent, inputs, exceptionCode, exceptionName, recommendedVasc, serviceAtom, providedFields, enrichedContext |
| validate-input | sopInput, validationResult | match-template | sopInput, validationResult |
| match-template | matchResult, sopInput | check-completeness | matchResult, sopInput |
| check-completeness | completenessResult, sopInput, matchResult | llm-generate-sop | sopInput, matchResult, completenessResult |
| llm-generate-sop | sopGenerationResult | format-output | sopGenerationResult |
| check-completeness | sopInput, matchResult, completenessResult | format-output | sopInput, matchResult, completenessResult |
| validate-input | validationResult | format-output | validationResult |
| format-output | structured, analysis, outputContext, enrichedContext | End(900001) | structured, analysis, outputContext, enrichedContext |

### LLM 节点的 prompt 变量绑定

systemPrompt 中使用 `{{sopInput}}`、`{{matchResult}}`、`{{completenessResult}}`，这三个变量通过 node_inputs 从 check-completeness 节点获取。

### Start 节点 outputs（入参定义）

```yaml
query: string         # 任务说明
customerIntent: string # 客户意图
inputContext: object   # 链式上下文
inputs: object         # 业务入参（含 customerIntent, exceptionCode, exceptionName, recommendedVasc, serviceAtom, providedFields, enrichedContext）
customerCode: string   # 客户编码
customerName: string   # 客户名称
username: string       # 操作者
language: string       # 语言
```

### End 节点 inputs（输出定义）

```yaml
structured: object       # from format-output
analysis: string         # from format-output
outputContext: object    # from format-output
enrichedContext: object  # from format-output
```

## 关键要求

1. **zip 结构必须和参考包完全一致**——先解压参考包看结构，再照着生成
2. **YAML schema 必须和参考包的 YAML 一致**——特别是 LLM 节点的 llmParam 列表（apiMode/temperature/topP/maxTokens/responseFormat/modelName/modelType 等字段名、类型、值格式）
3. **Code 节点代码直接内联**到 YAML 的 `code: |-` 字段
4. **不要添加 zip 里没有的文件**（如 icon 图片），参考包没有就不加

## 输出

生成的 zip 放到：
```
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\nonstandard-sop-guide-coze-import.zip
```
