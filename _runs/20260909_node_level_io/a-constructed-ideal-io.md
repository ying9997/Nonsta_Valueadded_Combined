# A 构造 case 节点级理想 I/O：VASC_CONSTRUCTED_A_001

> 草稿供用户修改。  
> **非 OMS 真单**：骨架参考 295161 审核流程（要 EB/WI、要附件、要明确动作），正文按场景卡 A 正例信号重写。  
> 验证：`a-constructed-detail.json` → dry-run L4 ✓ → 真实 LLM `a-constructed-l4-result.json` / `a-constructed.trace.md`

## 业务摘要（一句话）

构造的「标准 A」：包裹类异常下**包裹条码正常、商品条码异常**，按标签文件**换商品标签**后上架到新 WI，并关闭异常单（对照 295161 真实业务是「重打包裹标」，本构造刻意改成 A 定义以避免错标）。

## 构造输入（可复现）

| 字段 | 值 |
|------|-----|
| orderNo | `VASC_CONSTRUCTED_A_001` |
| BEOR | 包裹类异常：包裹条码正常，但商品条码异常/无法识别，需换商品标签后上架。 |
| RD | 异常单 EB0126060399990001：包裹类异常，包裹条码正常、商品条码异常。请按附件对应关系换商品标签后，上架到新入库单 WI50450527，并关闭异常单。 |
| EB | EB0126060399990001（示意） |
| WI | WI50450527 |
| 附件 | 标签文件=uploaded（`商品标签对应关系.pdf`）；操作说明/对应关系槽=missing |
| sceneCode | 20250407008 |

验证结果：match A score=**20**，decision=`supported_clear_top1`，completeness complete，outputPath=`sop_generated`。

---

## ② context-bind

### 输入
- customerIntent = BEOR + "\n" + RD（无场景概述名）
- OMS: warehouse=USWC2, customer=19376789（借用 295161 群聊客户语境）, eventNo / businessOrderNo 如上
- 附件: {操作说明: missing, 商品和标签对应关系: missing, 标签文件: uploaded}

### 理想输出
- boundKeys: `[eventNo, businessOrderNo, VAS_ATTR_REL_NWEON, 标签文件]`
- allEventNos: `[EB0126060399990001]`
- allBusinessOrderNos: `[WI50450527]`

### 当前实际 vs 理想
- dry-run / live 与理想一致（见 trace）。

---

## ③ check-requirement

### 输入
- customerIntent: 上表全文

### 理想输出
- 动作: `["换商品标签", "上架", "关闭异常单"]`
- OBJECT: `"包裹"` / `"商品条码"`
- ACTION: `"换"` / `"换商品标签"` / `"上架"`
- PURPOSE: `"上架"` / `"新入库单"` / `"关闭异常单"`
- complete: **true**
- 对照 295161 群聊：缺 EB 时应退回；本构造已写全，无需 L1 追问

### 当前实际 vs 理想
- 应 complete=true 进入 match（dry 已穿过 check-requirement）。

---

## ④ match-template

### 理想输出
- 信号: hasPackageException=true, hasRelabel=true, hasShelve=true, hasIdentify=false（无尺重/绿标优先）
- 排序:

| 场景 | 理想分数 | 理由 |
|------|---------|------|
| A | ≥ HIGH，本验证 **20** | 四个 strong 全中 + structural |
| F-001 | 中低（本验证 6） | 有「换商品标签/上架」但无辨识/尺重；不应超过 A |
| B | 0 | 排除 relabel_then_shelve |

- decision: **supported** / reason: **supported_clear_top1**

### 当前实际 vs 理想
- 实际 matchedSignals: 包裹类异常、包裹条码正常、商品条码异常、换商品标签 + weak 上架/新入库单/关闭异常单 → **与理想一致**。

---

## ⑤ check-completeness

### 理想输出
- 策略：requiredFieldKeys=`[VAS_ATTR_REL_LF]` + WI  
- 本构造：LF uploaded + WI → **complete=true** → L4  
- 若去掉 LF：理想 **complete=false**，缺「标签文件」（L3）；群聊侧 295161 也曾要求对应关系/标签类附件

### 变体（未跑，供标注）
- L3 构造：同文案但 LF=missing → 应 needs_field_clarification

### 当前实际 vs 理想
- dry complete=true → 一致。

---

## ⑥ generate-text（SOP 生成）

### 理想 SOP 步骤（场景卡 hints + A 定义；295161 仅借鉴「关异常/新 WI」约束）
1. 按异常单定位待处理包裹  
2. 确认**包裹条码正常、不更换**；处理**商品条码异常**件  
3. 按「商品标签对应关系」附件换/补贴**商品标签**（数量按附件）  
4. 扫描上架到新入库单 WI50450527  
5. 将异常单状态变更为已完成 / 关闭  

### 理想 SOP 不应包含
- 尺重辨识、拆包按尺寸定 SKU（那是 F-001）  
- 只重打包裹条码（那是 295161 真业务，不是 A）  
- 编造附件中没有的 SKU/数量  
- 「审核通过」话术  

### 理想 Reflection
- 可要求：核对实物条码与附件旧码、贴标位置、多件时是否每件换标、附件无匹配时上报  
- 不应要求库位级系统操作细节到「扫库位码」（除非知识库强制）—— 过细易误伤可执行 SOP

### 当前实际 vs 理想
- 实际 SOP（节选）：定位 → 核对包裹正常/商品异常 → 按附件补贴新标签 → WI 上架 → 关异常；注意「仅处理商品条码」  
- 与理想主干对齐  
- reflectionPass=**false**：issues 要求更细辨识/贴法/系统扫描步骤/异常分支 —— **部分合理（贴法、无匹配上报），部分偏运维细则**；用户审阅时可标哪些 issue 应进 gold

---

## 与 295161 的关系（防污染）

| | 295161 真单 | 本构造 |
|--|-------------|--------|
| OMS 码 | 20250407008（A） | 同左（故意） |
| 真动作 | 重打**包裹**条码 | **换商品标签** |
| Pipeline | L2 unsupported | L4 sop_generated |
| 用途 | 错标/近邻分析 | A 的节点级理想模板 |

详见 `a-295161-analysis.md`。
