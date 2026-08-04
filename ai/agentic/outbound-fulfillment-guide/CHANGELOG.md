# CHANGELOG

## Unreleased

### Added

- Phase 0 项目治理骨架。
- 项目级 AI 规则、Schema、目录约定和本地校验契约。

### Changed

- 本次业务范围收敛为订单创建至仓库出库交接。
- 仓内概念流程细化为资格、校验、库存分配、波次、拣货、复核、增值、包装、称重量方、面单、出库和交接。
- 轨迹、妥投、POD、查件、索赔和派送失败处置目录改为延期占位，不进入当前来源、Canonical、测试或发布范围。
- `kb:validate` 允许在带 `origin` 的隔离 clone 中验证，但不将 remote 名称或 URL 写入报告。

当前没有已发布知识版本，也没有 runtime knowledge package。
