# 任务：为 Coze workflow 生成逐节点调试手册

## 背景

Coze staging 上已导入 `nonstandard_sop_guide_staging_1` workflow，链路为：

```
Start → validate-input → match-template → check-completeness → llm-generate-sop → format-output → End
```

现在 LLM 节点输出 notActionable（不应该），需要逐节点排查。

## 需要 Codex 做的事

### 1. 读取以下文件理解每个节点的逻辑：

```
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\validate-input.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\match-template.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\check-completeness.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\coze-package\nodes\format-output.ts
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\prompts\main.md
```

### 2. 用下面这个测试输入，手动推演每个节点的预期输入和输出

测试输入（粘贴到 Coze workflow 的 Start 节点）：
```json
{
  "_input": {
    "customerCode": "EVAL_VASC000000310245",
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "customerName": "评测客户",
    "inputContext": {},
    "inputs": {
      "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
      "exceptionCode": "",
      "exceptionName": "",
      "recommendedVasc": { "vascCode": "OSF6V1603", "vascName": "库内其他服务需求" },
      "serviceAtom": "库内其他服务需求",
      "providedFields": {},
      "enrichedContext": {}
    },
    "language": "zh_CN",
    "query": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "username": "eval-test"
  }
}
```

### 3. 输出一份逐节点调试手册，格式如下：

对每个节点写清楚：

```
## 节点 X: {节点名}

### 预期输入
{这个节点应该收到的 JSON}

### 预期输出
{这个节点应该输出的 JSON}

### 排查点
- 在 Coze 调试面板中对比实际输入/输出和这里的预期
- 如果不一致，可能原因是什么
```

### 4. 特别注意 LLM 节点

对 llm-generate-sop 节点，除了输入输出，还要写清楚：
- LLM 实际收到的完整 prompt 应该长什么样（变量替换后的完整文本）
- 正确的输出应该是什么
- 如果输出了 notActionable，变量替换可能出了什么问题

### 5. 对比参考

对比成功运行的 workflow YAML 中 LLM 节点的完整配置：
```
D:\da\experts-push\experts\value-add\value-add-product-recommendation-v2\workflow\workflow\value_add_product_recommendation_v2-draft.yaml
```
搜索 `title: llm-recommend`，对比其 llmParam 配置、node_inputs 配置、systemPrompt 变量引用方式和我们的差异。

### 6. 最终输出

写一份 `debug-node-by-node.md`，放在：
```
D:\da\ai-cs-expert-study\study\value-add-ai\experts\nonstandard-sop-guide\debug-node-by-node.md
```

包含：
1. 逐节点的预期输入/输出 JSON
2. LLM 节点变量替换后的完整 prompt 文本
3. 和参考 workflow 的 LLM 节点配置差异清单
4. 修复建议（具体到在 Coze UI 上改什么）
