# Bot Client 发布确认

- 名称：`cs_Bot_Client_v2p_1`
- **新副本 id：`7685975376836739124`**（导入生成，不是覆盖旧画布）
- 旧画布仍在：`7685663589169381391`（没有 page 三格）
- 打开：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7685975376836739124

## API 试跑

`POST /v1/workflow/run` 三条都返回失败码 5000。执行历史明确：

`Invalid BotID and Invalid ProjectID`

这是对话流的正常限制：必须绑在某个 Bot 上跑，不能像 smoke 工作流那样用纯 workflow API 打。

调试页（节点细节要登录 Coze 看）：

- 出卡 https://www.coze.cn/work_flow?execute_id=7685977699416637455&space_id=7417755373999767571&workflow_id=7685975376836739124&execute_mode=2
- 读页 https://www.coze.cn/work_flow?execute_id=7685977712397385780&space_id=7417755373999767571&workflow_id=7685975376836739124&execute_mode=2
- 普通问答 https://www.coze.cn/work_flow?execute_id=7685977706437984262&space_id=7417755373999767571&workflow_id=7685975376836739124&execute_mode=2

## 画布上怎么验

打开新 id 的对话流 → 试运行。用户输入贴 `fixtures/sidecar-render-a2ui.json` 整段，应走插件 `renderA2UI`；贴「你好」不应发插件。
