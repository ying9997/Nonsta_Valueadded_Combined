# 16 条规则分流对照（2026-09-03）

对照基准：`_runs/20260902_internal_review_dryrun`（当时 SOP 仍是 mock）。  
本次：确定性节点 + 真实 LLM。LLM 失败 0，**未改任何规则 gate**。

| 口径 | 2026-09-02 mock | 2026-09-03 当前规则 | 2026-09-03 + 真实 LLM |
| --- | ---: | ---: | ---: |
| needs_requirement_clarification | 1 | 0 | 0 |
| needs_field_clarification | 1 | 1 | 1 |
| transfer_human | 14 | 15 | 15 |

唯一变化：`VASC000000348495`。

- 9/2 mock：`check-requirement` 停在「数量或范围」。
- 当前 `check-requirement.ts` 已明确不再把数量/范围当硬缺失；该单需求可路由，进入 `match-template`，reason=`unsupported_direct_scan_shelve` → `transfer_human`。
- 这是规则文件本身的既有口径，不是 LLM 改判。

其余 15 条与 9/2 一致：`VASC000000348477` 仍缺操作说明附件 + 商品和标签的对应关系；14 条拦截不上架仍转人工。
