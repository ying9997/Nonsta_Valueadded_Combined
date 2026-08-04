/**
 * 桩节点：在「跳过 LLM」分支上为 format-output 提供空的 analysisResult。
 * 与 workflow.json 中本节点 inputs / outputs 一致。
 */
async function main({ params: _params }: { params: Record<string, unknown> }) {
  return {
    analysisResult: {
      structured: {},
      analysis: "",
    },
  };
}
if (typeof process !== "undefined" && process.argv[1]?.includes("stub-llm-placeholder")) {
  main({ params: {} })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
