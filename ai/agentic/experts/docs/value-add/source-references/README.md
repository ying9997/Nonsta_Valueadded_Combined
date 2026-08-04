# Value-Add Source References

本目录保存 value-add 知识库的来源证据副本或摘要。它用于审查和维护，不直接作为 LLM 运行时全量输入。

| 目录 | 用途 | 当前状态 |
|---|---|---|
| `interface-documents/` | PMS / OMS / WH 接口文档摘要和后续全量副本 | 已建立关键接口摘要 |
| `offline-documents/` | 原子可选性离线规则源与结构化派生表 | 已复制当前 repo 既有文件 |
| `exception-vas-data-package/` | 快照、raw、normalized、coverage report | 已建立目录，待补外部源全量副本 |
| `kb-business-source-snapshots/` | 业务 KB 快照 | 已建立目录，待补外部源全量副本 |

## 约束

- 来源证据可以很细，但业务文档和 prompt KB 只能引用其中已经整理过的结论。
- 接口文档不能作为 VASC 业务适用性结论。
- raw 和 normalized 数据应保留生成口径；人工改写只能发生在摘要、映射和实体页。
