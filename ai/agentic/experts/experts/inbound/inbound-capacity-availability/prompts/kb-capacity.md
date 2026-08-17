# 库容额度与温度判断 KB

## MKS 额度字段说明

| 字段 | 含义 |
|------|------|
| totalCbm | 客户 CBM 总额度 |
| usedCbm | 已使用 CBM |
| remainingCbm | 剩余 CBM |
| totalSkuSlots | SKU 额度总数 |
| usedSkuSlots | 已用 SKU 额度 |
| remainingSkuSlots | 剩余 SKU 额度 |

查询路径：万邑联 → 账户中心 → 库容额度

## 温度等级定义（仅基于客户 CBM 额度）

| 温度 | 条件（参考） | 建议动作 |
|------|-------------|----------|
| green（充裕） | remainingCbm > 50% | 正常入库 |
| yellow（偏紧） | remainingCbm 20%–50% | 尽快安排入库，提前规划 |
| orange（紧张） | remainingCbm < 20% | 拆批或申请额度扩容 |
| red（满载） | remainingCbm < 5% | 换仓或扩容后再发 |
| unknown（未知） | 额度 API 不可用 | 登录万邑联账户中心或联系客服 |

## Slots / 预约送仓

- **本专家不提供**仓级 Slots 可约数据或仓库负载信号（不对客透露内部仓容信息）
- 客户问「还能不能约 Slots」：引导至万邑联 **预约送仓** 页面查看可约时段，或转 `inbound-appointment-manage` 操作指引

## API 数据源

- Coze OpenAPI 代理：`action=winit.huaweiDas.invoke`
- `data` 与卖家中心 ajaxProcess 的 `form` 同构（`uri=OPC/Detail/InboundSkuLimitAggChart`）
- 本地需 `COZE_API_TOKEN` + `COZE_WINIT_*` 租户字段（与其他 inbound fetch 节点一致）
- 按 `warehouseCode` 聚合该仓「普货 / 限制下单」各尺寸档 CBM 与 SKU 数量额度

## API 降级说明

当额度接口不可用或缺少 Coze 环境配置时：
- quotaSnapshot.apiAvailable = false
- dataSource = kb_only
- 引导客户登录万邑联账户中心查看，或联系客服

## 对客约束

- 额度与温度仅供参考，实际以平台系统为准
- 不承诺仓库一定能接货
- 不输出仓级负载、Slots 温度等内部运营信号
- 扩容申请见 inbound-permission-apply 专家
