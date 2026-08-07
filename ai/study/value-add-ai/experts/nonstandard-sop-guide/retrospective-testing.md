# 复盘：Coze Workflow 测试过程中的问题

## 时间线（事实记录）

### 第一次尝试：生成 Coze 导入包

1. 我参考 `experts-push/experts_coze_output/value-add-product-recommendation-v2.zip` 的结构生成 zip
2. 第一版 zip 目录结构错误（多包了一层 `workflow/`），导入失败
3. 第二版修正了目录结构但仍然失败
4. 用户指出还有其他问题：icon 文件缺失、LLM 变量引用格式、参数类型不一致
5. 最终用户自己用其他方式导入成功

**实证**：我没有先解压参考 zip 逐字节对比结构，而是凭记忆猜测格式，导致反复失败。

### 第二次尝试：生成测试 input JSON

1. 我生成了 `"customerCode": "EVAL_VASC000000310245"` 和 `"username": "eval-test"`
2. 用户在 Coze 上跑 Case 1，LLM 节点输出了 `notActionable`
3. 用户指出：假的 customerCode 和 username 在线上环境走不通

**实证**：
- CSV 中有真实的 `customer_code` 字段（如 `13816111`），我没有直接使用
- CSV 中没有 `username`（登录邮箱）字段，我没有去查真实数据源，而是编造了 `"eval-test"`
- 用户明确说"线上会调接口，用假数据走不通"

### 第三次尝试：LLM 节点输出 notActionable

1. Case 1 的 LLM 节点输入是正确的（`sopInput.customerIntent` 包含完整客户需求）
2. 但 LLM 输出了 `notActionable: true`
3. 我猜测是"变量没替换"，但没有实际验证

**实证**：用户贴出了 LLM 节点的实际输入 JSON，其中 `sopInput.customerIntent` 确实包含了客户需求文本。这说明变量替换是正常的，问题出在别处（可能是 prompt 的意图判断逻辑太严格，或者 matchResult 为 C 类导致 LLM 过度谨慎）。

## 我实际犯的错误

### 错误 1：没有用真实数据

| 字段 | 我给的 | 应该给的 | 来源 |
|------|--------|---------|------|
| customerCode | `"EVAL_VASC000000310245"` | `"13816111"` | CSV `customer_code` 列 |
| customerName | `"评测客户"` | `"乐米电子商务有限公司"` | CSV `customer_name` 列 |
| username | `"eval-test"` | 真实登录邮箱 | CSV 中没有，需要查库或问用户 |

### 错误 2：遇到缺失数据时编造而非确认

CSV 里没有 `username` 字段时，我应该：
- 告诉用户"CSV 里没有 username，需要你提供或者我去查数据库"
- 而不是编造一个 `"eval-test"` 糊弄过去

### 错误 3：没有区分"哪些字段影响执行、哪些只是透传"

我不确定 `customerCode` 和 `username` 在这个 workflow 中是否会影响执行（是纯透传？还是某个节点会用它调接口？）。面对不确定，我应该问用户，但我没问就直接编造了。

### 错误 4：Coze 包格式多次失败

- 参考 zip 就在本地（`experts-push/experts_coze_output/value-add-product-recommendation-v2.zip`），我应该先完整解压、逐文件对比、确认每个字段的格式
- 但我只是粗略看了一下就开始生成，导致 icon 引用、变量格式、参数类型等细节全部对不上

## 根因分析

| 错误模式 | 具体表现 | 应有行为 |
|---------|---------|---------|
| **编造代替确认** | 不知道 username 填什么 → 编造 "eval-test" | 不知道 → 问用户 |
| **粗看代替精读** | 粗略看了参考 YAML 结构 → 凭印象生成 | 精确解压参考 zip → 逐字段对照生成 |
| **假设代替验证** | 假设 Coze 变量用 `{{x}}` 格式就行 → 没有验证是否生效 | 给出最小测试 case → 先跑一个节点验证格式 |
| **批量代替逐步** | 一次生成 10 条 → 全部有问题 | 先确保 1 条跑通 → 再批量生成 |

## 改正规则

1. **数据字段**：能从已有数据源取到的，直接用真实值；取不到的，明确告诉用户"我需要你提供 X"
2. **格式对齐**：有参考文件时，先 100% 精确复制结构，确认能跑通，再修改内容
3. **逐步验证**：任何新环境（Coze、线上、staging），先用 1 条最简单的 case 跑通全链路，再扩展到 10 条
4. **不确定时停下来问**：不编造、不猜测、不跳过
