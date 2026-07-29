# Codex C Prompt — 入库段增值产品×原子全量清单提取

```
你是执行者，负责调用增值产品 API 提取入库段的"处理方式 → 产品 → 原子"三层映射清单。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

## 仓库

https://github.com/ying9997/Vas-Nonstandard-Guide (main 分支)

## 背景

增值服务的层级结构：
- 处理方式（上架/销毁/自提/暂存拍照辨识）— 对应 getVascInfo 的 shelveWay 参数
- 增值服务产品 VASC（如"原单上架""入库非标增值（特批）""入库非标拍照或提供视频"）— 由 listAllVasc 返回
- 增值服务原子 Event（如"入库-更换商品包装""包裹串仓异常调拨""入库-单品指定位置开箱拍照"）— 由 getVascInfo 返回

关系：一个产品由多个原子组成。一个非标产品内可同时包含"具体命名原子"（2a）和"兜底原子"（2b）。

产品分三类（不是四类）：
- standard — 标准增值（如"原单上架""新单上架""上架前销毁"）
- nonstandard_no_review — 非标增值免审（如"入库非标拍照或提供视频"）
- nonstandard_special_approval — 非标增值特批（如"入库非标增值（特批）"）

本次范围限定：仅入库段（pscgCode = OW01）。不含出库（OW03）和库内（OW02）。

## 任务

产出入库段全量的三层映射清单，包含产品类型和原子的可推荐性及分支归属。

## 执行前必读文件

1. `references/api-docs/vas-product-api-doc.md` — API 接口说明
2. `scripts/data-gateway/query_vas_attrs_all.py` — 参考调用方式
3. `contracts/candidate-normalization/` — 归一化契约字段
4. `references/rules/intent-routing/B0102E23.md` — 候选示例

## 具体步骤

### Step 1：调用 listAllVasc 获取入库段全量产品

调用参数：
- pscgCode = "OW01"（海外仓入库）
- 不传 exceptionEventCodeSet（拿全量，不按异常类型过滤）
- 不排除非标增值（不设 vasType 过滤）

获取每个产品的：
- vascCode — 产品编码
- vascName — 产品名称
- vascAttributeMap — 属性映射

对每个产品标注 productType（三选一）：
- `standard` — 标准增值。判定依据：vascAttributeMap 中 vasType 为标准，或产品名称不含"非标"
- `nonstandard_no_review` — 非标增值免审。判定依据：产品名称含"非标"且不含"特批"，或 vascAttributeMap 有免审标识
- `nonstandard_special_approval` — 非标增值特批。判定依据：产品名称含"特批"，或 vascAttributeMap 有特批标识
- 无法判断的标注 `❓待确认`

### Step 2：对每个产品调用 getVascInfo 获取原子列表

对 Step 1 返回的每个 vascCode 调用 getVascInfo。

先不传 shelveWay（拿全量原子），记录返回结果。

记录每个原子的以下字段（全部来自 API 原生响应）：
- eventCode — 原子编码
- name — 原子名称
- vasEventDesc — 事件描述
- mutexGroup — 互斥组（同组内原子互斥，客户只能选一个）
- required — 是否必选（选了该产品后此原子必须勾选，Agent 推荐产品时不能跳过必选原子）
- isDisable — 是否禁用（当前不可用，Agent 不能推荐）
- disableReason — 禁用原因（如有，Agent 可向客户解释为什么不可选）
- isShow — 是否显示（页面上是否对客户可见，不可见则 Agent 不纳入推荐范围）

### Step 3：按处理方式归类

尝试用以下 shelveWay 枚举值分别调用 getVascInfo，观察返回原子是否有差异：
- SHELVE_ORIGINAL_ORDER（原单上架）
- SHELVE_NEW_ORDER（新单上架）
- DESTROY（销毁）
- SELF_PICK_UP（自提）

如果某个枚举值 API 报错或返回空，标注"shelveWay=XX 不可用或返回空"，改用产品名称推断归类。

按四个处理方式分组：
1. 上架 — 产品名含"上架"
2. 销毁 — 产品名含"销毁"
3. 自提 — 产品名含"自提"
4. 暂存/拍照辨识 — 产品名含"拍照""视频""辨识""暂存"

无法归类的单独列为"其他/待确认"。

### Step 4：标注原子的 Agent 可推荐性和分支归属

对每个原子标注：

| 字段 | 判定规则 |
|------|---------|
| agentCanRecommend | isShow=true 且 isDisable=false → ✅ 可推荐；否则 ❌ 不可推荐 |
| branchClassification | 见下方规则 |

分支归属判定（在原子级别，不是产品级别）：
- 原子所属产品 productType=standard → `standard`（对应方案中的 2d 标准纠偏）
- 原子所属产品 productType=nonstandard_no_review 或 nonstandard_special_approval，且原子名称含"其他服务需求" → `2b_catchall`
- 原子所属产品 productType=nonstandard_no_review 或 nonstandard_special_approval，且原子名称不含"其他服务需求"（即具体命名操作） → `2a_named`
- 无法判断 → `❓待确认`

重要：同一个非标产品下可以同时包含 2a_named 原子和 2b_catchall 原子。分支判定在原子级别。

### Step 5：产出文件

#### 文件 1: `references/vas-atom-matrix.md`

```markdown
# 入库段增值产品×原子全量清单

## 数据来源
- API: pms.vasc.listAllVasc (pscgCode=OW01) + pms.vasc.getVascInfo
- 范围: 仅入库段（pscgCode=OW01）
- 查询时间: YYYY-MM-DD
- shelveWay 验证结果: （记录哪些枚举值有效、哪些报错、哪些返回空）

---

## 处理方式一：上架

### 产品：原单上架（VASC202407031503503）
- productType: standard

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 禁用 | 可见 | 可推荐 | 分支 |
|----------|----------|------|--------|------|------|------|--------|------|
| OW01V1561 | 入库-更换商品包装 | ... | group_A | 否 | 否 | 是 | ✅ | standard |
| OW01V1558 | 入库-补贴原商品条码 | ... | group_A | 否 | 否 | 是 | ✅ | standard |

### 产品：入库非标增值（特批）（VASC202411192246131）
- productType: nonstandard_special_approval

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 禁用 | 可见 | 可推荐 | 分支 |
|----------|----------|------|--------|------|------|------|--------|------|
| OW01V1602 | 入库其他服务需求 | ... | — | 是 | 否 | 是 | ✅ | 2b_catchall |
| （如有） | 包裹串仓异常调拨 | ... | — | 否 | 否 | 是 | ✅ | 2a_named |

### 产品：入库非标拍照或提供视频（VASC...）
- productType: nonstandard_no_review

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 禁用 | 可见 | 可推荐 | 分支 |
|----------|----------|------|--------|------|------|------|--------|------|
| ... | 入库-单品指定位置开箱拍照 | ... | — | 否 | 否 | 是 | ✅ | 2a_named |
| ... | 入库-异常包裹开箱拍照 | ... | — | 否 | 否 | 是 | ✅ | 2a_named |

...（按处理方式逐个列出所有产品和原子）

---

## 处理方式二：销毁
...

## 处理方式三：自提
...

## 处理方式四：暂存/拍照辨识
...

## 其他/待确认
...

---

## 汇总一：按分支归属

### 2a 命名原子（非标产品下的具体命名原子，Agent 可直接指引客户选择）
| 原子编码 | 原子名称 | 所属产品 | productType | 处理方式 |
|----------|----------|----------|-------------|---------|

### 2b 兜底原子（客户选后需写 SOP 描述需求）
| 原子编码 | 原子名称 | 所属产品 | productType | 处理方式 |
|----------|----------|----------|-------------|---------|

### 标准原子（属于标准产品，客户应走标准增值路径）
| 原子编码 | 原子名称 | 所属产品 | 处理方式 |
|----------|----------|----------|---------|

### 不可推荐原子（isDisable=true 或 isShow=false）
| 原子编码 | 原子名称 | 所属产品 | 原因 |
|----------|----------|----------|------|

---

## 汇总二：按产品类型

| vascCode | vascName | productType | 处理方式 | 原子数量 | 含2a命名原子 | 含2b兜底原子 |
|----------|----------|-------------|---------|----------|-------------|-------------|
| ... | 原单上架 | standard | 上架 | 3 | — | — |
| ... | 入库非标增值（特批） | nonstandard_special_approval | 上架 | 5 | ✅ | ✅ |
| ... | 入库非标拍照或提供视频 | nonstandard_no_review | 暂存/拍照 | 2 | ✅ | ❌ |
```

#### 文件 2: `references/vas-atom-matrix.json`

```json
{
  "scope": {
    "pscgCode": "OW01",
    "pscgName": "海外仓入库",
    "queryTime": "YYYY-MM-DD",
    "shelveWayTestResults": {
      "SHELVE_ORIGINAL_ORDER": "有效/报错/返回空",
      "SHELVE_NEW_ORDER": "有效/报错/返回空",
      "DESTROY": "有效/报错/返回空",
      "SELF_PICK_UP": "有效/报错/返回空"
    }
  },
  "products": [
    {
      "vascCode": "",
      "vascName": "",
      "productType": "standard | nonstandard_no_review | nonstandard_special_approval | ❓待确认",
      "processingMethod": "上架 | 销毁 | 自提 | 暂存拍照 | ❓待确认",
      "atoms": [
        {
          "eventCode": "",
          "name": "",
          "vasEventDesc": "",
          "mutexGroup": "",
          "required": false,
          "isDisable": false,
          "disableReason": "",
          "isShow": true,
          "agentCanRecommend": true,
          "branchClassification": "standard | 2a_named | 2b_catchall | ❓待确认"
        }
      ]
    }
  ],
  "branchSummary": {
    "2a_named": [
      {"eventCode": "", "name": "", "parentVascCode": "", "parentVascName": "", "productType": "", "processingMethod": ""}
    ],
    "2b_catchall": [
      {"eventCode": "", "name": "", "parentVascCode": "", "parentVascName": "", "productType": "", "processingMethod": ""}
    ],
    "standard": [
      {"eventCode": "", "name": "", "parentVascCode": "", "parentVascName": "", "processingMethod": ""}
    ],
    "not_recommendable": [
      {"eventCode": "", "name": "", "parentVascCode": "", "reason": ""}
    ]
  },
  "productTypeSummary": {
    "standard": [{"vascCode": "", "vascName": "", "processingMethod": "", "atomCount": 0}],
    "nonstandard_no_review": [{"vascCode": "", "vascName": "", "processingMethod": "", "atomCount": 0, "has2a": true, "has2b": false}],
    "nonstandard_special_approval": [{"vascCode": "", "vascName": "", "processingMethod": "", "atomCount": 0, "has2a": true, "has2b": true}]
  }
}
```

## 约束

- 只在 `references/` 目录下新建文件（vas-atom-matrix.md + vas-atom-matrix.json）
- 数据必须来自真实 API 返回，不编造产品名或原子名
- 限定 pscgCode=OW01（入库段），不查出库和库内
- productType 三选一：standard / nonstandard_no_review / nonstandard_special_approval。无法判断的标 ❓待确认
- 分支归属在原子级别判定：名称含"其他服务需求" → 2b_catchall；非标产品下其他原子 → 2a_named；标准产品原子 → standard
- 同一个非标产品可以同时包含 2a_named 和 2b_catchall 原子，这是正常的
- shelveWay 枚举值如果调用报错，记录报错信息，改用产品名称推断归类，不阻塞
- 所有 API 原生字段原样记录，不加工不改名
- commit message: `feat(references): add vas-atom-matrix for inbound (pscgCode=OW01)`
- push 到 main；如 push 失败，输出两个文件完整内容
```
