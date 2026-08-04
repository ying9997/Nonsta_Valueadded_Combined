# product-info 专家设计

从知识库获取 PSC/WF/Pallet 尾程产品介绍、规格、限制与增值服务。

## 调用说明

### 适用场景

- 用户查询**尾程产品详情、规格限制、带电政策、时效、保险**等。
- 不适用：需要根据商品推荐产品时，走 `product-consult`。

### 最小入参

- 可无业务字段；至少有 query 或 customerIntent 时更有效。

### 参数提示

- `country` / `destinationCountry`：ISO2 国家码（如 US、DE、UK、AU、CA），择一即可。
- `productLine`：psc / wf / pallet，不传则从 query 文本自动提取。
- 用户原话请放在顶层 `query`。
- `customerIntent` 仅出现在**调用 JSON 顶层**。

### Coze 工作流包

本地维护 `workflow.json` + `nodes/` + `prompts/`；KB 通过 textNode 注入中间过滤节点，按 scope 选择性透传给 LLM。导入 Coze 时执行 `npm run export:coze -- experts/last-mile/product-info`。

### 示例调用

以下为与仓库 **调用约定** 对齐的顶层结构（`customerCode` 等占位可为空串，但键名建议保留，便于上游统一拼装）。

**标准调用模板**

```json
{
  "query": "……",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": { "chainId": "……", "sourceExpertId": "", "previousOutput": {} },
  "inputs": {
    "country": "",
    "destinationCountry": "",
    "productLine": "",
    "enrichedContext": {}
  }
}
```

**示例 1：精确产品名匹配**（文本内可解析出产品与目的国）

```json
{
  "query": "帮我介绍一下FedEx Freight Economy-US (3-7 business days)",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": { "chainId": "pi-001" },
  "inputs": {}
}
```

→ 从 query 提取产品名「FedEx Freight Economy」→ `countryResolved=US`，`productLine=pallet` → kbScope=`direct`。

**示例 2：国家 + 产品线**（亦可把国家/产品线放进 `inputs` 显式传入）

```json
{
  "query": "请问WF发德国都有什么产品",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": {},
  "inputs": { "destinationCountry": "DE", "productLine": "wf" }
}
```

→ `kbScope=wf-DE`；若仅能从文本推断，效果等价于仅传 `query` 且文本含「德国」「WF」。

**其它常见 query 与 kbScope 对应**（省略与模板相同的顶层字段时，请仍保留 `customerCode`/`customerName`/`username`/`language` 占位）：

| query 要点 | kbScope（推断结果） |
|------------|---------------------|
| 仅国家，如「德国有什么尾程产品」 | `all-DE` |
| 仅产品线，如「PSC 标准尾程有什么产品」 | `psc-all` |
| 无法提取国家或产品线，如「你们有什么尾程服务」 | `index` |

## 1. 输入设计

### 1.1 框架顶层（调用边界，不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| query | string | 用户咨询内容，可为空 |
| customerIntent | string | 业务摘要，可为空 |
| inputContext | object | 可选；链式上下文 |

### 1.2 inputs 内业务字段（与 manifest.json 一致）

| 字段 | 类型 | 说明 |
|------|------|------|
| country | string | 目的国 ISO2，上游可选传入 |
| destinationCountry | string | 同 country |
| productLine | string | psc / wf / pallet / ""，上游可选传入 |
| enrichedContext | object | 上游合并上下文 |

## 2. 输出设计

遵循 `docs/design-spec.md` §7 三层输出统一约定，Coze 结束节点固定拉取三个字段：

| 字段 | 来源 | 说明 |
|------|------|------|
| **structured** | format-output `result.structured` | countryResolved、productLine、matchedProducts、confidence |
| **analysis** | format-output `result.analysis` | 产品介绍、规格说明、限制解读（自然语言） |
| **outputContext** | format-output `outputContext` | expertId（固定 `"product-info"`）、resultSummary、chainId（允许空串） |

## 3. 知识库层级与过滤策略

KB 按「索引 → 国家详情」两层组织：

```
索引层（始终加载，~150 行）
├── kb-psc.md     (27 行)  — PSC 产品目录总览 + 国家文件索引
├── kb-wf.md      (101 行) — WF 产品目录总览 + 通用规则 + 国家文件索引
└── kb-pallet.md  (21 行)  — Pallet 产品目录总览 + 国家文件索引

国家详情层（按需加载）
├── PSC:  kb-psc-us.md (171)  kb-psc-uk.md (183)  kb-psc-de.md (155)  kb-psc-au.md (175)  kb-psc-ca.md (79)
├── WF:   kb-wf-us.md (83)    kb-wf-uk.md (51)    kb-wf-de.md (53)    kb-wf-au.md (50)
└── Pallet: kb-pallet-us.md (62)  kb-pallet-de.md (137)
```

**过滤策略**：通过代码节点（load-product-knowledge）按 kbScope 选择性拼接，LLM 只收到聚焦内容：

| kbScope | 加载内容 | 预估上下文 |
|---------|---------|-----------|
| `direct` | 索引 + 匹配产品所在的国家详情文件 | ~200-350 行 |
| `{line}-{country}` 如 `psc-US` | 索引 + 该国家该产品线详情 | ~150-350 行 |
| `all-{country}` 如 `all-DE` | 索引 + 该国家所有产品线详情 | ~350-500 行 |
| `psc-all` / `wf-all` / `pallet-all` | 索引 + 该产品线所有国家详情 | ~400-800 行 |
| `index` | 仅索引 | ~150 行 |

## 4. 工作流编排

```
validate-input → [textNodes: 15 KB + 1 examples] → load-product-knowledge → llm-analyze → format-output
```

1. **validate-input**：校验入参、解析国家码、**模糊匹配产品名**、推断 productLine、确定 kbScope
2. **textNodes**（Coze 文本节点 ×16）：将 15 个 KB .md 文件 + examples.md 注入 load-product-knowledge 节点输入
3. **load-product-knowledge**：接收全量 KB 文本 + kbScope，**选择性拼接**输出 `kbContent`
4. **llm-analyze**：LLM 根据 `kbContent`（聚焦内容）检索产品信息，输出 structured + analysis
5. **format-output**：归一化输出、构建 outputContext

### 数据流图

```
validate-input
    │ outputs: countryResolved, productLine, kbScope, directMatch,
    │          matchedProductNames, enrichedContext, inputContext
    │
    ▼
[textNodes ×15: kb-psc.md, kb-psc-us.md, ..., kb-pallet-de.md]
[textNode ×1: examples.md]
    │
    ▼
load-product-knowledge
    │ inputs: countryResolved, productLine, kbScope, directMatch,
    │         matchedProductNames + 15 KB textNode outputs
    │ outputs: kbContent (聚焦后的 KB), kbScope, countryResolved, productLine
    │
    ▼
llm-analyze
    │ inputs: query, customerIntent, countryResolved, productLine,
    │         matchedProductNames, kbContent, enrichedContext, examplesMd
    │ outputs: analysisResult
    │
    ▼
format-output
    │ inputs: analysisResult, inputContext
    │ outputs: result ({ structured, analysis }), outputContext
    │
    ▼
[endOutputs] §7.3 固定三字段
    │ structured      ← format-output.result.structured
    │ analysis        ← format-output.result.analysis
    │ outputContext   ← format-output.outputContext
```

## 5. 节点说明

### validate-input

校验入参有效性，**所有信息均从 query/customerIntent 文本提取**，结构化字段（inputs）为可选补充。

1. **从文本提取国家**：正则匹配中文/英文国名（"美国"→US, "UK"→UK, "Germany"→DE 等）
2. **从文本提取产品线**：匹配关键词（"WF/履约"→wf, "PSC/标准尾程"→psc, "托盘/pallet/freight"→pallet）
3. **从文本模糊匹配产品名**：内置精简产品目录（~60 条）
   - query 和 customerIntent 整句作为候选
   - 大小写不敏感、子串匹配、alias 匹配
   - 匹配成功时推断 country 和 productLine
2. **kbScope 推断**：
   - 匹配到产品 → `direct`
   - country + productLine 都有 → `{line}-{country}`（如 `psc-US`）
   - 仅 country → `all-{country}`
   - 仅 productLine → `{line}-all`
   - 都没有 → `index`

**输出新增**：`directMatch`（boolean）、`matchedProductNames`（string[]）、`kbScope`（string）

### load-product-knowledge

**过滤路由器**（代码节点，不内嵌 KB 内容）。

接收 textNode 注入的 15 个 KB 字符串 + validate-input 的 kbScope/countryResolved/productLine。

始终输出索引层（kb-psc.md + kb-wf.md + kb-pallet.md），按 kbScope 追加国家详情：

```
kbContent = [索引层（始终包含）]

switch kbScope:
  direct     → 追加 matchedProductNames 对应的 {line}-{country} 国家文件
  psc-US     → 追加 kb-psc-us 内容
  wf-UK      → 追加 kb-wf-uk 内容
  all-DE     → 追加 kb-psc-de + kb-wf-de + kb-pallet-de
  psc-all    → 追加 5 个 PSC 国家文件
  wf-all     → 追加 4 个 WF 国家文件
  pallet-all → 追加 2 个 Pallet 国家文件
  index      → 仅索引，不追加
```

**输出**：`kbContent`（string，聚焦后的 KB）、`kbScope`、`countryResolved`、`productLine`

### llm-analyze

LLM 推理节点，prompt 见 `prompts/main.md`。

输入从 15 个 KB 变量简化为 1 个 `kbContent` 字符串。LLM 直接在 kbContent 中检索产品信息。

kbScope=`index` 时，kbContent 仅有索引目录，LLM 应引导用户指定国家或产品线。

### format-output

归一化 LLM 输出，构建 outputContext（expertId: product-info）。与当前逻辑一致。

## 6. KB 维护

KB 文件位于 `prompts/kb-*.md`，通过 coze.config.yml textNodes 注入 load-product-knowledge 节点。

- **更新 KB**：修改对应 .md 文件，重新 `npm run export:coze` 即可，无需修改代码节点
- **新增国家**：在 prompts/ 新建 kb-{line}-{country}.md，在 validate-input 的 PRODUCT_CATALOG 增加该国家产品条目，在 load-product-knowledge 的路由表增加该国家分支
- **新增产品线**：新建 kb-{line}.md 索引文件 + 各国家详情文件，同步更新 PRODUCT_CATALOG 和路由表

## 7. FaaS 单文件节点（nodes/）

| 节点文件 | 说明 |
|----------|------|
| `validate-input.ts` | 校验 + 国家解析 + 产品名模糊匹配 + kbScope 推断 |
| `load-product-knowledge.ts` | 过滤路由器（接收 textNode KB，按 scope 选择性输出） |
| `llm-analyze.ts` | LLM 声明（非可执行代码） |
| `format-output.ts` | 输出格式化 |
