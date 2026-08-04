# 自验 KB 索引（维护用）

> 本文件为知识溯源索引，供 prompt 维护与 KB 同步；**不对客引用文件名**。

## 优先级 1 — 客服自验 FAQ 系列

| 文档 | 覆盖场景 |
|------|----------|
| `自验货方式常见问题.md` | PDA / API / Excel 三种提交方式总览 |
| `自验货的常见问题（旧自验）.md` | OW01021 经典自验：箱单匹配、修改流程 |
| `（新版）客户自验常见问题（下单未提供装箱明细-原新自验）.md` | QSI 新自验：SKU+数量、扫描生成箱单、重验 |
| `快速自验常见问题.md` | API 对接验货、大客户批量场景 |
| `免自验常见问题.md` | 免验条件、白名单、`isAutoInspection` |
| `自验货第三方包裹条码验货.md` | 第三方条码特殊验货场景 |
| `自验-WINIT承运-海运整柜下单常见问题.md` | OW01021 整柜承运特殊要求 |

## 优先级 2 — 产品与规则

| 文档 | 覆盖场景 |
|------|----------|
| `_kb/product-team/.../inbound-rules.md` | 抽验类型 OW01V1266-68、收费标准、权限回收 |
| `_kb/product-team/.../inbound-product-details.md` | PSC 产品线定义（OW01021/22） |
| `docs/inbound/flows/02-direct-self-inspection.md` | 直发自验全链路 SOP |
| `docs/inbound/playbook.md` | 术语、状态机、产品决策树 |

## 本专家 prompt 映射

| prompt 文件 | 主要 KB 来源 |
|-------------|-------------|
| `si-submit-guide.md` | 自验货方式常见问题 + 旧/新自验 FAQ |
| `qsi-guide.md` | 新自验 FAQ + 快速自验 FAQ |
| `exemption-conditions.md` | 免自验常见问题 |
| `sampling-rules.md` | inbound-rules.md（抽验/收费/权限回收） |
