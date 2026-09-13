# 节点级理想 I/O v2 — 五案汇总

> 产出目录：`_runs/20260909_node_level_io_v2/`  
> 方案：全文深拆；constructed L4 仅旁注，不冒充自然实际。  
> **命名纪律（已执行）**：废止卡别名 F-001 / A / B；人读只用 OMS 全名（含【入库】）；机读用 `sceneKey`。不另造短码映射。

---

## 0. 两轴说明（勿混）

### Pipeline 节点（同一单会依次走过）

| 节点 | 代码步骤 | 在验什么 |
|------|----------|----------|
| **L1** | check-requirement | 需求完整度（对象/动作/去向是否够审） |
| **L2** | match-template | 场景匹配（命中哪个 OMS 场景） |
| **L3** | check-completeness | 附件校验（该场景必填附件/字段是否齐） |
| **L4** | generate-text | SOP 生成（可执行操作指引 + Reflection） |

### 本批覆盖的 4 个业务场景（抽样桶，≠ L1–L4）

本轮测集曾用文件夹名 `t1`…`t4` 区分 **4 种业务场景**，与上面 L 层无关。下文**不再用 T\* 当主称**，只保留文件名以便溯源；叙述一律用 OMS 全名。

| 文件名溯源 | OMS 场景名（人读主称） | sceneKey（机读） | omsSceneCode | SOP |
|------------|------------------------|------------------|--------------|-----|
| `t1-*.md` | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | `inbound_package_barcode_batch_relabel` | 20250430 | §2.33 |
| `t2-*.md` | 【入库】指定商品拍照暂存 | `inbound_photo_hold` | 20250522001 | §2.7 |
| `t3-*.md` | 【入库】关联第三方商品条码上架 | `inbound_third_party_merchandise_barcode` | 202506120001 | §2.12 |
| `t4-*.md` | 【入库】尺重/标签辨识后换标上架 | `inbound_label_identify` | 20250407004 | §2.1 |
| （对照误判） | 【入库】包裹类异常换商品标签上架 | `inbound_package_exception_relabel_shelving` | 20250407008 | §2.5 |

> 历史 trace 打分表「标签」列曾写 F-001/A/B：已废弃。各 ideal-io 在「当前实际」表中已改写为 OMS 全名，**分数与命中信号仍照抄 trace**。

---

## 1. 场景识别准确率（L2）

| VASC | 预期 OMS 场景 | 实际 L2 top1 | 是否判对 | 自然停在 |
|------|---------------|--------------|----------|----------|
| 311652 | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 【入库】包裹类异常换商品标签上架 (12) | ❌ | L4 规则可过 → LLM 安全闸 `transfer_human` |
| 315774 | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 【入库】尺重/标签辨识后换标上架 (12) | ❌ | L3 `needs_field_clarification` |
| 298617 | 【入库】指定商品拍照暂存 | 【入库】尺重/标签辨识后换标上架 (3) | ❌ | L3 `needs_field_clarification` |
| 305805 | 【入库】关联第三方商品条码上架 | unsupported | ❌ | L2 `transfer_human` |
| 333147 | 【入库】尺重/标签辨识后换标上架 | 【入库】尺重/标签辨识后换标上架 (11) | ✅ | L4 `sop_generated` |

**结论：5 条中 L2 判对 1 条（20%）。**  
唯一正例是尺重/标签辨识后换标上架；两条「包裹条码批量异常…」分别被「包裹类异常换商品标签」和「尺重/标签辨识后换标」抢走；拍照暂存被「辨识」短路；第三方商品条码信号全灭。

---

## 2. 共性的动作提取 / 抢分问题

| 问题 | 表现 case | 机制 |
|------|-----------|------|
| 「辨识」独占「尺重/标签辨识后换标上架」 | 315774、298617 | strong:辨识 +3，无动作→多场景约束 |
| 「补贴…包裹标签」隔字不命中 | 315774 | 该场景 strong 要连续「补贴包裹标签」，中间插入 WI 号则失败 |
| 否定句当正信号 | 311652 | 「不换商品标签」仍命中「换商品标签」 |
| 拍照口语未进拍照暂存 | 298617 | 「拍正/侧面/实物照片」→ hasPhoto=false |
| 失败描述当 ACTION | 305805 | 「无法扫描」命中 ACTION「扫描」 |
| 第三方场景信号表过窄 | 305805 | 「单品码/无主货/补贴包裹」未进该卡 strong |
| OMS assist 加分 | 333147（非致命） | `context:oms_scene_f001_assist`；Prompt 1 应删除 |
| 安全闸误杀输入内单号 | 311652 | 意图中的历史 VASC 被判「编造」 |

**与 Prompt 1 的衔接预期**

- 动作→场景约束 +「包裹条码批量异常…」信号补强 + 去掉 taggedF001：对 **315774** 翻转期望最高。  
- **311652** 还需否定处理与「箱唛→包裹标签」同义。  
- **298617** 还需 photo 信号与「返回后再…」→ photoHold。  
- **305805** 还需第三方/单品码同义。

---

## 3. 各场景附件规则建议（L3）

| OMS 场景 | 建议 requiredFieldKeys | 本批依据 |
|----------|------------------------|----------|
| 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | `[VAS_ATTR_REL_LF]` + 校验上架 WI | 315774 缺 LF→L3；311652 有 LF 可放行 |
| 【入库】指定商品拍照暂存 | `[]`（可选软校验操作说明） | 298617 误套「尺重/标签辨识…」的 LF+WI |
| 【入库】关联第三方商品条码上架 | `[]` 或软校验 WI；LF 视是否补贴标签 | 305805 有 LF+WI；策略 pending |
| 【入库】尺重/标签辨识后换标上架 | `[VAS_ATTR_REL_LF]` + WI；正文含对应关系/箱序表时建议校验对应关系附件 | 333147 群聊催标签/对应表后才审 |

跨场景：异常单是否关联增值单（311652 关 EB 失败）建议作为审核检查项，暂不进 OMS 附件槽。

---

## 4. 汇总 golden labels（供 Prompt 3）

`expectedScene` 只用 `sceneKey`（机读）；人读对照见 §0。

```jsonl
{"vascNo":"VASC000000311652","expectedOutputPath":"sop_generated","expectedScene":"inbound_package_barcode_batch_relabel","expectedActions":["补贴包裹标签","上架"],"expectedMissing":[],"layer":"L4","notes":"negation:不换商品标签; safety-gate false positive on VASC000000310857 in intent"}
{"vascNo":"VASC000000315774","expectedOutputPath":"needs_field_clarification","expectedScene":"inbound_package_barcode_batch_relabel","expectedActions":["辨识","补贴包裹标签","上架"],"expectedMissing":["标签文件"],"layer":"L3","notes":"actual L2 wrongly inbound_label_identify; Prompt1 expected flip"}
{"vascNo":"VASC000000298617","expectedOutputPath":"sop_generated","expectedScene":"inbound_photo_hold","expectedActions":["拍照","回传照片","暂存"],"expectedMissing":[],"layer":"L3","notes":"natural stuck L3 via wrong inbound_label_identify completeness; constructed L4旁注 only"}
{"vascNo":"VASC000000305805","expectedOutputPath":"sop_generated","expectedScene":"inbound_third_party_merchandise_barcode","expectedActions":["补贴包裹","关联第三方单品码","上架"],"expectedMissing":[],"layer":"L2","notes":"natural unsupported at L2; constructed L4旁注 only"}
{"vascNo":"VASC000000333147","expectedOutputPath":"sop_generated","expectedScene":"inbound_label_identify","expectedActions":["辨识","补贴包裹条码标签","上架","关闭异常"],"expectedMissing":[],"layer":"L4","notes":"good natural L4; oms_scene_f001_assist present but non-decisive"}
```

---

## 5. 对 Prompt 3 / 评测设计的简要建议

1. **客观层**：优先测 `sceneKey` 与 `outputPath`；本批 4/5 在 L2 错。  
2. **动作层**：对「辨识 / 补贴包裹标签 / 拍照 / 第三方」做 expectedActions 集合比对。  
3. **LLM-as-Judge**：仅对自然到达 L4 的单做 SOP 事实性；constructed 单独标记。  
4. **专项探针**：否定换标、隔字「补贴…包裹标签」、拍照口语、第三方单品码同义、安全闸对意图内历史单号。

---

## 文件清单

```
_runs/20260909_node_level_io_v2/
  ├── t1-311652-ideal-io.md   # 业务：【入库】包裹条码批量异常…
  ├── t1-315774-ideal-io.md
  ├── t2-298617-ideal-io.md   # 业务：【入库】指定商品拍照暂存
  ├── t3-305805-ideal-io.md   # 业务：【入库】关联第三方商品条码上架
  ├── t4-333147-ideal-io.md   # 业务：【入库】尺重/标签辨识后换标上架
  └── summary.md
```
