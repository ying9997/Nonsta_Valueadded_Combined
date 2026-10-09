# 专家结束节点设计（通道卡住时也能先定）

前端 `queryToolCall` 还是空的，**不挡先设计专家**。  
专家要定的是：什么时候吐哪一种 JSON。  
**专家自己不调用** `tool_call_send` / `renderA2UI` / `pageRead`。后面对话流里那三格已经会发。专家只负责把 JSON 写在结束节点的 `analysis` 里。

recaller、现网 Query、现网 Bot **这轮不要改**。

---

## 专家在整条链上干什么

```
客人说话
  → Query 问专家（recaller 按登记表 id 调）
  → 专家结束节点吐出：人话 + 标识 JSON
  → Query 以后把标识拆走，人话给卖家看
  → 对话流末尾三格（已经有了）把 JSON 发给前端
  → 前端画卡 / 读页 / 点选中
```

所以「专家怎么生成 JSON 然后调用后面的工具」拆成两句：

1. **生成 JSON** = 专家结束节点 `analysis` 里，人话后面跟 `<!--SIDECAR_BEGIN-->…<!--SIDECAR_END-->`
2. **调用工具** = 不是专家去调；是 Bot Client 已经接好的 `page_intent_emit` → `tool_call_send_page`

通道卡住（前端没收到）只说明第 2 步的最后一公里没通。第 1 步可以在专家工作流里单独试运行。

---

## 专家只做三种决定

客人问换标 / 增值时，专家每次只选一种：

| 情况 | 专家做什么 | 标识里的 type |
|---|---|---|
| 页上关键信息还没有（仓库、SKU、页上有哪些产品/原子选项） | 人话说明「我先读一下当前页」+ 读页标识 | `pageRead` |
| 已经能推荐「哪个产品 + 哪个原子」 | 人话推荐 + 出卡标识（确认后只选中，不提交） | `renderA2UI` |
| 只是问规则 / 价格 / 要不要做，不需要动页 | 只人话，**不要**标识 | （无） |

不要同一次既读页又出卡。先读页，等下一轮页面信息回来，再出卡。

选中按钮必须用 `selectOption`，参数是 `[下拉序号, 选项原文]`。不要写「点第 0 个元素」，也不要让专家自己去点页面。

---

## 结束节点四个口怎么用

| 口 | 怎么用 |
|---|---|
| `analysis` | **人话 + 标识写在这里。** recaller 只会把这段收成给下游的意见。 |
| `structured` | 继续给专家内部用（产品码、原子码）。**不要只把出卡 JSON 放这里**，下游看不见。 |
| `outputContext` / `enrichedContext` | 保持原样引用，不要改。 |

人话在前，空一行，再写标识。卖家最终只应看见人话；JSON 给后面的对话流。

标识格式细则：[`marker-format.md`](marker-format.md)。

---

## 两种 JSON（复制就能用）

### 1）还没看清页面 → 读页

粘贴全文：[`test-marker-page-read.txt`](test-marker-page-read.txt)

中间 JSON 的意思：

```json
{"type":"pageRead","payload":{"reason":"eds_value_add_form_need_facts"}}
```

后面的 `page_intent_emit` 认出 `type=pageRead`，就会让插件发 `pageRead`。

### 2）已经能推荐 → 出「确认选中」卡

粘贴全文：[`test-marker-recommend.txt`](test-marker-recommend.txt)

中间 JSON 的意思：

- `type` = `renderA2UI`
- 卡片标题：确认选中推荐服务
- 按钮点下去：前端在页上 `selectOption` 选中产品和原子，**不提交审核**

样例产品：库内轻加工-更换商品条码；原子：库内-更换新商品条码。  
SOP 准不准是下一轮的事；这一轮先把「专家吐出的形状」定死。

---

## 通道没通时，专家怎么算测过

打开**测试空间那张专家工作流**，点试运行（不要走 EDS 侧栏，也不要发布现网）。

| 检查 | 过 |
|---|---|
| `analysis` 里人话还在 | 能看见推荐句子 |
| `analysis` 里起止标记还在 | 能搜到 `SIDECAR_BEGIN` 和 `SIDECAR_END` |
| 中间是一行能解析的 JSON | `type` 是 `pageRead` 或 `renderA2UI` |
| `structured` 没被改乱 | 原来的产品/原子字段还在 |

**这一步过了，只证明专家会写 JSON。**  
不证明侧栏能出卡。出卡仍等前端 `queryToolCall` 不再是空数组。

贴进 Coze 的步骤：[`coze-inject-guide.md`](coze-inject-guide.md) 路径 A。  
确认地址栏 `workflow_id` 是测试副本，不要改飞书登记表，不要发布现网专家。

---

## 明确不做

- 不在专家画布上加 `tool_call_send` 插件（专家调不到聊天窗会话号）
- 不改共享 recaller
- 不改现网 Query / 现网 Bot
- 不把 JSON 写进 `qa-gen_base.csv`
- 不等前端收令才开始写结束节点样例

等通道通了、Query 副本能把标识交到 `page_intent_emit` 之后，再用真问句测：专家动态生成（不再写死换标这一组）。那才是「输出准确」。
