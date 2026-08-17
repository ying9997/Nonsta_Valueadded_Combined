/**
 * 节点：compose-conditional-config — 缺证据时输出条件性配置结论。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const configEvidence = asRecord(params.configEvidence);
  const pending = asArray(configEvidence.pendingRuleEvidence);
  const existingOutputPath = configEvidence.outputPath;
  const outputPath =
    existingOutputPath === "missing_vasc"
      ? "missing_vasc"
      : existingOutputPath === "inactive_vasc"
        ? "inactive_vasc"
      : existingOutputPath === "escalated"
        ? "escalated"
      : existingOutputPath === "conditional"
        ? "conditional"
      : pending.length > 0
        ? "conditional"
        : "committed_candidate";

  return {
    conditionalConfigEvidence: {
      ...configEvidence,
      outputPath,
    },
    serviceConfigInput: asRecord(params.serviceConfigInput),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("compose-conditional-config")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "compose-conditional-config failed");
      process.exit(1);
    });
}
