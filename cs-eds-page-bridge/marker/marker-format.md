# 标识格式约定（第 0 步）

专家草稿里，**人话在前，标识在后**。Query 副本 F_1 的 `extract_sidecar` 会拆走标识，只把人话交给 A1。卖家页气泡只看人话。Coze 预览/调试里可以看见 sidecar JSON。

本期出口要证明：**标识能从专家草稿拆进 Query 结束的 sidecar，并且不再出现在卖家页气泡里。** 卡片画得对不对，仍可以后补。

## 完整样子

```
这是正常给客户看的推荐回复文字。

<!--SIDECAR_BEGIN-->
{"type":"renderA2UI","payload":{"commands":[]}}
<!--SIDECAR_END-->
```

复制粘贴用的完整样例见同目录 [`test-marker-recommend.txt`](test-marker-recommend.txt)。

## 三条硬规则

1. **起止标记**必须原样出现，中间不要加空格、不要改大小写：
   - 开始：`<!--SIDECAR_BEGIN-->`
   - 结束：`<!--SIDECAR_END-->`
2. **中间只有一行 JSON**，不要折行、不要包代码块（不要 \`\`\`json）。
3. JSON 至少有两个键：
   - `type`：动作类型（见下表）
   - `payload`：该动作的数据对象

人话和标识之间空一行。人话里不要出现这两段 HTML 注释（客服话里几乎不会撞车）。

## type 取值

| type | 谁发出 | 做什么 |
|---|---|---|
| `renderA2UI` | AI → 前端 | 侧栏出卡。`payload` 里是 `{ "commands": [ ... ] }`，catalog 必须是 `ai-chatbot-builtin`、版本 `v0.9` |
| `pageRead` | AI → 前端 | 让前端读当前 EDS 页。`payload` 可空或带 `reason` |
| `operatePageResult` | 前端 → AI | 点页做完后的回执 |
| `frontendReply` | 前端 → AI | 前端把页面信息塞回下一轮用户消息 |

第 0 步只用 `renderA2UI` 测通道。其它 type 先占位，不测对错。

## 怎么拆（程序侧）

1. 在整段回复里找 `<!--SIDECAR_BEGIN-->` 和 `<!--SIDECAR_END-->`。
2. 两个标记都在，才继续；缺一个 = 标识被破坏。
3. 取出中间字符串，`JSON.parse`。
4. 读 `type`，再读 `payload`。
5. Query F_1 的 `extract_sidecar` 把整段标识拆进结束节点的 `sidecar`，人话只留 `reply_clean` 给 A1。卖家页不要再展示这段 JSON。

## 第 0 步过关标准

| 检查 | 过 |
|---|---|
| 专家草稿里起止标记还在 | `extract_sidecar` 输入里能扫到 `SIDECAR` |
| 中间仍是一行合法 JSON | `JSON.parse` 不报错 |
| `type` 仍是原来的值 | 例如仍是 `renderA2UI` |
| 人话还在，且卖家页没有 JSON | A1 / 气泡里扫不到 `SIDECAR` |

**过关不要求：** 卡片画得对、产品码正确、SOP 正确。

## 不要做的

- 不要把标识写进 `qa-gen_base.csv`
- 不要只用 `structured` 字段塞标识：recaller 往下只交 `reply_to_user` 这一句人话，`structured` 带不进 A1 / 气泡
- 不要改现网 Query / Bot / recaller。副本 F_1 的 sidecar 出口见 [`query-f1-sidecar-outlet.md`](query-f1-sidecar-outlet.md)
- 选中用 catalog 的 `selectOption`（`args=[index, optionText]`），不要用 `clickElement(0)`，也不要用 PRD 的 `fieldKey+valueCode`
