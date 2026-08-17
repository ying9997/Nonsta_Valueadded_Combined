# 尾程场景专家计划（4 月 OKR）

> 对应 [project-plan.md](project-plan.md) 中 KR-1 的 4 月目标：**35% 覆盖率**，尾程售后 - 轨迹咨询/查件/索赔提升（20% up）。

---

## 一、OKR 目标

- **目标达标月**：4 月
- **覆盖率目标**：35%
- **场景**：尾程售后 - 轨迹咨询/查件/索赔
- **专家**：delivery-status、查件/索赔解读、vPOD/ePOD 校验、面单获取

---

## 二、排期策略

- **本期（优先）**：API-READY > 0% 的能力，计划上线 **3.31**
- **下期**：API-READY = 0% 的能力，待 API 就绪后实现，计划上线 **4.15**

---

## 三、尾程流程专家清单（与 OKR 对齐）

### 1期


| [ ] | 流程          | 路径                         | 说明           | 当前状态 | API-READY |
| --- | ----------- | -------------------------- | ------------ | ---- | --------- |
| [x] | 轨迹长时间未更新    | last-mile/tracking-stale   | 轨迹长时间未更新处理流程 | done | 80%       |
| [x] | 轨迹无上网信息处理流程 | last-mile/tracking-no-scan | 轨迹无上网信息处理流程  | done | 60%       |


### 2期


| [ ] | 流程              | 路径                               | 说明                       | 当前状态 | API-READY |
| --- | --------------- | -------------------------------- | ------------------------ | ---- | --------- |
| [x] | 妥投未收到处理流程       | last-mile/delivered-not-received | 妥投未收到处理流程                | done | 0%        |
| [ ] | 查询、获取尾程面单       | last-mile/shipping-label         | 多类订单标识定位，批量返回已处理面单 PDF 与逐单失败原因 | 待配置 | 100%      |
| [x] | 申请、获取POD处理流程    | last-mile/pod-request            | 申请、获取POD处理流程             | -    | 0%        |
| [x] | 查件/代查件          | last-mile/tracking-inquiry       | 查件状态和结果返回，代客户发起查件或告知查件入口 | 待实现  | 0%        |
| [x] | 代客索赔进度、申请、时效及流程 | last-mile/substitute-claim       | 代客索赔申请、进度、时效及流程性赔付状态查询   | -    | 0%        |
| [ ] | 订单拦截/改址处理流程     | last-mile/intercept-redirect     | 订单拦截/改址处理流程              | -    | 0%        |
| [x] | 服务商和自提点等联系方式提供  | last-mile/carrier-contact        | 必要时给出正确服务商电话             | 待实现  | 0%        |
| [ ] | 预计到达时间查询        | last-mile/expected-arrival-time  | 预计到达时间处理流程               | -    | 0%        |
| [ ] | 尾程产品服务咨询        | last-mile/product-consult        | 尾程产品推荐+尾程服务能力解读          | -    | 0%        |


### 遗留进度需注意

1. `shipping-label` 已接入 `wh.outbound.getMaskedLabelUrl`；接口返回 PDF 已包含 `DO NOT PRINT - SAMPLE ONLY` 水印和条码模糊处理，无需 Expert 二次加工。2026-07-22 已完成六种状态的接口依赖验证：DLI、HPO、DLC、DLF、EX 取得可访问 PDF，OBC 样本返回成功空列表；并确认 `02020249909` 表示超过出库后 30 天。仓库已纠正超期提示及“仅支持人工客服”的旧规则，但线上 Coze 草稿尚未更新和复测，当前仍为「待配置」；发布、登记和 recaller 路由验证前不得标为「已完成」。

---

## 四、基础能力层

### 本期


| [ ] | 能力项      | 路径                             | 说明                                  | 当前状态                      | API-READY |
| --- | -------- | ------------------------------ | ----------------------------------- | ------------------------- | --------- |
| [x] | 尾程轨迹解读   | last-mile/delivery-status      | 供应商 + Winit 双源、业务规则判断；承运商官网爬取不在本专家内 | 部分实现，待配置                  | 70%       |
| [x] | 出库单状态解读  | outbound/outbound-order-status | 含暂存、增值、实际尺寸重量和各种状态解读（暂时少增值）       | 已上线；尺寸重量增强本地已验证、待发布回归 | 100%      |
| [x] | 赔付标准理解   | last-mile/refund-standard      | 根据场景对应赔付标准                          | 待配置                       | 100%      |
| [x] | 尾程产品信息获取 | last-mile/product-info         | 尾程产品介绍从价卡和综合方案配置ETL获取               | 等综合解决方案的数据源少欧洲和AU的尾程渠道介绍 | 80%       |


### 下期（4.15 上线，待 API 就绪）


| [ ] | 能力项                  | 路径                                 | 说明                            | 当前状态      | AI-READY |
| --- | -------------------- | ---------------------------------- | ----------------------------- | --------- | -------- |
| [ ] | vPOD/ePOD 校验         | last-mile/pod-validation           | 实时校验是否符合规范,有时候pod是空，但AI无法获取zip包，也没有任何返回信息表明pod是空       | 待实现       | 0%       |
| [ ] | Google Map 查询        | last-mile/google-map-address-query | 根据轨迹查询 Google Map             | 待实现       | -        |
| [ ] | 面单地址 OCR 识别          | last-mile/label-ocr                | 面单 OCR 识别，当前AI无法获取到面单图像，无法进行下一步识别       | 待有方案       | -        |
| [x] | 承运商官网轨迹查询入口         | last-mile/supplier-tracking        | KB 官方物流查询网址与步骤；专家内不爬网；系统侧轨迹爬取另案 | 已实现（链接模式） | -        |
| [ ] | 供应商ETA查询             | last-mile/supplier-eta             | 供应商ETA查询，无法访问供应商网站，采用模型猜测ETA                      | 待实现       | -        |
| [ ] | 查询 WINIT 和尾程相关的公告/通知 | last-mile/winit-announcement       | 查询WINIT关于Carrier服务异常时效的公告和通知  | 待实现       | 0%       |


---

## 五、已实现专家中的临时 / 占位接口（待办）

以下为仓库代码检索结果：涉及**未接真实 OpenAPI**、**仅占位返回**或**依赖代理/环境否则无数据**的请求逻辑；对接完成后可逐项勾掉。


| [ ] | 专家路径                             | 节点 / 文件                                     | 说明                                                                                                                       |
| --- | -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [x] | `last-mile/delivery-status`      | OpenAPI id/56 + 内嵌插件 + `fetch-trajectories` | 主路径 `tracking.getOrderVerdorTracking`；`build-winit-tracking-data` 拼装插件 `data`；公开 `getTracking` 仅作非 WO 键兜底；已移除反查/出库详情占位节点 |
| [x] | `last-mile/tracking-no-scan`     | `nodes/fetch-and-enrich.ts`                 | 与上相同的 `track.winit.com` 轨迹请求；同上待与官方接口策略对齐                                                                                |
| [x] | `outbound/outbound-order-status` | `nodes/fetch-outbound-order.ts`             | **无** `COZE_API_TOKEN` + `COZE_WINIT_`* 等时占位返回空 `list` 并告警；注释写明「万邑通直连（预留）」未实现，仅检测 `WINIT_API_TOKEN` 后仍返回空                |


**说明**：`outbound-order-status` 在配置 Coze Workflow 代理万邑通时为正式 `api.coze.cn` 的 `workflow/run`，不属于占位；占位的是**未配置代理时**的行为与**直连万邑通**缺口。`arithmetic-formula` 的 `stub-llm-placeholder` 为工作流分支桩节点，非 HTTP 接口，未列入。

2026-07-31：据 Henry 确认 `outbound-order-status` 已上线。本地已完成包裹实际尺寸/重量/体积增强，并用真实 trackingNo 验证 `wh.outbound.getPackageDetail` 返回 `actualWeight`、`actualVolume`、`actualContainerList`；本地代码、导出与回归已通过，但尚未执行线上导入、发布及发布后回归。

---
