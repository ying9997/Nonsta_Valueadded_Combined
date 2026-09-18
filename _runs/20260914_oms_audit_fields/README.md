# OMS 审核信息字段探测（VASC000000315774）

日期：2026-09-14。已审核通过单，`getVasList` atom + `pageQuery` header。

## 结论

| 位置 | 字段 | 已审核单取值 | 待审核单取值 | 能否当「已审」标志 |
|------|------|--------------|--------------|-------------------|
| pageQuery header | `isAuditThrough` | `Y` | `""` | **能** |
| header.vasc | `isAudit` | `Y` | `Y` | **不能**（产品「是否要审核」开关） |
| header | `actualAuditTime` / `actualAuditTimeStr` | `null` | `null` | 不能 |
| getVasList atom | `auditRemark` / `auditInfo` / `auditResult` | **不存在** | — | 没有这些字段 |
| atom.vaAtomAttrs | 审核意见/结果 | 无此属性 | — | 无 |

写入门禁用 `header.isAuditThrough` 非空拦截；并兜底识别若将来 atom 出现 `auditRemark` / `auditInfo` / `auditResult`。

原始 JSON：`VASC000000315774.atom.json`、`VASC000000315774.header.json`（含客户字段，勿提交）。
