# 飞书群 E2E 测试报告

## 结论

- 测试时间：2026-09-03
- 身份来源：`user_file`（用户身份）
- 目标消息：7 条
- 最终发送成功：7/7
- L4 SOP 草稿：4/4
- 根消息 API 验收：7/7 返回 HTTP 200、`code=0`
- 单号校验：7/7
- `💪` 标记：7/7

## 消息结果

| 层级 | orderNo | 消息类型 | 根消息 ID | 话题 ID | 验收 |
| --- | --- | --- | --- | --- | --- |
| L1 | VASC000000183069 | 缺需求 | om_x100b66a0cd8218a4c4bb81c515875b1 | omt_19fcc0fddf4f5be7 | 通过 |
| L2 | VASC000000344421 | 转人工 | om_x100b66a0ca81c4a4c36c7b1c30f81eb | omt_19fcc08de28f5b9a | 通过 |
| L3 | VASC000000343821 | 缺资料 | om_x100b66a0cbad4ca8c23e8d67b123be1 | omt_19fcc09f2a0f9b8f | 通过 |
| L4 | VASC000000333147 | SOP 草稿 | om_x100b66a0c9e6c8acc2cec9e140f5534 | omt_19fcc0bb924fdb80 | 通过 |
| L4 | VASC000000326061 | SOP 草稿 | om_x100b66a0c64604a4deb59430800fca1 | omt_19fcc0419e8f5a47 | 通过 |
| L4 | VASC000000143515 | SOP 草稿 | om_x100b66a0c75d84acc2332c653897b5f | omt_19fcc050268fdb8f | 通过 |
| L4 | VASC000000080416 | SOP 草稿 | om_x100b66a0c23994a4ddc608a66ade899 | omt_19fcc006678f5a70 | 通过 |

## 降级记录

`VASC000000080416` 首次调用时模型输出未解析成 JSON，系统按设计降级为 `transfer_human`，并发送了一条转人工消息：

- 根消息 ID：`om_x100b66a0c50090acc22b6d841fceaa5`
- 话题 ID：`omt_19fcc075f7cfdb8e`

随后仅重试该单，成功生成并发送 SOP 草稿。群内保留首次降级消息，用于展示异常时不会错误下发 SOP。

## 代码调整

`internal-review-copilot/scripts/demo-e2e.ts` 现在支持：

- `sop_generated` 时发送完整 SOP 草稿；
- SOP 消息标题使用 `SOP草稿`；
- 发送后状态记录为 `sop_ready`；
- `--force-send` 仅在显式测试时绕过去重，默认行为仍去重。

本次本地输出位于 `feishu_e2e/`。
