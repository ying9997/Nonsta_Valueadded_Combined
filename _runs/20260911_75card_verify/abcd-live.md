# 当天真实待审核单：A/B/C/D 四组对照

- 日期：2026-09-11 待审核 OW01，共 1 条
- 单号：VASC000000362139
- A=6卡无RAG；B=6卡有RAG；C=75卡无RAG；D=75卡有RAG

## VASC000000362139

| 组 | 场景 | sceneKey | 出口 | 决策 | 置信度 | RAG |
|----|------|----------|------|------|--------|-----|
| A 6卡无RAG | 【入库】关联第三方商品条码上架 | `inbound_third_party_merchandise_barcode` | sop_generated | supported | high | （未注入） |
| B 6卡有RAG | 【入库】包裹类异常换商品标签上架 | `inbound_package_exception_relabel_shelving` | needs_field_clarification | supported | medium | VASC000000291378 90.2 → 【入库】包裹/商品条码异常重新扫描包裹/商品条码上架 |
| C 75卡无RAG | 【入库】关联第三方商品条码上架 | `inbound_third_party_merchandise_barcode` | sop_generated | supported | high | （未注入） |
| D 75卡有RAG | 【入库】关联第三方商品条码上架 | `inbound_third_party_merchandise_barcode` | sop_generated | supported | high | VASC000000291378 90.2 → 【入库】包裹/商品条码异常重新扫描包裹/商品条码上架 |

| 组 | 判断摘要 |
|----|---------|
| A | 本案例应用规则C（复杂异常名称回退到需求描述判断）。虽然异常名称是'商品条码异常(需客户处理)'，但需求描述明确说明：1）第三方编码已被主账号占用导致无法识别；2）现已取消绑定并重新绑定第三方编码到指定账号；3）仓库只需重新扫描第三方编码即可识别上架。这是典型的【入库】关联第三方商品条码上架场景（已完成第三方码维护，仓库直接扫描上架）。关键区别：客户明确说' |
| B | 应用规则A（异常名称直接映射）：3个异常单均为「商品条码异常(需客户处理)」，按§2.5必须选inbound_package_exception_relabel_shelving。虽然客户描述中提到「重新扫描第三方编码即可识别上架」「已取消绑定并重新绑定第三方编码」，看似符合inbound_third_party_merchandise_barcode特征， |
| C | 本案例应用规则C（未知/复杂异常名称回退逻辑）。虽然异常单详情显示3个'商品条码异常(需客户处理)'，按规则A应优先考虑inbound_package_exception_relabel_shelving（换商品标签上架）。但客户需求描述明确说明：1）第三方编码已被主账号占用导致无法识别；2）现已取消绑定并重新绑定第三方编码到新账号；3）仓库只需重新扫描第三 |
| D | 应用规则C（未知/复杂异常名称判断）：虽然异常单详情显示3个异常单均为'商品条码异常(需客户处理)'，但客户需求描述明确说明：1）第三方编码已被主账号占用导致无法识别；2）现已取消绑定并重新绑定第三方编码到M010000000012103871；3）仓库只需重新扫描第三方编码即可识别上架。这是典型的【入库】关联第三方商品条码上架场景（sceneKey: in |

## 小结

- 四组场景是否一致：否，见上表
- 四组出口是否一致：否，见上表
- 金标四组里 A 最好；这条实单四组对照见上。
- Traces：`abcd-traces/A|B|C|D/`
