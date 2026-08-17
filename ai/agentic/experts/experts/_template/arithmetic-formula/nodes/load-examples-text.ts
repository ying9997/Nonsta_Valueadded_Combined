/**
 * Few-shot 字符串，与 prompts/examples.md 同步。
 */

const EXAMPLES_MD = "# Few-shot 示例（供 Coze **引用**，勿依赖 LLM 读盘）\r\n\r\n> **部署到 Coze**：请把**本文件全文**作为知识库条目、上传文档或工作流变量内容，在 **`llm-comment`** LLM 节点的 **「引用」** 中挂载；主 Prompt 使用 `prompts/main.md`，其中 **Few-shot** 一节说明见 `main.md` 的「Coze 引用」段落。\r\n>\r\n> 仓库内保留本文件是为 Git 维护与复制方便，**线上模型看不到文件名**。\r\n\r\n## 1. 话术 → expression（可选前置 LLM）\r\n\r\n代码节点只接受 `expression` 字符串。\r\n\r\n| 用户/客户侧表述 | 建议 expression |\r\n|----------------|-----------------|\r\n| 十二加三再乘四 | `(12+3)*4` |\r\n| 100 除以 5 减 2 | `100/5-2` |\r\n| 一点五乘二 | `1.5*2` |\r\n\r\n**不要**输出：变量名、`**` 幂运算、函数调用、中文数字未转换等。\r\n\r\n---\r\n\r\n## 2. 计算结果 → 点评（主链路 `llm-comment`）\r\n\r\n**输入片段示例**（注入到 `computationResult`）：\r\n\r\n```json\r\n{\r\n  \"structured\": { \"valid\": true, \"value\": 9, \"expressionNormalized\": \"(1+2)*3\" },\r\n  \"analysis\": \"算式 (1+2)*3 = 9。客户侧诉求：试算。\"\r\n}\r\n```\r\n\r\n**期望模型输出**（JSON）：\r\n\r\n```json\r\n{\r\n  \"structured\": {\r\n    \"highlights\": [\"括号保证先算 1+2，再乘 3\"],\r\n    \"caveats\": [],\r\n    \"confidence\": \"high\"\r\n  },\r\n  \"analysis\": \"数值与运算顺序一致；若业务场景强调「拆分步骤展示」，可在对客话术中单列每一步。\"\r\n}\r\n```\r\n\r\n**失败场景**：当 `valid: false` 且 `errorCode: \"invalid_chars\"` 时，点评应说明「仅支持四则与括号」，并建议改写算式。\r\n";

async function main({ params: _params }: { params: Record<string, unknown> }) {
  return { examplesMd: EXAMPLES_MD };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-examples-text")) {
  main({ params: {} })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
