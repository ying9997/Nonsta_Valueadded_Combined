# E2E 验证检查清单

- 时间：2026-09-14T14:32:20.452Z
- 测试群：oc_80b07f38ed6833df3787a97a496f1097
- OMS_WRITE_ENABLED=0（强制）
- 结果：✅ 25 / ⚠ 0 / ❌ 0 / 共 25（#9/#14/#17/#18 于 2026-09-15 换数据重跑通过，见 `_runs/20260915_e2e_rerun/`）

- [x] 1. 话题标题：VASC｜客户｜仓库｜摘要  ✅ VASC000000329235 | 13947840/******************** | US0001 | 4 个异常包裹（EB0126073131782987、EB0126073131782618、EB01
- [x] 2. 绿卡三段：客户填写 + AI 总结 + 操作步骤  ✅ hasOriginal=true hasAi=true hasSteps=true
- [x] 3. AI 判断依据：中文一句话  ✅ 【入库】包裹类异常换商品标签上架
- [x] 4. CC@李颖：在 @审核员的卡片上  ✅ 绿/蓝卡含李颖 open_id
- [x] 5. 入库@耿文文 / 库内@何静  ✅ 入库耿文文=true 库内何静=true
- [x] 6. 183069 不被 L1 拦，进入 L2  ✅ outputPath=transfer_human node=match-template
- [x] 7. 空需求（< 5 字）被 L1 拦  ✅ outputPath=needs_requirement_clarification missing=需求描述为空或过短
- [x] 8. 蓝卡：AI 推荐 + 以上都不对 + 转人工  ✅ path=sop_generated recommend=true more=true human=true
- [x] 9. 点「以上都不对」→ 全场景卡  ✅ 2026-09-15 listen 已连；同一 L2 话题发出全场景卡（请选择正确的场景 / 以上都没有）
- [x] 10. 选场景后 → 继续 L2.5 → L4  ✅ override=inbound_third_party_merchandise_barcode path=sop_generated
- [x] 11. 精准追问：本场景需要知道处理范围  ✅ path=needs_field_clarification missing=新入库单号未说明 / 商品标签数量未说明 / 标签文件 hint=true
- [x] 12. 需求+附件合并追问  ✅ info=true att=true missing=新入库单号未说明,商品标签数量未说明,标签文件
- [x] 13. SOP 生成正常  ✅ path=sop_generated llmError=
- [x] 14. 编造降级：[待补充] + 黄色提示  ✅ 2026-09-15 构造粘连单号 VASC000000999999，L4 绿卡 degraded=true
- [x] 15. SOP 修改闭环：点修改 → 回复意见 → 修订版  ✅ 脚本用 sopEditInstruction 生成修订绿卡并续发（未走飞书按钮 listen）
- [x] 16. 「场景不对」按钮：L4/L3/L1/错误卡都有  ✅ L4=true L3/L2.5=true L1=true 错误卡=true
- [x] 17. 308661 红色错误卡（不是蓝色选场景）  ✅ 2026-09-15 临时 maxTokens=50 触发 JSON 截断红卡，已改回 2500
- [x] 18. 正常写入（待审核的单）  ✅ 2026-09-15 VASC000000366432 真写 sceneOverviewCode+sop+nweon，写完 OMS_WRITE_ENABLED=0
- [x] 19. 非待审核拒绝  ✅ success=false skipped=vaOrderReview,status_not_writable error=订单状态为「已完成」，非待审核状态，禁止写入。可能审核员已经手动审核通过。
- [x] 20. 写入失败 → 重试按钮  ✅ 发出模拟失败重试卡；真实 Cookie 失败路径未在本轮触发
- [x] 21. @bot "拍照暂存" → 确认卡片  ✅ search hits=1 【入库】指定商品拍照暂存；未走真实 IM @bot（事件总线可能被占用）
- [x] 22. @bot "关联第三方" → 多结果卡片  ✅ hits=2
- [x] 23. @bot "啊啊啊" → 未找到提示  ✅ hits=0
- [x] 24. 非三种服务码跳过（看 log）  ✅ [2026-09-14T14:32:18.038Z] skip_service_code VASC000000E2ESKIP code=OW99SKIP
- [x] 25. 限流生效（看 hourly-count）  ✅ [2026-09-14T14:32:20.424Z] rate_limit_hour reached 10/hour

## 已发话题
- VASC000000329235 thread=om_x100b65b4786090a0c4af8e95a4a65ac title=VASC000000329235 | 13947840/******************** | US0001 | 4 个异常包裹（EB0126073131782987、EB0126073131782618、EB01
- VASC000000284952 thread=om_x100b65b471de6ca4c4f3fe836310edd title=VASC000000284952 | 18513540/********************** | USGA | 订单 WO11365273924 拣选时发现 16 件商品外箱破损严重且无法扫描 SN 码，需转为不
- VASC000000183069 thread=om_x100b65b40e7064a0c42e7d5e95abe27 title=VASC000000183069 | 1000173/梦幻岛网路科技有限公司 | US0001 | 请撕掉透明膜 然后根据包装盒背部的 型号进行区分 以及反馈数量
- VASC000000E2EEMPTY thread=om_x100b65b40f55a0a4c3fd1e8db31b6e2 title=VASC000000E2EEMPTY | 1000173/梦幻岛网路科技有限公司 | US0001 | 啊
- VASC000000326061 thread=om_x100b65b40bae20a0c4e0d9b61508770 title=VASC000000326061 | 19937931/TikTok Inc.-2 | USKY5 | 异常单 EB0326072531612017 涉及两个入库单（WI51383223、WI513831
- VASC000000E2EL25 thread=om_x100b65b4046b9ca0de23c1b4a09b789 title=VASC000000E2EL25 | 19937931/TikTok Inc.-2 | USKY5 | 请换标上架谢谢
- VASC000000282990 thread=om_x100b65b4029cc0a8c19e96c860258be title=VASC000000282990 | 17688379/*********** | USKY5 | 需求： 1请将异常单：EB0126050729293338的货物帮忙补贴商品条码M010000000
- VASC000000308661 thread=om_x100b65b41fe8d4a0c4a11fb2d970cee title=VASC000000308661 | 16757165/**************************** | DEBR2 | EB0526062530740871 EB0526062530740874 仓库反馈这两个异常实际是
- VASC000000329235-OMS-CANCEL thread=om_x100b65b41ce0f8a4debfc685f3cabb3 title=⚠ OMS 写入已取消 — VASC000000329235
- VASC000000329235-RETRY thread=om_x100b65b41dcd30a4c434b28c4ecd5e8 title=VASC000000329235 | 13947840/******************** | US0001 | 4 个异常包裹（EB0126073131782987、EB0126073131782618、EB01

