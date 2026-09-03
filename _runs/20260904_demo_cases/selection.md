# D+2 演示用例选择说明

## 范围与边界

- 来源：`_runs/20260901_oms_facts/details.json`，共 183 条历史单。
- 原始文件未修改。
- L4 副本只向 `vaAtomFiles` 追加缺失的模拟三必填附件记录；没有改需求、SOP、EB、WI、客户或仓库。
- 当前三必填仍是工程模拟口径，不表示业务正式签批。
- 选择方案：CASEBOOK 优先，确定性预检不通过时由可稳定进入 L4 的候选补位。

## 候选漏斗

1. `status=PD`
2. `isAuditThrough=Y`
3. 历史 SOP 长度大于 100 字
4. 需求背景、需求描述均非空
5. 同时存在真实 EB 和 WI
6. 补齐附件副本后，确定性结果必须为：
   - `ruleOutputPath=sop_generated`
   - `decision=supported`
   - `sceneKey=inbound_label_identify`

结果：

- 原始池：183 条
- 满足基础条件：53 条
- 补附件后可稳定进入 L4：18 条
- 最终 L4：4 条

## 初始 SOP 长度 Top 10

下列为满足基础条件后按历史 SOP 长度排序的初始 Top 10。它们补附件后都没有稳定命中当前 F-001，因此未强行改需求或规则，而是继续从 18 条确定性可进入 L4 的候选中补位。

| orderNo | SOP 字数 | EB | WI | 原附件类型（摘要） | 补附件后结果 | SOP 前 100 字 |
| --- | ---: | --- | --- | --- | --- | --- |
| VASC000000194691 | 978 | EB0125112024422214、EB0125112024422262 | WI46721163、WI46732351 | AOOI×2、LF×2、RDP | transfer_human | 辨识商品是否覆盖白色或蓝色标签，并按不同结果执行后续处理 |
| VASC000000126004 | 915 | 18 条 EB | WI43736500 | AOOI、CEO_SOA、LF×3、RDP | transfer_human | 检查商品是否贴有两个万邑通标签并输出辨识结果 |
| VASC000000170973 | 668 | 70 条 EB | WI46095185、WI46292977 | TRPP、LF、RDP×3 | transfer_human | 10 款产品、70 件异常，按多种方式分别处理 |
| VASC000000160065 | 541 | 10 条 EB | WI45764460、WI45766172、WI45858456 | RDP×3 | transfer_human | 指定 SKU 对应多张异常单并处理 |
| VASC000000160059 | 541 | 11 条 EB | WI45764460、WI45766172、WI45858456 | RDP×3 | transfer_human | 指定 SKU 对应多张异常单并处理 |
| VASC000000138394 | 533 | EB0125080621704137 | WI45165946、WI44973766 | CEO_SOA、RDP | transfer_human | 一个包裹混两个 SKU，按商品标签对应补贴新 SKU |
| VASC000000271086 | 505 | EB0326041828891836 | 18 张 WI | AOOI、LF×9 | transfer_human | 多张旧 WI 与新 WI 的批量处理说明 |
| VASC000000332922 | 495 | EB0326080832091342 | 6 张 WI | LF×5、RDP | transfer_human | 辨识后补贴包裹标签，按多张新单上架 |
| VASC000000287082 | 451 | EB0126041528803033 | WI50073123 | TCRBCAL、LF×5、RDP×4 | transfer_human | 亚马逊退回混装商品，按对应商品贴标 |
| VASC000000140461 | 389 | 5 条 EB | WI44108714 | RDP×20 | transfer_human | 多张异常单对应货物的辨识处理 |

完整 EB、WI、附件类型和 SOP 前 100 字见 `candidate-analysis.json`。

## CASEBOOK 四条复核

| orderNo | 基础条件 | 补附件后结果 | 处理 |
| --- | --- | --- | --- |
| VASC000000333147 | 满足，SOP 232 字 | `supported` → `sop_generated` | 入选 |
| VASC000000323364 | 满足，SOP 151 字 | `ambiguous_below_high_confidence` | 不改规则，使用候选补位 |
| VASC000000249768 | SOP 仅 35 字 | 不满足 >100 字 | 不入选 |
| VASC000000186117 | 满足，SOP 115 字 | `ambiguous_below_high_confidence` | 不改规则，使用候选补位 |

## 最终 4 条 L4

| orderNo | 仓库 | 展示内容 | 原始真实单据 | 追加的附件记录 | 真实 LLM 结果 |
| --- | --- | --- | --- | --- | --- |
| VASC000000333147 | AU Warehouse | 按箱序辨识并补贴 Winit 包裹条码 | EB0126080632030982 / WI51547628 | AOOI、TCRBCAL | `sop_generated` |
| VASC000000326061 | USKY5 Warehouse | 多 SKU 辨识后按两张新单分别上架 | EB0326072531612017 / WI51383223、WI51383191 | AOOI、TCRBCAL | `sop_generated` |
| VASC000000143515 | DEBR2 Warehouse | 按产品型号辨识并更换条码 | EB0125081521891412 / WI45365806 | AOOI、TCRBCAL | `sop_generated` |
| VASC000000080416 | UKGF Warehouse | 已开箱编号与尺重规则结合辨识上架 | 多张真实 EB / WI41289403、WI43089765 | TCRBCAL | `sop_generated` |

副本校验表明四条均为 `onlyFilesChanged=true`。真实 LLM 均返回 SOP，且未发现输入以外的 VASC、EB、WI。

## L1 / L2 / L3

| 层级 | orderNo | 选择原因 | 预期结果 |
| --- | --- | --- | --- |
| L1 | VASC000000183069 | 需求描述有对象和背景，但当前规则识别不到明确操作动作，适合展示自然语言追问 | `needs_requirement_clarification` |
| L2 | VASC000000344421 | 数量差异、SN 辨识、换包裹标及多新单并存，当前匹配为 `ambiguous_below_high_confidence` | `transfer_human` |
| L3 | VASC000000343821 | 明确命中 F-001，但缺操作说明附件和商品标签对应关系 | `needs_field_clarification` |

## 最终分布

| outputPath | 数量 |
| --- | ---: |
| needs_requirement_clarification | 1 |
| transfer_human | 1 |
| needs_field_clarification | 1 |
| sop_generated | 4 |

7 条均使用真实 LiteLLM，`llmError=0`。详情见 `final_results/summary.md` 和 `final_results/structured-reviews.json`。
