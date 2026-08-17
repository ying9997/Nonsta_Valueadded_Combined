# Few-shot 示例（供 Coze **引用**，勿依赖 LLM 读盘）

> **部署到 Coze**：请把**本文件全文**作为知识库条目、上传文档或工作流变量内容，在 **`llm-comment`** LLM 节点的 **「引用」** 中挂载；主 Prompt 使用 `prompts/main.md`，其中 **Few-shot** 一节说明见 `main.md` 的「Coze 引用」段落。
>
> 仓库内保留本文件是为 Git 维护与复制方便，**线上模型看不到文件名**。

## 1. 话术 → expression（可选前置 LLM）

代码节点只接受 `expression` 字符串。

| 用户/客户侧表述 | 建议 expression |
|----------------|-----------------|
| 十二加三再乘四 | `(12+3)*4` |
| 100 除以 5 减 2 | `100/5-2` |
| 一点五乘二 | `1.5*2` |
| 可用库存的两倍再加 10（式内写明仓与 SKU） | `SKU_QTY(wh=USKY5, sku=ABC)*2+10` |

**不要**输出：除 **`SKU_QTY(wh=,sku=)`** / **`SKU_QTY`** 外的变量名、`**` 幂运算、函数调用、中文数字未转换等。

---

## 2. 计算结果 → 点评（主链路 `llm-comment`）

**输入片段示例**（注入到 `computationResult`）：

```json
{
  "analysisResult": {
    "structured": {
      "valid": true,
      "value": 9,
      "expressionNormalized": "(1+2)*3"
    },
    "analysis": "算式 (1+2)*3 = 9。客户侧诉求：试算。"
  }
}
```

**期望模型输出**（JSON）：

```json
{
  "analysisResult": {
    "structured": {
      "highlights": [
        "括号保证先算 1+2，再乘 3"
      ],
      "caveats": [],
      "confidence": "high"
    },
    "analysis": "数值与运算顺序一致；若业务场景强调「拆分步骤展示」，可在对客话术中单列每一步。"
  }
}
```

**失败场景**：当 `valid: false` 且 `errorCode: "invalid_chars"` 时，点评应说明「仅支持四则与括号」，并建议改写算式。若为 `inventory_*`（含 `inventory_ambiguous`、`inventory_placeholder_malformed`），应指向占位符写法、**fetch 节点**与万邑通/Coze 配置，而非算式语法。
