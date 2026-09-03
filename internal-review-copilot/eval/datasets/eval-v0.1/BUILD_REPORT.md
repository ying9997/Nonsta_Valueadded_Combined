# Eval v0.1 BUILD_REPORT

- 日期：2026-09-02
- 样本文件：`candidates.jsonl`（16 条）
- 未改运行时代码

## A/B 各找到多少历史候选

| 场景 | Udesk 关键词行 | 飞书关键词行 | OMS 已完成带场景名 | 本轮核验可入 gold |
|------|----------------|--------------|--------------------|-------------------|
| A | 24 行（无「包裹类异常」原词） | 33 行（催审/换标，无终态） | extras 6 张，SOP 过短 | **0** |
| B | 30 行（几乎全是口语「拍照暂存」） | 13 行 | extras 未抽出 B 场景码 | **0** |

抽了 9 通 Udesk + 2 条飞书脱敏稿进 tmp。能用的真实作业多为：模糊指代、库内拍照暂存后上架、拍照+换标混合、拦截/直接上架（shadow）。

## 本集 gold / derived / shadow

| gold_status | 条数 | 谁 |
|-------------|------|----|
| gold | **1** | 仅 F-001：`ev01-l2-f001-pos-01`（`_runs/20260901_oms_facts/` 已完成+审核通过+可读 SOP；输入已脱敏） |
| derived | 12 | §2.5/§2.7、L1 对抗、边界、L3、L4、Udesk 改写 |
| shadow | 3 | 16 条里的拦截代表、绿标边界、直接上架 |
| **A gold** | **0** | 不声称 A 已有 gold |
| **B gold** | **0** | 不声称 B 已有 gold |

## 是否足够支撑各层评测

| 目标 | 结论 |
|------|------|
| match-template v0.2 分流 | **够做 smoke / derived 一致性 + shadow 不漂。** A/B 正例只有 derived。正式「三场景准确率」只有 1 条 F-001 gold，不够发布 |
| check-completeness hard gate | **不够、也不该做 A/B hard gate。** 附件 pending。本集用 `ev01-l3-a-no-gate-01` 证明不得套 F-001 三必填；F-001 声称已上传仍是 derived/simulated |
| SOP generation | **不够评文案。** 1 条 L4 只测「禁自动审批 / 禁编造费用时效」。16 条待审核没有 `sop_generated` |

## 16 条待审核单怎么处理

全部 **shadow**。入集 3 条（假号 `VASC_SHADOW_001/002/003`）：

- 绿标撕标换条码上架 → 防静默改 A
- 直接扫描上架 → unsupported
- 拦截不上架（14 张同文只计 1）→ 防误收 F-001/B

不计入准确率。dry-run 的 outputPath 不是 expected 来源。

## 下一步还要补什么

1. **OMS**：按 `OMS_PULL_TODO.md` 拉 A 场景名（旁证码未核）和 B 场景名的全状态池；核验 SOP 后再谈 A/B gold。
2. **人工**：对 extras 6 张 A 已完成单做 §2.5 核验（过短 SOP 直接淘汰）。
3. **业务**：F-001 vs A 互斥、A/B 附件是否必填。未签批前 hard gate 保持关。
4. **Casebook**：A/B 都只有 `CASEBOOK_TODO.md`，核验到 1 通过+1 取消后再写。
5. **不要**用 synthetic 把 happy 凑到 50%。本集 happy 约 25%，是因为真实干净正例不够。

## 本轮未做

- 未 live 拉 OMS A/B 全量。
- 未写 A/B CASEBOOK / rules / index。
- 未跑完整评测（只定义了 `scoring.md`）。
- 未把映射表写入 knowledge/eval。
