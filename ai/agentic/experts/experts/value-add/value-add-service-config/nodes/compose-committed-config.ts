/**
 * 节点：compose-committed-config — 证据充分时输出确定配置结论。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const conditional = asRecord(params.conditionalConfigEvidence);
  const outputPath =
    conditional.outputPath === "missing_vasc"
      ? "missing_vasc"
      : conditional.outputPath === "inactive_vasc"
        ? "inactive_vasc"
      : conditional.outputPath === "escalated"
        ? "escalated"
      : conditional.outputPath === "committed_candidate"
        ? "committed"
        : "conditional";

  return {
    configEvidence: {
      ...conditional,
      outputPath,
    },
    serviceConfigInput: asRecord(params.serviceConfigInput),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("compose-committed-config")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "compose-committed-config failed");
      process.exit(1);
    });
}
