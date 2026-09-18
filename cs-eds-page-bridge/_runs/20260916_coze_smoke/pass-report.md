# Coze API 试跑结果（发布后）

工作流：`page_intent_emit_smoke` / `7685762023372046362`  
三条全部 **PASS**（HTTP 200，业务 code 0）。

| 用例 | `function_name` | `should_send` | 调试页 |
|---|---|---|---|
| 出卡 | `renderA2UI` | true | [打开](https://www.coze.cn/work_flow?execute_id=7685969197193986102&space_id=7417755373999767571&workflow_id=7685762023372046362&execute_mode=2) |
| 读页 | `pageRead` | true | [打开](https://www.coze.cn/work_flow?execute_id=7685969208329158706&space_id=7417755373999767571&workflow_id=7685762023372046362&execute_mode=2) |
| 空 | 空 | false | [打开](https://www.coze.cn/work_flow?execute_id=7685969199903227950&space_id=7417755373999767571&workflow_id=7685762023372046362&execute_mode=2) |

空用例的 `skip_reason`：`sidecar 无法识别为 pageRead 或 renderA2UI`（符合预期，不会误发插件）。
