# 线 A 验收：exception-lookup 接真实 OMS

日期：2026-09-11

## 结论

| 项 | 结果 |
| --- | --- |
| VASC000000360750 异常名称 | **通过** `source=oms_api`，三张 EB 均为「商品条码异常(需客户处理)」 |
| 场景判断 | **通过** `inbound_package_exception_relabel_shelving`（不再是包裹条码批量异常） |
| 飞书卡「AI 判断依据」 | **通过**，含 oms_api，最多 5 行 |
| demo-7 `--skip-llm` | **不降** outputPath 7/7，sceneKey 4/5（与此前 skip-llm 基线一致） |
| 未真写 OMS | 360750 不在白名单 |

## 飞书话题（请看这张新卡）

- 话题：`omt_19c6344ab40f9a42`
- 根消息：`om_x100b650f86f4aca8dee6f4f0cfc386a`
- 出口：L3 缺附件（标签文件）
- 场景：【入库】包裹类异常换商品标签上架

同单更早一张误判「包裹条码批量异常」的卡片可忽略。

## 产物

- `_runs/20260911_line_a_verify/VASC000000360750.review.json`
- `_runs/20260911_line_a_verify/VASC000000360750.card.json`
- `_runs/20260911_line_a_verify/demo7/eval-report.md`
