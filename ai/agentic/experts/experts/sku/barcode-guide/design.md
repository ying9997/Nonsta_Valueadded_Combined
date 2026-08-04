# sku/barcode-guide 专家设计

对客专家：海外仓商品条码打印、第三方商品/单品条码增删查指引，以及仓内扫不上排查。KB + LLM 为主路径；首期不代客调用打标/绑码/删码写接口。

---

## 调用说明

### 适用场景

- 客户询问如何**打印 Winit 商品条码标签**（带/不带单品信息）。
- **添加 / 删除 / 查看**第三方商品码与单品条码（含 FNSKU 绑定）。
- 仓内**扫不上码**排查（未绑码、管理模式、错码）。
- 待办「**缺第三方商品条码**」如何补。
- 承接 `inbound-exception-check` / value-add 条码类异常中「客户不知如何绑码」的 handoff。
- **不适用**：包裹条码异常增值作业（→ `value-add`）；SKU 注册本身 / 急需打印条码的**加急入口**（→ `registration-guide`）；SKU 属性事实只读（→ `sku/profile`）。

### 最小入参

- `inputs.topic` 或 `inputs.intentType` 描述咨询主题

### 参数提示

- `intentType` 建议枚举：`print` / `third_party_add` / `third_party_delete` / `third_party_query` / `scan_fail` / `general`
- `intentSource` 为内部归一化结果：`explicit` 表示调用方明确传入有效 intent，`detected` 表示从文本动作识别，`fallback` 表示未识别到具体动作
- `skuCode`：与打标 API 的 `productCode` 同义；有则写入指引更具体
- `skuCodeThird`：绑码/查删场景建议提供
- `supervisorMode`：`SI`（单品化）/ `SKU`（商品化）；影响是否需要返回 S 码的打印接口选择说明
- 删除三方码：OpenAPI 删除文档 **Gap** → 指引万邑联自助路径；无法操作时 `need_human`，不假装有 delete action
- 包裹作业异常（贴错标、作业返工）→ `handoff_value_add`
- 明确的绑码或扫码失败意图不因缺少商品编码被截断：先给通用 SOP，再通过 `missingInfo` 补齐必要信息
- S 码反查、单商品编码绑定多个第三方码、改名后的条码变化和 RM 前缀均属于未证实能力；收集人工核实信息后 `need_human`

### 示例调用

**示例 1：打印标签**

```json
{
  "query": "指导客户打印海外仓商品条码标签",
  "customerIntent": "客户问怎么打印商品条码",
  "inputContext": { "chainId": "case-20260713-030" },
  "inputs": {
    "topic": "打印商品条码",
    "intentType": "print",
    "skuCode": "FGBX001",
    "supervisorMode": "SI"
  }
}
```

**示例 2：绑定三方码**

```json
{
  "query": "指导客户绑定第三方商品条码",
  "customerIntent": "客户说待办缺第三方商品条码，怎么补",
  "inputContext": { "chainId": "case-20260713-031" },
  "inputs": {
    "topic": "缺第三方商品条码",
    "intentType": "third_party_add",
    "skuCode": "SKU000123",
    "skuCodeThird": "A0092983991"
  }
}
```

**示例 3：删除三方码**

```json
{
  "query": "指导客户删除第三方编码",
  "customerIntent": "客户问怎么删掉错误的三方条码",
  "inputContext": { "chainId": "case-20260713-032" },
  "inputs": {
    "topic": "删除三方编码",
    "intentType": "third_party_delete",
    "skuCode": "SKU000123"
  }
}
```

**示例 4：扫不上**

```json
{
  "query": "排查仓库扫不上商品条码",
  "customerIntent": "仓库反馈扫不上这个 SKU 的码",
  "inputContext": {
    "chainId": "case-20260713-033",
    "sourceExpertId": "inbound/inbound-exception-check"
  },
  "inputs": {
    "topic": "仓库扫不上码",
    "intentType": "scan_fail",
    "skuCode": "LCD-IP5-01"
  }
}
```

---

## 1. 输入设计

| 字段 | 必填 | 说明 |
|------|------|------|
| topic / intentType | 其一 | 主题或意图 |
| skuCode | 否 | 商品编码（= productCode） |
| skuCodeThird | 否 | 第三方商品条码 |
| supervisorMode | 否 | SI / SKU |

## 2. 数据拉取（可选只读）

| 场景 | API | fetchProfile |
|------|-----|--------------|
| 查已绑三方码 / 管理模式 | `winit.item.page.list` | `barcode_third` |
| 缺三方码待办清单 | `winit.item.page.list` + `querySupplementType=SUPPLEMENT_THRID_SKU` | `supplement_third_sku` |
| 按明确的第三方商品码反查 SKU | `thirdItemCodes` 参数 | `barcode_third` |

`thirdItemCodes` 查询能力不等于仅凭 S 码即可反查商品编码；S 码反查无法由当前证据确认时必须转人工。

剪枝与 LLM 边界：[sku-data-fetch-strategy.md](../../docs/plan/sku-data-fetch-strategy.md) — LLM 仅收 `barcodeSnapshot`（`skuCodeThirds`、`supervisorMode`），不收原始 `list[]`。

## 3. 输出设计

| 字段 | 说明 |
|------|------|
| structured.branch | 见 branch 枚举 |
| structured.sopSteps | 可执行步骤 |
| structured.confidence | high / medium / low |
| analysis | 对客说明 |

**branch**：`guide_print` / `guide_third_party_add` / `guide_third_party_delete` / `guide_third_party_query` / `guide_scan_fail` / `need_info` / `need_human` / `handoff_value_add`

输出保护：

- 对客文本不输出 `productCode`、`skuCode`、`skuCodeThird` 等内部字段名。
- 空 LLM 输出不得按 intent 默认包装为成功引导分支，统一降级为 `need_human`，并使用低置信度说明。
- 仅返回 branch、没有有效对客说明或业务 SOP 的残缺 LLM 输出降级为 `need_info`；`general` 缺少 branch 时也不得默认成打印分支。
- `third_party_add` 的 `need_info` 只有在 intent 明确传入，或文本包含绑定/新增动作时才可恢复为操作指引；纯条码名词保持澄清。
- 从 `need_info` 恢复为绑码或扫码排查分支时，必须合并标准 SOP，不能只保留补参步骤。
- 系统查询到绑定或可用状态不等于仓库扫描已经生效；需要验证识别效果时必须要求仓库复扫。
- 打印数量按实际贴标对象和单品数量确定，不从箱数直接推导；PDF 顺序为生成或获取、下载或保存、核对后打印。

## 4. DAG

`validate-intent` → `resolve-barcode-fetch`（可选）→ textNodes(KB) → `load-barcode-kb` → `llm-analyze` → `format-output`

- `third_party_query` / `print` / `scan_fail`：有 `skuCode` 时可走 `barcode_third` 只读增强
- `supplement_third_sku` 待办：列表查询 + 截断摘要（前 10 条示例 + 总数）

首期不代客写 API；只读插件为 P2 增强。

## 5. 本地回归

不调用 LLM、Coze 或 Winit OpenAPI：

```bash
npx ts-node -P scripts/tsconfig.json scripts/check-sku-barcode-guide-regressions.ts
```

## 6. 降级与边界

- 不代客调用 `winit.singleitem.label.print(.v2)`、`batchSaveSkuCodeThird`、`importThirdByApi`
- 删除 action 文档 Gap：自助 + 人工
- 包裹条码作业 → `handoff_value_add`
- 「急需打印条码」加急 → 仍由 `registration-guide` 承接加急入口
