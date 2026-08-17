# nonstandard_sop_guide_staging_1 逐节点调试手册

本文按 `debug-coze-task.md` 要求，用给定 Start 输入手动推演每个节点的预期输入/输出，并重点对比 `llm-generate-sop` 与 `experts-push` 中成功运行的 `llm-recommend` 节点配置差异。

关键结论：

1. 按当前源码推演，测试输入会通过 `validate-input`，命中 B 类场景 `指定单品/库位商品更换标签上架`。
2. 但 `check-completeness` 只检查 `providedFields` 的字段键，不会从 `customerIntent` 自然语言中抽取 SKU/入库单；本测试输入的 `providedFields` 是 `{}`，所以预期输出应是 `needs_clarification`，不是进入 SOP 生成。
3. 如果 Coze 调试面板里看到 `llm-generate-sop` 输出 `notActionable`，优先排查 LLM 节点变量绑定和条件连线：当前 staging YAML 中 LLM 只绑定了 `sopInput/matchResult/completenessResult`，缺少 `query/customerIntent/kbSopTemplates`；部分导入包还把 `prompt` 写成 `客户意图：{{sopInput}}`，容易让模型只看到对象而不是清晰意图。

## 测试输入

Start 节点收到：

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
      "recommendedVasc": {
        "vascCode": "OSF6V1603",
        "vascName": "库内其他服务需求"
      },
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

Coze Start 节点实际向后暴露的是 `_input` 内的字段，即 `query/customerIntent/inputContext/inputs/customerCode/customerName/username/language`。

## 节点 1: validate-input

### 预期输入

`validate-input` 的 YAML 绑定来自 Start 节点：

```json
{
  "query": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
  "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
  "inputs": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "exceptionCode": "",
  "exceptionName": "",
  "recommendedVasc": {
    "vascCode": "OSF6V1603",
    "vascName": "库内其他服务需求"
  },
  "serviceAtom": "库内其他服务需求",
  "providedFields": {},
  "enrichedContext": {}
}
```

### 预期输出

```json
{
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "validationResult": {
    "ok": true
  }
}
```

### 排查点

- `validationResult.ok` 必须是 `true`。如果是 `named_service`，说明 `recommendedVasc` 被错传成 A 类命名服务。
- `serviceAtom` 应是 `库内其他服务需求`，或 `recommendedVasc.vascCode` 应是 `OSF6V1603/OSF6V1841`。否则会被判定为非兜底原子。
- `sopInput.customerIntent` 必须保留完整换标/入库单文本。如果为空，检查 Start 节点是否把用户输入包在 `_input` 下但 Coze 字段没有正确展开。

## 节点 2: match-template

### 预期输入

来自 `validate-input`：

```json
{
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "validationResult": {
    "ok": true
  }
}
```

### 预期输出

`customerIntent` 包含关键词 `补贴标签`，命中场景 6；没有命中其他更高分场景，置信度为 `low`。

```json
{
  "matchResult": {
    "matched": true,
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "confidence": "low",
    "candidateScenarios": [
      {
        "id": 6,
        "name": "指定单品/库位商品更换标签上架",
        "category": "B",
        "score": 1
      }
    ]
  },
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  }
}
```

### 排查点

- 如果 `matched=false/no_keyword_match`，检查 `sopInput.customerIntent` 是否为空或换标关键词是否被截断。
- 如果命中 C 类，检查关键词是否被其他 C 类词覆盖；本输入按源码不应命中 C 类。
- `confidence=low` 是当前关键词评分逻辑的正常结果，不代表不能继续；它只说明只命中 1 个关键词。

## 节点 3: check-completeness

### 预期输入

来自 `match-template`：

```json
{
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "matchResult": {
    "matched": true,
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "confidence": "low",
    "candidateScenarios": [
      {
        "id": 6,
        "name": "指定单品/库位商品更换标签上架",
        "category": "B",
        "score": 1
      }
    ]
  }
}
```

### 预期输出

场景 6 的必填字段是 `指定商品/新SKU/入库单`。当前 `providedFields` 是空对象，源码不会从自然语言 `customerIntent` 中抽取字段，所以判定缺 3 个字段。

```json
{
  "completenessResult": {
    "applicable": true,
    "complete": false,
    "missingFields": [
      {
        "field": "指定商品",
        "required": true,
        "clarificationPrompt": "请提供需要换标的商品编码或库位"
      },
      {
        "field": "新SKU",
        "required": true,
        "clarificationPrompt": "更换后的新 SKU 编码是什么？"
      },
      {
        "field": "入库单",
        "required": true,
        "clarificationPrompt": "请提供新入库单号"
      }
    ],
    "providedCount": 0,
    "totalRequired": 3,
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架"
  },
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "matchResult": {
    "matched": true,
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "confidence": "low",
    "candidateScenarios": [
      {
        "id": 6,
        "name": "指定单品/库位商品更换标签上架",
        "category": "B",
        "score": 1
      }
    ]
  }
}
```

### 排查点

- 如果业务预期是“客户意图里有 SKU/入库单就应直接生成 SOP”，当前源码不满足该预期；必须在上游或本节点补一个字段抽取步骤，把 `customerIntent` 解析成 `providedFields`。
- 如果 Coze 面板显示 `complete=true`，检查是否有上游额外填了 `providedFields`。
- 如果 `missingFields` 不是这 3 个字段，检查 `scenarioId` 是否不是 6。

## 节点 4: llm-generate-sop

### 预期输入

按当前 staging YAML，LLM 节点只绑定了以下 3 个变量：

```json
{
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "matchResult": {
    "matched": true,
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "confidence": "low",
    "candidateScenarios": [
      {
        "id": 6,
        "name": "指定单品/库位商品更换标签上架",
        "category": "B",
        "score": 1
      }
    ]
  },
  "completenessResult": {
    "applicable": true,
    "complete": false,
    "missingFields": [
      {
        "field": "指定商品",
        "required": true,
        "clarificationPrompt": "请提供需要换标的商品编码或库位"
      },
      {
        "field": "新SKU",
        "required": true,
        "clarificationPrompt": "更换后的新 SKU 编码是什么？"
      },
      {
        "field": "入库单",
        "required": true,
        "clarificationPrompt": "请提供新入库单号"
      }
    ],
    "providedCount": 0,
    "totalRequired": 3,
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架"
  }
}
```

注意：按业务链路，`completenessResult.complete=false` 时不应该调用 LLM 生成 SOP，应直接进入 `format-output` 输出追问。如果 Coze 当前线性连线强制执行 LLM，LLM 结果也会被后续 `format-output` 忽略。

### LLM 实际收到的完整 prompt 应该长什么样

如果采用源码 `prompts/main.md` 的设计，并正确绑定 `customerIntent/matchResult/sopInput/kbSopTemplates`，变量替换后 prompt 应类似下面这样。`kbSopTemplates` 至少应包含场景 6 的模板；当前 staging YAML 没有绑定该变量，若不修复这里会是空值或原始占位符。

````text
# 入库非标增值 SOP 生成

## 角色

你是万邑通入库非标增值 SOP 撰写专家。你的任务是根据客户在入库环节遇到的异常或特殊需求，生成**仓库操作指引**。

## 业务背景

客户货物在入库过程中出现异常（如条码异常、包装破损、商品需辨识等），无法走标准增值流程，需要提交"入库非标增值（特批）"。本 SOP 是告诉仓库怎么处理这批异常货物的操作指引。

## 核心视角

生成的 SOP 会：
1. 先展示给**客户确认**："这是仓库将要为您执行的操作，请确认是否正确"
2. 客户确认后填入增值单的"需求描述"字段，**仓库操作人员**按此执行

因此 SOP 需要：
- 用**仓库执行者视角**写操作步骤（"根据异常单找到包裹""补贴标签后上架"）
- 语言**客户也能看懂**（不用仓库内部缩写，但用业务术语）
- **不写客户侧操作**（如"在系统中注册SKU""开通权限""创建入库单"——这些是前置条件，不属于仓库操作 SOP）

## 意图判断

在生成 SOP 前，先判断客户意图是否为"需要仓库对入库异常货物执行物理操作"：
- ✅ 可生成：补贴标签上架、辨识后换标上架、拍照暂存、拆分后新单上架、组合上架、关联第三方条码上架等
- ❌ 不可生成：咨询费用、查询进度、查看视频、询问流程、申请权限

如果意图不可生成，输出：
```json
{"sopText": "", "scenarioName": "", "fieldsUsed": [], "notActionable": true, "reason": "客户在咨询/查询，非增值操作需求"}
```

## 输入信息

### 客户意图
需求
异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架
商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243
商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922
新入上架入库单号（WI50698772）

### 匹配场景
- 场景ID：6
- 场景名称：指定单品/库位商品更换标签上架

### 客户已提供字段
{}

### 异常上下文
- 异常编码：
- 异常名称：

### SOP 模板参考（从知识库获取）
## 6. 指定单品/库位商品更换标签上架

**模板结构：**
```
【需求背景】
{换标原因：SKU变更/标签错误/客户要求}

【换标明细】
- 指定商品：{商品编码/库位}
- 原SKU：{原编码}
- 新SKU：{新编码}
- 数量：{件数}

【前置条件】
- 新入库单：{入库单号}
- 新标签文件：{已提供/待提供}

【操作步骤】
1. 从指定库位取出商品
2. 移除原标签
3. 贴新SKU标签
4. 按新入库单扫描入库
5. 上架到新库位
6. 系统确认
```

## 生成要求

1. **格式**：
   - 【需求背景】一句话说明为什么需要做这个操作
   - 【操作要求】仓库具体执行步骤（3-6 步，每步一行）
   - 【注意事项】关键提醒（1-3 条，没有则省略）

2. **内容边界**：
   - ✅ 写：仓库物理操作（取货、贴标、拍照、扫描、上架、包装等）
   - ✅ 写：客户提供的具体信息（SKU、单号、数量、标签文件等）
   - ❌ 不写：客户前置操作（注册SKU、创建入库单、开通权限、配置映射）
   - ❌ 不写：系统配置说明、费用说明、流程解释

3. **语言风格**：
   - 祈使句，动词开头（"找到""补贴""扫描""上架"）
   - 引用客户提供的具体值时直接写出（如 "SKU WIT001234"，"入库单 WI50765526"）
   - 缺失的关键信息标注 [待补充]

4. **长度**：严格 150-300 字。仓库操作人员需要简洁指引。

## 输出格式

```json
{
  "sopText": "生成的 SOP 全文",
  "scenarioName": "场景名称",
  "fieldsUsed": ["实际引用的字段列表"]
}
```
````

### 正确的 LLM 输出

如果业务决定这条输入字段已经足够、允许绕过当前 `providedFields` 完整性检查，那么 LLM 不应输出 `notActionable`，而应输出类似：

```json
{
  "sopText": "【需求背景】\n异常单单品条码重复，需根据实物商品标签重新补贴单品标签，SKU 不变，并使用新入库单 WI50698772 上架。\n\n【操作要求】\n1. 找到本次异常单对应的待处理商品\n2. 核对商品标签 SKU MU7871171167 与条码 M010000000006720243，按实物信息补贴正确单品标签\n3. 核对商品标签 SKU MU9306389445-B 与条码 M010000000007422922，按实物信息补贴正确单品标签\n4. 补贴后逐一扫描复核标签信息，确认 SKU 和商品条码与实物一致\n5. 使用新入库单 WI50698772 扫描上架\n\n【注意事项】\n- SKU 保持不变，仅按实物商品标签补贴正确单品标签\n- 上架前确认两组标签信息均与新入库单一致",
  "scenarioName": "指定单品/库位商品更换标签上架",
  "fieldsUsed": ["SKU", "商品条码", "新入库单", "补贴标签要求"]
}
```

但按当前源码的严格推演，`complete=false` 时正确链路是追问，不是 SOP 生成。

### 如果输出了 notActionable，变量替换可能出了什么问题

- `{{customerIntent}}` 未绑定：`coze-import` 版本的 systemPrompt 使用 `{{customerIntent}}`，但 LLM `node_inputs` 只有 `sopInput/matchResult/completenessResult`，没有 `customerIntent`。模型看到的“客户意图”可能为空。
- `{{kbSopTemplates}}` 未绑定：源码 prompt 需要 SOP 模板参考，但当前 LLM 节点没有加载/绑定 `kbSopTemplates`，模型缺少场景模板。
- `prompt` 错写成 `客户意图：{{sopInput}}`：部分导入 YAML 的 user prompt 把整个对象当成客户意图，变量序列化不稳定时可能显示 `[object Object]`、空白或不可读 JSON。
- `responseFormat=0`：当前 staging YAML 用普通文本输出格式，参考成功节点用 `responseFormat=2` JSON；普通文本更容易返回 fenced JSON、解释文字或结构漂移。
- 无条件连线：`check-completeness -> llm-generate-sop -> format-output` 是线性连接。`complete=false` 时仍调用 LLM，会在调试面板里看到不应发生的 LLM 输出。

### 排查点

- 在 LLM 调试面板看“实际 prompt/变量值”：客户意图位置必须出现完整中文需求文本，不能是空白、`{{customerIntent}}` 原样、`[object Object]` 或只有 `{}`。
- 检查 LLM 的输入变量列表是否包含 `query`、`customerIntent`、`sopInput`、`matchResult`、`completenessResult`、`kbSopTemplates`。
- 检查 `completenessResult.complete=false` 时是否还执行了 LLM；如果执行了，说明条件分支缺失。

## 节点 5: format-output

### 预期输入

如果按当前线性 YAML，`format-output` 会收到 `sopGenerationResult`；但由于 `completenessResult.complete=false`，它应该忽略 LLM 输出并走追问分支。

```json
{
  "sopInput": {
    "customerIntent": "需求\n异常单单品条码重复需要根据实物商品标签重新补贴单品标签，sku不变。新单上架\n商品标签sku：MU7871171167 M010000000006720243对应正确贴新sku MU7871171167 M010000000006720243\n商品标签sku：MU9306389445-B M010000000007422922 对应正确贴新sku MU9306389445-B M010000000007422922\n新入上架入库单号（WI50698772）",
    "exceptionCode": "",
    "exceptionName": "",
    "recommendedVasc": {
      "vascCode": "OSF6V1603",
      "vascName": "库内其他服务需求"
    },
    "serviceAtom": "库内其他服务需求",
    "providedFields": {},
    "enrichedContext": {}
  },
  "matchResult": {
    "matched": true,
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "confidence": "low",
    "candidateScenarios": [
      {
        "id": 6,
        "name": "指定单品/库位商品更换标签上架",
        "category": "B",
        "score": 1
      }
    ]
  },
  "completenessResult": {
    "applicable": true,
    "complete": false,
    "missingFields": [
      {
        "field": "指定商品",
        "required": true,
        "clarificationPrompt": "请提供需要换标的商品编码或库位"
      },
      {
        "field": "新SKU",
        "required": true,
        "clarificationPrompt": "更换后的新 SKU 编码是什么？"
      },
      {
        "field": "入库单",
        "required": true,
        "clarificationPrompt": "请提供新入库单号"
      }
    ],
    "providedCount": 0,
    "totalRequired": 3,
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架"
  },
  "sopGenerationResult": "(有条件分支时应为空或不存在；当前线性连线下可能是 LLM 输出)",
  "validationResult": {
    "ok": true
  }
}
```

### 预期输出

```json
{
  "structured": {
    "outputPath": "needs_clarification",
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "missingFields": ["指定商品", "新SKU", "入库单"],
    "clarificationPrompts": [
      "请提供需要换标的商品编码或库位",
      "更换后的新 SKU 编码是什么？",
      "请提供新入库单号"
    ],
    "providedCount": 0,
    "totalRequired": 3
  },
  "analysis": "为了帮您生成完整的 SOP，还需要以下信息：\n1. 请提供需要换标的商品编码或库位\n2. 更换后的新 SKU 编码是什么？\n3. 请提供新入库单号",
  "outputContext": {
    "expertId": "nonstandard-sop-guide",
    "outputPath": "needs_clarification"
  },
  "enrichedContext": {
    "nonstandardSopGuide": {
      "outputPath": "needs_clarification",
      "category": "B",
      "scenarioId": 6,
      "scenarioName": "指定单品/库位商品更换标签上架",
      "missingFields": ["指定商品", "新SKU", "入库单"]
    }
  }
}
```

### 排查点

- 如果最终输出是 `notActionable`，说明 `format-output` 没有收到预期的 `completenessResult`，或 Coze End 节点直接接到了 LLM 输出而不是 `format-output`。
- 如果最终输出是 `sop_generated` 且 `complete=false`，说明 `completenessResult.applicable` 或 `complete` 类型异常，例如字符串 `"false"` 被当成 truthy。
- 如果最终输出是 `needs_clarification`，这是当前源码对本测试输入的正确结果；要生成 SOP 需要先修字段抽取。

## 节点 6: End

### 预期输入

End 节点从 `format-output` 读取：

```json
{
  "structured": {
    "outputPath": "needs_clarification",
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "missingFields": ["指定商品", "新SKU", "入库单"],
    "clarificationPrompts": [
      "请提供需要换标的商品编码或库位",
      "更换后的新 SKU 编码是什么？",
      "请提供新入库单号"
    ],
    "providedCount": 0,
    "totalRequired": 3
  },
  "analysis": "为了帮您生成完整的 SOP，还需要以下信息：\n1. 请提供需要换标的商品编码或库位\n2. 更换后的新 SKU 编码是什么？\n3. 请提供新入库单号",
  "outputContext": {
    "expertId": "nonstandard-sop-guide",
    "outputPath": "needs_clarification"
  },
  "enrichedContext": {
    "nonstandardSopGuide": {
      "outputPath": "needs_clarification",
      "category": "B",
      "scenarioId": 6,
      "scenarioName": "指定单品/库位商品更换标签上架",
      "missingFields": ["指定商品", "新SKU", "入库单"]
    }
  }
}
```

### 预期输出

End 返回同一组变量：

```json
{
  "structured": {
    "outputPath": "needs_clarification",
    "category": "B",
    "scenarioId": 6,
    "scenarioName": "指定单品/库位商品更换标签上架",
    "missingFields": ["指定商品", "新SKU", "入库单"],
    "clarificationPrompts": [
      "请提供需要换标的商品编码或库位",
      "更换后的新 SKU 编码是什么？",
      "请提供新入库单号"
    ],
    "providedCount": 0,
    "totalRequired": 3
  },
  "analysis": "为了帮您生成完整的 SOP，还需要以下信息：\n1. 请提供需要换标的商品编码或库位\n2. 更换后的新 SKU 编码是什么？\n3. 请提供新入库单号",
  "outputContext": {
    "expertId": "nonstandard-sop-guide",
    "outputPath": "needs_clarification"
  },
  "enrichedContext": {
    "nonstandardSopGuide": {
      "outputPath": "needs_clarification",
      "category": "B",
      "scenarioId": 6,
      "scenarioName": "指定单品/库位商品更换标签上架",
      "missingFields": ["指定商品", "新SKU", "入库单"]
    }
  }
}
```

### 排查点

- End 的输入必须来自 `format-output`，不是来自 `llm-generate-sop`。
- 如果 End 返回 LLM 原始 JSON，检查 End 节点变量绑定。

## LLM 节点配置差异清单

参考成功 workflow：`D:\da\experts-push\experts\value-add\value-add-product-recommendation-v2\workflow\workflow\value_add_product_recommendation_v2-draft.yaml` 中 `title: llm-recommend`。

| 配置项 | 成功的 `llm-recommend` | 当前 `llm-generate-sop` 风险 | 影响 |
|---|---|---|---|
| `llmParam.systemPrompt` | 完整 prompt 写在 `systemPrompt`，变量引用都在同一 prompt 内 | `coze-final` 使用简化 prompt；`coze-import` 使用接近 `main.md` 的 prompt，但变量未完全绑定 | prompt 内容与源码 `prompts/main.md` 可能不一致 |
| `node_inputs` | 绑定 `query`、`customerIntent`、`recommendationInput`、`filteredRecommendation`、`intentGuideKb`、`inputContext` 等 prompt 引用变量 | staging 只绑定 `sopInput`、`matchResult`、`completenessResult`；缺 `query/customerIntent/kbSopTemplates` | `{{customerIntent}}`、`{{kbSopTemplates}}` 可能为空或不替换 |
| `prompt` | `prompt` 为空，主要靠 `systemPrompt`，没有把对象误标为客户意图 | 部分导入包 `prompt` 写 `客户意图：{{sopInput}}` | 模型可能没有清晰用户输入，只看到对象或无效字符串 |
| `responseFormat` | `2` | `0` | 成功节点强制 JSON 风格；当前节点可能输出普通文本、代码块或结构漂移 |
| `modelName/modelType` | 显式配置 `豆包·2.0·pro` 和 modelType | 部分 staging YAML 缺失显式 model 配置 | 运行时模型可能使用默认值，行为不可控 |
| `maxTokens` | `4096` | `2048` 或不同导入包不一致 | SOP 短文本通常够用，但与参考成功配置不一致 |
| 输出类型 | 结构化 JSON 由 `responseFormat=2` 保证，后续节点按对象处理 | `coze-final` 的 `sopGenerationResult` 是 string；其他包有 object/string 不一致 | `format-output` 可解析 string，但更容易出现解析失败 |
| 知识库输入 | `intentGuideKb` 由上游 load 节点拼接，并绑定给 LLM | `kbSopTemplates` 在 `workflow.json` 里声明，但 staging YAML 未绑定 | LLM 缺少 SOP 模板参考 |
| 分支控制 | 推荐链路中各节点按过滤/校验后输入进入 LLM | 当前连接是 `check-completeness -> llm-generate-sop` 无条件执行 | 字段不完整时仍调用 LLM，调试面板会出现误导性输出 |

## 具体修复步骤

### 修复 1: 先决定这条输入是否应直接生成 SOP

当前源码的实际行为是追问，因为 `providedFields={}`。如果业务认为客户自然语言里的 SKU 和入库单已足够生成 SOP，需要做字段抽取修复：

1. 在 `validate-input` 后新增 `extract-provided-fields` 代码节点，或直接增强 `check-completeness`。
2. 从 `sopInput.customerIntent` 抽取：
   - `指定商品`: `MU7871171167 M010000000006720243; MU9306389445-B M010000000007422922`
   - `新SKU`: `MU7871171167 M010000000006720243; MU9306389445-B M010000000007422922`
   - `入库单`: `WI50698772`
3. 合并到 `sopInput.providedFields` 后再执行完整性检查。
4. 预期 `check-completeness.complete=true` 后再进入 LLM。

如果不做字段抽取，则本测试输入的正确最终结果就是 `needs_clarification`。

### 修复 2: 给 LLM 增加条件分支

在 Coze UI 中调整连线：

1. 从 `check-completeness` 增加条件分支。
2. 条件 A：`completenessResult.applicable == true && completenessResult.complete == true`，连接到 `llm-generate-sop`。
3. 条件 B：其他情况，直接连接到 `format-output`。
4. `format-output` 保留 `sopGenerationResult` 入参，但允许为空；它会根据 validation/match/completeness 决定输出路径。

这样字段不完整时不会出现 LLM 的 `notActionable` 干扰调试。

### 修复 3: 按 `llm-recommend` 的方式重配 LLM 入参

在 Coze UI 打开 `llm-generate-sop` 节点，输入变量建议配置为：

```yaml
node_inputs:
  - name: query
    ref_node: "100001"
    path: query
  - name: customerIntent
    ref_node: "100001"
    path: customerIntent
  - name: sopInput
    ref_node: "163002"
    path: sopInput
  - name: matchResult
    ref_node: "163002"
    path: matchResult
  - name: completenessResult
    ref_node: "163002"
    path: completenessResult
  - name: kbSopTemplates
    ref_node: "<加载 SOP 模板的节点>"
    path: kbSopTemplates
```

如果暂时没有加载知识库节点，可先把 `prompts/kb-sop-templates.md` 中场景 6 的模板放进一个固定文本/代码节点输出 `kbSopTemplates`，再绑定给 LLM。

### 修复 4: 重写 LLM prompt 变量引用

推荐把源码 `prompts/main.md` 的内容完整复制到 `llmParam.systemPrompt`，并确保变量都来自 `node_inputs`：

````text
### 客户意图
{{customerIntent}}

### 匹配场景
- 场景ID：{{matchResult.scenarioId}}
- 场景名称：{{matchResult.scenarioName}}

### 客户已提供字段
```json
{{sopInput.providedFields}}
```

### 字段完整性
```json
{{completenessResult}}
```

### SOP 模板参考
```text
{{kbSopTemplates}}
```
````

不要在 user `prompt` 里写 `客户意图：{{sopInput}}`。如果需要 user prompt，写：

```text
请根据以上 systemPrompt 和以下客户原始需求生成 SOP：{{customerIntent}}
```

### 修复 5: 对齐成功 LLM 节点的模型和输出配置

在 Coze UI 中把 `llm-generate-sop` 的 LLM 参数调成与 `llm-recommend` 一致或等价：

```yaml
temperature: "0.3" # SOP 生成可低于推荐节点的 0.5
topP: "1"
frequencyPenalty: "0"
maxTokens: "4096"
thinkingType: disabled
responseFormat: "2"
modelName: "豆包·2.0·pro"
modelType: "1772700462"
generationDiversity: balance
enableChatHistory: false
```

并把输出类型统一为对象：

```yaml
node_outputs:
  sopGenerationResult:
    type: object
```

如果 Coze LLM 节点只能输出字符串，`format-output` 当前可兼容 JSON string，但必须要求 LLM 只返回 JSON，不要返回 Markdown 代码块。

### 修复 6: 验证顺序

用同一条测试输入在 Coze 调试面板逐节点验证：

1. `validate-input.validationResult.ok == true`
2. `match-template.matchResult.scenarioId == 6`
3. 未做字段抽取时：`check-completeness.complete == false`，End 输出 `needs_clarification`
4. 做字段抽取后：`check-completeness.complete == true`
5. LLM 实际 prompt 中必须能看到完整 `customerIntent`、场景 6、抽取后的 `providedFields`、SOP 模板
6. LLM 输出必须是：

```json
{
  "sopText": "...",
  "scenarioName": "指定单品/库位商品更换标签上架",
  "fieldsUsed": ["SKU", "商品条码", "新入库单", "补贴标签要求"]
}
```

7. `format-output.structured.outputPath == "sop_generated"`，且 `analysis` 为 SOP 正文。
