# sku/compliance-check 专家设计

对客专家：海外仓商品**合规深判**——承运/禁限运细则、证书齐备、WEEE/GPSR、申报与电清关链接、品牌备案、解禁条件判定。KB + LLM 为主；有 `skuCode` 时可只读 `winit.item.page.list` 的 `facts_compliance` 切片。不代客上传证书、不解禁写入。

---

## 调用说明

### 适用场景

- `registration-guide` 输出 `handoff_compliance` 后的深判承接。
- 新品链接能否发/入某国，**浅层清单无法覆盖**时的深判话术与转人工登记。
- 缺 MSDS/UN38.3/GPSR、德国 WEEE 类别争议、电商清关销售链接是否合规。
- 已有禁止标记但需判定「解禁条件是否满足」（相对 `guide_unban` 浅层）。

### 不适用

- 注册/加急/属性解除/解禁**浅层操作步骤** → `registration-guide`
- 商品档案事实批量查询 → `sku/profile`
- 查验单进度 → `sku/inspection-status`（未上线则人工）
- 一般入库流程 → `inbound-process-guide`

### 最小入参

- `topic` 或 `intentType` 其一

### 参数提示

- `intentType`：`carriability_deep` / `restricted` / `certificates` / `weee` / `ecommerce` / `brand` / `unban_deep` / `declaration` / `general`
- `importCountryCode`：国别合规强烈建议提供
- `productLink`：承运 / 电清关场景建议提供
- 若上游有 `sku/profile` 快照，经 `inputContext` 读取，避免重复拉数

---

## 1. 输入设计

| 字段 | 必填 | 说明 |
|------|------|------|
| topic / intentType | 其一 | 主题或意图 |
| skuCode | 否 | 商品编码 |
| importCountryCode | 否 | 进口国 |
| productLink | 否 | 商品链接 |
| categoryHint | 否 | 品类自述 |

---

## 2. 数据拉取

| 场景 | API | fetchProfile |
|------|-----|--------------|
| 有 skuCode 且 intent∈证书/申报/解禁深判/WEEE | `winit.item.page.list` | `facts_compliance` |
| 上游已有 profile 快照 | 不拉 | 复用 `profileSnapshot` |
| 纯链接承运 / 无 sku | 无 API | KB only |

剪枝见 [sku-data-fetch-strategy.md](../../docs/plan/sku-data-fetch-strategy.md)。LLM 只收 `complianceSnapshotText`，不收 raw JSON。

---

## 3. DAG

```text
validate-intent
  → resolve-compliance-fetch
  → build-compliance-page-list
  → [plugin page.list]
  → fetch-compliance-snapshot
  → load-compliance-kb（+ textNodes）
  → llm-analyze
  → format-output
```

---

## 4. 输出设计

| 字段 | 说明 |
|------|------|
| structured.branch | 见枚举 |
| structured.complianceVerdict | `pass` / `fail` / `uncertain` / `need_human` |
| structured.missingDocuments | 缺失证书/资料列表 |
| structured.sopSteps | 可执行步骤 |
| structured.confidence | high / medium / low |
| analysis | 对客说明 |

**branch**：`verdict_carriability` / `guide_restricted` / `guide_certificates` / `guide_weee` / `guide_ecommerce` / `guide_brand` / `guide_declaration` / `guide_unban_criteria` / `handoff_registration` / `need_info` / `need_human`

---

## 5. 对客约束

- 不引用飞书链接、内部 API 名；路径用「万邑联 → …」
- 不代客上传证书、不代解禁写入
- 禁限运清单无结构化 API → 指引公告下载 + 无法判定则 `need_human`
- `prohibitSource=manual` → 优先 `need_human`

---

## 6. 依赖 KB

- flows/01、05、07；appendix WEEE / 电清关链接规则
- 禁限运清单：公告附件（无 API）
