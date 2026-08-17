# 免验条件

## 经典免验规则

- `isAutoInspection=Y` 时可能符合免验条件（以 `getOrderDetail` 实际字段为准）
- 部分 OW01021 客户满足 Winit 白名单要求（历史验货准确率高）可申请免验
- 免验以 Excel 箱单形式上传，Winit 不进行物理开箱核对
- 新自验模式（QSI）有独立免验规则
- 免验申请需特殊审批时升级人工

## 判断要点（OMS 链）

1. 查看 `getOrderDetail` 中 `isAutoInspection`、`inspectionType`、`winitProductCode`
2. 确认客户是否已完成必要验货数据提交
3. 不符合免验时说明需完成自验后方可发运/预约

## 对客原则

- 不承诺免验审批结果
- 说明条件与申请路径（万邑联平台操作）
- 纯 FAQ 场景可走 `kb_only`，不引用订单字段
