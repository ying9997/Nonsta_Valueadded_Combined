# 结构化数据

## 目录定位

本目录承载机器 Schema、证据抽取候选、Canonical 唯一事实源和可重建报告。不同层级不得混用，也不得形成两套可分别手工维护的事实源。

Phase 0 只允许骨架、机器 Schema、空来源台账所需结构和确定性生成元数据，不包含业务 Canonical 数据。

Phase 1 及后续 Canonical 的业务边界止于仓库出库交接。交接后的尾程实体、事实和关系不得进入 extracted、canonical 或 generated 业务视图。

## 子目录

- [schemas](schemas/)：机器可校验的结构契约。
- [extracted](extracted/)：从证据抽取的候选数据，不能直接发布。
- [canonical](canonical/)：实体、事实、关系和受控词表的唯一可审查来源。
- [generated](generated/)：命令报告等可重新生成的运行输出。

## 收录口径

- Canonical 实体与事实进入 canonical/entities。
- Canonical 关系进入 canonical/relationships。
- 受控术语、状态域和对象层级进入 canonical/vocabularies。
- 抽取结果在完成来源、冲突、范围和敏感审查前只能留在 extracted。
- 可重建报告不得反向成为业务事实来源。

## 生成与维护

- 新业务数据写入前必须读取 [SCHEMA.md](../SCHEMA.md)，Phase 0 不开放业务写入。
- Canonical 修改必须触发生成、索引、覆盖、检索、答案、边界和披露测试。
- generated 下的文件由命令原子生成，默认不进入 Git，不能人工修补结果。
- 所有项目内引用使用相对路径，外部来源根只能作为一次性命令参数。
- 结构或目录契约变化时同步更新 Schema、校验器、测试和项目进度记录。
