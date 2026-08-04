# 入库域专家业务参考索引

> 本目录存放 `inbound` 系列专家的**客服仿真视角**业务参考，供实现 `experts/inbound/*/design.md` 时对照。  
> 权威实现规格仍以各专家目录下的 `design.md` + `manifest.json` 为准。  
> 原始 SOP 全文在 `_kb/service-team/inbound-services-doc/`（gitignore，本地维护）。

---

## 专家清单与参考文档状态

| 优先级 | Expert ID | 层 | 咨询量 | 参考文档 | 状态 |
|--------|-----------|-----|-------:|----------|------|
| P0 | `inbound/inbound-warehouse-info` | 基础信息 | 1,045 | [inbound-warehouse-info.md](inbound-warehouse-info.md) | 已完成 |
| P0 | `inbound/inbound-process-guide` | 基础信息 | 236+ | [inbound-process-guide.md](inbound-process-guide.md) | 已完成 |
| P0 | `inbound/inbound-order-status` | 基础信息 | 382 | [inbound-order-status.md](inbound-order-status.md) | 已完成 |
| P0 | `inbound/inbound-arrival-status` | 业务流程 | 691 | [inbound-arrival-status.md](inbound-arrival-status.md) | 已完成 |
| P0 | `inbound/inbound-putaway-status` | 业务流程 | 804 | [inbound-putaway-status.md](inbound-putaway-status.md) | 已完成 |
| P0 | `inbound/inbound-putaway-expedite` | 业务流程 | 813 | [inbound-putaway-expedite.md](inbound-putaway-expedite.md) | 已完成 |
| P0 | `value-add/value-add-exception-diagnosis` | 跨域增值链路 | — | [../value-add/value-add-exception-diagnosis.md](../value-add/value-add-exception-diagnosis.md) | 已完成 |
| P0 | `value-add/value-add-product-recommendation` | 跨域增值链路 | — | [../value-add/value-add-product-recommendation.md](../value-add/value-add-product-recommendation.md) | 已完成 |
| P0 | `value-add/value-add-service-config` | 跨域增值链路 | — | [../value-add/value-add-service-config.md](../value-add/value-add-service-config.md) | 已完成 |
| P1 | `value-add/value-add-order-status` | 跨域增值链路 | — | [../value-add/value-add-order-status.md](../value-add/value-add-order-status.md) | 已完成 |
| P1 | `inbound/inbound-psc-eligibility` | 基础信息 | — | [inbound-psc-eligibility.md](inbound-psc-eligibility.md) | 已完成 |
| P1 | `inbound/inbound-permission-apply` | 业务流程 | 851 | [inbound-permission-apply.md](inbound-permission-apply.md) | 已完成 |
| P1 | `inbound/inbound-capacity-availability` | 业务流程 | — | [inbound-capacity-availability.md](inbound-capacity-availability.md) | 已完成 |
| P1 | `inbound/inbound-exception-check` | 业务流程 | 2,099 | [inbound-exception-check.md](inbound-exception-check.md) | 已完成 |
| P1 | `inbound/inbound-appointment-manage` | 业务流程 | — | [inbound-appointment-manage.md](inbound-appointment-manage.md) | 已完成 |
| P1 | `inbound/inbound-transit-tracking` | 业务流程 | — | [inbound-transit-tracking.md](inbound-transit-tracking.md) | 已完成 |
| P1 | `inbound/inbound-self-inspection` | 业务流程 | — | [inbound-self-inspection.md](inbound-self-inspection.md) | 已完成 |
| P1 | `inbound/inbound-order-manage` | 业务流程 | — | [inbound-order-manage.md](inbound-order-manage.md) | 已完成 |
| P2 | `inbound/inbound-customs-clearance` | 业务流程 | 254 | [inbound-customs-clearance.md](inbound-customs-clearance.md) | 已完成 |
| P2 | `inbound/inbound-customs-doc-manage` | 业务流程 | — | [inbound-customs-doc-manage.md](inbound-customs-doc-manage.md) | 已完成 |
| P2 | `inbound/inbound-overseas-inspection` | 业务流程 | — | [inbound-overseas-inspection.md](inbound-overseas-inspection.md) | 已完成 |

**合计**：17 个 `inbound/` 参考文档 + 4 个跨域 `value-add/` 关联入口 = 21 份业务参考齐备。

---

## service-team KB 覆盖率矩阵

路径前缀：`_kb/service-team/inbound-services-doc/`

**图例**：主 = 该专家参考文档的核心 SOP 来源；次 = 补充场景；— = 不归属（或内部排除）

| KB 文档 | 主归属专家 | 次归属 |
|---------|-----------|--------|
| 海外仓的头程直发收货地址.md | inbound-warehouse-info | inbound-process-guide |
| 海外仓头程快递入库服务常见问题.md | inbound-process-guide | inbound-warehouse-info, inbound-arrival-status |
| 新增海外仓入库单的常见问题.md | inbound-process-guide, inbound-order-status | inbound-order-manage |
| 流程起始话术.md | inbound-process-guide | inbound-arrival-status, inbound-transit-tracking |
| 各收费项的冻结_解冻_结算扣费节点.md | inbound-process-guide | — |
| 咨询入库单上架时间及催上架处理流程.md | inbound-putaway-expedite, inbound-putaway-status | inbound-arrival-status |
| 如何查询入库单是否上架完成.md | inbound-putaway-status | — |
| 查询头程送仓时间的处理流程.md | inbound-arrival-status | inbound-transit-tracking |
| 如何查看入库单包裹的海外仓卸货时间.md | inbound-arrival-status | — |
| 确认直发包裹是否到仓的处理流程（直发卸货少包裹）.md | inbound-arrival-status | inbound-exception-check |
| 查询头程到港时间的处理流程.md | inbound-transit-tracking | inbound-arrival-status |
| 查询头程离港时间的处理流程.md | inbound-transit-tracking | — |
| 查询头程进口清关_查验进度的处理流程.md | inbound-customs-clearance | inbound-transit-tracking, inbound-order-status |
| 上架前拦截包裹操作增值服务.md | value-add-product-recommendation | inbound-exception-check, value-add-service-config |
| 入库异常需要细节拍照增值提交.md | value-add-product-recommendation | inbound-exception-check, value-add-service-config |
| 增值预约送仓常见问题.md | value-add-product-recommendation | inbound-appointment-manage, value-add-service-config |
| 如何查询异常单.md | inbound-exception-check | — |
| 入库异常处理方式.md | inbound-exception-check | — |
| 上架少包裹_上架少单品的处理流程（标准海外仓入库单）.md | inbound-exception-check | — |
| 上架少包裹_少单品（查询预分拣记录及救火标准输入）.md | inbound-exception-check | — |
| 上架少单品（直发海外验_自验）的处理流程.md | inbound-exception-check | inbound-self-inspection |
| 客户反馈上架数量异常处理流程（标准海外仓入库单+直发海外验）.md | inbound-exception-check | inbound-overseas-inspection |
| 包裹条码异常(需客户处理)--需要补贴包裹条码上架.md | inbound-exception-check | — |
| 商品有条码但系统无法识别--需要第三方商品条码上架.md | inbound-exception-check | — |
| 直发串仓异常包裹需提增值处理.md | inbound-exception-check | — |
| 直发订单海外仓串仓（海外仓异常事件）.md | inbound-exception-check | — |
| 直发非WINIT仓包裹送错到万邑通仓库.md | inbound-exception-check | — |
| 包裹内出现订单外商品-换新单上架.md | inbound-exception-check | — |
| 入库无主货找回增值提交.md | inbound-exception-check | value-add-exception-diagnosis, value-add-product-recommendation |
| 入库异常需要处理上架前自提.md | inbound-exception-check | value-add-exception-diagnosis, value-add-product-recommendation |
| 入库异常需要处理上架前销毁.md | inbound-exception-check | value-add-exception-diagnosis, value-add-product-recommendation |
| 自验货方式常见问题.md | inbound-self-inspection | inbound-process-guide |
| 自验货的常见问题（旧自验）.md | inbound-self-inspection | — |
| （新版）客户自验常见问题（下单未提供装箱明细-原新自验）.md | inbound-self-inspection | — |
| 快速自验常见问题.md | inbound-self-inspection | — |
| 免自验常见问题.md | inbound-self-inspection | — |
| 自验货第三方包裹条码验货.md | inbound-self-inspection | — |
| 自验-WINIT承运-海运整柜下单常见问题.md | inbound-self-inspection | inbound-order-manage |
| 无箱单有预报常见问答.md | inbound-overseas-inspection | — |
| 直发预约送仓（常见问题）.md | inbound-appointment-manage | — |
| 直发散货预约常见问题.md | inbound-appointment-manage | — |
| 直发预约违规费常见问题.md | inbound-appointment-manage | — |
| 一、背景说明.md | inbound-appointment-manage | — |
| 直发整柜Drop卸货异常退费流程.md | inbound-appointment-manage | — |
| 直发整柜DROP通知提空柜后跑空.md | inbound-appointment-manage | — |
| 直发快递入仓常见问题.md | inbound-appointment-manage | inbound-process-guide |
| 修改入库单目的仓操作流程.md | inbound-order-manage | — |
| 客户如何自行关闭部分到仓的直发类入库单.md | inbound-order-manage | — |
| 英国PVA递延清关常见问题以及申请流程.md | inbound-customs-doc-manage | inbound-customs-clearance |
| 关于比利时清关递延常见问题.md | inbound-customs-doc-manage | inbound-customs-clearance |
| 英国直发订单上传清关资料的常见问题.md | inbound-customs-doc-manage | — |
| 注册自有进口商的常见问题.md | inbound-customs-doc-manage | inbound-permission-apply |
| 第三方进口商的常见问答.md | inbound-customs-doc-manage | — |
| 客户要求加急审核英国进口商的处理流程.md | inbound-customs-doc-manage | inbound-permission-apply |
| 为什么进口清关时间比到港时间早？（美国_澳洲_加拿大）.md | inbound-customs-clearance | inbound-transit-tracking |
| FBA退货入库解决方案.md | inbound-process-guide | — |
| 销售_客服常用对接人通讯录.md | — | **内部排除** |

---

## 关联文档

| 文档 | 说明 |
|------|------|
| [inbound-experts-plan.md](../../plan/inbound-experts-plan.md) | 18 专家规划与边界卡 |
| [inbound-api-matrix.md](../../plan/inbound-api-matrix.md) | API 与 TOM 查询路径 |
| [docs/inbound/playbook.md](../../inbound/playbook.md) | 双轨模型、状态机、SLA 速查 |
| [how-to-design-expert.md](../../how-to-design-expert.md) | 参考文档编写约定 |
