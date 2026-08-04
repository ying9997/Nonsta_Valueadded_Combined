# product-consult 专家设计

根据客户的商品属性和业务需求，从知识库推荐最适合的尾程产品和服务方案。与 `product-info`（查产品详情）不同，本专家解决的是**"用哪个产品"**的推荐问题。

## 调用说明

### 适用场景

- 客户咨询**"发什么产品""推荐什么渠道""选哪种方案"**——需要根据商品属性、目的地、时效偏好等做出推荐。
- 不适用：已锁定产品名称仅查规格/限制时，走 `product-info`。

### 最小入参

- 可无业务字段（`inputs` 为空对象）；提供信息越多，推荐越精准。
- 最小有效输入：`country`（或从 query 可提取国家）。

### 参数提示

- `country` / `destinationCountry`：ISO2 国家码（如 US、DE、UK、AU、CA），择一即可。
- `goodsType`：货型（大件 / 中件 / 小件 / 超大件异型 / 单托木箱 / LTL / FTL），影响推荐层级。
- `goodsWeight`：商品重量（如 30kg、5lb）。
- `goodsDimensions`：商品尺寸（如 60×40×40cm）。
- 用户原话请放在顶层 `query`，不要塞进 `manifest` 业务字段。
- `customerIntent` 仅出现在**调用 JSON 顶层**。

### Coze 工作流包

本地维护 `workflow.json` + `nodes/` + `prompts/`；KB 通过 textNode 注入中间路由节点，按国家选择性透传给 LLM。导入 Coze 时执行 `npm run export:coze -- experts/last-mile/product-consult`。

### 示例调用

**示例 1：推荐产品（有明确国家+商品信息）**

```json
{
  "query": "我有5kg电子产品含内置锂电池，发美国独立站，推荐什么尾程产品",
  "customerIntent": "需要产品推荐",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": { "chainId": "pc-001" },
  "inputs": {
    "country": "US",
    "goodsWeight": "5kg"
  }
}
```

→ 国家=US，5kg→中件（≤10kg）→ 查 KB US 中件行，按时效档推荐。

**示例 2：大件推荐**

```json
{
  "query": "大件家具发美国，30kg，60x40x40cm",
  "customerIntent": "产品推荐",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": {},
  "inputs": {
    "country": "US",
    "goodsType": "大件",
    "goodsWeight": "30kg",
    "goodsDimensions": "60x40x40cm"
  }
}
```

→ 国家=US，30kg→大件（≤31.5kg），60×40×40 → 查 KB US 大件行，推荐 FedEx Ground / UPS Ground 等。

**示例 3：信息不足，引导补充**

```json
{
  "query": "发德国用什么产品好",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": {},
  "inputs": {
    "destinationCountry": "DE"
  }
}
```

→ 国家=DE 但无商品信息 → 列出德国可用承运商概览 + 引导补充货型/重量。

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
| country | string | 目的国 ISO2 |
| destinationCountry | string | 同 country |
| goodsType | string | 货型描述（大件/中件/小件/超大件/托盘） |
| goodsWeight | string | 商品重量 |
| goodsDimensions | string | 商品尺寸 |
| enrichedContext | object | 上游合并上下文 |

## 2. 输出设计

遵循 §7 三层输出统一约定：

| 字段 | 来源 | 说明 |
|------|------|------|
| **structured** | format-output `result.structured` | countryResolved、recommendedProducts、missingInfo、confidence |
| **analysis** | format-output `result.analysis` | 推荐方案的自然语言解读 |
| **outputContext** | format-output `outputContext` | expertId（固定 `"product-consult"`）、resultSummary、chainId |

### structured 字段设计

```json
{
  "countryResolved": "US",
  "recommendedProducts": [
    {
      "name": "FedEx Ground",
      "tier": "标准",
      "reason": "30kg≈66lbs，10-200磅/件 US本土可派，大件首选",
      "sellingPoints": ["单仓：3日达95%达成", "多仓：2日达95%达成"]
    }
  ],
  "missingInfo": ["是否含电池"],
  "confidence": "high"
}
```

| 字段 | 说明 |
|------|------|
| `countryResolved` | ISO2 国家码，未解析时为 "" |
| `recommendedProducts` | 推荐产品列表，每项含 name/tier/reason/sellingPoints |
| `missingInfo` | 缺失的关键信息列表 |
| `confidence` | high（信息充分）/ medium（部分缺失但可推断）/ low（关键信息不足） |

## 3. 推荐决策逻辑

### 3.1 件型分类体系

KB 中每个国家均按统一的件型分类组织，LLM 需先根据客户提供的商品属性（重量/尺寸）判定件型，再查对应矩阵推荐。

#### 2C 包裹件型

| 件型 | 长(cm) | 宽(cm) | 高(cm) | 重量(kg) | 体积(m³) |
|------|--------|--------|--------|----------|----------|
| 小件 | ≤50 | ≤40 | ≤13 | ≤3 | ≤0.01 |
| 中件 | ≤70 | ≤40 | ≤25 | ≤10 | ≤0.07 |
| 大件 | ≤120 | ≤100 | ≤80 | ≤31.5 | ≤0.96 |
| 超大件/异型 | ≤300 | ≤240 | ≤200 | ≤100 | ≤14.4 |
| 超超大件 | >300 | >240 | >200 | >100 | — |

> 判定规则：长、宽、高、重量、体积**全部符合**的前提下，同时命中多个档位归为最低一档。异形件以凸出部分顶点为测量端点。UK 和 AU 的部分渠道（XDP 2 Man Delivery、Toll IPEC Freight 等）支持超超大件。

#### 2B 托盘/货运件型

| 件型 | 说明 |
|------|------|
| 单托/木箱 | 单个托盘或木箱包装 |
| LTL(<6plt) | 零担运输，少于6个托盘 |
| LTL(7-12plt) | 零担运输，7-12个托盘 |
| FTL | 整车运输 |

### 3.2 时效档位

各国支持的时效档位不同：

| 国家 | 经济7日达 | 标准5日达 | 快捷3日达 | 快捷隔日达 | 快捷次日达 |
|------|----------|----------|----------|----------|----------|
| US | ✓ | ✓ | ✓ | ✓ | ✓ |
| UK | — | ✓ | ✓ | ✓ | ✓ |
| DE | — | ✓ | ✓ | ✓ | ✓ |
| AU | ✓ | ✓ | ✓ | ✓ | ✓ |
| CA | ✓ | ✓ | ✓ | ✓ | ✓ |

### 3.3 推荐流程

```
Step 1: 定位国家 → 确定可用产品范围（加载对应国家 KB）
Step 2: 判定件型 → 根据尺寸/重量匹配到小件/中件/大件/超大件/托盘
Step 3: 匹配产品 → 查 KB 矩阵中该件型×时效档位的可用渠道
Step 4: 附带卖点 → 对 US 额外输出 Case 推荐（单仓/多仓差异）和增值服务
Step 5: 标注缺失 → 缺少件型或时效偏好时降低 confidence
```

### 3.4 件型判定规则（LLM 执行，非代码节点硬编码）

| 条件 | 判定 | 查 KB 行 |
|------|------|---------|
| 任一尺寸>300cm 或重量>100kg | 超超大件 | 超超大件行（仅 UK/AU 有） |
| 任一尺寸>120cm 或重量>31.5kg | 超大件/异型 | 超大件/异型行 |
| 任一尺寸>70cm 或重量>10kg | 大件 | 大件行 |
| 任一尺寸>50cm 或重量>3kg | 中件 | 中件行 |
| 全部≤50×40×13 且≤3kg | 小件 | 小件行 |
| 需托盘/整车运输 | 2B件型 | 单托/木箱 → LTL → FTL 行 |
| 信息不足 | 无法判定 | 列出所有件型概览 + 引导补充 |

### 3.5 各国推荐特点

**US**（最详细）：
- 2C 矩阵覆盖 超大件/异型、大件、中件、小件
- 2B 矩阵覆盖 单托/木箱、LTL(<6plt)、LTL(7-12plt)
- 额外提供：中小件 Case 推荐（Express/Standard/Economy 三档 × 推荐标记 + 单仓/多仓卖点）、大件 Case 推荐（一单一件/一单多件/托盘服务）、增值服务

**UK/DE/AU/CA**：
- 2C 矩阵覆盖各件型×时效档位，LLM 直接查表匹配
- 2B 矩阵以"渠道 | 时效"简洁格式呈现
- UK/AU 特有"超超大件"概念，部分渠道支持超出超大件限制的货物

## 4. 知识库层级与过滤策略

KB 按「国家详情」单层组织（无独立索引文件），每个国家文件内部自带货型定义参考：

```
国家详情层（按需加载，每个文件自含货型定义 + 2C矩阵 + 2B矩阵）
├── kb-delivery-us.md  — US 推荐（含 Case 推荐 + 增值服务）
├── kb-delivery-uk.md  — UK 推荐（含超超大件）
├── kb-delivery-de.md  — DE 推荐
├── kb-delivery-au.md  — AU 推荐（含超超大件）
└── kb-delivery-ca.md  — CA 推荐
```

**过滤策略**：通过代码节点（load-knowledge）按 kbScope 选择性拼接：

| kbScope | 加载内容 | 说明 |
|---------|---------|------|
| `delivery-us` | kb-delivery-us.md | US 推荐详情 |
| `delivery-uk` | kb-delivery-uk.md | UK 推荐详情 |
| `delivery-de` | kb-delivery-de.md | DE 推荐详情 |
| `delivery-au` | kb-delivery-au.md | AU 推荐详情 |
| `delivery-ca` | kb-delivery-ca.md | CA 推荐详情 |
| `index` | 提示语 | 未指定国家，引导用户 |

## 5. 工作流编排

```
validate-input → [textNodes: 5 KB + 1 examples] → load-knowledge → llm-analyze → format-output
```

1. **validate-input**：校验入参、解析国家码、提取商品信息、确定 kbScope
2. **textNodes**（Coze 文本节点 ×6）：将 5 个 KB .md 文件 + examples.md 注入
3. **load-knowledge**：接收 textNode 输出 + kbScope，**选择性输出**对应国家 KB
4. **llm-analyze**：LLM 根据 `kbContent` 推荐产品和服务方案
5. **format-output**：归一化输出、构建 outputContext

### 数据流图

```
validate-input
    │ outputs: valid, countryResolved, goodsInfo, kbScope, enrichedContext, inputContext
    │
    ▼
[textNodes ×5: kb-delivery-{us,uk,de,au,ca}.md]
[textNode ×1: examples.md]
    │
    ▼
load-knowledge
    │ inputs: countryResolved, kbScope + 5 KB textNode outputs
    │ outputs: kbContent, countryResolved
    │
    ▼
llm-analyze
    │ inputs: query, customerIntent, countryResolved, goodsInfo,
    │         kbContent, enrichedContext, examplesMd
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

## 6. 节点说明

### validate-input

校验入参、解析国家码、提取商品信息。核心职责：

1. **国家解析**：从 country / destinationCountry / enrichedContext 提取 ISO2 码
2. **商品信息提取**：从 inputs 结构化字段提取 goodsInfo（type/weight/dimensions）
3. **kbScope 推断**：
   - 有国家 → `delivery-{country}`（如 `delivery-us`）
   - 无国家 → `index`

### load-knowledge

**过滤路由器**（代码节点，不内嵌 KB 内容）。

按 kbScope 选择对应国家 KB 输出：

```
switch kbScope:
  delivery-us → 输出 kb-delivery-us.md
  delivery-uk → 输出 kb-delivery-uk.md
  delivery-de → 输出 kb-delivery-de.md
  delivery-au → 输出 kb-delivery-au.md
  delivery-ca → 输出 kb-delivery-ca.md
  index       → 输出"请指定目的国（US/UK/DE/AU/CA）以获取产品推荐。"
```

### llm-analyze

LLM 推理节点，prompt 见 `prompts/main.md`。

LLM 拿到 kbContent 后按推荐决策逻辑（§3）执行推荐。关键原则：

1. 只推荐 kbContent 中存在的产品
2. 先判定件型（根据尺寸/重量），再查对应矩阵行
3. 按客户时效偏好匹配具体渠道
4. US 额外输出 Case 推荐（推荐标记 + 单仓/多仓卖点）
5. 标注缺失信息并降低 confidence

kbScope=`index` 时，LLM 应列出可用国家概览，引导用户指定国家。

### format-output

归一化 LLM 输出，构建 outputContext（expertId: product-consult）。

## 7. KB 维护

KB 文件位于 `prompts/kb-*.md`，通过 coze.config.yml textNodes 注入 load-knowledge 节点。

每个 KB 文件统一包含三节：
1. **货型定义参考**：小件/中件/大件/超大件的尺寸/重量/体积阈值
2. **2C 包裹推荐矩阵**：件型 × 时效档位 → 可用渠道
3. **2B 托盘推荐矩阵**：件型 → 渠道 + 时效

US 额外包含：中小件 Case 推荐、大件 Case 推荐、增值服务。

维护操作：
- **更新推荐规则**：修改对应国家 .md 文件，重新 `npm run export:coze` 即可
- **新增国家**：新建 kb-delivery-{country}.md，在 load-knowledge 路由表增加该国家分支，在 coze.config.yml 增加 textNode 和 inputBinding

## 8. 与其他专家的关系

由上游 recaller 编排，专家之间不直接调用：

| 专家 | 职责 | 关系 |
|------|------|------|
| **product-consult**（本专家） | 推荐"用哪个产品" | 先行：根据客户情况推荐产品 |
| **product-info** | 介绍"产品是什么" | 后续：客户想了解推荐产品的详细规格 |
| **delivery-status** | 查"货到哪了" | 独立：物流状态追踪 |
| **tracking-inquiry** | 查"异常怎么处理" | 独立：异常件查询 |

典型 recaller 编排：`product-consult → product-info`（先推荐，再查详情）。

## 9. FaaS 单文件节点（nodes/）

| 节点文件 | 说明 |
|----------|------|
| `validate-input.ts` | 校验 + 国家解析 + 商品信息提取 + kbScope 推断 |
| `load-knowledge.ts` | 过滤路由器（接收 textNode KB，按 scope 选择性输出） |
| `llm-analyze.ts` | LLM 声明（非可执行代码） |
| `format-output.ts` | 输出格式化 |
