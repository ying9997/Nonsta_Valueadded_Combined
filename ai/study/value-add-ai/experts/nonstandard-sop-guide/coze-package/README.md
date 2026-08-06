# nonstandard-sop-guide Coze 部署包

## 部署步骤

### 1. 在 Coze Staging 创建新 Workflow

- 名称：`nonstandard_sop_guide_staging`
- 描述：非标增值 SOP 引导（灰度测试）

### 2. 导入 YAML

将 `workflow/nonstandard_sop_guide-draft.yaml` 导入 Coze。

如果 Coze 不支持直接导入 YAML，按以下顺序手动创建节点：

### 3. 手动创建节点（如需）

| 节点顺序 | 节点ID | 类型 | 标题 | 代码/Prompt 来源 |
|---------|--------|------|------|-----------------|
| 1 | 100001 | Start | 开始 | YAML 中 parameters |
| 2 | 163000 | Code | validate-input | `nodes/validate-input.ts` |
| 3 | 163001 | Code | match-template | `nodes/match-template.ts` |
| 4 | 163002 | Code | check-completeness | `nodes/check-completeness.ts` |
| 5 | 163003 | LLM | llm-generate-sop | `prompts/main.md` |
| 6 | 163004 | Code | format-output | `nodes/format-output.ts` |
| 7 | 900001 | End | 结束 | YAML 中 parameters |

### 4. LLM 节点配置

- 模型：选 claude-sonnet-4-5 或平台可用模型
- System Prompt：贴入 `prompts/main.md` 内容
- 输入变量：在 prompt 中用 `{{变量名}}` 引用
- 输出：直接输出 JSON 字符串

### 5. 连线（节点输入映射）

```
Start(100001)
  ↓ query, customerIntent, inputs.*
validate-input(163000)
  ↓ sopInput, validationResult
match-template(163001)
  ↓ matchResult, sopInput
check-completeness(163002)
  ↓ completenessResult, sopInput, matchResult
llm-generate-sop(163003) ← 只在 B类+字段齐全时执行
  ↓ sopGenerationResult
format-output(163004)
  ↓ structured, analysis, outputContext, enrichedContext
End(900001)
```

### 6. 灰度测试方法

在 Coze 的 workflow 调试面板直接输入测试 params：

```json
{
  "query": "帮我拍一下商品照片",
  "customerIntent": "帮我拍一下商品照片",
  "inputs": {
    "customerIntent": "帮我拍一下商品照片",
    "recommendedVasc": {"vascCode": "OSF6V1603", "vascName": "库内其他服务需求"},
    "serviceAtom": "库内其他服务需求",
    "providedFields": {"拍照范围": "SKU WIT005555 全部库存"}
  },
  "customerCode": "TEST001",
  "customerName": "测试客户",
  "username": "gray-test",
  "language": "zh_CN"
}
```

### 7. 预期输出

```json
{
  "structured": {
    "outputPath": "needs_clarification",
    "missingFields": ["照片用途", "拍摄位置/角度", "数量要求"],
    ...
  },
  "analysis": "为了帮您生成完整的 SOP，还需要以下信息：..."
}
```
