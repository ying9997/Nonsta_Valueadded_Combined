# 三场景附件模式分析（入库）

- 生成时间：2026-09-08
- 数据源：`workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json`
- 筛选：`sceneOverviewNames` 匹配 F-001 / A / B 场景名或场景码
- 附件口径：仅统计 `uploadedAttachments` 中 `verification=verified` 且 `inputNode=SUBMIT` 的记录（客户提交阶段）
- **注意：** OMS 真实 attributeKey 为 `VAS_ATTR_REL_AOOI` / `VAS_ATTR_REL_LF` / `VAS_ATTR_REL_TCRBCAL` 等；**不是**文档里偶见的 `VAS_ATTR_REL_OI` / `VAS_ATTR_REL_MLTC`

## 1. 场景样本量

| 场景 | sceneCode | 匹配 case 数 | 说明 |
|---|---|---:|---|
| F-001 【入库】尺重/标签辨识后换标上架 | 20250407004 | 7 | 入库桶内精确场景名命中偏少 |
| A 【入库】包裹类异常换商品标签上架 | 20250407008 | 5 | 同上 |
| B 【入库】指定商品拍照暂存 | 20250522001 | 19 | 相对较多 |

> 样本小 → 出现率波动大；下列「必填建议」严格按任务规则，并标注与历史 F-001 模拟三必填的差异。

## 2. SUBMIT 附件 attributeKey 分布

### 2.1 F-001（n=7）

| attributeKey | attributeName | 出现 case 数 | 出现率 | 是否必填建议 |
|---|---|---:|---:|---|
| VAS_ATTR_REL_LF | 标签文件 | 6 | 85.7% | **建议必填**（≥70%） |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 2 | 28.6% | 不列入（&lt;30%） |
| CEO_SOA | CEO审批截图 | 1 | 14.3% | 不列入 |

历史模拟三必填含「操作说明附件 / 商品和标签的对应关系 / 标签文件」。本批入库精确场景样本中：

- 「标签文件」数据支持必填
- 「操作说明附件」出现率不足 30%
- 「商品和标签的对应关系」（`VAS_ATTR_REL_TCRBCAL`）在 F-001 SUBMIT **未出现**

### 2.2 A（n=5）

| attributeKey | attributeName | 出现 case 数 | 出现率 | 是否必填建议 |
|---|---|---:|---:|---|
| VAS_ATTR_REL_LF | 标签文件 | 5 | 100% | **建议必填** |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 1 | 20% | 不列入 |
| TRPP | 包裹和标签的对应关系 | 1 | 20% | 不列入 |
| CEO_SOA | CEO审批截图 | 1 | 20% | 不列入 |

### 2.3 B（n=19）

| attributeKey | attributeName | 出现 case 数 | 出现率 | 是否必填建议 |
|---|---|---:|---:|---|
| VAS_ATTR_REL_AOOI | 操作说明附件 | 6 | 31.6% | **建议可选**（30%–70%） |
| VAS_ATTR_REL_LF | 标签文件 | 3 | 15.8% | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 3 | 15.8% | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 3 | 15.8% | 不列入 |

→ **B 无 ≥70% 的 SUBMIT 附件** → 建议 `requiredFieldKeys=[]`，命中后 check-completeness 直接放行。

## 3. 关键提交字段填写率

| 场景 | fieldKey | fieldName（业务含义） | 填写 case 数 | 填写率 | 建议 |
|---|---|---|---:|---:|---|
| F-001 | VAS_ATTR_REL_NWEON | 上架入库单号 | 6 | 85.7% | **建议必填** |
| F-001 | NSVASTN | 非标增值来源单号 | 0 | 0% | 不列入 |
| A | VAS_ATTR_REL_NWEON | 上架入库单号 | 5 | 100% | **建议必填** |
| A | NSVASTN | 非标增值来源单号 | 1 | 20% | 不列入 |
| B | VAS_ATTR_REL_NWEON | 上架入库单号 | 8 | 42.1% | 建议可选 |
| B | NSVASTN | 非标增值来源单号 | 5 | 26.3% | 不列入 |

## 4. FINISH 阶段备注（不计入必填）

仓库完成阶段大量出现 `VAS_ATTR_REL_RDP`（结果展示照片），属 FINISH，**不作为提交完备性必填**。

## 5. 场景卡建议落地（任务 2 输入）

| 场景 | omsWhitelistFieldKeys（SUBMIT 实测） | requiredFieldKeys（≥70%） | enforcement |
|---|---|---|---|
| F-001 | LF, AOOI, CEO_SOA | **LF**（标签文件） | required；另建议校验 NWEON/WI |
| A | LF, AOOI, TRPP, CEO_SOA | **LF** | required；另建议校验 NWEON/WI |
| B | AOOI, LF, TCRBCAL, VSS | **[]（空）** | required 策略下「无必填项 → 直接 complete」 |

### attributeKey → attributeName 映射（供 pipeline）

| attributeKey | attributeName |
|---|---|
| VAS_ATTR_REL_LF | 标签文件 |
| VAS_ATTR_REL_AOOI | 操作说明附件 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 |
| TRPP | 包裹和标签的对应关系 |
| VSS | 视频拍摄SOP（中文+英文） |
| CEO_SOA | CEO审批截图 |
| VAS_ATTR_REL_RDP | 结果展示照片（FINISH） |

## 6. 与历史模拟口径的差异（必须人工知晓）

- 旧 F-001 模拟三必填：操作说明 + 商品标签对应关系 + 标签文件
- 本数据驱动口径：F-001/A 仅 **标签文件** 达 ≥70%；B 无必填附件
- 若业务仍坚持旧三必填，需显式覆盖本分析；否则 pipeline 按本表落地

## 7. 后续

- 任务 2 按上表改三张场景卡
- 任务 3 `check-completeness` 按 `requiredFieldKeys`（attributeKey）映射到 `attributeName` 查 `attachmentStatus`
