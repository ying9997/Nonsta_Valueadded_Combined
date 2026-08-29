# Batch-0：agent-inventory-assist 合并记录

- 日期：2026-08-27
- 决策依据：`triage_相对Nonsta主线_20260827.md` §5 P1

## 结论

以 `Nonsta_Valueadded_Combined/agent-inventory-assist/` 为**唯一工作副本**。

## 对比结果

| 对比项 | DA 根独立仓 | Nonsta 内副本 |
|--------|-------------|---------------|
| 内容文件数 | 10 | 15（超集） |
| 独有文件 | 无 | 评测链路图、6 节点评测设计等 5 份 |
| 共有文件 hash | 8/9 相同 | |
| PRD 差异 | 缺 1 行（V1.0 取消「让AI再改一版」说明） | **较新**（2026-08-27） |

**无需从 DA 根拷入新内容**；Nonsta 已包含全部有效资产且更新。

## 执行动作

1. `D:\DA\agent-inventory-assist\`（含 `.git`）→ **复制**归档至  
   `archive/source-da-root/agent-inventory-assist_git_20260827/`（因文件占用未能整目录 Move）
2. DA 根原路径已清空，仅留 `MOVED.md` 重定向
3. 后续所有 `agent-inventory-assist` 改动只在 Nonsta 内进行

## DA 根独立仓 Git 摘要（已归档）

```
f537b13 docs: 评测文档技术评审第一轮意见 (2026-08-25)
83617d0 docs(prd): define node IO contracts
8170d10 docs(evaluation): capture initial eval framework
```

节点 IO 契约等内容已在 Nonsta PRD §5.0 中保留。

## 下一步

- Batch-1：Vas-Nonstandard-Guide 回流 Nonsta
- 可选：在 Nonsta 根 README 声明 Active 项目列表
