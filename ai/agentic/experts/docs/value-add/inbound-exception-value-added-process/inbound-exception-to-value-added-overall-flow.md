# 入库异常到增值服务总流程

## 目标

把入库异常事实归一为是否进入 value-add 推荐链的判断，不重复做入库异常核实，也不直接输出最终 VASC。

## v1 流程

1. 接收用户描述、异常编码或上游 `valueAddHandoff`。
2. 归一异常对象、异常节点和客户处理意图。
3. 检查 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md` 是否存在 VASC 候选关系。
4. 有候选关系时，交给 `value-add-product-recommendation` 输出候选 VASC。
5. 用户已明确 VASC 或服务方向时，交给 `value-add-service-config` 查询服务项编排和字段证据。
6. 用户提供已提交增值单号并问状态时，交给 `value-add-order-status`。

## 边界

- 入库异常责任、数量差异、是否人工介入仍由 inbound 专家处理。
- 接口文档不能单独决定某异常是否适用某 VASC。
- 缺少异常对象、入库阶段或客户意图时，输出缺失确认项。
