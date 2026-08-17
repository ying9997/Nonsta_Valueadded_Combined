# 尾程专家系统文档链接表

从飞书云表格「查件/索赔客服记录数据分析」->「数据透视表2」提取，E(场景)、F(客服SOP文档)、G(AI判断处理流程)三列

| 序号 | 业务场景 | 专家ID | 客服SOP文档链接 | AI处理流程文档链接 |
|------|---------|--------|----------------|-------------------|
| 1 | 轨迹长时间未更新 | `tracking-stale` | [尾程派送常见问题](https://winitlink.feishu.cn/wiki/YObiwojn5iaUQMk7PJuc2NrTnMc)（飞书正文 **第 2、10 条** 与停滞/断更场景相关，可作 KB 补充索引） | [轨迹长时间未更新处理流程](https://winitlink.feishu.cn/wiki/BKqCwcBS1iHKkJkW90uciqz9nGb) |
| 2 | 轨迹长时间未上网及索赔咨询 | `tracking-no-scan` | [无上网信息](https://winitlink.feishu.cn/wiki/wikcnYUi0OjmnCpYseCEprBcOig) | [无上网信息处理流程](https://winitlink.feishu.cn/wiki/Wm5YwCzBxiRBamklvvEcvBpAnff) |
| 3 | 查询、下载尾程面单 | `shipping-label` | [海外仓出库申请发货面单](https://winitlink.feishu.cn/wiki/OQ6twHYvXiRRLtkrW7xccAw0nvc)（历史 SOP，不得进入运行时回答或据此声称“仅支持人工客服提供”） | 运行路径以 `wh.outbound.getMaskedLabelUrl` 与本地 Expert 设计为准；接口失败按真实业务码说明，不自动转人工 |
| 4 | 物流状态及轨迹查询 | `delivery-status` | [海外仓-尾程](https://winitlink.feishu.cn/wiki/wikcnPWDYgTm9UdVCy5RTMpSOmc) | [物流状态及轨迹查询处理流程](https://winitlink.feishu.cn/wiki/TlyMwLNTlicfZBkfACccpBb4nFe) |
| 5 | 申请pod | `pod-request` | 1. [客户如何自助获取尾程订单的妥投证明文件（POD）](https://winitlink.feishu.cn/wiki/FLzcwSCL0isbegksbkNctF8Unee)<br>2. [哪些渠道客服可以直接在tom获取pod？](https://winitlink.feishu.cn/wiki/B6nrwIVhFiKGJakuxVHcJ0WRnMd) | [申请POD处理流程](https://winitlink.feishu.cn/wiki/UbirwMozOiVbATkAsivcep6tnHg) |
| 6 | 查件申请进度查询 | `tracking-inquiry` | [标准出库单查件进度查询](https://winitlink.feishu.cn/wiki/HOEwwoCRXikIYzkQ2fQcaIBAnPb) | [查件申请进度查询](https://winitlink.feishu.cn/wiki/SOzTwOjV6iuVzZktf3jcEwKpnif) |
| 7 | 代客索赔申请、进度、时效及流程性赔付状态查询 | `substitute-claim` | [代客索赔进度查询](https://winitlink.feishu.cn/wiki/AK5kwbKhxiVB9Lk1Hi8cHgqwnFh) | 无 |
| 8 | 截单/改地址 | `intercept-redirect` | 1. [（订单已出库）申请尾程截单的处理流程](https://winitlink.feishu.cn/wiki/wikcnMlBOFsO8fQyxfmewbsfamb)<br>2. [（订单已出库）申请尾程改地址的处理流程](https://winitlink.feishu.cn/wiki/VrRlw0xBYiDMbgkl73mc6VzanJp) | [订单已出库申请尾程截单](https://winitlink.feishu.cn/wiki/CwiNwrMzUi5LhkkfNTocjIjonxe) |
| 9 | 妥投未收到 | `delivered-not-received` | [妥投未收到的处理流程](https://winitlink.feishu.cn/wiki/Y5cYwWGebiKhxCkbhdjcpXnVn9g) | [妥投未收到处理流程](https://winitlink.feishu.cn/wiki/Y1nTwSkoiiToaOknFNoc30HsnBg) |
| 10 | 尾程附加费咨询 | `product-consult`/`product-info` | 1. [尾程附加费提交操作文档](https://winitlink.feishu.cn/wiki/R8WPwM8S7iRHqakD8NxcGFbVnjb)<br>2. [海外仓尾程附加费的申诉流程](https://winitlink.feishu.cn/wiki/wikcnhu3y5t8OlPFgtd2Nl2jgKd) | 无 |
| 11 | 咨询运输商联系方式 | `carrier-contact` | [(海外仓）各供应商的客服电话](https://winitlink.feishu.cn/wiki/Ndqvw5WnSip7Juk9JavcVrapnPf) | [咨询运输商联系方式](https://winitlink.feishu.cn/wiki/VJ6MwL0EeiZqhekaMBccEewjnse) |
| 12 | 预计到达时间咨询 | `expected-arrival-time` | [尾程查件常见问题（文档里的9）](https://winitlink.feishu.cn/wiki/N3zlwJuXgiI98ekXkCDcnKTKnBg) | [预计到达时间咨询处理流程](https://winitlink.feishu.cn/wiki/AJRjwaDlhiqiWukfWbvcQmdhnSc) |
| 13 | 标准索赔申请及咨询 | `refund-standard` | 无文档 | 无 |

---

## KB 补充说明（文档第 2、10 条 × 表格序号 2、10）

- **《尾程派送常见问题》里的「第 2、10 条」**（飞书 wiki 内编号，非本表「序号」列）：用于 **序号 1 / `tracking-stale`** 时，优先对照正文第 2、10 条是否与「轨迹长时间未更新、断更、停滞」一致；本地已沉淀的主文档为 [`docs/experts/last-mile/tracking-stale.md`](../experts/tracking-stale.md)（含断更原因、MSCAN、延迟与索赔 FAQ 等）。若飞书第 2、10 条有更新而本地未同步，应把增量并入该文件作为 KB。
- **本表「序号 2」「序号 10」** 是另一条索引：分别对应专家 **`tracking-no-scan`**、**`product-consult` / `product-info`**，与上文「飞书文档第 2、10 条」不是同一含义。扩展 KB 时可链向 [`docs/experts/last-mile/tracking-no-scan.md`](../experts/tracking-no-scan.md)、[`docs/experts/last-mile/product-consult.md`](../experts/product-consult.md)、[`docs/experts/last-mile/product-info.md`](../experts/product-info.md)。

- **`carrier-contact`**：飞书 SOP 与本地整理 KB 的对应关系见 [experts/last-mile/carrier-contact/prompts/kb.md](../../experts/last-mile/carrier-contact/prompts/kb.md) 与 [experts/last-mile/carrier-contact/design.md](../../experts/last-mile/carrier-contact/design.md) §5；更新飞书表后须同步 kb.md 并运行 `node experts/last-mile/carrier-contact/scripts/embed-kb-into-load.mjs`。

**原始表格链接**：https://winitlink.feishu.cn/wiki/ToFzwBDVOiHyVJkp9qGcHyvTnPb?sheet=rSomu2  
**提取时间**：2026年4月25日
