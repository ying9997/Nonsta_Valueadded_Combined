# 专家参考资料（docs/experts）

本目录存放各专家的**业务设计思路、SOP 摘要、话术路由与知识库副本**，供 `experts/{域}/{专家ID}/` 实现时对照；**不是**运行时代码。

新建或更新参考文档的流程见 [how-to-design-expert.md](../how-to-design-expert.md)（步骤 7）。实现侧权威文档仍在各专家目录：`experts/{域}/{专家ID}/design.md`、`manifest.json`。

域划分与 plan 排期见 [docs/plan/domain-taxonomy.md](../plan/domain-taxonomy.md)。  
入库流程知识库见 [docs/inbound/playbook.md](../inbound/playbook.md)（双轨模型、产品分层、状态机、决策树）。

---

## 目录结构

```
docs/experts/
├── README.md                 # 本说明
├── last-mile/                # 尾程域 — 与 experts/last-mile/ 对齐
│   ├── {expert-id}.md        # 单专家业务/设计参考
│   └── supplier-tracking/
│       ├── carrier-portals.md    # 飞书 KB 全文（含配图引用）
│       └── carrier-portals/      # 截图资源
├── outbound/
│   └── outbound-order-status.md
├── inbound/                  # 入库域 — 与 experts/inbound/ 对齐
│   ├── README.md             # 专家索引 + service-team KB 覆盖率矩阵
│   └── {expert-id}.md        # 单专家客服 SOP 参考（18 专家已全部完成）
├── value-add/                # 增值域（跨 inbound/outbound）
│   ├── value-add-exception-diagnosis.md
│   ├── value-add-product-recommendation.md
│   ├── value-add-service-config.md
│   ├── value-add-order-status.md
├── storage/                  # （待建）在库域参考
├── warehouse/                # （待建）仓运营共享域参考
├── customer/                 # （待建）
└── sku/                      # 商品主数据 LLM Wiki — playbook + flows/
    ├── README.md
    ├── playbook.md
    ├── flows/
    └── scenes/
```

**命名约定**：`docs/experts/{域}/{专家ID}.md`，专家 ID 与 `experts/{域}/{专家ID}/` 一致。附属 KB、配图放在 `{域}/{专家ID}/` 子目录下。

---

## 尾程（last-mile）

| 参考文档 | 专家 ID | 说明 |
|---|---|---|
| [delivery-status.md](last-mile/delivery-status.md) | `last-mile/delivery-status` | 轨迹解读（基础层） |
| [tracking-stale.md](last-mile/tracking-stale.md) | `last-mile/tracking-stale` | 轨迹长时间未更新 |
| [tracking-no-scan.md](last-mile/tracking-no-scan.md) | `last-mile/tracking-no-scan` | 轨迹无上网 |
| [tracking-inquiry.md](last-mile/tracking-inquiry.md) | `last-mile/tracking-inquiry` | 查件/代查件 |
| [delivered-not-received.md](last-mile/delivered-not-received.md) | `last-mile/delivered-not-received` | 妥投未收到 |
| [expected-arrival-time.md](last-mile/expected-arrival-time.md) | `last-mile/expected-arrival-time` | 预计到达时间 |
| [intercept-redirect.md](last-mile/intercept-redirect.md) | `last-mile/intercept-redirect` | 拦截/改址 |
| [shipping-label.md](last-mile/shipping-label.md) | `last-mile/shipping-label` | 面单获取 |
| [pod-request.md](last-mile/pod-request.md) | `last-mile/pod-request` | POD 申请 |
| [pod-validation.md](last-mile/pod-validation.md) | `last-mile/pod-validation` | vPOD/ePOD 校验 |
| [substitute-claim.md](last-mile/substitute-claim.md) | `last-mile/substitute-claim` | 代客索赔 |
| [carrier-contact.md](last-mile/carrier-contact.md) | `last-mile/carrier-contact` | 承运商联系方式 |
| [supplier-tracking.md](last-mile/supplier-tracking.md) | `last-mile/supplier-tracking` | 承运商官网轨迹查询入口 |
| [supplier-tracking/carrier-portals.md](last-mile/supplier-tracking/carrier-portals.md) | ↑ | KB 全文 + 配图 |
| [refund-standard.md](last-mile/refund-standard.md) | `last-mile/refund-standard` | 赔付标准 |
| [product-info.md](last-mile/product-info.md) | `last-mile/product-info` | 尾程产品信息 |
| [product-consult.md](last-mile/product-consult.md) | `last-mile/product-consult` | 尾程产品咨询 |

---

## 出库（outbound）

| 参考文档 | 专家 ID |
|---|---|
| [outbound-order-status.md](outbound/outbound-order-status.md) | `outbound/outbound-order-status` |

---

## 入库（inbound）

索引：[inbound/README.md](inbound/README.md)

| 参考文档 | 专家 ID | 说明 |
|---|---|---|
| [inbound-warehouse-info.md](inbound/inbound-warehouse-info.md) | `inbound/inbound-warehouse-info` | 仓库地址/联系人/截单（P0） |
| [inbound-process-guide.md](inbound/inbound-process-guide.md) | `inbound/inbound-process-guide` | 入库流程/规则/费用 FAQ（P0） |
| [inbound-order-status.md](inbound/inbound-order-status.md) | `inbound/inbound-order-status` | 入库单状态/报错解读（P0） |
| [inbound-arrival-status.md](inbound/inbound-arrival-status.md) | `inbound/inbound-arrival-status` | 到仓确认/轨迹/POD（P0） |
| [inbound-putaway-status.md](inbound/inbound-putaway-status.md) | `inbound/inbound-putaway-status` | 上架进度/数量核实（P0） |
| [inbound-putaway-expedite.md](inbound/inbound-putaway-expedite.md) | `inbound/inbound-putaway-expedite` | 催上架/加急（P0） |
| [inbound-exception-check.md](inbound/inbound-exception-check.md) | `inbound/inbound-exception-check` | 入库异常核实（P1） |
| [inbound-appointment-manage.md](inbound/inbound-appointment-manage.md) | `inbound/inbound-appointment-manage` | 预约送仓（P1） |
| [inbound-transit-tracking.md](inbound/inbound-transit-tracking.md) | `inbound/inbound-transit-tracking` | 头程在途（P1） |
| [inbound-self-inspection.md](inbound/inbound-self-inspection.md) | `inbound/inbound-self-inspection` | 自验/抽验（P1） |
| [inbound-order-manage.md](inbound/inbound-order-manage.md) | `inbound/inbound-order-manage` | 单据操作指引（P1） |
| [inbound-permission-apply.md](inbound/inbound-permission-apply.md) | `inbound/inbound-permission-apply` | 权限申请（P1） |
| [inbound-psc-eligibility.md](inbound/inbound-psc-eligibility.md) | `inbound/inbound-psc-eligibility` | PSC 开通查询（P1） |
| [inbound-capacity-availability.md](inbound/inbound-capacity-availability.md) | `inbound/inbound-capacity-availability` | 库容/额度（P1） |
| [inbound-customs-clearance.md](inbound/inbound-customs-clearance.md) | `inbound/inbound-customs-clearance` | 清关进度（P2） |
| [inbound-customs-doc-manage.md](inbound/inbound-customs-doc-manage.md) | `inbound/inbound-customs-doc-manage` | 清关资料（P2） |
| [inbound-overseas-inspection.md](inbound/inbound-overseas-inspection.md) | `inbound/inbound-overseas-inspection` | 海外验进度（P2） |

## 增值（value-add，跨域）

| 参考文档 | 专家 ID |
|---|---|
| [value-add-exception-diagnosis.md](value-add/value-add-exception-diagnosis.md) | `value-add/value-add-exception-diagnosis` |
| [value-add-product-recommendation.md](value-add/value-add-product-recommendation.md) | `value-add/value-add-product-recommendation` |
| [value-add-service-config.md](value-add/value-add-service-config.md) | `value-add/value-add-service-config` |
| [value-add-order-status.md](value-add/value-add-order-status.md) | `value-add/value-add-order-status` |
---

## 商品主数据（sku）

索引：[sku/README.md](sku/README.md) · **业务说明**：[sku/expert-manual.md](sku/expert-manual.md) · **Huddle 短介绍**：[sku/huddle-brief.md](sku/huddle-brief.md)

| 参考文档 | 专家 ID | 说明 |
|---|---|---|
| [profile.md](sku/profile.md) | `sku/profile` | SKU 档案共享事实（P1，待配置） |
| [registration-guide.md](sku/registration-guide.md) | `sku/registration-guide` | 注册/加急/退回引导（P1，待配置） |
| [barcode-guide.md](sku/barcode-guide.md) | `sku/barcode-guide` | 打标 + 三方码增删查（P2，待配置） |
| [experts/sku/compliance-check](../../experts/sku/compliance-check/) | `sku/compliance-check` | 合规深判（P2，待配置） |

域规划：[sku-plan.md](../plan/sku-plan.md) · LLM Wiki：[sku/playbook.md](../sku/playbook.md)

---

## 路径迁移（2026-06）

原扁平路径 `docs/experts/{name}.md` 已按域归档。常见对照：

| 旧路径 | 新路径 |
|---|---|
| `docs/experts/last-mile/tracking-stale.md` | `docs/experts/last-mile/tracking-stale.md` |
| `docs/experts/outbound/outbound-order-status.md` | `docs/experts/outbound/outbound-order-status.md` |
| `docs/experts/last-mile/supplier-tracking/carrier-portals.md` | `docs/experts/last-mile/supplier-tracking/carrier-portals.md` |
| `docs/experts/last-mile/supplier-tracking/carrier-portals/` | `docs/experts/last-mile/supplier-tracking/carrier-portals/` |
