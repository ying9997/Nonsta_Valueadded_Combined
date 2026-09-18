# T1 补贴包裹标：单/多 SKU 商品码校验

时间：2026-09-17
样例：`VASC000000370734` / 上架单 `WI52674273`

## 结论（370734）

客户写「都是同一个 sku」。入库单商品码是：

- `M010000000013991941-10X`
- `M010000000013991941`

去后缀后都是 `M010000000013991941`，判为 **同一个 SKU → 直接生成 SOP**，不再要对应关系。

业务肉眼看到两个商品码，是后缀不同，不是两个 SKU。

## Pipeline

命中 `inbound_package_barcode_batch_relabel` 后、L2.5 前：

| 入库单去后缀后 | 客户怎么写 | 结果 |
|---|---|---|
| 1 个 SKU | 任意 | 直接生成，不追问对应关系 |
| 多个 SKU | 写了「一个/同一个 SKU」 | 橙卡打回销售客服，核对是否填错、让客户重提 |
| 多个 SKU | 多个 / 没写 | 必须提供辨识方法 + SKU 与入库单对应关系 |

查不到商品码或超时：跳过，不卡住。

## 本地验证

```
npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts
npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts --live
```

live：`verdict=single_ok stems=M010000000013991941`

## 40

2026-09-17 已同步 `~/.agents/services/internal-review-copilot`，`irc-poll` / `irc-listen` 已重启。40 上单测通过。`LISTEN_IM` 仍关；正式群、OMS 真写未改。

## 口径确认（2026-09-18 金萤）

去后缀后同一 SKU → 直接生成 SOP，这个口径锁定。

`VASC000000370734` 当时 case-store 已是 `written_back` / `sop_generated`，【增值】异常沟通已有话题 `omt_19cf23847f0f5b97`。现网 OMS 之后变成「待客户确认」。测试群重评见下一节。

## 40 备份（2026-09-18）

T1 当时只备份了 `.env`。已补打当前代码整包（不含密钥）：40 上 `~/.agents/backups/internal-review-copilot/irc-code-20260918_current.tgz`，说明见 `_runs/20260918_40_rollback/README.md`。
