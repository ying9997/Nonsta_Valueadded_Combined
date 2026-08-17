# Coze 代码节点说明

每个文件为**单文件闭环**，无跨文件 import，可直接复制到 Coze 工作流代码节点使用。

**Coze 格式**：`main({ params })` 通过 `params` 获取输入变量，输出必须为 `const ret = { "key": value }; return ret;` 的 Object 键值对形式。

新建专家时，参考 `_template/arithmetic-formula/nodes/evaluate-expression.ts` 的 Coze 单文件格式，复制后重命名并按业务实现逻辑。
