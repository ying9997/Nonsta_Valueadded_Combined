# 商品咨询群场景归类（清洗版）

> 来源：飞书 Wiki [商品咨询群问题归类汇总分析](https://winitlink.feishu.cn/wiki/MwTuw5qwiibb36kR2Plck3zVnOb)  
> 样本量约 **7,450** 条（表中个数合计）。占比 = 个数 / 总量。

---

## Top 场景（驱动专家优先级）

| 原因类型 | 个数 | 占比 | 机器人策略摘要 | Flow | Expert |
|----------|-----:|-----:|----------------|------|--------|
| SKU 注册加急 | 4570 | 61.4% | 识别「加急」→ 引用应维护完成时间 + 加急按钮 | [02](../flows/02-registration-audit-expedite.md) | `registration-guide` |
| 商品是否可以承运或入库 | 1828 | 24.5% | 历史清单 → 禁限运清单 → 转人工并沉淀 | [01](../flows/01-new-product-carriability.md) | `registration-guide` / P2 `compliance-check` |
| 直发原因咨询 | 247 | 3.3% | 按 SKU 引用头程直发限制原因 | [04](../flows/04-direct-shipment-restriction.md) | `profile` + `registration-guide` |
| 注册 SKU 退回原因 | 122 | 1.6% | 按 SKU 引用退回原因 | [03](../flows/03-return-resubmit.md) | `registration-guide` |
| 修改 WEEE 类别 | 113 | 1.5% | 引用德国 WEEE 类别 + 六类定义 | [07](../flows/07-compliance-certificates.md) | P2 `compliance-check` |
| 解除带电池 | 59 | 0.8% | 实物确认 → 取消勾选 | [06](../flows/06-special-attribute-removal.md) | `registration-guide` |
| 禁售原因咨询 | 52 | 0.7% | TOM/库存查不合规禁售原因 | [05](../flows/05-prohibit-inbound-sale.md) | `profile` / P2 |
| 禁止入库原因 | 40 | 0.5% | 商品信息禁止入库感叹号 | [05](../flows/05-prohibit-inbound-sale.md) | `profile` / P2 |
| 品牌是否有备案 | 39 | 0.5% | 各国商标网站自助查询 | [07](../flows/07-compliance-certificates.md) | P2 |
| 电商清关未获建议申报价 | 37 | 0.5% | 15 条链接规范自查 | [07](../flows/07-compliance-certificates.md) | P2 |

---

## 中长尾场景（<0.5% 各）

| 原因类型 | 个数 | 处理要点 | 默认 |
|----------|-----:|----------|------|
| 添加 / 删除 / 查看三方编码 | 34+（删除为主） | P2 `barcode-guide` | 规划在 sku；首期 KB 引导 |
| 退回注册 | 24 | 未发布待审核可取消注册（需求中） | `registration-guide` |
| 资料缺失无法下承运单 | 24 | MSDS+UN38.3 有效期 | [07](../flows/07-compliance-certificates.md) |
| 解除 DG | 22 | 电池 WH 公式自查 | [06](../flows/06-special-attribute-removal.md) |
| 解除带刀片 | 15 | 法规限制不可取消 | [06](../flows/06-special-attribute-removal.md) |
| 资料是否可以 | 15 | 引导注册 SKU 后上传 | [07](../flows/07-compliance-certificates.md) |
| 是否需要资料 | 13 | — | KB / 人工 |
| 解除带磁 / 液体 / 粉末 | 11/9/4 | 同属性解除模板 | [06](../flows/06-special-attribute-removal.md) |
| 税率咨询 | 9 | — | 转人工 |
| 是否属于 DG | 6 | — | 转人工 |
| 仓库尺重测错 | 4 | SKU 明细转人工 | 转人工 |
| 国内仓查验异常 | 4 | — | 转人工 |
| 无资料先注册后补 | 4 | — | 转人工 |
| 自验核实尺重超限 | 4 | 尺重释义 + 自查 | [06](../flows/06-special-attribute-removal.md) |
| UN 标签咨询 | 3 | — | 转人工 |
| WEEE 类别咨询 | 3 | 引导注册后查看 | [07](../flows/07-compliance-certificates.md) |
| 解除化工 | 3 | 尼斯分类查询 | [06](../flows/06-special-attribute-removal.md) |
| 是否需要熏蒸 | 3 | 澳洲木质 / MDF | [07](../flows/07-compliance-certificates.md) |
| 修改包装信息（入/出库打包方式） | 3 | 未来 inbound/outbound 打包专家 | **空缺**（暂转人工） |
| 注册尺重超限制 | 3 | 尺重释义 + 自查 | [06](../flows/06-special-attribute-removal.md) |

---

## 机器人闭环要求 `[KB]`

1. 能引用系统的：**必须**先查 SKU 再答复（直发原因、退回原因、禁止入库、禁售、WEEE 类别）  
2. 转人工后：**同类问答沉淀**至历史咨询清单  
3. 合规 handoff 占比高时 → 立项 P2 `compliance-check`（见 [sku-plan.md](../../plan/sku-plan.md)）

---

## 原始数据

未清洗的飞书导出（含表格 JSON）：[../raw/consultation-taxonomy-analysis.md](../raw/consultation-taxonomy-analysis.md)
