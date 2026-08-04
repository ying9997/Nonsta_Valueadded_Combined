# Outbound Carrier Detail Implementation Plan

**Goal:** 在 `outbound-order-status` 内用 id/54 定位订单后按需调用 id/55，并确定性输出实际承运商。

**Scope:** 只修改本目录；不修改其他 Expert、recaller、共享模块或线上配置。

## Tasks

- [x] 新增目录内回归脚本，覆盖 id/55 动作构建、详情合并、缺失/失败兜底和结构化输出。
- [x] 运行回归脚本，确认因新节点尚不存在而失败。
- [x] 新增 `build-carrier-detail-winit.ts`，从 id/54 结果提取 WO 并生成 `queryOutboundOrder` 动作。
- [x] 新增 `merge-carrier-detail.ts`，将 id/55 详情安全合并到 id/54 订单并生成 `carrierFacts`。
- [x] 更新 `format-output.ts`，以确定性 `carrierFacts` 覆盖或补充 LLM 的 `structured.carriers`。
- [x] 更新 `workflow.json`、`coze.config.yml`、Prompt、manifest 和专家设计说明。
- [x] 运行回归脚本并确认通过。
- [x] 运行 `typecheck`、manifest、Coze 节点、输出契约校验。
- [x] 导出新的 `outbound-order-status` Coze 包并检查包内容。

## Outbound timing enrichment

**Goal:** 仅在发货/出库时效意图下调用 `wh.outbound.getPackageDetail`，确定性输出应出库时间。

- [x] 建立10个合成红灯回归，覆盖意图门控、子单匹配、payload、成功/空数据/失败和确定性输出。
- [x] 新增 `build-outbound-timing-detail.ts` 与 `merge-outbound-timing-detail.ts`。
- [x] 只保留时效必要字段，丢弃面单 URL、商品库存、内部 ID 和完整容器数据。
- [x] 接入 workflow、Coze 插件配置、Prompt、manifest 与设计文档。
- [x] 运行全套回归和导出校验，并完成真实样本只读链路验证。

## Actual package measurement enrichment

**Goal:** 在实际尺寸、重量或体积意图下复用 `wh.outbound.getPackageDetail`，按 trackingNo / 子单确定性输出实际测量值。

- [x] 扩展详情意图门控，保持普通状态查询不增加接口调用。
- [x] 从 `actualWeight`、`actualVolume`、`actualContainerList` 映射 kg、m³、cm 字段。
- [x] 严禁用 `estimate*` 或普通 `containerList` 回填实际值；多箱逐箱保留。
- [x] 接入 `packageMeasurementFacts`、`structured.packageMeasurements`、Prompt、manifest、workflow 和设计文档。
- [x] 增加实际/预估隔离、多箱、精确子单匹配和确定性覆盖回归。
- [x] 通过专项测试、typecheck、manifest、节点代码、端口、打包编译和输出契约检查。
- [x] 重新导出本地 Coze YAML 与 zip；线上导入、发布和回归待单独确认。
