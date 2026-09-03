# 失败用例回流

gold 只从真实 trace + OMS 终态增长，不靠 synthetic 堆量。

```text
生产失败（误命中 / 漏召回 / 越权附件 / 不该出 SOP）
    → 最小复现（一条脱敏 input + available_context + rubric）
    → 判定 gold / derived / shadow
    → 加入 regression set（本目录或后续 eval-v0.1.x）
    → 下次发版必须过 shadow/regression
    → 若补到 OMS 终态+SOP+原因，才允许升 gold
```

| 来源 | 怎么回流 | 默认 gold_status |
|------|----------|-----------------|
| 16 条待审核 dry-run 漂了 | 只加 shadow 守卫，不升 gold | shadow |
| 客服/群聊新会话 | 脱敏后切 1 个切点 | derived，直到有 OMS 终态 |
| OMS 历史通过/取消 | 核验 SOP 与 evidence 信号 | 过门槛才 gold |
| 构造句（§2.5/§2.7） | 只补规则空洞 | 永远 derived |

禁止：为凑 20/50/100 条复制同文拦截；把 dry-run `outputPath` 抄成 expected；未脱敏原文进 knowledge/eval。
