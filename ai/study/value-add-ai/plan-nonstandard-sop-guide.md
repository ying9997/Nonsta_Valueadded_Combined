# 计划：增值AI智能化 — 非标增值 SOP 引导 Expert 设计与实现

## Context

用户在做万邑通 AI 客服"增值AI智能化"项目。现有入库增值链路（exception-diagnosis → product-recommendation-v2 → service-config）在推荐非标产品后，客户仍然不知道怎么写需求描述和 SOP。需要新增一个 expert 接在 product-recommendation 之后，专门负责：识别客户场景 → 匹配历史 SOP 模板 → 追问补齐字段 → 生成 SOP 摘要 → 客户确认。

方向变更：先在入库增值范围内做这个非标 SOP 引导 expert，而非库内/出库异常推荐。

---

## 架构定位

```
现有链路：
  exception-diagnosis → product-recommendation-v2 → service-config
                              │
                              │ 推荐了非标 VASC
                              ▼
                    nonstandard-sop-guide (新 Expert) ← 本次新增
                       │ 意图匹配 → 模板匹配 → 追问 → 生成 SOP → 客户确认
                       ▼
                    输出: 对客 SOP 摘要文本（一期纯文本）
```

触发方式：Planner 根据 product-recommendation 输出判断调用。具体条件：上游推荐了非标 VASC **且** 服务项落到"入库其他服务需求"兜底原子（本期只覆盖入库场景）。A 类命名服务（DG商品销毁、货权转移等）不进入本 expert，由 service-config 处理。不修改现有 expert 代码。

---

## 实施步骤

### Step 1: 创建项目目录

```
study/value-add-ai/
├── README.md                              # 增值AI智能化项目总览
├── backlog.md                             # 统一待办
└── experts/
    └── nonstandard-sop-guide/             # 新 expert 完整代码
        ├── manifest.json
        ├── design.md
        ├── workflow.json
        ├── nodes/
        │   ├── validate-input.ts
        │   ├── match-template.ts
        │   ├── check-completeness.ts
        │   ├── format-output.ts
        │   └── llm-generate-sop.ts
        └── prompts/
            ├── main.md
            ├── kb-template-index.md
            ├── kb-sop-templates.md
            └── kb-field-requirements.md
```

### Step 2: 写 manifest.json

```json
{
  "id": "nonstandard-sop-guide",
  "domain": "value-add",
  "name": "非标增值 SOP 引导",
  "description": "当上游推荐了非标增值产品且服务项为兜底原子（入库其他服务需求），为客户匹配历史 SOP 模板、追问缺失字段、生成规范 SOP 摘要并引导确认。Use when 上游 product-recommendation 推荐了非标 VASC 且落到其他服务需求兜底原子，客户需要填写需求描述但不知道怎么写。",
  "version": "1.0.0",
  "x_recaller_propagate_previous_enriched_context": true,
  "x_recaller_enriched_context_preferred_source_experts": [
    "value-add-product-recommendation",
    "value-add-product-recommendation-v2",
    "value-add-exception-diagnosis"
  ]
}
```

### Step 3: design.md 核心设计

**工作流**

```
validate-input → match-template → check-completeness
  ├── B 类 + 字段齐全 → llm-generate-sop → format-output (sop_generated)
  ├── B 类 + 字段不齐 → format-output (needs_clarification, 输出追问清单)
  └── C 类（无模板） → format-output (transfer_human)
```

**输出 outputPath 取值**
- `sop_generated` — B 类场景、字段齐全、SOP 已生成
- `needs_clarification` — B 类场景、字段不齐、输出追问清单
- `transfer_human` — C 类场景、无模板、引导转人工

**知识库**

| KB 文件 | 内容 | 来源 |
|---------|------|------|
| `kb-template-index.md` | 38 个场景的 B/C 分类索引 + 关键词 | `Vas-Nonstandard-Guide/references/库内增值_交叉验证表_知识库×VASC.md` |
| `kb-sop-templates.md` | B 类 23 个场景的 SOP 模板 | `Vas-Nonstandard-Guide/references/库内增值_知识库_SOP模板场景清单.md` |
| `kb-field-requirements.md` | 各场景必填/可选字段及追问话术 | 从 SOP 模板中提取 |

### Step 4: 节点代码

- **validate-input.ts**: 校验服务项为兜底原子（非命名服务），提取异常/意图
- **match-template.ts**: 用客户意图 + 异常编码/描述查 kb-template-index，判断 B/C 分类
- **check-completeness.ts**: 对照 B 类模板的必填字段检查已提供信息
- **llm-generate-sop.ts**: LLM 节点声明
- **format-output.ts**: 四字段标准输出

### Step 5: prompts/main.md

LLM 基于匹配模板 + 客户已提供信息 + 异常上下文生成 SOP 摘要。

---

## 场景清单

**B 类 23 个场景（有模板，走 SOP 生成）：**

| # | 场景名称 | 核心字段 |
|---|---------|---------|
| 1 | 良品/不良品检测 | 检测SKU/检测要求/判定标准/良品处理/不良品处理 |
| 2 | 拆分SKU | 原SKU/拆分后SKU/数量/新入库单/标签文件 |
| 3 | 商品组合 | 主产品/配件/组合方式/新入库单 |
| 4 | 拍摄照片/视频 | 拍照范围/用途/位置/角度/数量要求/命名规范 |
| 5 | 商品尺重测量辨识 | 退货单/测量要求/长宽高/重量 |
| 6 | 指定单品/库位商品更换标签上架 | 指定商品/新SKU/入库单 |
| 7 | 库存冻结/解冻 | SKU/数量/冻结或解冻/原因 |
| 8 | 自提单取消出库 | 出库单/新入库单/异常单/检查项 |
| 9 | 异常重新拍照 | 异常编号/原拍照问题/重新拍照要求/命名规则 |
| 10 | 异常商品转不良品上架 | 检测SKU/判定结果/SKU/数量 |
| 11 | 商品外观辨识+贴标上架 | 商品编码/是否开箱/辨识方法/条码/照片要求 |
| 12 | 更换客制包装 | 包材/新入库单 |
| 13 | 更换商品生产日期标签 | SKU/数量 |
| 14 | 不良品转良品 | SKU/数量/原不良品原因 |
| 15 | 更换SKU做不良品上架 | 原SKU/新SKU/数量 |
| 16 | A+包裹更换标签上架 | A+包裹条码/新入库单 |
| 17 | 指定位置贴标 | SKU/库位/标签类型/贴标要求 |
| 18 | 包装破损商品更换包材重新上架 | 出库单/WINIT包材型号/新入库单/标签文件 |
| 19 | SN采集+管理方式变更+重新上架 | 案例背景/适用条件/前置条件 |
| 20 | 库内仓间调拨 | 调拨SOP |
| 21 | 良品转不良品上架 | 背景/增值单需求描述 |
| 22 | 异常单：自提单取消出库 | 审核要点/短期方案/异常单关闭路径 |
| 23 | WINIT标准包材线下寄件出库 | 采购需求/包材类型/规格/数量/用途/前置条件 |

**C 类 15 个场景（无模板，一期转人工）：**

| # | 场景名称 |
|---|---------|
| 1 | 非标收费 |
| 2 | 辨识拍照后销毁 |
| 3 | 商品改制重新上架 |
| 4 | 库内库存销毁（非DG类） |
| 5 | 采集SN码 |
| 6 | 拆箱辨识后重新更换SKU上架 |
| 7 | 库内辨识+辨识后重新贴标上架 |
| 8 | 商品贴指令性标签+拍照 |
| 9 | 打包完成后作废出库单 |
| 10 | 库内加固 |
| 11 | 商品拆箱加/减配件 |
| 12 | 箱转单一 |
| 13 | 剪轧带/剪绑带 |
| 14 | 单品化管理的SN处理场景 |
| 15 | 单品（S码或SN码）二次上架 |

---

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 触发方式 | Planner 自行判断（方案 B） | 不改现有 expert，符合"expert 不互调"原则 |
| 触发条件 | 推荐了非标 + 落到兜底原子 | A 类已由 service-config 处理，不进入本 expert |
| 一期输出 | 纯文本 SOP 摘要 | 轻量化，后续迭代为结构化 |
| C 类场景处理 | 输出"建议转人工" | 一期不做自主 SOP 生成 |
| 多轮追问 | outputPath=needs_clarification + missingFields | Planner/Judge 看到后重新调用本 expert |

---

## 边界说明

**与 A 类的关系**：A 类（5 个命名服务：货权转移改数/换标、审计盘点、代采购包材物料、DG商品销毁）有专属表单字段，不需要 SOP 生成。流向是 product-recommendation → service-config → 完成。本 expert 的 validate-input 校验服务项不是命名服务，误入则返回错误。

**与现有 v2 kb-nonstandard-sop-2.1 的关系**：v2 的 SOP 切片只有 1 个场景示例。新 expert 覆盖全部 38 个场景，完全取代其 SOP 生成职责。product-recommendation 的职责收窄为：识别非标 → 推荐 → handoff。
