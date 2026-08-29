# workspace/prototypes/current

**唯一 Active 区。**

| 文件 | 角色 | 受众 |
|------|------|------|
| **`B_侧边栏真实体验版.html`** | **交互原型权威** | 外部客户 |
| `flow-v1.html` | 客户侧业务流程图（英文短名） | 外部客户 + Planner |
| `非标增值Agent_权威业务流程图_V1.0.html` | 同上中文文件名（客户侧） | 外部客户 |
| **`flow-internal-audit-v1.html`** | **内部审核咨询智能体流程图**（与客户侧并列） | 审核 + 销售/客服 |
| `_files/mermaid.min.js` | 本地 Mermaid | — |

## 命名约定（客户侧 vs 内部侧）

| 层级 | 客户侧 | 内部审核侧 |
|------|--------|------------|
| 流程图文件 | `flow-v1.html` / `非标增值Agent_权威业务流程图_*.html` | `flow-internal-audit-v1.html` |
| 子目录（可选，文件变多再拆） | `current/customer/` | `current/internal-audit/` |
| Expert 包（建议） | `experts/value-add/nonstandard-sop-guide/` | `experts/value-add/audit-order-assist/` |
| 文档/飞书标题前缀 | `customer-` / 「客户侧」 | `internal-audit-` / 「内部审核咨询」 |

其它探索版已在上级目录标废弃；正式维护只改本目录。客户侧与内部侧**不要**揉进同一张 flow-v1。
